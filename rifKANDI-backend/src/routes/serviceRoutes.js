const crypto = require('node:crypto');
const express = require('express');
const { all, get, run } = require('../services/bookingProtocolService');
const { createPaginationMetadata, getPagination } = require('../utils/pagination');

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
    sr.rating AS review_rating, sr.comment AS review_comment
  FROM service_orders so
  JOIN services s ON s.id = so.service_id
  JOIN users buyer ON buyer.id = so.buyer_id
  JOIN users provider ON provider.id = so.provider_id
  LEFT JOIN service_reviews sr ON sr.service_order_id = so.id
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
  payment_status: 'not_available',
  payment_message: 'Online payment is not available for services yet.',
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
  validateServiceReview,
  notificationService,
}) => {
  const router = express.Router();
  const notify = (payload) => notificationService?.create(payload).catch((error) => {
    console.error(JSON.stringify({ level: 'error', event: 'service_notification_failed', error: error.message }));
  });
  const recordStatus = (orderId, actorId, fromStatus, toStatus, note = '') => run(db, `
    INSERT INTO service_order_status_history (service_order_id, actor_id, from_status, to_status, note)
    VALUES (?, ?, ?, ?, ?)
  `, [orderId, actorId, fromStatus, toStatus, note]);

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

  router.post('/services', protect, requireSeller, validateServiceCreate, async (req, res, next) => {
    try {
      const { title, description, price, old_price, category, delivery_time, revisions, image, deliverables, client_requirements, media = [] } = req.body;
      const created = await run(db, `INSERT INTO services (title, description, price, old_price, category, delivery_time, revisions, image, deliverables, client_requirements, provider_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
      [title, description, price, old_price || null, category, delivery_time || '', revisions || 0, image || '', serializeList(deliverables), serializeList(client_requirements), req.user.id]);
      for (let index = 0; index < media.length; index += 1) {
        const item = media[index];
        await run(db, 'INSERT INTO service_media (service_id, media_type, media_url, display_order, is_primary) VALUES (?, ?, ?, ?, ?)',
          [created.lastID, item.type, item.url, index, index === 0]);
      }
      return res.status(201).json({ success: true, service: { id: created.lastID, ...req.body } });
    } catch (error) { return next(error); }
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
      const service = await get(db, 'SELECT * FROM services WHERE id = ? AND provider_id = ?', [req.params.id, req.user.id]);
      if (!service) return res.status(404).json({ error: 'Service not found.' });
      const values = { ...service, ...req.body };
      await run(db, 'UPDATE services SET title = ?, description = ?, price = ?, old_price = ?, category = ?, delivery_time = ?, revisions = ?, image = ?, deliverables = ?, client_requirements = ? WHERE id = ?',
        [values.title, values.description, values.price, values.old_price || null, values.category, values.delivery_time || '', values.revisions || 0, values.image || '', serializeList(values.deliverables), serializeList(values.client_requirements), service.id]);
      if (req.body.media) {
        await run(db, 'DELETE FROM service_media WHERE service_id = ?', [service.id]);
        for (let index = 0; index < req.body.media.length; index += 1) {
          const item = req.body.media[index];
          await run(db, 'INSERT INTO service_media (service_id, media_type, media_url, display_order, is_primary) VALUES (?, ?, ?, ?, ?)', [service.id, item.type, item.url, index, index === 0]);
        }
      }
      return res.json({ success: true, message: 'Service updated.' });
    } catch (error) { return next(error); }
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
      const service = await get(db, "SELECT id, title, provider_id, price FROM services WHERE id = ? AND status = 'published'", [req.params.id]);
      if (!service) return res.status(404).json({ error: 'Service not found.' });
      if (Number(service.provider_id) === Number(req.user.id)) return res.status(400).json({ error: 'You cannot request your own service.' });
      const selectedPackage = req.body.packageId ? await get(db, 'SELECT id, name, price FROM service_packages WHERE id = ? AND service_id = ?', [req.body.packageId, service.id]) : null;
      if (req.body.packageId && !selectedPackage) return res.status(404).json({ error: 'The selected package is not available for this service.' });
      const created = await run(db, `INSERT INTO service_orders (order_number, service_id, buyer_id, provider_id, package_id, package_name, price, requirements, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'requested', CURRENT_TIMESTAMP)`,
      [requestNumber(), service.id, req.user.id, service.provider_id, selectedPackage?.id || null, selectedPackage?.name || 'Standard service', Number(selectedPackage?.price ?? service.price), req.body.requirements]);
      await recordStatus(created.lastID, req.user.id, null, 'requested', 'Client request created.');
      notify({ userId: service.provider_id, kind: 'service.requested', title: 'New service request', body: `${req.user.name} requested ${service.title}.`, href: '/seller/dashboard/services', metadata: { serviceOrderId: created.lastID } });
      return res.status(201).json({ success: true, request: serializeOrder(await readOrder(db, created.lastID)) });
    } catch (error) { return next(error); }
  });

  router.get('/my-service-requests', protect, async (req, res, next) => {
    try {
      const rows = await all(db, `SELECT so.*, s.title AS service_title, s.category AS service_category,
        buyer.name AS buyer_name, buyer.city AS buyer_city, buyer."profilePicture" AS buyer_picture,
        provider.name AS provider_name, provider.city AS provider_city, provider."profilePicture" AS provider_picture,
        sr.rating AS review_rating, sr.comment AS review_comment FROM service_orders so
        JOIN services s ON s.id = so.service_id JOIN users buyer ON buyer.id = so.buyer_id JOIN users provider ON provider.id = so.provider_id
        LEFT JOIN service_reviews sr ON sr.service_order_id = so.id WHERE so.buyer_id = ? ORDER BY so.updated_at DESC, so.id DESC`, [req.user.id]);
      return res.json({ success: true, requests: rows.map(serializeOrder) });
    } catch (error) { return next(error); }
  });

  router.get('/my-service-orders', protect, requireSeller, async (req, res, next) => {
    try {
      const rows = await all(db, `SELECT so.*, s.title AS service_title, s.category AS service_category,
        buyer.name AS buyer_name, buyer.city AS buyer_city, buyer."profilePicture" AS buyer_picture,
        provider.name AS provider_name, provider.city AS provider_city, provider."profilePicture" AS provider_picture,
        sr.rating AS review_rating, sr.comment AS review_comment FROM service_orders so
        JOIN services s ON s.id = so.service_id JOIN users buyer ON buyer.id = so.buyer_id JOIN users provider ON provider.id = so.provider_id
        LEFT JOIN service_reviews sr ON sr.service_order_id = so.id WHERE so.provider_id = ? ORDER BY so.updated_at DESC, so.id DESC`, [req.user.id]);
      return res.json({ success: true, orders: rows.map(serializeOrder) });
    } catch (error) { return next(error); }
  });

  router.patch('/service-orders/:id/status', protect, validateIdParams('id'), validateServiceOrderAction, async (req, res, next) => {
    try {
      const order = await readOrder(db, req.params.id);
      if (!order) return res.status(404).json({ error: 'Service request not found.' });
      const isProvider = Number(order.provider_id) === Number(req.user.id);
      const isBuyer = Number(order.buyer_id) === Number(req.user.id);
      const transitions = isProvider ? providerTransitions : isBuyer ? buyerTransitions : {};
      const nextStatus = transitions[order.status]?.[req.body.action];
      if (!nextStatus) return res.status(409).json({ error: 'This action is not available for the current request status.' });
      const noteColumn = isProvider ? 'provider_note' : 'buyer_note';
      const result = await run(db, `UPDATE service_orders SET status = ?, ${noteColumn} = ?, updated_at = CURRENT_TIMESTAMP,
        completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE id = ? AND status = ?`,
      [nextStatus, req.body.note, nextStatus, order.id, order.status]);
      if (!result.changes) return res.status(409).json({ error: 'This request changed. Refresh and try again.' });
      await recordStatus(order.id, req.user.id, order.status, nextStatus, req.body.note);
      const recipientId = isProvider ? order.buyer_id : order.provider_id;
      notify({ userId: recipientId, kind: `service.${nextStatus}`, title: 'Service request updated', body: `${req.user.name} marked “${order.service_title}” as ${nextStatus.replaceAll('_', ' ')}.`, href: isProvider ? '/service-requests' : '/seller/dashboard/services', metadata: { serviceOrderId: order.id } });
      return res.json({ success: true, request: serializeOrder(await readOrder(db, order.id)) });
    } catch (error) { return next(error); }
  });

  router.post('/service-orders/:id/review', protect, validateIdParams('id'), validateServiceReview, async (req, res, next) => {
    try {
      const order = await readOrder(db, req.params.id);
      if (!order || Number(order.buyer_id) !== Number(req.user.id)) return res.status(404).json({ error: 'Completed service request not found.' });
      if (order.status !== 'completed') return res.status(409).json({ error: 'A review is available after the service is completed.' });
      if (order.review_rating) return res.status(409).json({ error: 'You have already reviewed this service request.' });
      await run(db, 'INSERT INTO service_reviews (service_order_id, service_id, buyer_id, provider_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)',
        [order.id, order.service_id, order.buyer_id, order.provider_id, req.body.rating, req.body.comment]);
      await run(db, 'UPDATE services SET rating = COALESCE((SELECT AVG(rating) FROM service_reviews WHERE service_id = ?), 0) WHERE id = ?', [order.service_id, order.service_id]);
      notify({ userId: order.provider_id, kind: 'service.reviewed', title: 'New client review', body: `${req.user.name} reviewed “${order.service_title}”.`, href: '/seller/dashboard/services', metadata: { serviceOrderId: order.id } });
      return res.status(201).json({ success: true, message: 'Your review was published.' });
    } catch (error) { return next(error); }
  });

  return router;
};

module.exports = createServiceRoutes;
