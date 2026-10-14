const crypto = require('node:crypto');
const express = require('express');
const { all, get, run, withTransaction } = require('../services/bookingProtocolService');
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
  validateServiceWorkroomEntry,
  validateServiceReview,
  validatePackageCreate,
  validatePackageUpdate,
  notificationService,
}) => {
  const router = express.Router();
  const notify = (payload) => notificationService?.create(payload).catch((error) => {
    console.error(JSON.stringify({ level: 'error', event: 'service_notification_failed', error: error.message }));
  });
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

  router.get('/service-orders/:id/workroom', protect, validateIdParams('id'), async (req, res, next) => {
    try {
      const order = await readOrder(db, req.params.id);
      if (!order) return res.status(404).json({ error: 'Service project not found.' });
      const role = getParticipantRole(order, req.user.id);
      if (!role) return res.status(403).json({ error: 'You do not have access to this private project workspace.' });
      const [entries, history] = await Promise.all([
        all(db, `SELECT e.id, e.entry_type, e.body, e.delivery_url, e.created_at, e.author_id,
          u.name AS author_name, u."profilePicture" AS author_picture
          FROM service_workroom_entries e JOIN users u ON u.id = e.author_id
          WHERE e.service_order_id = ? ORDER BY e.created_at ASC, e.id ASC`, [order.id]),
        all(db, `SELECT h.id, h.from_status, h.to_status, h.note, h.created_at, h.actor_id,
          u.name AS actor_name FROM service_order_status_history h
          LEFT JOIN users u ON u.id = h.actor_id
          WHERE h.service_order_id = ? ORDER BY h.created_at ASC, h.id ASC`, [order.id]),
      ]);
      return res.json({ success: true, workroom: {
        project: serializeOrder(order), role,
        entries: entries.map((entry) => ({ ...entry, id: Number(entry.id), author_id: Number(entry.author_id) })),
        history: history.map((entry) => ({ ...entry, id: Number(entry.id), actor_id: entry.actor_id ? Number(entry.actor_id) : null })),
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
        return { order, nextStatus, recipientId: isProvider ? order.buyer_id : order.provider_id, isProvider };
      });
      notify({ userId: changed.recipientId, kind: `service.${changed.nextStatus}`, title: 'Service request updated', body: `${req.user.name} marked “${changed.order.service_title}” as ${changed.nextStatus.replaceAll('_', ' ')}.`, href: changed.isProvider ? '/service-requests' : '/seller/dashboard/services', metadata: { serviceOrderId: changed.order.id } });
      return res.json({ success: true, request: serializeOrder(await readOrder(db, changed.order.id)) });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      return next(error);
    }
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
