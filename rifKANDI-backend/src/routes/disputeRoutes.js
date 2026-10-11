const express = require('express');
const WalletService = require('../services/walletService');
const { all, get, run } = require('../services/bookingProtocolService');

const OPEN_STATUSES = new Set(['open', 'in_review']);
const RESOLUTION_STATUSES = new Set(['in_review', 'resolved_buyer', 'resolved_seller', 'return_required', 'closed']);
const REASONS = new Set(['not_received', 'wrong_item', 'damaged', 'not_as_described', 'delivery_issue', 'other']);

class DisputeError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const positiveId = (value, field = 'ID') => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new DisputeError(`${field} is invalid.`, 422);
  return parsed;
};

const cleanText = (value, field, { min = 1, max = 1_500, required = true } = {}) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text && !required) return '';
  if (text.length < min || text.length > max) throw new DisputeError(`${field} must be between ${min} and ${max} characters.`, 422);
  return text;
};

const createDisputeRoutes = ({
  db,
  protect,
  AuditService,
  NotificationService,
  canAccessCodOperations,
  canAccessCodReconciliation,
  notifyCodTeam,
}) => {
  const router = express.Router();
  const safeNotify = (payload) => {
    void NotificationService.create(payload).catch((error) => {
      console.error(JSON.stringify({ level: 'error', event: 'dispute_notification_failed', error: error.message }));
    });
  };

  const getDispute = async (disputeId, tx = db, lock = false) => {
    const query = `SELECT d.*, f.status AS fulfillment_status, f.settlement_status, f.order_id,
           o.order_number, o.user_id AS buyer_id,
           COALESCE((SELECT COALESCE(NULLIF(oi.product_title, ''), p.title)
                     FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
                     WHERE oi.order_id = o.id AND p.seller_id = d.seller_id
                     ORDER BY oi.id ASC LIMIT 1), fo.item_title, 'Marketplace item') AS item_title,
           buyer.name AS buyer_name, seller.name AS seller_name
    FROM order_disputes d
    JOIN cod_fulfillments f ON f.id = d.fulfillment_id
    JOIN orders o ON o.id = d.order_id
    LEFT JOIN findit_orders fo ON fo.order_id = o.id
    JOIN users buyer ON buyer.id = d.buyer_id
    JOIN users seller ON seller.id = d.seller_id
    WHERE d.id = ?
    LIMIT 1`;
    return get(tx, lock ? WalletService.lockForUpdate(query) : query, [disputeId]);
  };

  const participant = (dispute, userId) => Number(dispute.buyer_id) === Number(userId) || Number(dispute.seller_id) === Number(userId);
  const canCoordinate = (user) => canAccessCodOperations(user) || canAccessCodReconciliation(user);

  const recordEventTx = (tx, { disputeId, actorUserId = null, eventType, body = '' }) => run(tx,
    `INSERT INTO order_dispute_events (dispute_id, actor_user_id, event_type, body)
     VALUES (?, ?, ?, ?)`,
    [disputeId, actorUserId, eventType, body]
  );

  const loadEvents = (disputeId) => all(db, `
    SELECT e.id, e.event_type, e.body, e.created_at, e.actor_user_id, u.name AS actor_name
    FROM order_dispute_events e
    LEFT JOIN users u ON u.id = e.actor_user_id
    WHERE e.dispute_id = ?
    ORDER BY e.created_at ASC, e.id ASC
  `, [disputeId]);

  const present = async (dispute) => ({ ...dispute, events: await loadEvents(dispute.id) });

  router.get('/disputes/mine', protect, async (req, res) => {
    try {
      const orderId = req.query.orderId === undefined ? null : positiveId(req.query.orderId, 'Order ID');
      const rows = await all(db, `
        SELECT d.*, f.status AS fulfillment_status, o.order_number,
               COALESCE((SELECT COALESCE(NULLIF(oi.product_title, ''), p.title)
                         FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
                         WHERE oi.order_id = o.id AND p.seller_id = d.seller_id
                         ORDER BY oi.id ASC LIMIT 1), fo.item_title, 'Marketplace item') AS item_title
        FROM order_disputes d
        JOIN cod_fulfillments f ON f.id = d.fulfillment_id
        JOIN orders o ON o.id = d.order_id
        LEFT JOIN findit_orders fo ON fo.order_id = o.id
        WHERE (d.buyer_id = ? OR d.seller_id = ?) AND (? IS NULL OR d.order_id = ?)
        ORDER BY CASE WHEN d.status IN ('open', 'in_review') THEN 0 ELSE 1 END, d.updated_at DESC, d.id DESC
      `, [req.user.id, req.user.id, orderId, orderId]);
      return res.json({ success: true, disputes: await Promise.all(rows.map(present)) });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to load disputes.', requestId: req.requestId });
    }
  });

  router.post('/fulfillments/:id/disputes', protect, async (req, res) => {
    try {
      const fulfillmentId = positiveId(req.params.id, 'Fulfillment ID');
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      const unexpected = Object.keys(body).filter((key) => !['reason', 'description'].includes(key));
      if (unexpected.length) throw new DisputeError('Unexpected dispute fields.', 422);
      const reason = String(body.reason || '').trim();
      if (!REASONS.has(reason)) throw new DisputeError('Dispute reason is invalid.', 422);
      const description = cleanText(body.description, 'Description', { min: 10, max: 1_500 });

      const dispute = await WalletService.withFinancialTransaction(async (tx) => {
        const fulfillment = await tx.get(WalletService.lockForUpdate(`
          SELECT f.*, o.user_id AS buyer_id, o.order_number
          FROM cod_fulfillments f JOIN orders o ON o.id = f.order_id
          WHERE f.id = ?
        `), [fulfillmentId]);
        if (!fulfillment) throw new DisputeError('Delivery record was not found.', 404);
        if (![fulfillment.buyer_id, fulfillment.seller_id].map(Number).includes(Number(req.user.id))) {
          throw new DisputeError('You are not allowed to open a dispute for this delivery.', 403);
        }
        if (!['shipped', 'delivered', 'refused', 'returned'].includes(fulfillment.status)) {
          throw new DisputeError('A dispute can be opened after the parcel enters delivery.', 409);
        }
        const existing = await tx.get(WalletService.lockForUpdate(`
          SELECT id FROM order_disputes
          WHERE fulfillment_id = ? AND status IN ('open', 'in_review', 'return_required')
          LIMIT 1
        `), [fulfillmentId]);
        if (existing) throw new DisputeError('This delivery already has an open dispute.', 409);
        const inserted = await tx.run(`
          INSERT INTO order_disputes (fulfillment_id, order_id, buyer_id, seller_id, opened_by, reason, description)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [fulfillment.id, fulfillment.order_id, fulfillment.buyer_id, fulfillment.seller_id, req.user.id, reason, description]);
        await recordEventTx(tx, { disputeId: inserted.lastID, actorUserId: req.user.id, eventType: 'opened', body: description });
        await tx.run(`INSERT INTO order_status_history (order_id, status, note, created_by) VALUES (?, 'dispute_opened', ?, ?)`,
          [fulfillment.order_id, `Dispute opened: ${reason}.`, req.user.id]);
        return tx.get('SELECT * FROM order_disputes WHERE id = ?', [inserted.lastID]);
      });

      await AuditService.recordFromRequest(req, {
        action: 'marketplace.dispute_opened', resourceType: 'order_dispute', resourceId: dispute.id, metadata: { fulfillmentId, reason },
      });
      const recipient = Number(dispute.opened_by) === Number(dispute.buyer_id) ? dispute.seller_id : dispute.buyer_id;
      safeNotify({ userId: recipient, kind: 'dispute.opened', title: 'Delivery dispute opened', body: `A dispute was opened for order ${dispute.order_id}. Share any relevant delivery details in rifKANDO.`, href: `/orders/${dispute.order_id}`, metadata: { disputeId: dispute.id, orderId: dispute.order_id, fulfillmentId } });
      notifyCodTeam({ team: 'operations', kind: 'dispute.opened', title: 'COD dispute needs review', body: `A delivery dispute was opened for fulfillment ${fulfillmentId}. Review the parcel record and delivery notes.`, href: '/operations/cod', metadata: { disputeId: dispute.id, orderId: dispute.order_id, fulfillmentId } });
      notifyCodTeam({ team: 'reconciliation', kind: 'dispute.opened', title: 'COD dispute needs review', body: `A delivery dispute was opened for fulfillment ${fulfillmentId}. Do not complete financial settlement until reviewed.`, href: '/admin/disputes', metadata: { disputeId: dispute.id, orderId: dispute.order_id, fulfillmentId } });
      return res.status(201).json({ success: true, dispute: await present(dispute) });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to open dispute.', requestId: req.requestId });
    }
  });

  router.post('/disputes/:id/messages', protect, async (req, res) => {
    try {
      const disputeId = positiveId(req.params.id, 'Dispute ID');
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      if (Object.keys(body).some((key) => key !== 'message')) throw new DisputeError('Unexpected message fields.', 422);
      const message = cleanText(body.message, 'Message', { min: 3, max: 1_500 });
      const dispute = await WalletService.withFinancialTransaction(async (tx) => {
        const current = await getDispute(disputeId, tx, true);
        if (!current) throw new DisputeError('Dispute not found.', 404);
        if (!participant(current, req.user.id) && !canCoordinate(req.user)) throw new DisputeError('You are not allowed to update this dispute.', 403);
        if (!OPEN_STATUSES.has(current.status)) throw new DisputeError('This dispute is closed to new messages.', 409);
        await recordEventTx(tx, { disputeId, actorUserId: req.user.id, eventType: 'message', body: message });
        await tx.run('UPDATE order_disputes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [disputeId]);
        return current;
      });
      await AuditService.recordFromRequest(req, { action: 'marketplace.dispute_message_added', resourceType: 'order_dispute', resourceId: disputeId });
      const recipients = new Set([Number(dispute.buyer_id), Number(dispute.seller_id)]);
      for (const recipient of recipients) {
        if (recipient === Number(req.user.id)) continue;
        safeNotify({ userId: recipient, kind: 'dispute.message', title: 'New dispute update', body: `There is a new update for order ${dispute.order_number}.`, href: `/orders/${dispute.order_id}`, metadata: { disputeId, orderId: dispute.order_id, fulfillmentId: dispute.fulfillment_id } });
      }
      return res.json({ success: true, dispute: await present(await getDispute(disputeId)) });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to add dispute message.', requestId: req.requestId });
    }
  });

  router.get('/disputes/team', protect, async (req, res) => {
    try {
      if (!canCoordinate(req.user)) throw new DisputeError('You are not authorized to access the disputes desk.', 403);
      const rows = await all(db, `
        SELECT d.*, f.status AS fulfillment_status, f.settlement_status, f.carrier_name, f.tracking_number,
               o.order_number, COALESCE((SELECT COALESCE(NULLIF(oi.product_title, ''), p.title)
                         FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
                         WHERE oi.order_id = o.id AND p.seller_id = d.seller_id
                         ORDER BY oi.id ASC LIMIT 1), fo.item_title, 'Marketplace item') AS item_title,
               buyer.name AS buyer_name, seller.name AS seller_name
        FROM order_disputes d
        JOIN cod_fulfillments f ON f.id = d.fulfillment_id
        JOIN orders o ON o.id = d.order_id
        LEFT JOIN findit_orders fo ON fo.order_id = o.id
        JOIN users buyer ON buyer.id = d.buyer_id
        JOIN users seller ON seller.id = d.seller_id
        ORDER BY CASE WHEN d.status IN ('open', 'in_review') THEN 0 ELSE 1 END, d.updated_at DESC, d.id DESC
      `);
      return res.json({ success: true, disputes: await Promise.all(rows.map(present)), canResolve: canAccessCodReconciliation(req.user) });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to load team disputes.', requestId: req.requestId });
    }
  });

  router.patch('/disputes/:id/decision', protect, async (req, res) => {
    try {
      if (!canAccessCodReconciliation(req.user)) throw new DisputeError('Only COD reconciliation controllers can record a dispute decision.', 403);
      const disputeId = positiveId(req.params.id, 'Dispute ID');
      const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      if (Object.keys(body).some((key) => !['status', 'resolution'].includes(key))) throw new DisputeError('Unexpected decision fields.', 422);
      const status = String(body.status || '').trim();
      if (!RESOLUTION_STATUSES.has(status)) throw new DisputeError('Decision status is invalid.', 422);
      const resolution = cleanText(body.resolution, 'Decision note', { min: 3, max: 1_500 });
      const dispute = await WalletService.withFinancialTransaction(async (tx) => {
        const current = await getDispute(disputeId, tx, true);
        if (!current) throw new DisputeError('Dispute not found.', 404);
        if (!OPEN_STATUSES.has(current.status) && status !== 'closed') throw new DisputeError('A closed dispute cannot be reopened from this desk.', 409);
        await tx.run(`UPDATE order_disputes
          SET status = ?, resolution = ?, resolved_by = ?, resolved_at = CASE WHEN ? IN ('resolved_buyer', 'resolved_seller', 'return_required', 'closed') THEN CURRENT_TIMESTAMP ELSE NULL END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`, [status, resolution, req.user.id, status, disputeId]);
        await recordEventTx(tx, { disputeId, actorUserId: req.user.id, eventType: 'decision', body: resolution });
        await tx.run(`INSERT INTO order_status_history (order_id, status, note, created_by) VALUES (?, 'dispute_${status}', ?, ?)`, [current.order_id, resolution, req.user.id]);
        return current;
      });
      await AuditService.recordFromRequest(req, { action: 'marketplace.dispute_decided', resourceType: 'order_dispute', resourceId: disputeId, metadata: { status } });
      for (const recipient of new Set([Number(dispute.buyer_id), Number(dispute.seller_id)])) {
        safeNotify({ userId: recipient, kind: 'dispute.decision', title: 'Dispute decision recorded', body: `rifKANDO recorded a decision for order ${dispute.order_number}. Open your order for the details.`, href: `/orders/${dispute.order_id}`, metadata: { disputeId, orderId: dispute.order_id, fulfillmentId: dispute.fulfillment_id } });
      }
      if (status === 'return_required') notifyCodTeam({ team: 'operations', excludedUserId: req.user.id, kind: 'dispute.return_required', title: 'Return required for COD dispute', body: `Arrange the return workflow for order ${dispute.order_number} and record the field outcome.`, href: '/operations/cod', metadata: { disputeId, orderId: dispute.order_id, fulfillmentId: dispute.fulfillment_id } });
      return res.json({ success: true, dispute: await present(await getDispute(disputeId)) });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to record dispute decision.', requestId: req.requestId });
    }
  });

  return router;
};

module.exports = createDisputeRoutes;
