const express = require('express');
const { createPaginationMetadata, getPagination } = require('../utils/pagination');

const createServiceRoutes = ({
  db,
  protect,
  requireSeller,
  validateIdParams,
  validateServiceCreate,
  validateServiceUpdate,
}) => {
  const router = express.Router();

// ==================== SERVICE ENDPOINTS ====================
// (unchanged – kept exactly as in original)
router.post('/services', protect, requireSeller, validateServiceCreate, (req, res) => {
  const { title, description, price, old_price, category, delivery_time, revisions, image, media } = req.body;

  db.run(`
    INSERT INTO services (
      title, description, price, old_price, category, delivery_time, revisions, image, provider_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
  `, [
    title, description, price, old_price || null, category, delivery_time, revisions || 0, image || '🛠️', req.user.id
  ], function(err) {
    if (err) {
      console.error('Service creation error:', err);
      res.status(400).json({ error: err.message });
    } else {
      const serviceId = this.lastID;
      if (media && media.length) {
        let inserted = 0;
        media.forEach((item, idx) => {
          db.run(
            `INSERT INTO service_media (service_id, media_type, media_url, display_order, is_primary)
             VALUES (?, ?, ?, ?, ?)`,
            [serviceId, item.type, item.url, idx, idx === 0 ? 1 : 0],
            (err) => {
              if (err) console.error('Media insert error:', err);
              inserted++;
              if (inserted === media.length) {
                res.json({ success: true, service: { id: serviceId, ...req.body } });
              }
            }
          );
        });
      } else {
        res.json({ success: true, service: { id: serviceId, ...req.body } });
      }
    }
  });
});

router.get('/services', (req, res) => {
  const { page, limit, offset } = getPagination(req.query);

  db.get("SELECT COUNT(*) AS total FROM services WHERE status = 'published'", (countError, countRow) => {
    if (countError) return res.status(500).json({ error: countError.message });

    const pagination = createPaginationMetadata(page, limit, countRow?.total || 0);
    const sendServices = (services) => {
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return res.json({ success: true, services, pagination });
    };

    db.all(`
      SELECT s.*, u.name as provider_name
      FROM services s
      JOIN users u ON s.provider_id = u.id
      WHERE s.status = 'published'
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length) return sendServices([]);

      let completed = 0;
      rows.forEach((service) => {
        db.all(`SELECT * FROM service_media WHERE service_id = ? ORDER BY display_order, id`, [service.id], (mediaError, media) => {
          if (!mediaError) service.media = media || [];
          completed++;
          if (completed === rows.length) sendServices(rows);
        });
      });
    });
  });
});

router.get('/services/:id', (req, res) => {
  db.get(`
    SELECT s.*, u.name as provider_name, u.email as provider_email, u.id as provider_id
    FROM services s
    JOIN users u ON s.provider_id = u.id
    WHERE s.id = ?
  `, [req.params.id], (err, service) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!service) {
      res.status(404).json({ error: 'Service not found' });
    } else {
      db.all(`SELECT * FROM service_packages WHERE service_id = ? ORDER BY price`, [service.id], (err, packages) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          service.packages = packages || [];
          db.all(`SELECT * FROM service_media WHERE service_id = ? ORDER BY display_order, id`, [service.id], (err, media) => {
            if (!err) service.media = media || [];
            res.json({ success: true, service });
          });
        }
      });
    }
  });
});

router.get('/my-services', protect, requireSeller, (req, res) => {
  db.all(`
    SELECT s.*,
      (SELECT COUNT(*) FROM service_orders WHERE service_id = s.id) as orders_count
    FROM services s
    WHERE s.provider_id = ?
    ORDER BY s.created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      if (!rows.length) return res.json({ success: true, services: [] });
      let completed = 0;
      rows.forEach((service) => {
        db.all(`SELECT * FROM service_media WHERE service_id = ? ORDER BY display_order, id`, [service.id], (err, media) => {
          if (!err) service.media = media || [];
          completed++;
          if (completed === rows.length) {
            res.json({ success: true, services: rows });
          }
        });
      });
    }
  });
});

router.put('/services/:id', protect, requireSeller, validateIdParams('id'), validateServiceUpdate, (req, res) => {
  const { title, description, price, old_price, category, delivery_time, revisions, image, media } = req.body;
  const serviceId = req.params.id;

  db.get('SELECT provider_id FROM services WHERE id = ?', [serviceId], (err, service) => {
    if (err || !service) return res.status(404).json({ error: 'Service not found' });
    if (service.provider_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    db.run(`
      UPDATE services SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        old_price = COALESCE(?, old_price),
        category = COALESCE(?, category),
        delivery_time = COALESCE(?, delivery_time),
        revisions = COALESCE(?, revisions),
        image = COALESCE(?, image)
      WHERE id = ?
    `, [title, description, price, old_price, category, delivery_time, revisions, image, serviceId], function(err) {
      if (err) return res.status(400).json({ error: err.message });

      db.run('DELETE FROM service_media WHERE service_id = ?', [serviceId], () => {
        if (media && media.length) {
          media.forEach((item, idx) => {
            db.run(
              `INSERT INTO service_media (service_id, media_type, media_url, display_order, is_primary)
               VALUES (?, ?, ?, ?, ?)`,
              [serviceId, item.type, item.url, idx, idx === 0 ? 1 : 0]
            );
          });
        }
        res.json({ success: true, message: 'Service updated' });
      });
    });
  });
});

router.delete('/services/:id', protect, requireSeller, validateIdParams('id'), (req, res) => {
  db.get('SELECT provider_id FROM services WHERE id = ?', [req.params.id], (err, service) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    if (service.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.run('DELETE FROM services WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        db.run('DELETE FROM service_packages WHERE service_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Service deleted' });
      }
    });
  });
});

router.post('/services/:id/order', protect, (req, res) => {
  const serviceId = req.params.id;
  const { package_name, requirements, price } = req.body;
  const orderNumber = 'SRV-' + Date.now();

  db.get('SELECT provider_id, title FROM services WHERE id = ?', [serviceId], (err, service) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    db.run(`
      INSERT INTO service_orders (order_number, service_id, buyer_id, provider_id, package_name, price, requirements)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [orderNumber, serviceId, req.user.id, service.provider_id, package_name, price, requirements], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        db.run('UPDATE services SET orders_count = orders_count + 1 WHERE id = ?', [serviceId]);
        res.json({
          success: true,
          order: {
            id: this.lastID,
            orderNumber,
            status: 'pending'
          }
        });
      }
    });
  });
});

  return router;
};

module.exports = createServiceRoutes;
