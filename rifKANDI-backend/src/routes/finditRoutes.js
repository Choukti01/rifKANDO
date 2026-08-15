const crypto = require('node:crypto');
const express = require('express');
const Money = require('../services/moneyService');
const WalletService = require('../services/walletService');
const { calculateCommissionMinor } = require('../services/commissionPolicyService');
const { all, get, run } = require('../services/bookingProtocolService');
const { createPaginationMetadata, getPagination } = require('../utils/pagination');

class FindItError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const requestNumber = () => {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `FIND-${stamp}-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
};

const orderNumber = () => {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `RIF-FIND-${stamp}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
};

const minorFromRow = (row, minorColumn, decimalColumn) => {
  const minor = Number(row?.[minorColumn]);
  if (Number.isSafeInteger(minor) && minor >= 0) return minor;
  return Money.toMinor(Number(row?.[decimalColumn] || 0), { allowZero: true });
};

const effectiveStatus = (request, now = Date.now()) => {
  if (request.status === 'active' && Date.parse(request.expires_at) <= now) return 'expired';
  return request.status;
};

const safeRequest = (request) => ({
  id: request.id,
  request_number: request.request_number,
  title: request.title,
  description: request.description,
  category: request.category,
  city: request.city,
  preferred_condition: request.preferred_condition,
  budget_max: Number(request.budget_max || 0),
  budget_max_minor: minorFromRow(request, 'budget_max_minor', 'budget_max'),
  status: effectiveStatus(request),
  expires_at: request.expires_at,
  created_at: request.created_at,
  offer_count: Number(request.offer_count || 0),
  media: request.media || [],
});

const safeOfferForBuyer = (offer) => ({
  id: offer.id,
  request_id: offer.request_id,
  title: offer.title,
  description: offer.description,
  price: Number(offer.price),
  price_minor: minorFromRow(offer, 'price_minor', 'price'),
  delivery_fee: Number(offer.delivery_fee || 0),
  delivery_fee_minor: minorFromRow(offer, 'delivery_fee_minor', 'delivery_fee'),
  condition: offer.condition,
  estimated_delivery_days: Number(offer.estimated_delivery_days),
  status: offer.status,
  created_at: offer.created_at,
  updated_at: offer.updated_at,
  seller: {
    id: offer.seller_id,
    name: offer.seller_name,
    profile_picture: offer.seller_profile_picture || '',
  },
});

const safeOfferForSeller = (offer) => ({
  id: offer.id,
  request_id: offer.request_id,
  title: offer.title,
  description: offer.description,
  price: Number(offer.price),
  price_minor: minorFromRow(offer, 'price_minor', 'price'),
  delivery_fee: Number(offer.delivery_fee || 0),
  delivery_fee_minor: minorFromRow(offer, 'delivery_fee_minor', 'delivery_fee'),
  condition: offer.condition,
  estimated_delivery_days: Number(offer.estimated_delivery_days),
  status: offer.status,
  created_at: offer.created_at,
  updated_at: offer.updated_at,
  request: {
    id: offer.request_id,
    request_number: offer.request_number,
    title: offer.request_title,
    category: offer.request_category,
    city: offer.request_city,
    status: effectiveStatus({ status: offer.request_status, expires_at: offer.request_expires_at }),
    expires_at: offer.request_expires_at,
  },
});

const createFindItRoutes = ({
  db,
  protect,
  requireSeller,
  validateIdParams,
  validateFinditRequestCreate,
  validateFinditOfferCreate,
  validateFinditOfferUpdate,
  validateFinditCheckout,
  auditService,
}) => {
  const router = express.Router();

  const record = async (req, action, resourceType, resourceId, metadata = {}) => {
    if (!auditService) return;
    await auditService.recordFromRequest(req, {
      action,
      resourceType,
      resourceId: String(resourceId),
      metadata,
    });
  };

  const requestMedia = async (database, requestId) => all(database,
    'SELECT media_url, display_order FROM findit_request_media WHERE request_id = ? ORDER BY display_order, id',
    [requestId]
  );

  const attachMedia = async (database, request) => ({
    ...request,
    media: await requestMedia(database, request.id),
  });

  const requestSelect = `
    SELECT r.*,
      (SELECT COUNT(*) FROM findit_offers fo WHERE fo.request_id = r.id AND fo.status = 'active') AS offer_count
    FROM findit_requests r
  `;

  router.get('/findit/requests', async (req, res) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const now = new Date().toISOString();
      const count = await get(db,
        "SELECT COUNT(*) AS total FROM findit_requests WHERE status = 'active' AND expires_at > ?",
        [now]
      );
      const requests = await all(db, `${requestSelect}
        WHERE r.status = 'active' AND r.expires_at > ?
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?`, [now, limit, offset]);
      const results = await Promise.all(requests.map((request) => attachMedia(db, request)));
      res.set('Cache-Control', 'private, max-age=30');
      return res.json({
        success: true,
        requests: results.map(safeRequest),
        pagination: createPaginationMetadata(page, limit, count?.total || 0),
      });
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', event: 'findit_catalog_failed', error: error.message }));
      return res.status(500).json({ error: 'Unable to load FINDit requests.' });
    }
  });

  router.get('/findit/requests/:id', validateIdParams('id'), async (req, res) => {
    try {
      const request = await get(db, `${requestSelect}
        WHERE r.id = ? AND r.status = 'active' AND r.expires_at > ?`,
      [req.params.id, new Date().toISOString()]);
      if (!request) return res.status(404).json({ error: 'FINDit request not found.' });
      return res.json({ success: true, request: safeRequest(await attachMedia(db, request)) });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to load this FINDit request.' });
    }
  });

  router.post('/findit/requests', protect, validateFinditRequestCreate, async (req, res) => {
    try {
      const expiresAt = new Date(Date.now() + (req.body.expires_in_days * 24 * 60 * 60 * 1000)).toISOString();
      const budgetMinor = Money.toMinor(req.body.budget_max, { allowZero: true });
      const request = await WalletService.withFinancialTransaction(async (transaction) => {
        const inserted = await transaction.run(`
          INSERT INTO findit_requests
            (request_number, buyer_id, title, description, category, city, preferred_condition,
             budget_max, budget_max_minor, status, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
        `, [
          requestNumber(), req.user.id, req.body.title, req.body.description, req.body.category,
          req.body.city, req.body.preferred_condition, Money.fromMinor(budgetMinor), budgetMinor, expiresAt,
        ]);
        for (const [index, media] of req.body.media.entries()) {
          await transaction.run(
            'INSERT INTO findit_request_media (request_id, media_url, display_order) VALUES (?, ?, ?)',
            [inserted.lastID, media.url, index]
          );
        }
        return get(transaction, `${requestSelect} WHERE r.id = ?`, [inserted.lastID]);
      });
      const result = safeRequest(await attachMedia(db, request));
      await record(req, 'findit.request_created', 'findit_request', request.id, {
        category: request.category,
        city: request.city,
        expiresAt,
      });
      return res.status(201).json({ success: true, request: result });
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', event: 'findit_request_create_failed', error: error.message }));
      return res.status(500).json({ error: 'Unable to create your FINDit request.' });
    }
  });

  router.get('/findit/my-requests', protect, async (req, res) => {
    try {
      const requests = await all(db, `${requestSelect}
        WHERE r.buyer_id = ? ORDER BY r.created_at DESC`, [req.user.id]);
      const requestIds = requests.map((request) => request.id);
      const offers = requestIds.length === 0 ? [] : await all(db, `
        SELECT fo.*, u.name AS seller_name, u.profilePicture AS seller_profile_picture
        FROM findit_offers fo
        JOIN users u ON u.id = fo.seller_id
        WHERE fo.request_id IN (${requestIds.map(() => '?').join(', ')})
        ORDER BY fo.created_at DESC
      `, requestIds);
      const offersByRequest = new Map();
      for (const offer of offers) {
        const collection = offersByRequest.get(offer.request_id) || [];
        collection.push(safeOfferForBuyer(offer));
        offersByRequest.set(offer.request_id, collection);
      }
      const results = await Promise.all(requests.map(async (request) => ({
        ...safeRequest(await attachMedia(db, request)),
        offers: offersByRequest.get(request.id) || [],
      })));
      return res.json({ success: true, requests: results });
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', event: 'findit_buyer_dashboard_failed', error: error.message }));
      return res.status(500).json({ error: 'Unable to load your FINDit requests.' });
    }
  });

  router.post('/findit/requests/:id/cancel', protect, validateIdParams('id'), async (req, res) => {
    try {
      const result = await run(db, `
        UPDATE findit_requests SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND buyer_id = ? AND status = 'active'
      `, [req.params.id, req.user.id]);
      if (result.changes !== 1) throw new FindItError('This FINDit request is no longer active.', 409);
      await run(db, `
        UPDATE findit_offers SET status = 'withdrawn', updated_at = CURRENT_TIMESTAMP
        WHERE request_id = ? AND status = 'active'
      `, [req.params.id]);
      await record(req, 'findit.request_cancelled', 'findit_request', req.params.id);
      return res.json({ success: true, message: 'FINDit request cancelled.' });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to cancel this FINDit request.' });
    }
  });

  router.post('/findit/requests/:id/offers', protect, requireSeller, validateIdParams('id'), validateFinditOfferCreate, async (req, res) => {
    try {
      const priceMinor = Money.toMinor(req.body.price);
      const deliveryFeeMinor = Money.toMinor(req.body.delivery_fee, { allowZero: true });
      const { offer, request } = await WalletService.withFinancialTransaction(async (transaction) => {
        const request = await get(transaction,
          WalletService.lockForUpdate('SELECT * FROM findit_requests WHERE id = ?'),
          [req.params.id]
        );
        if (!request || request.status !== 'active' || Date.parse(request.expires_at) <= Date.now()) {
          throw new FindItError('This FINDit request is no longer accepting offers.', 409);
        }
        if (Number(request.buyer_id) === Number(req.user.id)) {
          throw new FindItError('You cannot submit an offer to your own request.', 422);
        }
        const existing = await get(transaction,
          WalletService.lockForUpdate('SELECT id FROM findit_offers WHERE request_id = ? AND seller_id = ?'),
          [request.id, req.user.id]
        );
        if (existing) throw new FindItError('You already have an offer on this request. Update or withdraw it from your dashboard.', 409);
        const inserted = await transaction.run(`
          INSERT INTO findit_offers
            (request_id, seller_id, title, description, price, price_minor, delivery_fee,
             delivery_fee_minor, condition, estimated_delivery_days, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `, [
          request.id, req.user.id, req.body.title, req.body.description,
          Money.fromMinor(priceMinor), priceMinor, Money.fromMinor(deliveryFeeMinor), deliveryFeeMinor,
          req.body.condition, req.body.estimated_delivery_days,
        ]);
        const offer = await get(transaction, 'SELECT * FROM findit_offers WHERE id = ?', [inserted.lastID]);
        return { offer, request };
      });
      await record(req, 'findit.offer_created', 'findit_offer', offer.id, { requestId: request.id, priceMinor, deliveryFeeMinor });
      return res.status(201).json({ success: true, offer: safeOfferForSeller({
        ...offer,
        request_number: request.request_number,
        request_title: request.title,
        request_category: request.category,
        request_city: request.city,
        request_status: request.status,
        request_expires_at: request.expires_at,
      }) });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to send your FINDit offer.' });
    }
  });

  router.get('/seller/findit/offers', protect, requireSeller, async (req, res) => {
    try {
      const offers = await all(db, `
        SELECT fo.*, r.request_number, r.title AS request_title, r.category AS request_category,
               r.city AS request_city, r.status AS request_status, r.expires_at AS request_expires_at
        FROM findit_offers fo
        JOIN findit_requests r ON r.id = fo.request_id
        WHERE fo.seller_id = ?
        ORDER BY fo.updated_at DESC, fo.created_at DESC
      `, [req.user.id]);
      return res.json({ success: true, offers: offers.map(safeOfferForSeller) });
    } catch (error) {
      return res.status(500).json({ error: 'Unable to load your FINDit offers.' });
    }
  });

  router.put('/findit/offers/:id', protect, requireSeller, validateIdParams('id'), validateFinditOfferUpdate, async (req, res) => {
    try {
      const { offer, priceMinor, deliveryFeeMinor } = await WalletService.withFinancialTransaction(async (transaction) => {
        const existing = await get(transaction, WalletService.lockForUpdate(`
          SELECT fo.*, r.status AS request_status, r.expires_at AS request_expires_at
          FROM findit_offers fo JOIN findit_requests r ON r.id = fo.request_id
          WHERE fo.id = ? AND fo.seller_id = ?
        `), [req.params.id, req.user.id]);
        if (!existing) throw new FindItError('FINDit offer not found.', 404);
        if (existing.status !== 'active' || effectiveStatus({ status: existing.request_status, expires_at: existing.request_expires_at }) !== 'active') {
          throw new FindItError('This offer can no longer be changed.', 409);
        }
        const next = {
          title: req.body.title ?? existing.title,
          description: req.body.description ?? existing.description,
          price: req.body.price ?? Number(existing.price),
          delivery_fee: req.body.delivery_fee ?? Number(existing.delivery_fee || 0),
          condition: req.body.condition ?? existing.condition,
          estimated_delivery_days: req.body.estimated_delivery_days ?? Number(existing.estimated_delivery_days),
        };
        const priceMinor = Money.toMinor(next.price);
        const deliveryFeeMinor = Money.toMinor(next.delivery_fee, { allowZero: true });
        const updated = await run(transaction, `
          UPDATE findit_offers SET title = ?, description = ?, price = ?, price_minor = ?,
            delivery_fee = ?, delivery_fee_minor = ?, condition = ?, estimated_delivery_days = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND seller_id = ? AND status = 'active'
        `, [
          next.title, next.description, Money.fromMinor(priceMinor), priceMinor,
          Money.fromMinor(deliveryFeeMinor), deliveryFeeMinor, next.condition, next.estimated_delivery_days,
          req.params.id, req.user.id,
        ]);
        if (updated.changes !== 1) throw new FindItError('This offer changed before your update could be saved.', 409);
        const offer = await get(transaction, 'SELECT * FROM findit_offers WHERE id = ?', [req.params.id]);
        return { offer, priceMinor, deliveryFeeMinor };
      });
      await record(req, 'findit.offer_updated', 'findit_offer', offer.id, { priceMinor, deliveryFeeMinor });
      return res.json({ success: true, offer });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to update your FINDit offer.' });
    }
  });

  router.delete('/findit/offers/:id', protect, requireSeller, validateIdParams('id'), async (req, res) => {
    try {
      const result = await run(db, `
        UPDATE findit_offers SET status = 'withdrawn', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND seller_id = ? AND status = 'active'
      `, [req.params.id, req.user.id]);
      if (result.changes !== 1) throw new FindItError('This active FINDit offer was not found.', 404);
      await record(req, 'findit.offer_withdrawn', 'findit_offer', req.params.id);
      return res.json({ success: true, message: 'FINDit offer withdrawn.' });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to withdraw this FINDit offer.' });
    }
  });

  router.post('/findit/offers/:id/checkout', protect, validateIdParams('id'), validateFinditCheckout, async (req, res) => {
    const idempotencyKey = req.get('Idempotency-Key');
    if (!idempotencyKey) return res.status(400).json({ error: 'Idempotency-Key header is required to accept a FINDit offer.' });
    try {
      const safeKey = WalletService.normalizeIdempotencyKey(idempotencyKey, 'Checkout idempotency key');
      const result = await WalletService.withFinancialTransaction(async (transaction) => {
        const existing = await get(transaction, `
          SELECT o.* FROM findit_checkout_requests fc
          JOIN orders o ON o.id = fc.order_id
          WHERE fc.user_id = ? AND fc.idempotency_key = ?
        `, [req.user.id, safeKey]);
        if (existing) return { order: existing, alreadyCreated: true };

        const offer = await get(transaction, WalletService.lockForUpdate(`
          SELECT fo.*, r.buyer_id, r.status AS request_status, r.expires_at AS request_expires_at,
                 r.request_number, r.title AS request_title
          FROM findit_offers fo
          JOIN findit_requests r ON r.id = fo.request_id
          WHERE fo.id = ?
        `), [req.params.id]);
        if (!offer || Number(offer.buyer_id) !== Number(req.user.id)) throw new FindItError('FINDit offer not found.', 404);
        if (offer.status !== 'active' || effectiveStatus({ status: offer.request_status, expires_at: offer.request_expires_at }) !== 'active') {
          throw new FindItError('This FINDit offer is no longer available.', 409);
        }
        if (Number(offer.seller_id) === Number(req.user.id)) throw new FindItError('You cannot accept your own offer.', 422);

        const address = WalletService.sanitizeShippingAddress(req.body.shippingAddress);
        const priceMinor = minorFromRow(offer, 'price_minor', 'price');
        const deliveryFeeMinor = minorFromRow(offer, 'delivery_fee_minor', 'delivery_fee');
        const commissionMinor = calculateCommissionMinor('findit', priceMinor);
        const sellerAmountMinor = priceMinor - commissionMinor;
        const totalMinor = priceMinor + deliveryFeeMinor;
        const number = orderNumber();
        const orderInsert = await transaction.run(`
          INSERT INTO orders
            (order_number, user_id, total, total_minor, order_type, payment_method, payment_status, shipping_address, notes, status)
          VALUES (?, ?, ?, ?, 'findit', 'cash', 'pending', ?, ?, 'pending')
        `, [number, req.user.id, Money.fromMinor(totalMinor), totalMinor, JSON.stringify(address), req.body.notes || '']);
        const orderId = orderInsert.lastID;
        await transaction.run(`
          INSERT INTO findit_orders
            (order_id, request_id, offer_id, seller_id, item_title, item_description, item_condition,
             price, price_minor, delivery_fee, delivery_fee_minor, commission, commission_minor,
             seller_amount, seller_amount_minor)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          orderId, offer.request_id, offer.id, offer.seller_id, offer.title, offer.description, offer.condition,
          Money.fromMinor(priceMinor), priceMinor, Money.fromMinor(deliveryFeeMinor), deliveryFeeMinor,
          Money.fromMinor(commissionMinor), commissionMinor, Money.fromMinor(sellerAmountMinor), sellerAmountMinor,
        ]);
        await transaction.run(
          "INSERT INTO payment_splits (order_id, party_type, party_id, amount, amount_minor, status) VALUES (?, 'seller', ?, ?, ?, 'pending')",
          [orderId, offer.seller_id, Money.fromMinor(sellerAmountMinor), sellerAmountMinor]
        );
        await transaction.run(
          "INSERT INTO payment_splits (order_id, party_type, amount, amount_minor, status) VALUES (?, 'platform', ?, ?, 'pending')",
          [orderId, Money.fromMinor(commissionMinor), commissionMinor]
        );
        if (deliveryFeeMinor > 0) {
          await transaction.run(
            "INSERT INTO payment_splits (order_id, party_type, amount, amount_minor, status) VALUES (?, 'delivery', ?, ?, 'pending')",
            [orderId, Money.fromMinor(deliveryFeeMinor), deliveryFeeMinor]
          );
        }
        const accepted = await transaction.run(
          "UPDATE findit_offers SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'",
          [offer.id]
        );
        if (accepted.changes !== 1) throw new FindItError('This FINDit offer changed before it could be accepted.', 409);
        const requestUpdate = await transaction.run(
          "UPDATE findit_requests SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'",
          [offer.request_id]
        );
        if (requestUpdate.changes !== 1) throw new FindItError('This FINDit request changed before it could be accepted.', 409);
        await transaction.run(
          "UPDATE findit_offers SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE request_id = ? AND id != ? AND status = 'active'",
          [offer.request_id, offer.id]
        );
        await transaction.run(
          "INSERT INTO order_status_history (order_id, status, note, created_by) VALUES (?, 'pending', ?, ?)",
          [orderId, `FINDit offer accepted for ${offer.request_number}`, req.user.id]
        );
        await transaction.run(
          'INSERT INTO findit_checkout_requests (user_id, idempotency_key, order_id) VALUES (?, ?, ?)',
          [req.user.id, safeKey, orderId]
        );
        return {
          alreadyCreated: false,
          order: { id: orderId, order_number: number, total: Money.fromMinor(totalMinor), total_minor: totalMinor, status: 'pending', payment_method: 'cash', payment_status: 'pending' },
          commissionMinor,
        };
      });
      await record(req, 'findit.offer_accepted', 'findit_order', result.order.id, {
        offerId: req.params.id,
        commissionMinor: result.commissionMinor ?? null,
        alreadyCreated: result.alreadyCreated,
      });
      return res.status(result.alreadyCreated ? 200 : 201).json({
        success: true,
        alreadyCreated: result.alreadyCreated,
        order: {
          id: result.order.id,
          orderNumber: result.order.order_number,
          total: Number(result.order.total),
          status: result.order.status,
          paymentMethod: result.order.payment_method,
          paymentStatus: result.order.payment_status,
          type: 'findit',
        },
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to accept this FINDit offer.' });
    }
  });

  return router;
};

module.exports = createFindItRoutes;
