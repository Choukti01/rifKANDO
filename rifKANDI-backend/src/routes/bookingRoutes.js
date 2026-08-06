const express = require('express');

const createBookingRoutes = ({
  db,
  protect,
  requireSeller,
  validateIdParams,
  validateBookingCreate,
  validateBookingUpdate,
}) => {
  const router = express.Router();

// ==================== BOOKING ENDPOINTS ====================
// (unchanged – kept exactly as in original)
router.post('/bookings', protect, requireSeller, validateBookingCreate, (req, res) => {
  const { title, description, price, old_price, category, duration, location_type, location, max_participants, available_days, image, media } = req.body;

  db.run(`
    INSERT INTO bookings (
      title, description, price, old_price, category, duration, location_type, location,
      max_participants, available_days, image, provider_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
  `, [
    title, description, price, old_price || null, category, duration || 60, location_type || 'online',
    location || '', max_participants || 1, available_days || '[]', image || '📅', req.user.id
  ], function(err) {
    if (err) {
      console.error('Booking creation error:', err);
      res.status(400).json({ error: err.message });
    } else {
      const bookingId = this.lastID;
      if (media && media.length) {
        let inserted = 0;
        media.forEach((item, idx) => {
          db.run(
            `INSERT INTO booking_media (booking_id, media_type, media_url, display_order, is_primary)
             VALUES (?, ?, ?, ?, ?)`,
            [bookingId, item.type, item.url, idx, idx === 0 ? 1 : 0],
            (err) => {
              if (err) console.error('Media insert error:', err);
              inserted++;
              if (inserted === media.length) {
                res.json({ success: true, booking: { id: bookingId, ...req.body } });
              }
            }
          );
        });
      } else {
        res.json({ success: true, booking: { id: bookingId, ...req.body } });
      }
    }
  });
});

router.get('/bookings', (req, res) => {
  db.all(`
    SELECT b.*, u.name as provider_name, u.id as provider_id
    FROM bookings b
    JOIN users u ON b.provider_id = u.id
    WHERE b.status = 'published'
    ORDER BY b.created_at DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      if (!rows.length) return res.json({ success: true, bookings: [] });
      let completed = 0;
      rows.forEach((booking) => {
        db.all(`SELECT * FROM booking_media WHERE booking_id = ? ORDER BY display_order, id`, [booking.id], (err, media) => {
          if (!err) booking.media = media || [];
          completed++;
          if (completed === rows.length) {
            res.json({ success: true, bookings: rows });
          }
        });
      });
    }
  });
});

router.get('/bookings/:id', (req, res) => {
  db.get(`
    SELECT b.*, u.name as provider_name, u.email as provider_email, u.id as provider_id
    FROM bookings b
    JOIN users u ON b.provider_id = u.id
    WHERE b.id = ?
  `, [req.params.id], (err, booking) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
    } else {
      db.all(`SELECT * FROM booking_media WHERE booking_id = ? ORDER BY display_order, id`, [booking.id], (err, media) => {
        if (!err) booking.media = media || [];
        res.json({ success: true, booking });
      });
    }
  });
});

router.get('/my-bookings', protect, requireSeller, (req, res) => {
  db.all(`
    SELECT b.*,
      (SELECT COUNT(*) FROM appointments WHERE booking_id = b.id) as appointments_count
    FROM bookings b
    WHERE b.provider_id = ?
    ORDER BY b.created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      if (!rows.length) return res.json({ success: true, bookings: [] });
      let completed = 0;
      rows.forEach((booking) => {
        db.all(`SELECT * FROM booking_media WHERE booking_id = ? ORDER BY display_order, id`, [booking.id], (err, media) => {
          if (!err) booking.media = media || [];
          completed++;
          if (completed === rows.length) {
            res.json({ success: true, bookings: rows });
          }
        });
      });
    }
  });
});

router.put('/bookings/:id', protect, requireSeller, validateIdParams('id'), validateBookingUpdate, (req, res) => {
  const { title, description, price, old_price, category, duration, location_type, location, max_participants, available_days, image, media } = req.body;
  const bookingId = req.params.id;

  db.get('SELECT provider_id FROM bookings WHERE id = ?', [bookingId], (err, booking) => {
    if (err || !booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.provider_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    db.run(`
      UPDATE bookings SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        old_price = COALESCE(?, old_price),
        category = COALESCE(?, category),
        duration = COALESCE(?, duration),
        location_type = COALESCE(?, location_type),
        location = COALESCE(?, location),
        max_participants = COALESCE(?, max_participants),
        available_days = COALESCE(?, available_days),
        image = COALESCE(?, image)
      WHERE id = ?
    `, [title, description, price, old_price, category, duration, location_type, location, max_participants, available_days, image, bookingId], function(err) {
      if (err) return res.status(400).json({ error: err.message });

      db.run('DELETE FROM booking_media WHERE booking_id = ?', [bookingId], () => {
        if (media && media.length) {
          media.forEach((item, idx) => {
            db.run(
              `INSERT INTO booking_media (booking_id, media_type, media_url, display_order, is_primary)
               VALUES (?, ?, ?, ?, ?)`,
              [bookingId, item.type, item.url, idx, idx === 0 ? 1 : 0]
            );
          });
        }
        res.json({ success: true, message: 'Booking updated' });
      });
    });
  });
});

router.delete('/bookings/:id', protect, requireSeller, validateIdParams('id'), (req, res) => {
  db.get('SELECT provider_id FROM bookings WHERE id = ?', [req.params.id], (err, booking) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.run('DELETE FROM bookings WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        db.run('DELETE FROM booking_slots WHERE booking_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Booking deleted' });
      }
    });
  });
});

router.post('/bookings/:id/book', protect, (req, res) => {
  const bookingId = req.params.id;
  const { appointment_date, appointment_time, notes } = req.body;
  const bookingNumber = 'BKG-' + Date.now();

  db.get('SELECT * FROM bookings WHERE id = ?', [bookingId], (err, booking) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    db.run(`
      INSERT INTO appointments (booking_number, booking_id, client_id, provider_id, appointment_date, appointment_time, duration, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [bookingNumber, bookingId, req.user.id, booking.provider_id, appointment_date, appointment_time, booking.duration, notes || ''], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        db.run('UPDATE bookings SET bookings_count = bookings_count + 1 WHERE id = ?', [bookingId]);
        res.json({
          success: true,
          appointment: {
            id: this.lastID,
            bookingNumber,
            status: 'pending'
          }
        });
      }
    });
  });
});

router.get('/my-appointments', protect, (req, res) => {
  db.all(`
    SELECT a.*, b.title, b.image, b.duration, u.name as provider_name
    FROM appointments a
    JOIN bookings b ON a.booking_id = b.id
    JOIN users u ON a.provider_id = u.id
    WHERE a.client_id = ?
    ORDER BY a.appointment_date DESC
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, appointments: rows });
    }
  });
});

router.get('/provider-appointments', protect, requireSeller, (req, res) => {
  db.all(`
    SELECT a.*, b.title, u.name as client_name, u.email as client_email, u.phone as client_phone
    FROM appointments a
    JOIN bookings b ON a.booking_id = b.id
    JOIN users u ON a.client_id = u.id
    WHERE a.provider_id = ?
    ORDER BY a.appointment_date DESC
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, appointments: rows });
    }
  });
});

  return router;
};

module.exports = createBookingRoutes;
