const express = require('express');
const { createPaginationMetadata, getPagination } = require('../utils/pagination');
const {
  BookingProtocolError,
  all,
  cancelAppointment,
  createAppointment,
  getAvailability,
  getAvailabilityWindows,
  get: getRow,
  run,
  rescheduleAppointment,
  updateAppointmentStatus,
  withTransaction,
} = require('../services/bookingProtocolService');

const sendProtocolError = (res, error, fallback = 'Booking operation failed.') => {
  if (error instanceof BookingProtocolError) {
    return res.status(error.statusCode).json({ error: error.message, code: error.code });
  }
  console.error('Booking protocol error:', error);
  return res.status(500).json({ error: fallback });
};

const getBooking = (database, bookingId) => getRow(database, `
  SELECT b.*, u.name AS provider_name, u.id AS provider_id
  FROM bookings b
  JOIN users u ON b.provider_id = u.id
  WHERE b.id = ?
`, [bookingId]);

const attachBookingSchedule = async (database, booking) => {
  if (!booking) return booking;
  const [availability, blockedDates] = await Promise.all([
    getAvailabilityWindows(database, booking),
    all(database, 'SELECT date FROM booking_date_overrides WHERE booking_id = ? AND is_available = 0 ORDER BY date', [booking.id]),
  ]);
  return {
    ...booking,
    availability,
    unavailable_dates: blockedDates.map((entry) => entry.date),
  };
};

const attachMedia = async (database, booking) => ({
  ...booking,
  media: await all(database, 'SELECT * FROM booking_media WHERE booking_id = ? ORDER BY display_order, id', [booking.id]),
});

const createBookingRoutes = ({
  db,
  protect,
  optionalProtect,
  requireSeller,
  validateIdParams,
  validateBookingCreate,
  validateBookingUpdate,
  validateBookingAvailabilityQuery,
  validateAppointmentCreate,
  validateAppointmentCancellation,
  validateAppointmentReschedule,
  validateAppointmentProviderAction,
  validateBookingStatus,
  auditService,
}) => {
  const router = express.Router();

  router.post('/bookings', protect, requireSeller, validateBookingCreate, async (req, res) => {
    try {
      const booking = await withTransaction(db, async (transaction) => {
        const data = req.body;
        const inserted = await run(transaction, `
          INSERT INTO bookings (
            title, description, price, old_price, category, duration, location_type, location,
            max_participants, available_days, image, provider_id, status, timezone, buffer_minutes,
            minimum_notice_minutes, booking_window_days, max_bookings_per_day,
            cancellation_notice_hours, confirmation_mode
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?)
        `, [
          data.title, data.description, data.price, data.old_price ?? null, data.category, data.duration,
          data.location_type, data.location, data.max_participants,
          JSON.stringify([...new Set(data.availability.map((window) => window.weekday))]), data.image,
          req.user.id, data.timezone, data.buffer_minutes, data.minimum_notice_minutes,
          data.booking_window_days, data.max_bookings_per_day, data.cancellation_notice_hours,
          data.confirmation_mode,
        ]);
        const bookingId = inserted.lastID;

        for (const window of data.availability) {
          await run(transaction, `
            INSERT INTO booking_availability_windows (booking_id, weekday, start_time, end_time)
            VALUES (?, ?, ?, ?)
          `, [bookingId, window.weekday, window.start_time, window.end_time]);
        }
        for (const date of data.unavailable_dates) {
          await run(transaction, `
            INSERT INTO booking_date_overrides (booking_id, date, is_available)
            VALUES (?, ?, 0)
          `, [bookingId, date]);
        }
        for (const [index, media] of (data.media || []).entries()) {
          await run(transaction, `
            INSERT INTO booking_media (booking_id, media_type, media_url, display_order, is_primary)
            VALUES (?, 'image', ?, ?, ?)
          `, [bookingId, media.url, index, index === 0 ? 1 : 0]);
        }
        return getBooking(transaction, bookingId);
      });

      await auditService?.recordFromRequest(req, {
        action: 'booking.service.created',
        resourceType: 'booking',
        resourceId: booking.id,
        metadata: { confirmationMode: booking.confirmation_mode, timeZone: booking.timezone },
      });
      return res.status(201).json({ success: true, booking: await attachBookingSchedule(db, await attachMedia(db, booking)) });
    } catch (error) {
      return sendProtocolError(res, error, 'Unable to create the booking service.');
    }
  });

  router.get('/bookings', async (req, res) => {
    try {
      const { page, limit, offset } = getPagination(req.query);
      const category = typeof req.query.category === 'string' && req.query.category.trim().length <= 80
        ? req.query.category.trim()
        : '';
      const filterValues = category ? [category] : [];
      const countCategoryFilter = category ? ' AND category = ?' : '';
      const listCategoryFilter = category ? ' AND b.category = ?' : '';
      const count = await getRow(db, `SELECT COUNT(*) AS total FROM bookings WHERE status = 'published'${countCategoryFilter}`, filterValues);
      const pagination = createPaginationMetadata(page, limit, count?.total || 0);
      const rows = await all(db, `
        SELECT b.*, u.name AS provider_name, u.id AS provider_id
        FROM bookings b
        JOIN users u ON b.provider_id = u.id
        WHERE b.status = 'published'${listCategoryFilter}
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?
      `, [...filterValues, limit, offset]);
      const bookings = await Promise.all(rows.map((booking) => attachMedia(db, booking)));
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return res.json({ success: true, bookings, pagination });
    } catch (error) {
      return sendProtocolError(res, error, 'Unable to load booking services.');
    }
  });

  router.get('/bookings/:id/availability', validateIdParams('id'), validateBookingAvailabilityQuery, async (req, res) => {
    try {
      const booking = await getBooking(db, req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking service not found.' });
      const availability = await getAvailability(db, booking, req.query.date);
      return res.json({ success: true, availability });
    } catch (error) {
      return sendProtocolError(res, error, 'Unable to load availability.');
    }
  });

  router.get('/bookings/:id', optionalProtect, validateIdParams('id'), async (req, res) => {
    try {
      const booking = await getBooking(db, req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking service not found.' });
      if (booking.status !== 'published' && Number(req.user?.id) !== Number(booking.provider_id)) {
        return res.status(404).json({ error: 'Booking service not found.' });
      }
      return res.json({ success: true, booking: await attachBookingSchedule(db, await attachMedia(db, booking)) });
    } catch (error) {
      return sendProtocolError(res, error, 'Unable to load booking service.');
    }
  });

  router.get('/my-bookings', protect, requireSeller, async (req, res) => {
    try {
      const rows = await all(db, `
        SELECT b.*, COUNT(a.id) AS appointments_count,
          SUM(CASE WHEN a.status IN ('pending', 'confirmed') THEN 1 ELSE 0 END) AS upcoming_appointments_count
        FROM bookings b
        LEFT JOIN appointments a ON a.booking_id = b.id
        WHERE b.provider_id = ?
        GROUP BY b.id
        ORDER BY b.created_at DESC
      `, [req.user.id]);
      const bookings = await Promise.all(rows.map((booking) => attachMedia(db, booking)));
      return res.json({ success: true, bookings });
    } catch (error) {
      return sendProtocolError(res, error, 'Unable to load your booking services.');
    }
  });

  router.put('/bookings/:id', protect, requireSeller, validateIdParams('id'), validateBookingUpdate, async (req, res) => {
    try {
      const updated = await withTransaction(db, async (transaction) => {
        const existing = await getRow(transaction, 'SELECT * FROM bookings WHERE id = ?', [req.params.id]);
        if (!existing) throw new BookingProtocolError('Booking service not found.', 404, 'BOOKING_NOT_FOUND');
        if (Number(existing.provider_id) !== Number(req.user.id)) throw new BookingProtocolError('You are not allowed to edit this booking service.', 403, 'BOOKING_FORBIDDEN');

        const data = req.body;
        const columns = [
          ['title', data.title], ['description', data.description], ['price', data.price], ['old_price', data.old_price],
          ['category', data.category], ['duration', data.duration], ['location_type', data.location_type], ['location', data.location],
          ['max_participants', data.max_participants], ['image', data.image], ['timezone', data.timezone],
          ['buffer_minutes', data.buffer_minutes], ['minimum_notice_minutes', data.minimum_notice_minutes],
          ['booking_window_days', data.booking_window_days], ['max_bookings_per_day', data.max_bookings_per_day],
          ['cancellation_notice_hours', data.cancellation_notice_hours], ['confirmation_mode', data.confirmation_mode],
        ].filter(([, value]) => value !== undefined);
        if (data.availability !== undefined) columns.push(['available_days', JSON.stringify([...new Set(data.availability.map((window) => window.weekday))])]);
        if (columns.length > 0) {
          const assignments = columns.map(([column]) => `${column} = ?`).join(', ');
          await run(transaction, `UPDATE bookings SET ${assignments} WHERE id = ?`, [...columns.map(([, value]) => value), req.params.id]);
        }
        if (data.availability !== undefined) {
          await run(transaction, 'DELETE FROM booking_availability_windows WHERE booking_id = ?', [req.params.id]);
          for (const window of data.availability) {
            await run(transaction, `INSERT INTO booking_availability_windows (booking_id, weekday, start_time, end_time) VALUES (?, ?, ?, ?)`, [req.params.id, window.weekday, window.start_time, window.end_time]);
          }
        }
        if (data.unavailable_dates !== undefined) {
          await run(transaction, 'DELETE FROM booking_date_overrides WHERE booking_id = ?', [req.params.id]);
          for (const date of data.unavailable_dates) {
            await run(transaction, `INSERT INTO booking_date_overrides (booking_id, date, is_available) VALUES (?, ?, 0)`, [req.params.id, date]);
          }
        }
        if (data.media !== undefined) {
          await run(transaction, 'DELETE FROM booking_media WHERE booking_id = ?', [req.params.id]);
          for (const [index, media] of data.media.entries()) {
            await run(transaction, `INSERT INTO booking_media (booking_id, media_type, media_url, display_order, is_primary) VALUES (?, 'image', ?, ?, ?)`, [req.params.id, media.url, index, index === 0 ? 1 : 0]);
          }
        }
        return getBooking(transaction, req.params.id);
      });

      await auditService?.recordFromRequest(req, {
        action: 'booking.service.updated', resourceType: 'booking', resourceId: updated.id,
        metadata: { confirmationMode: updated.confirmation_mode, timeZone: updated.timezone },
      });
      return res.json({ success: true, booking: await attachBookingSchedule(db, await attachMedia(db, updated)) });
    } catch (error) {
      return sendProtocolError(res, error, 'Unable to update the booking service.');
    }
  });

  router.patch('/bookings/:id/status', protect, requireSeller, validateIdParams('id'), validateBookingStatus, async (req, res) => {
    try {
      const booking = await getRow(db, 'SELECT * FROM bookings WHERE id = ?', [req.params.id]);
      if (!booking) return res.status(404).json({ error: 'Booking service not found.' });
      if (Number(booking.provider_id) !== Number(req.user.id)) return res.status(403).json({ error: 'You are not allowed to manage this booking service.' });
      await run(db, 'UPDATE bookings SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
      await auditService?.recordFromRequest(req, {
        action: 'booking.service.status_updated', resourceType: 'booking', resourceId: req.params.id,
        metadata: { status: req.body.status },
      });
      return res.json({ success: true, status: req.body.status });
    } catch (error) {
      return sendProtocolError(res, error, 'Unable to update booking service status.');
    }
  });

  router.delete('/bookings/:id', protect, requireSeller, validateIdParams('id'), async (req, res) => {
    try {
      const booking = await getRow(db, 'SELECT provider_id FROM bookings WHERE id = ?', [req.params.id]);
      if (!booking) return res.status(404).json({ error: 'Booking service not found.' });
      if (Number(booking.provider_id) !== Number(req.user.id)) return res.status(403).json({ error: 'You are not allowed to delete this booking service.' });
      const history = await getRow(db, 'SELECT COUNT(*) AS total FROM appointments WHERE booking_id = ?', [req.params.id]);
      if (Number(history?.total || 0) > 0) {
        return res.status(409).json({ error: 'Services with appointment history cannot be deleted. Pause or end the service instead.' });
      }
      await run(db, 'DELETE FROM bookings WHERE id = ?', [req.params.id]);
      await auditService?.recordFromRequest(req, {
        action: 'booking.service.deleted', resourceType: 'booking', resourceId: req.params.id,
      });
      return res.json({ success: true, message: 'Booking service deleted.' });
    } catch (error) {
      return sendProtocolError(res, error, 'Unable to delete booking service.');
    }
  });

  router.post('/bookings/:id/book', protect, validateIdParams('id'), validateAppointmentCreate, async (req, res) => {
    try {
      const result = await createAppointment(db, {
        bookingId: req.params.id,
        clientId: req.user.id,
        appointmentDate: req.body.appointment_date,
        appointmentTime: req.body.appointment_time,
        guestCount: req.body.guest_count,
        notes: req.body.notes,
        idempotencyKey: req.body.idempotency_key,
      });
      if (!result.alreadyProcessed) {
        await auditService?.recordFromRequest(req, {
          action: 'booking.appointment.created', resourceType: 'appointment', resourceId: result.appointment.id,
          metadata: { bookingId: req.params.id, status: result.appointment.status, guestCount: req.body.guest_count },
        });
      }
      return res.status(result.alreadyProcessed ? 200 : 201).json({ success: true, appointment: result.appointment, alreadyProcessed: result.alreadyProcessed });
    } catch (error) {
      return sendProtocolError(res, error, 'Unable to create appointment.');
    }
  });

  router.get('/my-appointments', protect, async (req, res) => {
    try {
      const appointments = await all(db, `
        SELECT a.*, b.title, b.image, b.duration, b.location_type, b.location, b.booking_window_days,
               b.cancellation_notice_hours, b.confirmation_mode, b.timezone AS provider_timezone,
               u.name AS provider_name
        FROM appointments a
        JOIN bookings b ON a.booking_id = b.id
        JOIN users u ON a.provider_id = u.id
        WHERE a.client_id = ?
        ORDER BY CASE WHEN a.status IN ('pending', 'confirmed') THEN 0 ELSE 1 END,
                 a.appointment_date ASC, a.appointment_time ASC
      `, [req.user.id]);
      return res.json({ success: true, appointments });
    } catch (error) {
      return sendProtocolError(res, error, 'Unable to load appointments.');
    }
  });

  router.get('/provider-appointments', protect, requireSeller, async (req, res) => {
    try {
      const appointments = await all(db, `
        SELECT a.*, b.title, b.location_type, b.location, b.confirmation_mode,
               b.timezone AS provider_timezone, u.name AS client_name
        FROM appointments a
        JOIN bookings b ON a.booking_id = b.id
        JOIN users u ON a.client_id = u.id
        WHERE a.provider_id = ?
        ORDER BY CASE WHEN a.status IN ('pending', 'confirmed') THEN 0 ELSE 1 END,
                 a.appointment_date ASC, a.appointment_time ASC
      `, [req.user.id]);
      return res.json({ success: true, appointments });
    } catch (error) {
      return sendProtocolError(res, error, 'Unable to load provider appointments.');
    }
  });

  router.post('/appointments/:id/cancel', protect, validateIdParams('id'), validateAppointmentCancellation, async (req, res) => {
    try {
      const appointment = await cancelAppointment(db, { appointmentId: req.params.id, actorId: req.user.id, reason: req.body.reason });
      await auditService?.recordFromRequest(req, {
        action: 'booking.appointment.cancelled', resourceType: 'appointment', resourceId: appointment.id,
        metadata: { bookingId: appointment.booking_id },
      });
      return res.json({ success: true, appointment });
    } catch (error) {
      return sendProtocolError(res, error, 'Unable to cancel appointment.');
    }
  });

  router.post('/appointments/:id/reschedule', protect, validateIdParams('id'), validateAppointmentReschedule, async (req, res) => {
    try {
      const result = await rescheduleAppointment(db, {
        appointmentId: req.params.id, clientId: req.user.id,
        appointmentDate: req.body.appointment_date, appointmentTime: req.body.appointment_time,
      });
      if (!result.alreadyProcessed) {
        await auditService?.recordFromRequest(req, {
          action: 'booking.appointment.rescheduled', resourceType: 'appointment', resourceId: result.appointment.id,
          metadata: { bookingId: result.appointment.booking_id, status: result.appointment.status },
        });
      }
      return res.status(result.alreadyProcessed ? 200 : 201).json({ success: true, appointment: result.appointment, alreadyProcessed: result.alreadyProcessed });
    } catch (error) {
      return sendProtocolError(res, error, 'Unable to reschedule appointment.');
    }
  });

  router.post('/appointments/:id/action', protect, requireSeller, validateIdParams('id'), validateAppointmentProviderAction, async (req, res) => {
    try {
      const appointment = await updateAppointmentStatus(db, {
        appointmentId: req.params.id, providerId: req.user.id, action: req.body.action, reason: req.body.reason,
      });
      await auditService?.recordFromRequest(req, {
        action: `booking.appointment.${req.body.action}`, resourceType: 'appointment', resourceId: appointment.id,
        metadata: { bookingId: appointment.booking_id, status: appointment.status },
      });
      return res.json({ success: true, appointment });
    } catch (error) {
      return sendProtocolError(res, error, 'Unable to update appointment.');
    }
  });

  return router;
};

module.exports = createBookingRoutes;
