const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const testDirectory = path.join(os.tmpdir(), `rifkando-booking-protocol-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkando.db');
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-booking-tests';
process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-booking-tests';
process.env.AUDIT_LOG_SECRET = 'test-audit-secret-that-is-long-enough-for-booking-tests';
process.env.CLIENT_URL = 'https://www.rifkando.test';
process.env.BACKEND_URL = 'https://api.rifkando.test';
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const app = require('../src/app');
const { establishTestSessionForEmail } = require('./helpers/testSession');

const runStatement = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function done(error) {
    if (error) return reject(error);
    return resolve({ lastID: this.lastID, changes: this.changes });
  });
});
const closeDatabase = () => new Promise((resolve, reject) => db.close((error) => (error ? reject(error) : resolve())));
const startServer = () => new Promise((resolve) => {
  const server = app.listen(0, '127.0.0.1', () => resolve(server));
});
const stopServer = (server) => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
const cookiesFrom = (response) => (typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [response.headers.get('set-cookie')].filter(Boolean)).map((value) => value.split(';')[0]);
const request = (port, pathname, { method = 'GET', cookies = [], csrfToken, body } = {}) => {
  const headers = { Origin: 'https://www.rifkando.test' };
  if (cookies.length) headers.Cookie = cookies.join('; ');
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(`http://127.0.0.1:${port}${pathname}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
};
const login = async (_port, email, _password) => establishTestSessionForEmail(db, email);
const futureDate = () => {
  const date = new Date(Date.now() + (3 * 86_400_000));
  return date.toISOString().slice(0, 10);
};
const weeklyAvailability = () => Array.from({ length: 7 }, (_, weekday) => ({ weekday, start_time: '08:00', end_time: '20:00' }));
const bookingPayload = (confirmationMode = 'instant') => ({
  title: `Protocol service ${confirmationMode}`,
  description: 'A booking service used only to verify protected scheduling behaviour.',
  price: 100,
  category: 'consultation',
  duration: 60,
  location_type: 'online',
  location: '',
  max_participants: 1,
  timezone: 'Africa/Casablanca',
  availability: weeklyAvailability(),
  unavailable_dates: [],
  buffer_minutes: 15,
  minimum_notice_minutes: 0,
  booking_window_days: 60,
  max_bookings_per_day: null,
  cancellation_notice_hours: 0,
  confirmation_mode: confirmationMode,
  image: '',
  media: [],
});

const run = async () => {
  await db.ready;
  const password = 'correct horse battery staple';
  const hash = await bcrypt.hash(password, 12);
  await runStatement("INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'seller', 1)", ['Protocol Seller', 'booking-seller@example.test', hash]);
  await runStatement("INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'buyer', 1)", ['Protocol Buyer', 'booking-buyer@example.test', hash]);
  await runStatement("INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'buyer', 1)", ['Second Buyer', 'booking-buyer-two@example.test', hash]);
  const server = await startServer();
  const port = server.address().port;
  try {
    const launchState = await request(port, '/api/bookings');
    if (launchState.status === 404) {
      console.log('Booking protocol HTTP smoke test skipped: bookings are intentionally parked for the focused launch.');
      return;
    }

    const seller = await login(port, 'booking-seller@example.test', password);
    const buyer = await login(port, 'booking-buyer@example.test', password);
    const secondBuyer = await login(port, 'booking-buyer-two@example.test', password);
    const created = await request(port, '/api/bookings', { method: 'POST', cookies: seller.cookies, csrfToken: seller.csrfToken, body: bookingPayload() });
    assert.equal(created.status, 201, 'seller should create a schedule-backed booking service');
    const booking = (await created.json()).booking;
    const date = futureDate();
    const availabilityResponse = await request(port, `/api/bookings/${booking.id}/availability?date=${date}`);
    assert.equal(availabilityResponse.status, 200, 'public availability must be generated server-side');
    const availability = (await availabilityResponse.json()).availability;
    assert.ok(availability.slots.length > 0, 'future weekly availability must expose reservable slots');
    const slot = availability.slots[0];
    const selfBooking = await request(port, `/api/bookings/${booking.id}/book`, { method: 'POST', cookies: seller.cookies, csrfToken: seller.csrfToken, body: { appointment_date: date, appointment_time: slot.startTime, guest_count: 1, idempotency_key: 'protocol-self-booking-key' } });
    assert.equal(selfBooking.status, 422, 'providers must not book their own service');
    const idempotencyKey = 'protocol-booking-idempotency-key-1';
    const firstBooking = await request(port, `/api/bookings/${booking.id}/book`, { method: 'POST', cookies: buyer.cookies, csrfToken: buyer.csrfToken, body: { appointment_date: date, appointment_time: slot.startTime, guest_count: 1, idempotency_key: idempotencyKey } });
    assert.equal(firstBooking.status, 201, 'client should reserve an available slot');
    const firstAppointment = (await firstBooking.json()).appointment;
    assert.equal(firstAppointment.status, 'confirmed', 'instant confirmation should confirm safely');
    const replay = await request(port, `/api/bookings/${booking.id}/book`, { method: 'POST', cookies: buyer.cookies, csrfToken: buyer.csrfToken, body: { appointment_date: date, appointment_time: slot.startTime, guest_count: 1, idempotency_key: idempotencyKey } });
    assert.equal(replay.status, 200, 'replayed booking submissions must be idempotent');
    assert.equal((await replay.json()).alreadyProcessed, true, 'replayed booking must return the original appointment');
    const overCapacity = await request(port, `/api/bookings/${booking.id}/book`, { method: 'POST', cookies: secondBuyer.cookies, csrfToken: secondBuyer.csrfToken, body: { appointment_date: date, appointment_time: slot.startTime, guest_count: 1, idempotency_key: 'protocol-second-buyer-key' } });
    assert.equal(overCapacity.status, 409, 'a fully reserved appointment slot must reject another client');
    const replacementSlot = availability.slots[1];
    assert.ok(replacementSlot, 'the booking schedule must offer a second slot for rescheduling');
    const rescheduled = await request(port, `/api/appointments/${firstAppointment.id}/reschedule`, { method: 'POST', cookies: buyer.cookies, csrfToken: buyer.csrfToken, body: { appointment_date: date, appointment_time: replacementSlot.startTime } });
    assert.equal(rescheduled.status, 201, 'clients should be able to reschedule before the cancellation window closes');
    const movedAppointment = (await rescheduled.json()).appointment;
    assert.equal(movedAppointment.appointment_time, replacementSlot.startTime, 'rescheduling must update the protected appointment record');
    const rescheduleReplay = await request(port, `/api/appointments/${movedAppointment.id}/reschedule`, { method: 'POST', cookies: buyer.cookies, csrfToken: buyer.csrfToken, body: { appointment_date: date, appointment_time: replacementSlot.startTime } });
    assert.equal(rescheduleReplay.status, 200, 'repeating an already-applied reschedule must be harmless');
    assert.equal((await rescheduleReplay.json()).alreadyProcessed, true);

    const requestMode = await request(port, '/api/bookings', { method: 'POST', cookies: seller.cookies, csrfToken: seller.csrfToken, body: bookingPayload('request') });
    assert.equal(requestMode.status, 201, 'seller should create a request-confirmed booking service');
    const requestedBooking = (await requestMode.json()).booking;
    const requestedAvailability = await request(port, `/api/bookings/${requestedBooking.id}/availability?date=${date}`);
    const requestedSlot = (await requestedAvailability.json()).availability.slots[0];
    const requested = await request(port, `/api/bookings/${requestedBooking.id}/book`, { method: 'POST', cookies: secondBuyer.cookies, csrfToken: secondBuyer.csrfToken, body: { appointment_date: date, appointment_time: requestedSlot.startTime, guest_count: 1, idempotency_key: 'protocol-request-mode-key' } });
    assert.equal(requested.status, 201, 'client should be able to submit a provider-reviewed request');
    const requestedAppointment = (await requested.json()).appointment;
    assert.equal(requestedAppointment.status, 'pending', 'request confirmation mode must remain pending');
    const providerAppointments = await request(port, '/api/provider-appointments', { cookies: seller.cookies });
    assert.equal(providerAppointments.status, 200, 'provider must see their appointment queue');
    const unauthorizedAction = await request(port, `/api/appointments/${requestedAppointment.id}/action`, { method: 'POST', cookies: buyer.cookies, csrfToken: buyer.csrfToken, body: { action: 'confirm' } });
    assert.equal(unauthorizedAction.status, 403, 'clients cannot perform provider appointment actions');
    const confirmed = await request(port, `/api/appointments/${requestedAppointment.id}/action`, { method: 'POST', cookies: seller.cookies, csrfToken: seller.csrfToken, body: { action: 'confirm' } });
    assert.equal(confirmed.status, 200, 'provider can confirm a pending appointment');
    assert.equal((await confirmed.json()).appointment.status, 'confirmed');
  } finally {
    await stopServer(server);
  }
  console.log('Booking protocol HTTP smoke test passed.');
};

run().then(closeDatabase).catch(async (error) => {
  console.error(error.stack || error.message);
  try { await closeDatabase(); } catch (_) { /* preserve original failure */ }
  process.exitCode = 1;
}).finally(async () => {
  await fs.rm(testDirectory, { recursive: true, force: true });
});
