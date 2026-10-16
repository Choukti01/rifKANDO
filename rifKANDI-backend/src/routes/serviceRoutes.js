const crypto = require('node:crypto');
const express = require('express');
const { all, get, run, withTransaction } = require('../services/bookingProtocolService');
const { createPaginationMetadata, getPagination } = require('../utils/pagination');
const Money = require('../services/moneyService');

const SERVICE_COMMISSION_RATE = 0.05;
const configuredServiceBankTransfer = () => {
  const accountHolder = String(process.env.SELLER_COMMISSION_ACCOUNT_HOLDER || '').trim();
  const bankName = String(process.env.SELLER_COMMISSION_BANK_NAME || '').trim();
  const rib = String(process.env.SELLER_COMMISSION_RIB || '').replace(/\s+/g, '');
  return accountHolder && bankName && /^\d{20,34}$/.test(rib) ? { accountHolder, bankName, rib } : null;
};
const transferAmounts = (price) => {
  const amountMinor = Money.toMinor(price);
  const commissionMinor = Math.round(amountMinor * SERVICE_COMMISSION_RATE);
  return { amountMinor, commissionMinor, providerPayoutMinor: amountMinor - commissionMinor };
};
const transferAmountsForOrder = (order) => {
  const amountMinor = Number(order?.price_minor);
  if (Number.isSafeInteger(amountMinor) && amountMinor > 0) {
    const commissionMinor = Math.round(amountMinor * SERVICE_COMMISSION_RATE);
    return { amountMinor, commissionMinor, providerPayoutMinor: amountMinor - commissionMinor };
  }
  return transferAmounts(order?.price);
};

const parseList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

const serializeList = (value) => {
  if (Array.isArray(value)) return JSON.stringify(value);
  return typeof value === 'string' && value.trim() ? value : '[]';
};

const requestNumber = () => {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `SRV-${stamp}-${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
};

const attachMedia = async (db, service) => ({
  ...service,
  media: await all(db,
    'SELECT id, media_type, media_url, display_order, is_primary FROM service_media WHERE service_id = ? ORDER BY display_order ASC, id ASC',
    [service.id]
  ),
});

const publicService = (service) => ({
  ...service,
  provider_id: Number(service.provider_id),
  price: Number(service.price || 0),
  old_price: service.old_price === null ? null : Number(service.old_price || 0),
  rating: Number(service.rating || 0),
  orders_count: Number(service.orders_count || 0),
  reviews_count: Number(service.reviews_count || 0),
  deliverables: parseList(service.deliverables),
  client_requirements: parseList(service.client_requirements),
  media: service.media || [],
  provider: {
    id: Number(service.provider_id),
    name: service.provider_name,
    city: service.provider_city || '',
    country: service.provider_country || '',
    profilePicture: service.provider_picture || '',
    headline: service.provider_headline || '',
    availability: service.provider_availability || 'available',
  },
});

const readOrder = async (db, id) => get(db, `
  SELECT so.*, s.title AS service_title, s.category AS service_category,
    buyer.name AS buyer_name, buyer.city AS buyer_city, buyer."profilePicture" AS buyer_picture,
    provider.name AS provider_name, provider.city AS provider_city, provider."profilePicture" AS provider_picture,
    sr.rating AS review_rating, sr.comment AS review_comment,
    spt.payment_status, spt.transfer_reference, spt.submitted_at, spt.verified_at, spt.payout_status,
    sd.id AS dispute_id, sd.status AS dispute_status, sd.reason AS dispute_reason
  FROM service_orders so
  JOIN services s ON s.id = so.service_id
  JOIN users buyer ON buyer.id = so.buyer_id
  JOIN users provider ON provider.id = so.provider_id
  LEFT JOIN service_reviews sr ON sr.service_order_id = so.id
  LEFT JOIN service_payment_transfers spt ON spt.service_order_id = so.id
  LEFT JOIN service_disputes sd ON sd.service_order_id = so.id
  WHERE so.id = ?
`, [id]);

const serializeOrder = (order) => ({
  id: Number(order.id),
  order_number: order.order_number,
  service_id: Number(order.service_id),
  service_title: order.service_title,
  service_category: order.service_category,
  package_id: order.package_id ? Number(order.package_id) : null,
  package_name: order.package_name || 'Standard service',
  price: Number(order.price || 0),
  requirements: order.requirements || '',
  status: order.status,
  provider_note: order.provider_note || '',
  buyer_note: order.buyer_note || '',
  created_at: order.created_at,
  updated_at: order.updated_at || order.created_at,
  completed_at: order.completed_at || null,
  payment_status: order.payment_status || 'not_started',
  payment_message: order.payment_status === 'verified'
    ? 'Your bank transfer was verified. The provider can start work.'
    : order.payment_status === 'submitted'
      ? 'Your bank transfer is awaiting rifKANDO verification.'
      : order.payment_status === 'rejected'
        ? 'Your bank transfer needs correction. Review the payment instructions and submit again.'
        : 'Pay by bank transfer after the provider accepts your request.',
  payment: order.payment_status ? { status: order.payment_status, transfer_reference: order.transfer_reference || '', submitted_at: order.submitted_at || null, verified_at: order.verified_at || null, payout_status: order.payout_status || 'not_due' } : null,
  dispute: order.dispute_id ? { id: Number(order.dispute_id), status: order.dispute_status, reason: order.dispute_reason } : null,
  buyer: { id: Number(order.buyer_id), name: order.buyer_name, city: order.buyer_city || '', profilePicture: order.buyer_picture || '' },
  provider: { id: Number(order.provider_id), name: order.provider_name, city: order.provider_city || '', profilePicture: order.provider_picture || '' },
  review: order.review_rating ? { rating: Number(order.review_rating), comment: order.review_comment || '' } : null,
});

const providerTransitions = Object.freeze({
  requested: { accept: 'accepted', decline: 'declined' },
  accepted: { start: 'in_progress' },
  in_progress: { submit: 'submitted' },
  revision_requested: { start: 'in_progress' },
});
const buyerTransitions = Object.freeze({
  requested: { cancel: 'cancelled' },
  accepted: { cancel: 'cancelled' },
  submitted: { request_revision: 'revision_requested', complete: 'completed' },
});

const createServiceRoutes = ({
  db,
  protect,
  requireSeller,
  validateIdParams,
  validateServiceCreate,
  validateServiceUpdate,
  validateServiceProviderProfile,
  validateServiceRequestCreate,
  validateServiceOrderAction,
  validateServiceWorkroomEntry,
  validateServiceReview,
  validateServicePayoutProfile,
  validateServiceDispute,
  validateServiceDisputeResolution,
  validatePackageCreate,
  validatePackageUpdate,
  notificationService,
  requireServiceReconciliationAccess,
  auditService,
}) => {
  const router = express.Router();
  const notify = (payload) => notificationService?.create(payload).catch((error) => {
    console.error(JSON.stringify({ level: 'error', event: 'service_notification_failed', error: error.message }));
  });
  // The reconciliation queue is intentionally founder-only. Notify that one
  // operational account without broadening access to financial evidence.
  const notifyServiceFinance = async (payload) => {
    try {
      const controllers = await all(db, 'SELECT id FROM users WHERE LOWER(email) = ?', ['achoukti1999@gmail.com']);
      controllers.forEach(({ id }) => notify({ ...payload, userId: id }));
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', event: 'service_finance_notification_failed', error: error.message }));
    }
  };
  const recordStatus = (database, orderId, actorId, fromStatus, toStatus, note = '') => run(database, `
    INSERT INTO service_order_status_history (service_order_id, actor_id, from_status, to_status, note)
    VALUES (?, ?, ?, ?, ?)
  `, [orderId, actorId, fromStatus, toStatus, note]);
  const getParticipantRole = (order, userId) => {
    if (Number(order.provider_id) === Number(userId)) return 'provider';
    if (Number(order.buyer_id) === Number(userId)) return 'buyer';
    return null;
  };
  const isActiveWorkroomStatus = (status) => ['requested', 'accepted', 'in_progress', 'submitted', 'revision_requested'].includes(status);
  const paymentForOrder = (database, orderId) => get(database, 'SELECT * FROM service_payment_transfers WHERE service_order_id = ?', [orderId]);
  const openDisputeForOrder = (database, orderId) => get(database, `
    SELECT * FROM service_disputes
    WHERE service_order_id = ? AND status IN ('open', 'in_review')
    LIMIT 1
  `, [orderId]);
  const presentDispute = async (database, dispute) => ({
    ...dispute,
    id: Number(dispute.id),
    service_order_id: Number(dispute.service_order_id),
    buyer_id: Number(dispute.buyer_id),
    provider_id: Number(dispute.provider_id),
    events: await all(database, `
      SELECT e.id, e.event_type, e.body, e.created_at, e.actor_id, u.name AS actor_name
      FROM service_dispute_events e
      LEFT JOIN users u ON u.id = e.actor_id
      WHERE e.dispute_id = ? ORDER BY e.created_at ASC, e.id ASC
    `, [dispute.id]),
  });
  const assertTransferConfigured = () => {
    const bank = configuredServiceBankTransfer();
    if (!bank) { const error = new Error('Bank transfer is temporarily unavailable. Please contact rifKANDO support.'); error.statusCode = 503; throw error; }
    return bank;
  };

  router.post('/service-orders/:id/payment-instructions', protect, validateIdParams('id'), async (req, res, next) => {
    try {
      const result = await withTransaction(db, async (transaction) => {
        const order = await readOrder(transaction, req.params.id);
        if (!order || Number(order.buyer_id) !== Number(req.user.id)) { const error = new Error('Service request not found.'); error.statusCode = 404; throw error; }
        if (order.status !== 'accepted') { const error = new Error('Payment instructions become available after the provider accepts the request.'); error.statusCode = 409; throw error; }
        const bank = assertTransferConfigured(); const amounts = transferAmountsForOrder(order);
        await run(transaction, `INSERT INTO service_payment_transfers (service_order_id, buyer_id, provider_id, amount_minor, commission_minor, provider_payout_minor)
          VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(service_order_id) DO NOTHING`, [order.id, order.buyer_id, order.provider_id, amounts.amountMinor, amounts.commissionMinor, amounts.providerPayoutMinor]);
        return { bank, amounts, orderNumber: order.order_number, payment: await paymentForOrder(transaction, order.id) };
      });
      return res.json({ success: true, instructions: { method: 'bank_transfer', currency: 'MAD', amount: Money.fromMinor(result.amounts.amountMinor), account_holder: result.bank.accountHolder, bank_name: result.bank.bankName, rib: result.bank.rib, reference: result.orderNumber, notice: 'Transfer exactly this amount and use the service request number as the transfer reference. rifKANDO verifies received funds before work starts.' }, payment: { status: result.payment.payment_status, transfer_reference: result.payment.transfer_reference || '' } });
    } catch (error) { if (error.statusCode) return res.status(error.statusCode).json({ error: error.message }); return next(error); }
  });

  router.post('/service-orders/:id/payment-submission', protect, validateIdParams('id'), async (req, res, next) => {
    try {
      const reference = String(req.body?.transferReference || '').trim(); const note = String(req.body?.note || '').trim();
      if (!/^[A-Za-z0-9 _./:-]{3,256}$/.test(reference) || note.length > 1000) return res.status(422).json({ error: 'Provide a valid bank transfer reference and an optional note under 1,000 characters.' });
      const changed = await withTransaction(db, async (transaction) => {
        const order = await readOrder(transaction, req.params.id);
        if (!order || Number(order.buyer_id) !== Number(req.user.id)) { const error = new Error('Service request not found.'); error.statusCode = 404; throw error; }
        if (order.status !== 'accepted') { const error = new Error('This service request is not awaiting payment.'); error.statusCode = 409; throw error; }
        const payment = await paymentForOrder(transaction, order.id);
        if (!payment) { const error = new Error('Open the bank transfer instructions first.'); error.statusCode = 409; throw error; }
        if (payment.payment_status === 'verified') { const error = new Error('This transfer has already been verified.'); error.statusCode = 409; throw error; }
        await run(transaction, `UPDATE service_payment_transfers SET transfer_reference = ?, buyer_note = ?, payment_status = 'submitted', submitted_at = CURRENT_TIMESTAMP, verified_at = NULL, verified_by = NULL, verification_note = '', updated_at = CURRENT_TIMESTAMP WHERE service_order_id = ? AND payment_status IN ('awaiting_payment', 'rejected')`, [reference, note, order.id]);
        return order;
      });
      notify({ userId: changed.provider_id, kind: 'service.payment_submitted', title: 'Client payment awaiting verification', body: `The client submitted a bank transfer reference for “${changed.service_title}”. Work starts after rifKANDO verifies it.`, href: '/seller/dashboard/services', metadata: { serviceOrderId: changed.id } });
      await notifyServiceFinance({ kind: 'service.payment_submitted', title: 'Service payment needs verification', body: `A client submitted a bank-transfer reference for “${changed.service_title}”.`, href: '/admin/service-reconciliation', metadata: { serviceOrderId: changed.id } });
      return res.json({ success: true, message: 'Your transfer reference was submitted for rifKANDO verification.' });
    } catch (error) { if (error.statusCode) return res.status(error.statusCode).json({ error: error.message }); return next(error); }
  });

  router.get('/admin/service-reconciliation', protect, requireServiceReconciliationAccess, async (req, res, next) => {
    try {
      const transfers = await all(db, `SELECT spt.*, so.order_number, so.status AS service_status, s.title AS service_title,
        buyer.name AS buyer_name, buyer.email AS buyer_email, provider.name AS provider_name, provider.email AS provider_email,
        sd.id AS dispute_id, sd.status AS dispute_status, sd.reason AS dispute_reason, sd.description AS dispute_description,
        sd.resolution_note AS dispute_resolution_note, sd.resolution_reference AS dispute_resolution_reference,
        spp.account_holder AS payout_account_holder, spp.payout_method, spp.bank_name AS payout_bank_name,
        spp.rib AS payout_rib, spp.payout_phone
        FROM service_payment_transfers spt
        JOIN service_orders so ON so.id = spt.service_order_id
        JOIN services s ON s.id = so.service_id
        JOIN users buyer ON buyer.id = spt.buyer_id
        JOIN users provider ON provider.id = spt.provider_id
        LEFT JOIN service_disputes sd ON sd.service_order_id = spt.service_order_id
        LEFT JOIN service_provider_payout_profiles spp ON spp.user_id = spt.provider_id
        ORDER BY CASE WHEN sd.status IN ('open', 'in_review') THEN 0 WHEN spt.payment_status = 'submitted' THEN 1 WHEN spt.payout_status = 'due' THEN 2 ELSE 3 END, spt.updated_at DESC, spt.id DESC`);
      await auditService?.recordFromRequest(req, { action: 'finance.service_reconciliation_viewed', resourceType: 'service_payment_transfer', metadata: { resultCount: transfers.length } });
      return res.json({ success: true, transfers: transfers.map((transfer) => ({ ...transfer, amount: Money.fromMinor(transfer.amount_minor), commission: Money.fromMinor(transfer.commission_minor), provider_payout: Money.fromMinor(transfer.provider_payout_minor) })) });
    } catch (error) { return next(error); }
  });

  router.post('/admin/service-disputes/:id/resolve', protect, requireServiceReconciliationAccess, validateIdParams('id'), validateServiceDisputeResolution, async (req, res, next) => {
    try {
      const changed = await withTransaction(db, async (transaction) => {
        const dispute = await get(transaction, `SELECT sd.*, so.status AS service_status, spt.payment_status, spt.payout_status
          FROM service_disputes sd
          JOIN service_orders so ON so.id = sd.service_order_id
          LEFT JOIN service_payment_transfers spt ON spt.service_order_id = sd.service_order_id
          WHERE sd.id = ?`, [req.params.id]);
        if (!dispute) { const error = new Error('Service dispute not found.'); error.statusCode = 404; throw error; }
        if (!['open', 'in_review'].includes(dispute.status)) { const error = new Error('This service dispute is already closed.'); error.statusCode = 409; throw error; }
        const action = req.body.action;
        if (action === 'resolve_buyer' && !String(req.body.reference || '').trim()) {
          const error = new Error('Record the real buyer refund reference before resolving in the buyer’s favor.'); error.statusCode = 422; throw error;
        }
        const nextStatus = action === 'review' ? 'in_review' : action === 'resolve_buyer' ? 'resolved_buyer' : action === 'resolve_provider' ? 'resolved_provider' : 'closed';
        await run(transaction, `UPDATE service_disputes SET status = ?, resolution_note = ?, resolution_reference = ?,
          resolved_by = CASE WHEN ? IN ('resolved_buyer', 'resolved_provider', 'closed') THEN ? ELSE NULL END,
          resolved_at = CASE WHEN ? IN ('resolved_buyer', 'resolved_provider', 'closed') THEN CURRENT_TIMESTAMP ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [nextStatus, req.body.note, req.body.reference || '', nextStatus, req.user.id, nextStatus, dispute.id]);
        await run(transaction, 'INSERT INTO service_dispute_events (dispute_id, actor_id, event_type, body) VALUES (?, ?, ?, ?)', [dispute.id, req.user.id, action, req.body.note]);
        if (action === 'resolve_buyer') {
          await run(transaction, `UPDATE service_payment_transfers SET payment_status = 'refunded', payout_status = 'withheld',
            payout_note = ?, updated_at = CURRENT_TIMESTAMP WHERE service_order_id = ? AND payment_status = 'verified'`,
          [`Manual buyer refund recorded: ${req.body.reference}`, dispute.service_order_id]);
        }
        if (action === 'resolve_provider' && dispute.payment_status === 'verified') {
          await run(transaction, `UPDATE service_payment_transfers SET payout_status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE service_order_id = ? AND payout_status = 'withheld'`,
          [dispute.service_status === 'completed' ? 'due' : 'not_due', dispute.service_order_id]);
        }
        return { ...dispute, status: nextStatus };
      });
      await auditService?.recordFromRequest(req, { action: `finance.service_dispute_${req.body.action}`, resourceType: 'service_dispute', resourceId: req.params.id, metadata: { serviceOrderId: changed.service_order_id } });
      for (const userId of [changed.buyer_id, changed.provider_id]) {
        notify({ userId, kind: 'service.dispute_updated', title: 'Service dispute updated', body: `rifKANDO updated the dispute for service request ${changed.service_order_id}.`, href: '/service-requests', metadata: { serviceOrderId: changed.service_order_id, disputeId: changed.id } });
      }
      return res.json({ success: true, message: 'Service dispute updated.' });
    } catch (error) { if (error.statusCode) return res.status(error.statusCode).json({ error: error.message }); return next(error); }
  });

  router.post('/admin/service-reconciliation/:id/verify', protect, requireServiceReconciliationAccess, validateIdParams('id'), async (req, res, next) => {
    try {
      const action = String(req.body?.action || ''); const note = String(req.body?.note || '').trim();
      if (!['verify', 'reject'].includes(action) || note.length > 1000) return res.status(422).json({ error: 'Choose verify or reject and provide a note under 1,000 characters.' });
      const changed = await withTransaction(db, async (transaction) => {
        const payment = await get(transaction, 'SELECT * FROM service_payment_transfers WHERE id = ?', [req.params.id]);
        if (!payment) { const error = new Error('Service payment record not found.'); error.statusCode = 404; throw error; }
        if (payment.payment_status !== 'submitted') { const error = new Error('Only a submitted transfer can be verified or rejected.'); error.statusCode = 409; throw error; }
        const nextStatus = action === 'verify' ? 'verified' : 'rejected';
        await run(transaction, `UPDATE service_payment_transfers SET payment_status = ?, verified_at = CASE WHEN ? = 'verified' THEN CURRENT_TIMESTAMP ELSE NULL END, verified_by = ?, verification_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND payment_status = 'submitted'`, [nextStatus, nextStatus, req.user.id, note, payment.id]);
        return { ...payment, payment_status: nextStatus };
      });
      await auditService?.recordFromRequest(req, { action: `finance.service_transfer_${action}d`, resourceType: 'service_payment_transfer', resourceId: req.params.id, metadata: { serviceOrderId: changed.service_order_id } });
      notify({ userId: changed.buyer_id, kind: `service.payment_${changed.payment_status}`, title: changed.payment_status === 'verified' ? 'Service payment verified' : 'Service payment needs correction', body: changed.payment_status === 'verified' ? 'rifKANDO verified your payment. The provider can now begin work.' : 'rifKANDO could not match this transfer. Review the payment details and submit a correct reference.', href: '/service-requests', metadata: { serviceOrderId: changed.service_order_id } });
      notify({ userId: changed.provider_id, kind: `service.payment_${changed.payment_status}`, title: changed.payment_status === 'verified' ? 'Service payment verified' : 'Service payment needs correction', body: changed.payment_status === 'verified' ? 'rifKANDO verified the client payment. You can now begin work.' : 'The client must correct the transfer reference before work starts.', href: '/seller/dashboard/services', metadata: { serviceOrderId: changed.service_order_id } });
      return res.json({ success: true, message: action === 'verify' ? 'Bank transfer verified.' : 'Bank transfer rejected for correction.' });
    } catch (error) { if (error.statusCode) return res.status(error.statusCode).json({ error: error.message }); return next(error); }
  });

  router.post('/admin/service-reconciliation/:id/payout', protect, requireServiceReconciliationAccess, validateIdParams('id'), async (req, res, next) => {
    try {
      const reference = String(req.body?.payoutReference || '').trim(); const note = String(req.body?.note || '').trim();
      if (!/^[A-Za-z0-9 _./:-]{3,256}$/.test(reference) || note.length > 1000) return res.status(422).json({ error: 'Provide a valid seller payout reference and an optional note under 1,000 characters.' });
      const changed = await withTransaction(db, async (transaction) => {
        const payment = await get(transaction, `SELECT spt.*, so.status AS service_status,
          sd.status AS dispute_status, spp.user_id AS payout_profile_user_id
          FROM service_payment_transfers spt
          JOIN service_orders so ON so.id = spt.service_order_id
          LEFT JOIN service_disputes sd ON sd.service_order_id = spt.service_order_id
          LEFT JOIN service_provider_payout_profiles spp ON spp.user_id = spt.provider_id
          WHERE spt.id = ?`, [req.params.id]);
        if (!payment) { const error = new Error('Service payment record not found.'); error.statusCode = 404; throw error; }
        if (payment.payment_status !== 'verified' || payment.service_status !== 'completed') { const error = new Error('A seller payout is allowed only after verified payment and completed client work.'); error.statusCode = 409; throw error; }
        if (payment.payout_status !== 'due') { const error = new Error('This provider payout is not currently due. Review any service dispute before continuing.'); error.statusCode = 409; throw error; }
        if (['open', 'in_review'].includes(payment.dispute_status)) { const error = new Error('A provider payout is blocked while this service dispute is open.'); error.statusCode = 409; throw error; }
        if (!payment.payout_profile_user_id) { const error = new Error('The provider must complete their private payout profile before rifKANDO can record a payout.'); error.statusCode = 409; throw error; }
        if (payment.payout_status === 'paid') { const error = new Error('This provider payout is already recorded.'); error.statusCode = 409; throw error; }
        await run(transaction, `UPDATE service_payment_transfers SET payout_status = 'paid', payout_reference = ?, payout_note = ?, paid_at = CURRENT_TIMESTAMP, paid_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [reference, note, req.user.id, payment.id]);
        return payment;
      });
      await auditService?.recordFromRequest(req, { action: 'finance.service_provider_payout_recorded', resourceType: 'service_payment_transfer', resourceId: req.params.id, metadata: { serviceOrderId: changed.service_order_id } });
      notify({ userId: changed.provider_id, kind: 'service.provider_payout_recorded', title: 'Service provider payout recorded', body: 'rifKANDO recorded your manual service payout.', href: '/seller/dashboard/services', metadata: { serviceOrderId: changed.service_order_id } });
      return res.json({ success: true, message: 'Provider payout recorded.' });
    } catch (error) { if (error.statusCode) return res.status(error.statusCode).json({ error: error.message }); return next(error); }
  });

  router.get('/services', async (req, res, next) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const total = await get(db, "SELECT COUNT(*) AS total FROM services WHERE status = 'published'");
      const rows = await all(db, `
        SELECT s.*, u.name AS provider_name, u.city AS provider_city, u.country AS provider_country,
          u."profilePicture" AS provider_picture, p.headline AS provider_headline, p.availability AS provider_availability,
          (SELECT COUNT(*) FROM service_reviews sr WHERE sr.service_id = s.id) AS reviews_count
        FROM services s JOIN users u ON u.id = s.provider_id
        LEFT JOIN service_provider_profiles p ON p.user_id = s.provider_id
        WHERE s.status = 'published'
        ORDER BY s.created_at DESC, s.id DESC LIMIT ? OFFSET ?
      `, [limit, offset]);
      const services = await Promise.all(rows.map((service) => attachMedia(db, service)));
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return res.json({ success: true, services: services.map(publicService), pagination: createPaginationMetadata(page, limit, Number(total?.total || 0)) });
    } catch (error) { return next(error); }
  });

  router.get('/services/:id', validateIdParams('id'), async (req, res, next) => {
    try {
      const service = await get(db, `
        SELECT s.*, u.name AS provider_name, u.city AS provider_city, u.country AS provider_country,
          u."profilePicture" AS provider_picture, p.headline AS provider_headline, p.availability AS provider_availability,
          (SELECT COUNT(*) FROM service_reviews sr WHERE sr.service_id = s.id) AS reviews_count
        FROM services s JOIN users u ON u.id = s.provider_id
        LEFT JOIN service_provider_profiles p ON p.user_id = s.provider_id
        WHERE s.id = ? AND s.status = 'published'
      `, [req.params.id]);
      if (!service) return res.status(404).json({ error: 'Service not found.' });
      const [withMedia, packages, reviews] = await Promise.all([
        attachMedia(db, service),
        all(db, 'SELECT id, name, price, delivery_time, revisions, features FROM service_packages WHERE service_id = ? ORDER BY price ASC, id ASC', [service.id]),
        all(db, `SELECT sr.rating, sr.comment, sr.created_at, u.name AS buyer_name, u."profilePicture" AS buyer_picture
          FROM service_reviews sr JOIN users u ON u.id = sr.buyer_id WHERE sr.service_id = ? ORDER BY sr.created_at DESC LIMIT 20`, [service.id]),
      ]);
      return res.json({ success: true, service: { ...publicService(withMedia), packages, reviews } });
    } catch (error) { return next(error); }
  });

  router.get('/service-providers/:userId', validateIdParams('userId'), async (req, res, next) => {
    try {
      const provider = await get(db, 'SELECT id, name, city, country, "profilePicture" FROM users WHERE id = ? AND role = \'seller\'', [req.params.userId]);
      if (!provider) return res.status(404).json({ error: 'Service provider not found.' });
      const [profile, services] = await Promise.all([
        get(db, 'SELECT * FROM service_provider_profiles WHERE user_id = ?', [provider.id]),
        all(db, `SELECT id, title, description, price, category, delivery_time, revisions, rating, orders_count, created_at
          FROM services WHERE provider_id = ? AND status = 'published' ORDER BY created_at DESC`, [provider.id]),
      ]);
      return res.json({
        success: true,
        provider: { id: Number(provider.id), name: provider.name, city: provider.city || '', country: provider.country || '', profilePicture: provider.profilePicture || '' },
        profile: profile ? { ...profile, skills: parseList(profile.skills), languages: parseList(profile.languages), credentials: parseList(profile.credentials) } : null,
        services: services.map((item) => ({ ...item, price: Number(item.price || 0), rating: Number(item.rating || 0) })),
      });
    } catch (error) { return next(error); }
  });

  router.get('/my-service-profile', protect, requireSeller, async (req, res, next) => {
    try {
      const profile = await get(db, 'SELECT * FROM service_provider_profiles WHERE user_id = ?', [req.user.id]);
      return res.json({ success: true, profile: profile ? { ...profile, skills: parseList(profile.skills), languages: parseList(profile.languages), credentials: parseList(profile.credentials) } : null });
    } catch (error) { return next(error); }
  });

  router.put('/my-service-profile', protect, requireSeller, validateServiceProviderProfile, async (req, res, next) => {
    try {
      const profile = req.body;
      await run(db, `
        INSERT INTO service_provider_profiles (user_id, headline, introduction, experience_summary, skills, languages, credentials, availability, response_time, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET headline = excluded.headline, introduction = excluded.introduction,
          experience_summary = excluded.experience_summary, skills = excluded.skills, languages = excluded.languages,
          credentials = excluded.credentials, availability = excluded.availability, response_time = excluded.response_time,
          updated_at = CURRENT_TIMESTAMP
      `, [req.user.id, profile.headline, profile.introduction, profile.experience_summary, JSON.stringify(profile.skills), JSON.stringify(profile.languages), JSON.stringify(profile.credentials), profile.availability, profile.response_time]);
      const saved = await get(db, 'SELECT * FROM service_provider_profiles WHERE user_id = ?', [req.user.id]);
      return res.json({ success: true, profile: { ...saved, skills: parseList(saved.skills), languages: parseList(saved.languages), credentials: parseList(saved.credentials) } });
    } catch (error) { return next(error); }
  });

  router.get('/my-service-payout-profile', protect, requireSeller, async (req, res, next) => {
    try {
      const profile = await get(db, `SELECT account_holder, payout_method, bank_name, rib, payout_phone, updated_at
        FROM service_provider_payout_profiles WHERE user_id = ?`, [req.user.id]);
      return res.json({ success: true, profile: profile || null });
    } catch (error) { return next(error); }
  });

  router.put('/my-service-payout-profile', protect, requireSeller, validateServicePayoutProfile, async (req, res, next) => {
    try {
      await run(db, `INSERT INTO service_provider_payout_profiles
        (user_id, account_holder, payout_method, bank_name, rib, payout_phone, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET account_holder = excluded.account_holder,
          payout_method = excluded.payout_method, bank_name = excluded.bank_name, rib = excluded.rib,
          payout_phone = excluded.payout_phone, updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, req.body.account_holder, req.body.payout_method, req.body.bank_name, req.body.rib, req.body.payout_phone]);
      await auditService?.recordFromRequest(req, { action: 'finance.service_payout_profile_updated', resourceType: 'service_provider_payout_profile', resourceId: req.user.id });
      return res.json({ success: true, message: 'Private service payout profile saved.' });
    } catch (error) { return next(error); }
  });

  router.post('/services', protect, requireSeller, validateServiceCreate, async (req, res, next) => {
    try {
      const { title, description, price, old_price, category, delivery_time, revisions, image, deliverables, client_requirements, media = [] } = req.body;
      const serviceId = await withTransaction(db, async (transaction) => {
        const profile = await get(transaction, 'SELECT availability FROM service_provider_profiles WHERE user_id = ?', [req.user.id]);
        if (!profile) {
          const error = new Error('Complete your professional profile before publishing a service.');
          error.statusCode = 409;
          throw error;
        }
        if (profile.availability === 'unavailable') {
          const error = new Error('Set your professional profile to available before publishing a service.');
          error.statusCode = 409;
          throw error;
        }
        const created = await run(transaction, `INSERT INTO services (title, description, price, old_price, category, delivery_time, revisions, image, deliverables, client_requirements, provider_id, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
        [title, description, price, old_price || null, category, delivery_time || '', revisions || 0, image || '', serializeList(deliverables), serializeList(client_requirements), req.user.id]);
        for (let index = 0; index < media.length; index += 1) {
          const item = media[index];
          await run(transaction, 'INSERT INTO service_media (service_id, media_type, media_url, display_order, is_primary) VALUES (?, ?, ?, ?, ?)',
            [created.lastID, item.type, item.url, index, index === 0]);
        }
        return created.lastID;
      });
      return res.status(201).json({ success: true, service: { id: serviceId, ...req.body } });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      return next(error);
    }
  });

  router.post('/services/:serviceId/packages', protect, requireSeller, validateIdParams('serviceId'), validatePackageCreate, async (req, res, next) => {
    try {
      const packageId = await withTransaction(db, async (transaction) => {
        const service = await get(transaction, 'SELECT id, provider_id FROM services WHERE id = ?', [req.params.serviceId]);
        if (!service) {
          const error = new Error('Service not found.');
          error.statusCode = 404;
          throw error;
        }
        if (Number(service.provider_id) !== Number(req.user.id)) {
          const error = new Error('You can only manage your own service packages.');
          error.statusCode = 403;
          throw error;
        }
        const created = await run(transaction, `
          INSERT INTO service_packages (service_id, name, price, delivery_time, revisions, features)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [service.id, req.body.name, req.body.price, req.body.delivery_time || '', req.body.revisions || 0, req.body.features || '']);
        return created.lastID;
      });
      return res.status(201).json({ success: true, package: { id: packageId } });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      return next(error);
    }
  });

  router.put('/services/:serviceId/packages/:packageId', protect, requireSeller, validateIdParams('serviceId', 'packageId'), validatePackageUpdate, async (req, res, next) => {
    try {
      await withTransaction(db, async (transaction) => {
        const service = await get(transaction, 'SELECT id, provider_id FROM services WHERE id = ?', [req.params.serviceId]);
        if (!service) {
          const error = new Error('Service not found.');
          error.statusCode = 404;
          throw error;
        }
        if (Number(service.provider_id) !== Number(req.user.id)) {
          const error = new Error('You can only manage your own service packages.');
          error.statusCode = 403;
          throw error;
        }
        const result = await run(transaction, `
          UPDATE service_packages
          SET name = COALESCE(?, name), price = COALESCE(?, price), delivery_time = COALESCE(?, delivery_time),
              revisions = COALESCE(?, revisions), features = COALESCE(?, features)
          WHERE id = ? AND service_id = ?
        `, [req.body.name, req.body.price, req.body.delivery_time, req.body.revisions, req.body.features, req.params.packageId, service.id]);
        if (!result.changes) {
          const error = new Error('Service package not found.');
          error.statusCode = 404;
          throw error;
        }
      });
      return res.json({ success: true, message: 'Service package updated.' });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      return next(error);
    }
  });

  router.delete('/services/:serviceId/packages/:packageId', protect, requireSeller, validateIdParams('serviceId', 'packageId'), async (req, res, next) => {
    try {
      await withTransaction(db, async (transaction) => {
        const service = await get(transaction, 'SELECT id, provider_id FROM services WHERE id = ?', [req.params.serviceId]);
        if (!service) {
          const error = new Error('Service not found.');
          error.statusCode = 404;
          throw error;
        }
        if (Number(service.provider_id) !== Number(req.user.id)) {
          const error = new Error('You can only manage your own service packages.');
          error.statusCode = 403;
          throw error;
        }
        const result = await run(transaction, 'DELETE FROM service_packages WHERE id = ? AND service_id = ?', [req.params.packageId, service.id]);
        if (!result.changes) {
          const error = new Error('Service package not found.');
          error.statusCode = 404;
          throw error;
        }
      });
      return res.json({ success: true, message: 'Service package removed.' });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      return next(error);
    }
  });

  router.get('/my-services', protect, requireSeller, async (req, res, next) => {
    try {
      const rows = await all(db, `SELECT s.*, (SELECT COUNT(*) FROM service_orders so WHERE so.service_id = s.id) AS orders_count,
        (SELECT COUNT(*) FROM service_reviews sr WHERE sr.service_id = s.id) AS reviews_count FROM services s WHERE s.provider_id = ? ORDER BY s.created_at DESC`, [req.user.id]);
      const services = await Promise.all(rows.map((service) => attachMedia(db, service)));
      return res.json({ success: true, services: services.map((service) => publicService({ ...service, provider_id: req.user.id, provider_name: req.user.name })) });
    } catch (error) { return next(error); }
  });

  router.put('/services/:id', protect, requireSeller, validateIdParams('id'), validateServiceUpdate, async (req, res, next) => {
    try {
      await withTransaction(db, async (transaction) => {
        const service = await get(transaction, 'SELECT * FROM services WHERE id = ? AND provider_id = ?', [req.params.id, req.user.id]);
        if (!service) {
          const error = new Error('Service not found.');
          error.statusCode = 404;
          throw error;
        }
        const values = { ...service, ...req.body };
        await run(transaction, 'UPDATE services SET title = ?, description = ?, price = ?, old_price = ?, category = ?, delivery_time = ?, revisions = ?, image = ?, deliverables = ?, client_requirements = ? WHERE id = ?',
          [values.title, values.description, values.price, values.old_price || null, values.category, values.delivery_time || '', values.revisions || 0, values.image || '', serializeList(values.deliverables), serializeList(values.client_requirements), service.id]);
        if (req.body.media) {
          await run(transaction, 'DELETE FROM service_media WHERE service_id = ?', [service.id]);
          for (let index = 0; index < req.body.media.length; index += 1) {
            const item = req.body.media[index];
            await run(transaction, 'INSERT INTO service_media (service_id, media_type, media_url, display_order, is_primary) VALUES (?, ?, ?, ?, ?)', [service.id, item.type, item.url, index, index === 0]);
          }
        }
      });
      return res.json({ success: true, message: 'Service updated.' });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      return next(error);
    }
  });

  router.delete('/services/:id', protect, requireSeller, validateIdParams('id'), async (req, res, next) => {
    try {
      const result = await run(db, "UPDATE services SET status = 'ended' WHERE id = ? AND provider_id = ? AND status <> 'ended'", [req.params.id, req.user.id]);
      if (!result.changes) return res.status(404).json({ error: 'Active service not found.' });
      return res.json({ success: true, message: 'Service ended. Existing client requests remain available to participants.' });
    } catch (error) { return next(error); }
  });

  router.post('/services/:id/requests', protect, validateIdParams('id'), validateServiceRequestCreate, async (req, res, next) => {
    try {
      const result = await withTransaction(db, async (transaction) => {
        const service = await get(transaction, `
          SELECT s.id, s.title, s.provider_id, s.price, p.availability AS provider_availability
          FROM services s
          LEFT JOIN service_provider_profiles p ON p.user_id = s.provider_id
          WHERE s.id = ? AND s.status = 'published'
        `, [req.params.id]);
        if (!service) {
          const error = new Error('Service not found.');
          error.statusCode = 404;
          throw error;
        }
        if (service.provider_availability === 'unavailable') {
          const error = new Error('This provider is not accepting new service requests right now.');
          error.statusCode = 409;
          throw error;
        }
        if (Number(service.provider_id) === Number(req.user.id)) {
          const error = new Error('You cannot request your own service.');
          error.statusCode = 400;
          throw error;
        }
        const existing = await get(transaction, `
          SELECT id FROM service_orders
          WHERE service_id = ? AND buyer_id = ? AND status IN ('requested', 'accepted', 'in_progress', 'submitted', 'revision_requested')
          LIMIT 1
        `, [service.id, req.user.id]);
        if (existing) {
          const error = new Error('You already have an active request for this service. Follow it from your service requests page.');
          error.statusCode = 409;
          throw error;
        }
        const selectedPackage = req.body.packageId
          ? await get(transaction, 'SELECT id, name, price FROM service_packages WHERE id = ? AND service_id = ?', [req.body.packageId, service.id])
          : null;
        if (req.body.packageId && !selectedPackage) {
          const error = new Error('The selected package is not available for this service.');
          error.statusCode = 404;
          throw error;
        }
        const created = await run(transaction, `
          INSERT INTO service_orders (order_number, service_id, buyer_id, provider_id, package_id, package_name, price, requirements, status, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'requested', CURRENT_TIMESTAMP)
        `, [requestNumber(), service.id, req.user.id, service.provider_id, selectedPackage?.id || null, selectedPackage?.name || 'Standard service', Number(selectedPackage?.price ?? service.price), req.body.requirements]);
        await recordStatus(transaction, created.lastID, req.user.id, null, 'requested', 'Client request created.');
        return { service, requestId: created.lastID };
      });
      notify({ userId: result.service.provider_id, kind: 'service.requested', title: 'New service request', body: `${req.user.name} requested ${result.service.title}.`, href: '/seller/dashboard/services', metadata: { serviceOrderId: result.requestId } });
      return res.status(201).json({ success: true, request: serializeOrder(await readOrder(db, result.requestId)) });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      return next(error);
    }
  });

  router.get('/my-service-requests', protect, async (req, res, next) => {
    try {
      const rows = await all(db, 'SELECT id FROM service_orders WHERE buyer_id = ? ORDER BY updated_at DESC, id DESC', [req.user.id]);
      const requests = await Promise.all(rows.map(async (row) => serializeOrder(await readOrder(db, row.id))));
      return res.json({ success: true, requests });
    } catch (error) { return next(error); }
  });

  router.get('/my-service-orders', protect, requireSeller, async (req, res, next) => {
    try {
      const rows = await all(db, 'SELECT id FROM service_orders WHERE provider_id = ? ORDER BY updated_at DESC, id DESC', [req.user.id]);
      const orders = await Promise.all(rows.map(async (row) => serializeOrder(await readOrder(db, row.id))));
      return res.json({ success: true, orders });
    } catch (error) { return next(error); }
  });

  router.get('/service-orders/:id/workroom', protect, validateIdParams('id'), async (req, res, next) => {
    try {
      const order = await readOrder(db, req.params.id);
      if (!order) return res.status(404).json({ error: 'Service project not found.' });
      const role = getParticipantRole(order, req.user.id);
      if (!role) return res.status(403).json({ error: 'You do not have access to this private project workspace.' });
      const [entries, history, dispute] = await Promise.all([
        all(db, `SELECT e.id, e.entry_type, e.body, e.delivery_url, e.created_at, e.author_id,
          u.name AS author_name, u."profilePicture" AS author_picture
          FROM service_workroom_entries e JOIN users u ON u.id = e.author_id
          WHERE e.service_order_id = ? ORDER BY e.created_at ASC, e.id ASC`, [order.id]),
        all(db, `SELECT h.id, h.from_status, h.to_status, h.note, h.created_at, h.actor_id,
          u.name AS actor_name FROM service_order_status_history h
          LEFT JOIN users u ON u.id = h.actor_id
          WHERE h.service_order_id = ? ORDER BY h.created_at ASC, h.id ASC`, [order.id]),
        get(db, 'SELECT * FROM service_disputes WHERE service_order_id = ?', [order.id]),
      ]);
      return res.json({ success: true, workroom: {
        project: serializeOrder(order), role,
        entries: entries.map((entry) => ({ ...entry, id: Number(entry.id), author_id: Number(entry.author_id) })),
        history: history.map((entry) => ({ ...entry, id: Number(entry.id), actor_id: entry.actor_id ? Number(entry.actor_id) : null })),
        dispute: dispute ? await presentDispute(db, dispute) : null,
      } });
    } catch (error) { return next(error); }
  });

  router.post('/service-orders/:id/workroom/entries', protect, validateIdParams('id'), validateServiceWorkroomEntry, async (req, res, next) => {
    try {
      const changed = await withTransaction(db, async (transaction) => {
        const order = await readOrder(transaction, req.params.id);
        if (!order) { const error = new Error('Service project not found.'); error.statusCode = 404; throw error; }
        const role = getParticipantRole(order, req.user.id);
        if (!role) { const error = new Error('You do not have access to this private project workspace.'); error.statusCode = 403; throw error; }
        if (!isActiveWorkroomStatus(order.status)) { const error = new Error('This project is closed and no longer accepts workspace updates.'); error.statusCode = 409; throw error; }
        if (await openDisputeForOrder(transaction, order.id)) { const error = new Error('This project is paused while rifKANDO reviews an open dispute.'); error.statusCode = 409; throw error; }
        const { type, body, delivery_url: deliveryUrl } = req.body;
        if (type === 'delivery' && (role !== 'provider' || order.status !== 'in_progress')) {
          const error = new Error('Only the provider can submit a delivery while work is in progress.'); error.statusCode = 409; throw error;
        }
        if (type === 'revision' && (role !== 'buyer' || order.status !== 'submitted')) {
          const error = new Error('Only the client can request a revision after work is submitted.'); error.statusCode = 409; throw error;
        }
        const created = await run(transaction, `INSERT INTO service_workroom_entries
          (service_order_id, author_id, entry_type, body, delivery_url) VALUES (?, ?, ?, ?, ?)`,
        [order.id, req.user.id, type, body, deliveryUrl || null]);
        let nextStatus = null;
        const recipientId = role === 'provider' ? order.buyer_id : order.provider_id;
        if (type === 'delivery') {
          nextStatus = 'submitted';
          const update = await run(transaction, `UPDATE service_orders SET status = 'submitted', provider_note = ?,
            updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'in_progress'`, [body, order.id]);
          if (!update.changes) { const error = new Error('This project changed. Refresh and try again.'); error.statusCode = 409; throw error; }
          await recordStatus(transaction, order.id, req.user.id, order.status, nextStatus, body);
        } else if (type === 'revision') {
          nextStatus = 'revision_requested';
          const update = await run(transaction, `UPDATE service_orders SET status = 'revision_requested', buyer_note = ?,
            updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'submitted'`, [body, order.id]);
          if (!update.changes) { const error = new Error('This project changed. Refresh and try again.'); error.statusCode = 409; throw error; }
          await recordStatus(transaction, order.id, req.user.id, order.status, nextStatus, body);
        }
        return { order, role, recipientId, entryId: created.lastID, nextStatus };
      });
      const verb = changed.nextStatus === 'submitted' ? 'delivered work for review' : changed.nextStatus === 'revision_requested' ? 'requested a revision' : 'added a project message';
      notify({ userId: changed.recipientId, kind: `service.workroom.${changed.nextStatus || 'message'}`,
        title: 'Service workroom update', body: `${req.user.name} ${verb} on “${changed.order.service_title}”.`,
        href: `/service-workroom/${changed.order.id}`, metadata: { serviceOrderId: changed.order.id, entryId: changed.entryId } });
      return res.status(201).json({ success: true, entry: { id: Number(changed.entryId) }, status: changed.nextStatus || changed.order.status });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      return next(error);
    }
  });

  router.patch('/service-orders/:id/status', protect, validateIdParams('id'), validateServiceOrderAction, async (req, res, next) => {
    try {
      const changed = await withTransaction(db, async (transaction) => {
        const order = await readOrder(transaction, req.params.id);
        if (!order) {
          const error = new Error('Service request not found.');
          error.statusCode = 404;
          throw error;
        }
        const isProvider = Number(order.provider_id) === Number(req.user.id);
        const isBuyer = Number(order.buyer_id) === Number(req.user.id);
        const transitions = isProvider ? providerTransitions : isBuyer ? buyerTransitions : {};
        const nextStatus = transitions[order.status]?.[req.body.action];
        if (!nextStatus) {
          const error = new Error('This action is not available for the current request status.');
          error.statusCode = 409;
          throw error;
        }
        const payment = await paymentForOrder(transaction, order.id);
        if (await openDisputeForOrder(transaction, order.id)) {
          const error = new Error('This project is paused while rifKANDO reviews an open dispute.'); error.statusCode = 409; throw error;
        }
        if (isProvider && req.body.action === 'start' && payment?.payment_status !== 'verified') {
          const error = new Error('Work can start after rifKANDO verifies the client bank transfer.');
          error.statusCode = 409;
          throw error;
        }
        if (isBuyer && req.body.action === 'cancel' && ['submitted', 'verified'].includes(payment?.payment_status)) {
          const error = new Error('Contact rifKANDO support to cancel a request after a bank transfer was submitted.');
          error.statusCode = 409;
          throw error;
        }
        const noteColumn = isProvider ? 'provider_note' : 'buyer_note';
        const update = await run(transaction, `UPDATE service_orders SET status = ?, ${noteColumn} = ?, updated_at = CURRENT_TIMESTAMP,
          completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE id = ? AND status = ?`,
        [nextStatus, req.body.note, nextStatus, order.id, order.status]);
        if (!update.changes) {
          const error = new Error('This request changed. Refresh and try again.');
          error.statusCode = 409;
          throw error;
        }
        await recordStatus(transaction, order.id, req.user.id, order.status, nextStatus, req.body.note);
        if (nextStatus === 'accepted') {
          // Create the financial-control item at acceptance, not when the
          // buyer later opens the instructions. That gives the founder an
          // immediate, complete queue of pending service payments.
          assertTransferConfigured();
          const amounts = transferAmountsForOrder(order);
          await run(transaction, `INSERT INTO service_payment_transfers
            (service_order_id, buyer_id, provider_id, amount_minor, commission_minor, provider_payout_minor)
            VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(service_order_id) DO NOTHING`,
          [order.id, order.buyer_id, order.provider_id, amounts.amountMinor, amounts.commissionMinor, amounts.providerPayoutMinor]);
        }
        if (nextStatus === 'completed' && payment?.payment_status === 'verified') {
          await run(transaction, `UPDATE service_payment_transfers SET payout_status = 'due', updated_at = CURRENT_TIMESTAMP
            WHERE service_order_id = ? AND payment_status = 'verified' AND payout_status = 'not_due'`, [order.id]);
        }
        return { order, nextStatus, recipientId: isProvider ? order.buyer_id : order.provider_id, isProvider };
      });
      notify({ userId: changed.recipientId, kind: `service.${changed.nextStatus}`, title: 'Service request updated', body: `${req.user.name} marked “${changed.order.service_title}” as ${changed.nextStatus.replaceAll('_', ' ')}.`, href: changed.isProvider ? '/service-requests' : '/seller/dashboard/services', metadata: { serviceOrderId: changed.order.id } });
      return res.json({ success: true, request: serializeOrder(await readOrder(db, changed.order.id)) });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      return next(error);
    }
  });

  router.post('/service-orders/:id/disputes', protect, validateIdParams('id'), validateServiceDispute, async (req, res, next) => {
    try {
      const dispute = await withTransaction(db, async (transaction) => {
        const order = await readOrder(transaction, req.params.id);
        if (!order || Number(order.buyer_id) !== Number(req.user.id)) { const error = new Error('Service request not found.'); error.statusCode = 404; throw error; }
        const payment = await paymentForOrder(transaction, order.id);
        if (!payment || payment.payment_status !== 'verified') { const error = new Error('A dispute can be opened after rifKANDO verifies the service payment.'); error.statusCode = 409; throw error; }
        if (!['in_progress', 'submitted', 'revision_requested', 'completed'].includes(order.status)) { const error = new Error('This service request is not eligible for a dispute at its current stage.'); error.statusCode = 409; throw error; }
        if (payment.payout_status === 'paid') { const error = new Error('Contact rifKANDO support with the payout reference for a completed settlement.'); error.statusCode = 409; throw error; }
        const existing = await get(transaction, 'SELECT id FROM service_disputes WHERE service_order_id = ?', [order.id]);
        if (existing) { const error = new Error('A dispute already exists for this service request.'); error.statusCode = 409; throw error; }
        const created = await run(transaction, `INSERT INTO service_disputes (service_order_id, buyer_id, provider_id, reason, description)
          VALUES (?, ?, ?, ?, ?)`, [order.id, order.buyer_id, order.provider_id, req.body.reason, req.body.description]);
        await run(transaction, 'INSERT INTO service_dispute_events (dispute_id, actor_id, event_type, body) VALUES (?, ?, ?, ?)', [created.lastID, req.user.id, 'opened', req.body.description]);
        await run(transaction, `UPDATE service_payment_transfers SET payout_status = 'withheld', updated_at = CURRENT_TIMESTAMP
          WHERE service_order_id = ? AND payment_status = 'verified' AND payout_status IN ('not_due', 'due')`, [order.id]);
        return get(transaction, 'SELECT * FROM service_disputes WHERE id = ?', [created.lastID]);
      });
      await auditService?.recordFromRequest(req, { action: 'marketplace.service_dispute_opened', resourceType: 'service_dispute', resourceId: dispute.id, metadata: { serviceOrderId: dispute.service_order_id, reason: dispute.reason } });
      notify({ userId: dispute.provider_id, kind: 'service.dispute_opened', title: 'Service dispute opened', body: 'The client opened a dispute. Project actions and payout are paused while rifKANDO reviews it.', href: '/seller/dashboard/services', metadata: { serviceOrderId: dispute.service_order_id, disputeId: dispute.id } });
      await notifyServiceFinance({ kind: 'service.dispute_opened', title: 'Service dispute needs review', body: 'A client opened a service dispute. Work and payout are paused until you resolve it.', href: '/admin/service-reconciliation', metadata: { serviceOrderId: dispute.service_order_id, disputeId: dispute.id } });
      return res.status(201).json({ success: true, dispute: await presentDispute(db, dispute) });
    } catch (error) { if (error.statusCode) return res.status(error.statusCode).json({ error: error.message }); return next(error); }
  });

  router.post('/service-orders/:id/review', protect, validateIdParams('id'), validateServiceReview, async (req, res, next) => {
    try {
      const order = await withTransaction(db, async (transaction) => {
        const current = await readOrder(transaction, req.params.id);
        if (!current || Number(current.buyer_id) !== Number(req.user.id)) {
          const error = new Error('Completed service request not found.');
          error.statusCode = 404;
          throw error;
        }
        if (current.status !== 'completed') {
          const error = new Error('A review is available after the service is completed.');
          error.statusCode = 409;
          throw error;
        }
        if (current.review_rating) {
          const error = new Error('You have already reviewed this service request.');
          error.statusCode = 409;
          throw error;
        }
        await run(transaction, 'INSERT INTO service_reviews (service_order_id, service_id, buyer_id, provider_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)',
          [current.id, current.service_id, current.buyer_id, current.provider_id, req.body.rating, req.body.comment]);
        await run(transaction, 'UPDATE services SET rating = COALESCE((SELECT AVG(rating) FROM service_reviews WHERE service_id = ?), 0) WHERE id = ?', [current.service_id, current.service_id]);
        return current;
      });
      notify({ userId: order.provider_id, kind: 'service.reviewed', title: 'New client review', body: `${req.user.name} reviewed “${order.service_title}”.`, href: '/seller/dashboard/services', metadata: { serviceOrderId: order.id } });
      return res.status(201).json({ success: true, message: 'Your review was published.' });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      return next(error);
    }
  });

  return router;
};

module.exports = createServiceRoutes;
