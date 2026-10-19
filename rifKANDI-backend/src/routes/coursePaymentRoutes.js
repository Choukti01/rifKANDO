const crypto = require('node:crypto');
const express = require('express');
const { get, all, run, withTransaction } = require('../services/bookingProtocolService');
const Money = require('../services/moneyService');
const { coursePaymentAmounts } = require('../services/coursePaymentPolicy');
const { getCourseBankTransferConfig } = require('../services/courseBankTransferConfig');

const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const sendError = (error, res, next) => error.statusCode ? res.status(error.statusCode).json({ error: error.message }) : next(error);
const number = () => `CRS-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;

module.exports = ({ db, protect, requireServiceReconciliationAccess, validateIdParams, requireCourses }) => {
  const router = express.Router();
  router.use(['/courses/:id/payment-instructions', '/courses/:id/payment-submission', '/admin/course-reconciliation'], requireCourses);

  router.post('/courses/:id/payment-instructions', protect, validateIdParams('id'), async (req, res, next) => {
    try {
      const bank = getCourseBankTransferConfig();
      if (!bank) throw fail('Bank transfer is temporarily unavailable. Please contact support.', 503);
      const payment = await withTransaction(db, async tx => {
        const course = await get(tx, 'SELECT id, instructor_id, price, status FROM courses WHERE id = ?', [req.params.id]);
        if (!course || course.status !== 'published') throw fail('Course not found.', 404);
        if (Number(course.instructor_id) === Number(req.user.id)) throw fail('You cannot purchase your own course.', 409);
        const amount = coursePaymentAmounts(Money.toMinor(course.price));
        await run(tx, `INSERT INTO course_bank_transfers (purchase_number, course_id, buyer_id, instructor_id, amount_minor, commission_minor, instructor_payout_minor)
          VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(course_id, buyer_id) DO NOTHING`, [number(), course.id, req.user.id, course.instructor_id, amount.amountMinor, amount.commissionMinor, amount.instructorPayoutMinor]);
        return get(tx, 'SELECT * FROM course_bank_transfers WHERE course_id = ? AND buyer_id = ?', [course.id, req.user.id]);
      });
      res.set('Cache-Control', 'private, no-store');
      return res.json({ success: true, payment: { id: payment.id, status: payment.payment_status, reference: payment.purchase_number, amount: Money.fromMinor(payment.amount_minor), currency: payment.currency }, instructions: { account_holder: bank.accountHolder, bank_name: bank.bankName, rib: bank.rib } });
    } catch (error) { return sendError(error, res, next); }
  });

  router.post('/courses/:id/payment-submission', protect, validateIdParams('id'), async (req, res, next) => {
    try {
      const reference = String(req.body?.transferReference || '').trim();
      if (!/^[A-Za-z0-9 _./:-]{3,256}$/.test(reference)) throw fail('Provide a valid transfer reference.', 422);
      await withTransaction(db, async tx => {
        const result = await run(tx, `UPDATE course_bank_transfers SET transfer_reference = ?, payment_status = 'submitted', updated_at = CURRENT_TIMESTAMP
          WHERE course_id = ? AND buyer_id = ? AND payment_status IN ('awaiting_payment','rejected')`, [reference, req.params.id, req.user.id]);
        if (result.changes !== 1) throw fail('Payment is not awaiting submission.', 409);
      });
      res.set('Cache-Control', 'private, no-store');
      return res.json({ success: true, message: 'Your reference was submitted for manual bank verification.' });
    } catch (error) { return sendError(error, res, next); }
  });

  router.get('/admin/course-reconciliation', protect, requireServiceReconciliationAccess, async (_req, res, next) => {
    try {
      const payments = await all(db, `SELECT p.*, c.title AS course_title, buyer.name AS buyer_name, instructor.name AS instructor_name
        FROM course_bank_transfers p JOIN courses c ON c.id = p.course_id JOIN users buyer ON buyer.id = p.buyer_id
        JOIN users instructor ON instructor.id = p.instructor_id ORDER BY p.created_at DESC LIMIT 200`);
      res.set('Cache-Control', 'private, no-store');
      return res.json({ success: true, payments });
    } catch (error) { return next(error); }
  });

  router.post('/admin/course-reconciliation/:id/verify', requireCourses, protect, requireServiceReconciliationAccess, validateIdParams('id'), async (req, res, next) => {
    try {
      const action = String(req.body?.action || '');
      if (!['verify', 'reject'].includes(action)) throw fail('Choose verify or reject.', 422);
      const note = String(req.body?.note || '').trim();
      if (note.length > 1000) throw fail('Note is too long.', 422);
      await withTransaction(db, async tx => {
        const payment = await get(tx, 'SELECT * FROM course_bank_transfers WHERE id = ?', [req.params.id]);
        if (!payment) throw fail('Payment not found.', 404);
        const status = action === 'verify' ? 'verified' : 'rejected';
        const changed = await run(tx, `UPDATE course_bank_transfers SET payment_status = ?, payout_status = CASE WHEN ? = 'verified' THEN 'due' ELSE 'not_due' END, verification_note = ?, verified_by = ?,
          verified_at = CASE WHEN ? = 'verified' THEN CURRENT_TIMESTAMP ELSE NULL END, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND payment_status = 'submitted'`, [status, status, note, req.user.id, status, payment.id]);
        if (changed.changes !== 1) throw fail('Payment has already been processed or was not submitted.', 409);
        if (status === 'verified') await run(tx, 'INSERT INTO enrollments (user_id, course_id) VALUES (?, ?) ON CONFLICT(user_id, course_id) DO NOTHING', [payment.buyer_id, payment.course_id]);
      });
      return res.json({ success: true });
    } catch (error) { return sendError(error, res, next); }
  });

  // This records a transfer already made outside rifKANDO; it never moves money.
  router.post('/admin/course-reconciliation/:id/payout', requireCourses, protect, requireServiceReconciliationAccess, validateIdParams('id'), async (req, res, next) => {
    try {
      const reference = String(req.body?.payoutReference || '').trim();
      if (!/^[A-Za-z0-9 _./:-]{3,256}$/.test(reference)) throw fail('Provide the actual payout reference.', 422);
      await withTransaction(db, async tx => {
        const result = await run(tx, `UPDATE course_bank_transfers
          SET payout_status = 'paid', payout_reference = ?, paid_by = ?, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND payment_status = 'verified' AND payout_status = 'due'`, [reference, req.user.id, req.params.id]);
        if (result.changes !== 1) throw fail('Payout is not due or has already been recorded.', 409);
      });
      return res.json({ success: true });
    } catch (error) { return sendError(error, res, next); }
  });
  return router;
};
