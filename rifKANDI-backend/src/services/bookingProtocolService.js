const crypto = require('node:crypto');

const DEFAULT_TIME_ZONE = 'Africa/Casablanca';
const DEFAULT_WINDOWS = Object.freeze([
  { weekday: 1, start_time: '09:00', end_time: '17:00' },
  { weekday: 2, start_time: '09:00', end_time: '17:00' },
  { weekday: 3, start_time: '09:00', end_time: '17:00' },
  { weekday: 4, start_time: '09:00', end_time: '17:00' },
  { weekday: 5, start_time: '09:00', end_time: '17:00' },
]);
const ACTIVE_APPOINTMENT_STATUSES = Object.freeze(['pending', 'confirmed']);

class BookingProtocolError extends Error {
  constructor(message, statusCode = 400, code = 'BOOKING_PROTOCOL_ERROR') {
    super(message);
    this.name = 'BookingProtocolError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

const query = (database, method, sql, parameters = []) => new Promise((resolve, reject) => {
  let settled = false;
  const finish = (error, value) => {
    if (settled) return;
    settled = true;
    if (error) reject(error);
    else resolve(value);
  };

  try {
    const result = database[method](sql, parameters, function onResult(error, value) {
      if (method === 'run') {
        finish(error, error ? undefined : { changes: this?.changes ?? 0, lastID: this?.lastID });
      } else {
        finish(error, value);
      }
    });
    if (result && typeof result.then === 'function') {
      result.then((value) => finish(null, value), finish);
    }
  } catch (error) {
    finish(error);
  }
});

const get = (database, sql, parameters = []) => query(database, 'get', sql, parameters);
const all = (database, sql, parameters = []) => query(database, 'all', sql, parameters);
const run = (database, sql, parameters = []) => query(database, 'run', sql, parameters);

const timeParts = (time, field = 'time') => {
  const match = /^(\d{2}):(\d{2})$/.exec(String(time || ''));
  if (!match) throw new BookingProtocolError(`${field} must use HH:MM format.`, 422, 'INVALID_TIME');
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new BookingProtocolError(`${field} is invalid.`, 422, 'INVALID_TIME');
  return { hours, minutes, total: (hours * 60) + minutes };
};

const formatTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const dateParts = (date) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
  if (!match) throw new BookingProtocolError('date must use YYYY-MM-DD format.', 422, 'INVALID_DATE');
  const [year, month, day] = match.slice(1).map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) {
    throw new BookingProtocolError('date is invalid.', 422, 'INVALID_DATE');
  }
  return { year, month, day };
};

const formatDateParts = (parts) => `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;

const formatter = (timeZone, options) => new Intl.DateTimeFormat('en-CA', {
  timeZone,
  hourCycle: 'h23',
  ...options,
});

const isTimeZone = (timeZone) => {
  try {
    formatter(timeZone, { year: 'numeric' }).format();
    return true;
  } catch (_) {
    return false;
  }
};

const zonedParts = (date, timeZone) => {
  const values = formatter(timeZone, {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short',
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    weekday: values.weekday,
  };
};

const offsetAt = (epoch, timeZone) => {
  const parts = zonedParts(new Date(epoch), timeZone);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - epoch;
};

const dateTimeInZoneToEpoch = (date, time, timeZone) => {
  if (!isTimeZone(timeZone)) throw new BookingProtocolError('The provider time zone is invalid.', 500, 'INVALID_PROVIDER_TIME_ZONE');
  const day = dateParts(date);
  const clock = timeParts(time);
  const localEpoch = Date.UTC(day.year, day.month - 1, day.day, clock.hours, clock.minutes);
  const candidate = localEpoch - offsetAt(localEpoch, timeZone);
  const resolved = zonedParts(new Date(candidate), timeZone);

  if (resolved.year !== day.year || resolved.month !== day.month || resolved.day !== day.day
    || resolved.hour !== clock.hours || resolved.minute !== clock.minutes) {
    throw new BookingProtocolError('This time is not available in the provider time zone.', 409, 'INVALID_LOCAL_TIME');
  }
  return candidate;
};

const dateInTimeZone = (epoch, timeZone) => {
  const parts = zonedParts(new Date(epoch), timeZone);
  return formatDateParts(parts);
};

const weekdayForDate = (date, timeZone) => {
  const weekday = formatter(timeZone, { weekday: 'short' }).format(new Date(dateTimeInZoneToEpoch(date, '12:00', timeZone)));
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
};

const dateDifference = (start, end) => {
  const startParts = dateParts(start);
  const endParts = dateParts(end);
  return Math.round((Date.UTC(endParts.year, endParts.month - 1, endParts.day) - Date.UTC(startParts.year, startParts.month - 1, startParts.day)) / 86_400_000);
};

const adjacentDate = (date, offset) => {
  const parts = dateParts(date);
  const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offset));
  return value.toISOString().slice(0, 10);
};

const getTimeZone = (booking) => booking.timezone || DEFAULT_TIME_ZONE;
const toInteger = (value, fallback = 0) => Number.isInteger(Number(value)) ? Number(value) : fallback;
const activeStatusSql = ACTIVE_APPOINTMENT_STATUSES.map(() => '?').join(', ');

const parseLegacyAvailability = (availableDays) => {
  try {
    const values = JSON.parse(availableDays || '[]');
    if (!Array.isArray(values) || values.length === 0) return DEFAULT_WINDOWS;
    const dayMap = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
    };
    const selectedDays = values
      .map((day) => dayMap[String(day).trim().toLowerCase()])
      .filter((day) => Number.isInteger(day));
    return selectedDays.length > 0
      ? selectedDays.map((weekday) => ({ weekday, start_time: '09:00', end_time: '17:00' }))
      : DEFAULT_WINDOWS;
  } catch (_) {
    return DEFAULT_WINDOWS;
  }
};

const getAvailabilityWindows = async (database, booking) => {
  const windows = await all(
    database,
    'SELECT weekday, start_time, end_time FROM booking_availability_windows WHERE booking_id = ? ORDER BY weekday, start_time, end_time',
    [booking.id]
  );
  return windows.length > 0 ? windows : parseLegacyAvailability(booking.available_days);
};

const getOverride = (database, bookingId, date) => get(
  database,
  'SELECT is_available FROM booking_date_overrides WHERE booking_id = ? AND date = ?',
  [bookingId, date]
);

const hasOverlappingProviderAppointment = (candidate, appointments, booking) => appointments.some((appointment) => {
  const sameSlot = Number(appointment.booking_id) === Number(booking.id)
    && (appointment.starts_at ? Date.parse(appointment.starts_at) : dateTimeInZoneToEpoch(appointment.appointment_date, appointment.appointment_time, getTimeZone(booking))) === candidate.startAt;
  if (sameSlot) return false;

  const existingStart = appointment.starts_at
    ? Date.parse(appointment.starts_at)
    : dateTimeInZoneToEpoch(appointment.appointment_date, appointment.appointment_time, appointment.booking_timezone || getTimeZone(booking));
  const existingEnd = appointment.ends_at
    ? Date.parse(appointment.ends_at)
    : existingStart + (toInteger(appointment.duration, 60) * 60_000);
  const existingBuffer = toInteger(appointment.buffer_minutes, 0) * 60_000;
  const candidateBuffer = toInteger(booking.buffer_minutes, 0) * 60_000;
  return candidate.startAt < existingEnd + existingBuffer && candidate.endAt + candidateBuffer > existingStart;
});

const getAvailability = async (database, booking, date, { now = Date.now(), excludeAppointmentId = null } = {}) => {
  if (booking.status !== 'published') throw new BookingProtocolError('This booking service is not currently available.', 409, 'BOOKING_UNAVAILABLE');
  const timeZone = getTimeZone(booking);
  if (!isTimeZone(timeZone)) throw new BookingProtocolError('This booking service has an invalid time zone.', 500, 'INVALID_PROVIDER_TIME_ZONE');
  dateParts(date);

  const providerToday = dateInTimeZone(now, timeZone);
  const daysAhead = dateDifference(providerToday, date);
  if (daysAhead < 0 || daysAhead > toInteger(booking.booking_window_days, 60)) {
    return { date, timeZone, slots: [], reason: 'outside_booking_window' };
  }

  const override = await getOverride(database, booking.id, date);
  if (override && !Boolean(override.is_available)) {
    return { date, timeZone, slots: [], reason: 'provider_unavailable' };
  }

  const weekday = weekdayForDate(date, timeZone);
  const allWindows = await getAvailabilityWindows(database, booking);
  const windows = allWindows.filter((window) => Number(window.weekday) === weekday);
  if (windows.length === 0) return { date, timeZone, slots: [], reason: 'provider_unavailable' };

  const appointments = await all(database, `
    SELECT a.*, b.buffer_minutes
    FROM appointments a
    JOIN bookings b ON b.id = a.booking_id
    WHERE a.provider_id = ?
      AND a.appointment_date BETWEEN ? AND ?
      AND a.status IN (${activeStatusSql})
  `, [booking.provider_id, adjacentDate(date, -1), adjacentDate(date, 1), ...ACTIVE_APPOINTMENT_STATUSES]);

  const relevantAppointments = excludeAppointmentId === null
    ? appointments
    : appointments.filter((appointment) => Number(appointment.id) !== Number(excludeAppointmentId));
  const duration = toInteger(booking.duration, 60);
  const buffer = toInteger(booking.buffer_minutes, 0);
  const minimumStart = now + (toInteger(booking.minimum_notice_minutes, 60) * 60_000);
  const dailyLimit = booking.max_bookings_per_day === null || booking.max_bookings_per_day === undefined
    ? null
    : toInteger(booking.max_bookings_per_day, 0);
  const bookedToday = relevantAppointments.filter((appointment) => Number(appointment.booking_id) === Number(booking.id)
    && appointment.appointment_date === date).length;
  if (dailyLimit !== null && bookedToday >= dailyLimit) {
    return { date, timeZone, slots: [], reason: 'daily_limit_reached' };
  }

  const slots = [];
  for (const window of windows) {
    const start = timeParts(window.start_time, 'availability start_time').total;
    const end = timeParts(window.end_time, 'availability end_time').total;
    for (let startMinutes = start; startMinutes + duration <= end; startMinutes += duration + buffer) {
      const startTime = formatTime(startMinutes);
      const endTime = formatTime(startMinutes + duration);
      let startAt;
      try {
        startAt = dateTimeInZoneToEpoch(date, startTime, timeZone);
      } catch (error) {
        if (error.code === 'INVALID_LOCAL_TIME') continue;
        throw error;
      }
      const candidate = { startAt, endAt: startAt + (duration * 60_000) };
      if (candidate.startAt < minimumStart || hasOverlappingProviderAppointment(candidate, relevantAppointments, booking)) continue;

      const reservedSeats = relevantAppointments
        .filter((appointment) => Number(appointment.booking_id) === Number(booking.id)
          && (appointment.starts_at ? Date.parse(appointment.starts_at) : dateTimeInZoneToEpoch(appointment.appointment_date, appointment.appointment_time, timeZone)) === candidate.startAt)
        .reduce((sum, appointment) => sum + toInteger(appointment.guest_count, 1), 0);
      const remainingCapacity = Math.max(0, toInteger(booking.max_participants, 1) - reservedSeats);
      if (remainingCapacity < 1) continue;

      slots.push({
        startTime,
        endTime,
        startAt: new Date(candidate.startAt).toISOString(),
        endAt: new Date(candidate.endAt).toISOString(),
        remainingCapacity,
      });
    }
  }

  return { date, timeZone, slots, reason: null };
};

let sqliteTransactionTail = Promise.resolve();

const withTransaction = async (database, work) => {
  if (typeof database.withTransaction === 'function') {
    return database.withTransaction((transaction) => work(transaction), { isolationLevel: 'SERIALIZABLE', retries: 2 });
  }

  const previous = sqliteTransactionTail;
  let release;
  sqliteTransactionTail = new Promise((resolve) => { release = resolve; });
  await previous.catch(() => undefined);
  let began = false;
  try {
    await run(database, 'BEGIN IMMEDIATE TRANSACTION');
    began = true;
    const result = await work(database);
    await run(database, 'COMMIT');
    return result;
  } catch (error) {
    if (began) await run(database, 'ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    release();
  }
};

const lockedSelect = (database, sql) => (database.dialect === 'postgres' ? `${sql} FOR UPDATE` : sql);

const bookingNumber = () => `BKG-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

const appointmentRow = (database, appointmentId) => get(database, `
  SELECT a.*, b.title, b.location_type, b.location, b.cancellation_notice_hours,
         b.confirmation_mode, b.timezone AS provider_timezone, b.image,
         provider.name AS provider_name, client.name AS client_name
  FROM appointments a
  JOIN bookings b ON b.id = a.booking_id
  JOIN users provider ON provider.id = a.provider_id
  JOIN users client ON client.id = a.client_id
  WHERE a.id = ?
`, [appointmentId]);

const createAppointment = async (database, {
  bookingId,
  clientId,
  appointmentDate,
  appointmentTime,
  guestCount,
  notes,
  idempotencyKey,
}) => withTransaction(database, async (transaction) => {
  const booking = await get(transaction, lockedSelect(database, 'SELECT * FROM bookings WHERE id = ?'), [bookingId]);
  if (!booking || booking.status !== 'published') throw new BookingProtocolError('This booking service is no longer available.', 409, 'BOOKING_UNAVAILABLE');
  if (Number(booking.provider_id) === Number(clientId)) throw new BookingProtocolError('You cannot book your own service.', 422, 'SELF_BOOKING');

  if (idempotencyKey) {
    const existing = await get(transaction, 'SELECT * FROM appointments WHERE idempotency_key = ?', [idempotencyKey]);
    if (existing) {
      if (Number(existing.client_id) !== Number(clientId) || Number(existing.booking_id) !== Number(bookingId)) {
        throw new BookingProtocolError('This booking request cannot be reused.', 409, 'IDEMPOTENCY_KEY_REUSED');
      }
      return { appointment: await appointmentRow(transaction, existing.id), alreadyProcessed: true };
    }
  }

  const availability = await getAvailability(transaction, booking, appointmentDate);
  const slot = availability.slots.find((item) => item.startTime === appointmentTime);
  if (!slot) throw new BookingProtocolError('That time is no longer available. Please choose another slot.', 409, 'SLOT_UNAVAILABLE');
  if (guestCount > slot.remainingCapacity) throw new BookingProtocolError(`Only ${slot.remainingCapacity} place(s) remain for that time.`, 409, 'CAPACITY_UNAVAILABLE');

  const status = booking.confirmation_mode === 'request' ? 'pending' : 'confirmed';
  const key = idempotencyKey || `server:${crypto.randomUUID()}`;
  const inserted = await run(transaction, `
    INSERT INTO appointments (
      booking_number, booking_id, client_id, provider_id, appointment_date, appointment_time,
      duration, status, notes, starts_at, ends_at, booking_timezone, guest_count,
      idempotency_key, confirmed_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    bookingNumber(), bookingId, clientId, booking.provider_id, appointmentDate, appointmentTime,
    booking.duration, status, notes || '', slot.startAt, slot.endAt, availability.timeZone, guestCount,
    key, status === 'confirmed' ? new Date().toISOString() : null,
  ]);
  const appointment = await appointmentRow(transaction, inserted.lastID);
  return { appointment, alreadyProcessed: false };
});

const cancelAppointment = async (database, { appointmentId, actorId, reason }) => withTransaction(database, async (transaction) => {
  const appointment = await appointmentRow(transaction, appointmentId);
  if (!appointment) throw new BookingProtocolError('Appointment not found.', 404, 'APPOINTMENT_NOT_FOUND');
  const isClient = Number(appointment.client_id) === Number(actorId);
  const isProvider = Number(appointment.provider_id) === Number(actorId);
  if (!isClient && !isProvider) throw new BookingProtocolError('You are not allowed to manage this appointment.', 403, 'APPOINTMENT_FORBIDDEN');
  if (!ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)) {
    throw new BookingProtocolError('This appointment can no longer be cancelled.', 409, 'APPOINTMENT_NOT_CANCELLABLE');
  }

  const startAt = appointment.starts_at
    ? Date.parse(appointment.starts_at)
    : dateTimeInZoneToEpoch(appointment.appointment_date, appointment.appointment_time, appointment.booking_timezone || appointment.provider_timezone || DEFAULT_TIME_ZONE);
  if (isClient && Date.now() >= startAt - (toInteger(appointment.cancellation_notice_hours, 24) * 60 * 60_000)) {
    throw new BookingProtocolError(`This appointment can only be cancelled at least ${toInteger(appointment.cancellation_notice_hours, 24)} hours before it starts.`, 409, 'CANCELLATION_WINDOW_CLOSED');
  }

  const result = await run(transaction, `
    UPDATE appointments
    SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancelled_by = ?,
        cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status IN (${activeStatusSql})
  `, [actorId, reason || '', appointmentId, ...ACTIVE_APPOINTMENT_STATUSES]);
  if (result.changes !== 1) throw new BookingProtocolError('This appointment changed before it could be cancelled.', 409, 'APPOINTMENT_CHANGED');
  return appointmentRow(transaction, appointmentId);
});

const rescheduleAppointment = async (database, {
  appointmentId, clientId, appointmentDate, appointmentTime,
}) => withTransaction(database, async (transaction) => {
  const appointment = await appointmentRow(transaction, appointmentId);
  if (!appointment) throw new BookingProtocolError('Appointment not found.', 404, 'APPOINTMENT_NOT_FOUND');
  if (Number(appointment.client_id) !== Number(clientId)) throw new BookingProtocolError('Only the client can reschedule this appointment.', 403, 'APPOINTMENT_FORBIDDEN');
  if (!ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)) {
    throw new BookingProtocolError('This appointment can no longer be rescheduled.', 409, 'APPOINTMENT_NOT_RESCHEDULABLE');
  }
  const existingStart = appointment.starts_at
    ? Date.parse(appointment.starts_at)
    : dateTimeInZoneToEpoch(appointment.appointment_date, appointment.appointment_time, appointment.booking_timezone || appointment.provider_timezone || DEFAULT_TIME_ZONE);
  if (Date.now() >= existingStart - (toInteger(appointment.cancellation_notice_hours, 24) * 60 * 60_000)) {
    throw new BookingProtocolError(`This appointment can only be rescheduled at least ${toInteger(appointment.cancellation_notice_hours, 24)} hours before it starts.`, 409, 'RESCHEDULE_WINDOW_CLOSED');
  }
  if (appointment.appointment_date === appointmentDate && appointment.appointment_time === appointmentTime) {
    return { appointment, alreadyProcessed: true };
  }

  const booking = await get(transaction, lockedSelect(database, 'SELECT * FROM bookings WHERE id = ?'), [appointment.booking_id]);
  if (!booking || booking.status !== 'published') throw new BookingProtocolError('This booking service is no longer available for rescheduling.', 409, 'BOOKING_UNAVAILABLE');
  const availability = await getAvailability(transaction, booking, appointmentDate, { excludeAppointmentId: appointment.id });
  const slot = availability.slots.find((item) => item.startTime === appointmentTime);
  if (!slot || toInteger(appointment.guest_count, 1) > slot.remainingCapacity) {
    throw new BookingProtocolError('That time is no longer available. Please choose another slot.', 409, 'SLOT_UNAVAILABLE');
  }

  const nextStatus = booking.confirmation_mode === 'request' ? 'pending' : 'confirmed';
  const result = await run(transaction, `
    UPDATE appointments
    SET appointment_date = ?, appointment_time = ?, starts_at = ?, ends_at = ?, booking_timezone = ?,
        status = ?, confirmed_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND client_id = ? AND status IN (${ACTIVE_APPOINTMENT_STATUSES.map(() => '?').join(', ')})
  `, [
    appointmentDate, appointmentTime, slot.startAt, slot.endAt, availability.timeZone,
    nextStatus, nextStatus === 'confirmed' ? new Date().toISOString() : null,
    appointmentId, clientId, ...ACTIVE_APPOINTMENT_STATUSES,
  ]);
  if (result.changes !== 1) throw new BookingProtocolError('This appointment changed before it could be rescheduled.', 409, 'APPOINTMENT_CHANGED');
  return { appointment: await appointmentRow(transaction, appointmentId), alreadyProcessed: false };
});

const updateAppointmentStatus = async (database, { appointmentId, providerId, action, reason }) => withTransaction(database, async (transaction) => {
  const appointment = await appointmentRow(transaction, appointmentId);
  if (!appointment) throw new BookingProtocolError('Appointment not found.', 404, 'APPOINTMENT_NOT_FOUND');
  if (Number(appointment.provider_id) !== Number(providerId)) throw new BookingProtocolError('Only the provider can update this appointment.', 403, 'APPOINTMENT_FORBIDDEN');

  const transitions = {
    confirm: { from: ['pending'], to: 'confirmed', columns: 'confirmed_at = CURRENT_TIMESTAMP' },
    decline: { from: ['pending'], to: 'declined', columns: 'cancelled_at = CURRENT_TIMESTAMP, cancelled_by = ?, cancellation_reason = ?' },
    complete: { from: ['confirmed'], to: 'completed', columns: 'completed_at = CURRENT_TIMESTAMP' },
    no_show: { from: ['confirmed'], to: 'no_show', columns: '' },
    cancel: { from: ['pending', 'confirmed'], to: 'cancelled', columns: 'cancelled_at = CURRENT_TIMESTAMP, cancelled_by = ?, cancellation_reason = ?' },
  };
  const transition = transitions[action];
  if (!transition || !transition.from.includes(appointment.status)) {
    throw new BookingProtocolError('This status change is not allowed.', 409, 'APPOINTMENT_TRANSITION_INVALID');
  }

  const params = [transition.to];
  let columns = `status = ?`;
  if (transition.columns) {
    columns += `, ${transition.columns}`;
    if (['decline', 'cancel'].includes(action)) params.push(providerId, reason || '');
  }
  params.push(appointmentId, ...transition.from);
  const result = await run(transaction, `
    UPDATE appointments SET ${columns}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status IN (${transition.from.map(() => '?').join(', ')})
  `, params);
  if (result.changes !== 1) throw new BookingProtocolError('This appointment changed before it could be updated.', 409, 'APPOINTMENT_CHANGED');
  return appointmentRow(transaction, appointmentId);
});

module.exports = {
  ACTIVE_APPOINTMENT_STATUSES,
  BookingProtocolError,
  DEFAULT_TIME_ZONE,
  DEFAULT_WINDOWS,
  all,
  createAppointment,
  get,
  getAvailability,
  getAvailabilityWindows,
  isTimeZone,
  run,
  cancelAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
  withTransaction,
};
