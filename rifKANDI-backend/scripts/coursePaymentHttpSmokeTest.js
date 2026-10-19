const assert = require('node:assert/strict');
const express = require('express');
const sqlite3 = require('sqlite3');
const createCoursePaymentRoutes = require('../src/routes/coursePaymentRoutes');
const db = new sqlite3.Database(':memory:');
const exec = sql => new Promise((resolve, reject) => db.exec(sql, error => error ? reject(error) : resolve()));
const pass = (_req, _res, next) => next();
const protect = (req, res, next) => { const id = Number(req.headers['x-user']); if (!id) return res.sendStatus(401); req.user = { id }; next(); };
const founder = (req, res, next) => req.user.id === 1 ? next() : res.sendStatus(403);

(async () => {
  await exec(`CREATE TABLE courses (id INTEGER PRIMARY KEY, instructor_id INTEGER, price REAL, status TEXT, title TEXT);
    CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE enrollments (id INTEGER PRIMARY KEY, user_id INTEGER, course_id INTEGER, UNIQUE(user_id, course_id));
    CREATE TABLE course_bank_transfers (id INTEGER PRIMARY KEY, purchase_number TEXT UNIQUE, course_id INTEGER, buyer_id INTEGER, instructor_id INTEGER, amount_minor INTEGER, commission_minor INTEGER, instructor_payout_minor INTEGER, currency TEXT DEFAULT 'MAD', payment_status TEXT DEFAULT 'awaiting_payment', transfer_reference TEXT, verification_note TEXT DEFAULT '', verified_by INTEGER, verified_at TEXT, payout_status TEXT DEFAULT 'not_due', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(course_id,buyer_id));
    INSERT INTO courses VALUES (11,7,100,'published','Course'); INSERT INTO users VALUES (7,'Instructor'),(8,'Buyer'),(1,'Founder');`);
  process.env.SELLER_COMMISSION_ACCOUNT_HOLDER = 'Example';
  process.env.SELLER_COMMISSION_BANK_NAME = 'Example';
  process.env.SELLER_COMMISSION_RIB = '00000000000000000000';
  const app = express(); app.use(express.json());
  app.use(createCoursePaymentRoutes({ db, protect, requireServiceReconciliationAccess: founder, validateIdParams: () => pass, requireCourses: pass }));
  app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'Internal error' }); });
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (url, user, body) => fetch(base + url, { method: body ? 'POST' : 'GET', headers: { 'x-user': String(user), 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  try {
    const instructions = await call('/courses/11/payment-instructions', 8, {}); assert.equal(instructions.status, 200);
    const payment = await instructions.json(); assert.equal(payment.payment.amount, 100);
    const repeat = await (await call('/courses/11/payment-instructions', 8, {})).json(); assert.equal(repeat.payment.id, payment.payment.id);
    assert.equal((await call('/courses/11/payment-instructions', 7, {})).status, 409);
    assert.equal((await call('/admin/course-reconciliation', 8)).status, 403);
    assert.equal((await call(`/admin/course-reconciliation/${payment.payment.id}/verify`, 1, { action: 'verify' })).status, 409);
    assert.equal((await call('/courses/11/payment-submission', 8, { transferReference: 'BANK-123' })).status, 200);
    assert.equal((await call('/courses/11/payment-submission', 8, { transferReference: 'BANK-123' })).status, 409);
    assert.equal((await call(`/admin/course-reconciliation/${payment.payment.id}/verify`, 1, { action: 'verify' })).status, 200);
    assert.equal((await call(`/admin/course-reconciliation/${payment.payment.id}/verify`, 1, { action: 'verify' })).status, 409);
    const enrolled = await new Promise((resolve, reject) => db.get('SELECT COUNT(*) AS count FROM enrollments WHERE user_id = 8 AND course_id = 11', (error, row) => error ? reject(error) : resolve(row.count)));
    assert.equal(enrolled, 1);
    console.log('Course payment HTTP smoke tests passed');
  } finally { await new Promise(resolve => server.close(resolve)); await new Promise(resolve => db.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
