const Money = require('./moneyService');
const WalletService = require('./walletService');

const SELLER_ACTIONS = new Set(['confirm', 'request_handoff', 'cancel']);
const PHYSICAL_STATUSES = new Set([
  'pending_confirmation',
  'confirmed',
  'shipped',
  'delivered',
  'refused',
  'returned',
  'cancelled',
]);
const TERMINAL_STATUSES = new Set(['delivered', 'refused', 'returned', 'cancelled']);

const cleanText = (value, maxLength = 1_000) => String(value || '').trim().slice(0, maxLength);
const commissionReference = (fulfillment) => `RKC-${String(fulfillment.order_number).replace(/[^A-Za-z0-9]/g, '').slice(-18)}-${fulfillment.id}`;
const validatedDeliveryDeadline = (value, now = Date.now()) => {
  const parsed = Date.parse(value);
  const maximum = now + (90 * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(parsed) || parsed < now - (5 * 60 * 1000) || parsed > maximum) {
    throw new Error('The delivery deadline must be between now and 90 days from now.');
  }
  return new Date(parsed).toISOString();
};

const getAmountMinor = (row, minorColumn, decimalColumn) => {
  if (Number.isSafeInteger(row?.[minorColumn])) {
    return Money.assertMinor(row[minorColumn], { allowZero: true, allowNegative: true });
  }
  return Money.toMinor(row?.[decimalColumn] ?? 0, { allowZero: true, allowNegative: true });
};

class CodFulfillmentService {
  static confirmationWindowHours() {
    return Math.min(168, Math.max(1, Number.parseInt(process.env.COD_SELLER_CONFIRMATION_HOURS || '24', 10) || 24));
  }

  static confirmationExpired(fulfillment, now = Date.now()) {
    const deadline = fulfillment.confirmation_expires_at
      ? Date.parse(fulfillment.confirmation_expires_at)
      : Date.parse(fulfillment.created_at) + (this.confirmationWindowHours() * 60 * 60 * 1000);
    return Number.isFinite(deadline) && deadline <= now;
  }

  // Safe to run from both a timer and request paths: each update is conditional
  // and wrapped in the same serializable financial transaction as COD actions.
  static async expirePendingConfirmations({ now = Date.now(), limit = 100 } = {}) {
    const candidates = await WalletService.all(
      `SELECT id, created_at, confirmation_expires_at FROM cod_fulfillments
       WHERE status = 'pending_confirmation' ORDER BY created_at ASC LIMIT ?`,
      [Math.max(1, Math.min(500, Number(limit) || 100))]
    );
    let expired = 0;
    for (const candidate of candidates) {
      if (!this.confirmationExpired(candidate, now)) continue;
      const changed = await WalletService.withFinancialTransaction(async (tx) => {
        const fulfillment = await this.getFulfillmentTx(tx, candidate.id);
        if (!fulfillment || fulfillment.status !== 'pending_confirmation' || !this.confirmationExpired(fulfillment, now)) return false;
        const update = await tx.run(
          `UPDATE cod_fulfillments SET status = 'cancelled', settlement_status = 'void',
             cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, exception_note = ?
           WHERE id = ? AND status = 'pending_confirmation'`,
          [`Seller confirmation expired after ${this.confirmationWindowHours()} hours.`, fulfillment.id]
        );
        if (update.changes !== 1) return false;
        await this.restoreSellerInventoryTx(tx, fulfillment.order_id, fulfillment.seller_id);
        await this.addHistoryTx(tx, fulfillment.order_id, 'cancelled', `Seller confirmation expired after ${this.confirmationWindowHours()} hours.`, null);
        await this.cancelFinancialSplitsIfTerminalTx(tx, fulfillment.order_id);
        await this.syncOrderStateTx(tx, fulfillment.order_id);
        return true;
      });
      if (changed) expired += 1;
    }
    return expired;
  }

  static async getFulfillmentTx(tx, fulfillmentId, sellerId = null) {
    const where = sellerId === null ? 'f.id = ?' : 'f.id = ? AND f.seller_id = ?';
    const params = sellerId === null ? [fulfillmentId] : [fulfillmentId, sellerId];
    return tx.get(WalletService.lockForUpdate(`
      SELECT f.*, o.order_number, o.order_type, o.user_id AS buyer_id, o.status AS order_status,
             o.payment_status
      FROM cod_fulfillments f
      JOIN orders o ON o.id = f.order_id
      WHERE ${where}
    `), params);
  }

  static async addHistoryTx(tx, orderId, status, note, actorId) {
    await tx.run(
      `INSERT INTO order_status_history (order_id, status, note, created_by)
       VALUES (?, ?, ?, ?)`,
      [orderId, status, cleanText(note), actorId]
    );
  }

  // Disputes are operational evidence, not a replacement for finance. While a
  // case is active, however, no irreversible COD cash or payout action may be
  // recorded. Keep this inside the same transaction as the protected action so
  // a concurrently opened dispute cannot race a settlement through.
  static async assertNoActiveDisputeTx(tx, fulfillmentId) {
    const active = await tx.get(
      WalletService.lockForUpdate(`
        SELECT id
        FROM order_disputes
        WHERE fulfillment_id = ? AND status IN ('open', 'in_review', 'return_required')
        LIMIT 1
      `),
      [fulfillmentId]
    );
    if (active) {
      throw new Error('This COD delivery has an active dispute. Resolve the case before recording cash, remittance, or a seller payout.');
    }
  }

  static async syncOrderStateTx(tx, orderId) {
    const fulfillments = await tx.all(
      WalletService.lockForUpdate('SELECT status, settlement_status, seller_payout_status FROM cod_fulfillments WHERE order_id = ? ORDER BY id ASC'),
      [orderId]
    );
    if (fulfillments.length === 0) return null;

    const statuses = fulfillments.map((item) => item.status);
    let nextStatus = 'pending';
    if (statuses.every((status) => status === 'delivered')) nextStatus = 'delivered';
    else if (statuses.every((status) => status === 'refused')) nextStatus = 'refused';
    else if (statuses.every((status) => status === 'returned')) nextStatus = 'returned';
    else if (statuses.every((status) => TERMINAL_STATUSES.has(status))) nextStatus = 'cancelled';
    else if (statuses.some((status) => status === 'shipped')) nextStatus = 'shipped';
    else if (statuses.some((status) => status === 'confirmed')) nextStatus = 'processing';

    // A delivery partner remittance settles the cash collection, but the
    // order is not financially complete until rifKANDO has recorded the
    // seller's separate manual payout.
    const allSettled = fulfillments.every((item) => item.settlement_status === 'settled'
      && (!item.seller_payout_status || item.seller_payout_status === 'paid'));
    const allVoid = fulfillments.every((item) => item.settlement_status === 'void');
    const someCollected = fulfillments.some((item) => item.status === 'delivered');
    const paymentStatus = allSettled ? 'settled' : allVoid ? 'cancelled' : someCollected ? 'collected' : 'pending';

    await tx.run(
      'UPDATE orders SET status = ?, payment_status = ? WHERE id = ?',
      [nextStatus, paymentStatus, orderId]
    );
    return { status: nextStatus, paymentStatus };
  }

  static async restoreSellerInventoryTx(tx, orderId, sellerId) {
    const items = await tx.all(
      WalletService.lockForUpdate(`
        SELECT oi.product_id, oi.quantity
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ? AND p.seller_id = ?
      `),
      [orderId, sellerId]
    );
    for (const item of items) {
      await tx.run(
        `UPDATE products
         SET stock = stock + ?, sold = MAX(COALESCE(sold, 0) - ?, 0)
         WHERE id = ?`,
        [item.quantity, item.quantity, item.product_id]
      );
    }
  }

  static async cancelFinancialSplitsIfTerminalTx(tx, orderId) {
    const active = await tx.get(
      // PostgreSQL cannot apply FOR UPDATE to an aggregate query. This
      // transaction already runs at SERIALIZABLE isolation, so the aggregate
      // read remains safe and concurrent state changes cause a retry.
      `SELECT COUNT(*) AS count
       FROM cod_fulfillments
       WHERE order_id = ? AND settlement_status NOT IN ('settled', 'void')`,
      [orderId]
    );
    if (Number(active?.count || 0) !== 0) return;
    await tx.run(
      `UPDATE payment_splits
       SET status = 'cancelled'
       WHERE order_id = ? AND status = 'pending'`,
      [orderId]
    );
  }

  static async sellerAction({ fulfillmentId, sellerId, action, note = '' }) {
    const safeFulfillmentId = WalletService.positiveInteger(fulfillmentId, 'Fulfillment ID');
    const safeSellerId = WalletService.positiveInteger(sellerId, 'Seller ID');
    if (!SELLER_ACTIONS.has(action)) throw new Error('Unsupported COD fulfilment action.');

    return WalletService.withFinancialTransaction(async (tx) => {
      const fulfillment = await this.getFulfillmentTx(tx, safeFulfillmentId, safeSellerId);
      if (!fulfillment) throw new Error('COD fulfilment was not found.');
      if (!PHYSICAL_STATUSES.has(fulfillment.status)) throw new Error('COD fulfilment has an invalid status.');

      if (action === 'confirm') {
        if (fulfillment.status !== 'pending_confirmation') {
          throw new Error('Only a new COD order can be confirmed.');
        }
        if (this.confirmationExpired(fulfillment)) {
          throw new Error('This COD order expired because it was not confirmed in time.');
        }
        await tx.run(
          `UPDATE cod_fulfillments
           SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND status = 'pending_confirmation'`,
          [fulfillment.id]
        );
        await this.addHistoryTx(tx, fulfillment.order_id, 'processing', 'Seller confirmed the COD order.', safeSellerId);
      }

      if (action === 'request_handoff') {
        if (fulfillment.status !== 'confirmed') {
          throw new Error('Confirm the COD order before requesting a delivery-partner pickup.');
        }
        if (!fulfillment.delivery_partner_contacted_at) {
          const update = await tx.run(
            `UPDATE cod_fulfillments
             SET delivery_partner_name = 'Toufiq Zariohi', delivery_partner_contacted_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND status = 'confirmed' AND delivery_partner_contacted_at IS NULL`,
            [fulfillment.id]
          );
          if (update.changes !== 1) throw new Error('The delivery handoff changed before it could be recorded.');
          await this.addHistoryTx(
            tx,
            fulfillment.order_id,
            'processing',
            'Seller requested a Toufiq Zariohi delivery-partner pickup.',
            safeSellerId
          );
        }
      }

      if (action === 'cancel') {
        if (!['pending_confirmation', 'confirmed'].includes(fulfillment.status)) {
          throw new Error('Only an unshipped COD order can be cancelled by the seller.');
        }
        const update = await tx.run(
          `UPDATE cod_fulfillments
           SET status = 'cancelled', settlement_status = 'void', exception_note = ?,
               cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND status IN ('pending_confirmation', 'confirmed')`,
          [cleanText(note) || 'Seller cancelled before dispatch.', fulfillment.id]
        );
        if (update.changes !== 1) throw new Error('COD fulfilment changed before cancellation.');
        await this.restoreSellerInventoryTx(tx, fulfillment.order_id, safeSellerId);
        await this.addHistoryTx(tx, fulfillment.order_id, 'cancelled', cleanText(note) || 'Seller cancelled before dispatch.', safeSellerId);
      }

      await this.cancelFinancialSplitsIfTerminalTx(tx, fulfillment.order_id);
      const orderState = await this.syncOrderStateTx(tx, fulfillment.order_id);
      const updated = await this.getFulfillmentTx(tx, safeFulfillmentId, safeSellerId);
      return { fulfillment: updated, orderState };
    });
  }

  static async confirmDeliveryPartnerPickup({ fulfillmentId, operationsUserId, carrierName, trackingNumber, note = '' }) {
    const safeFulfillmentId = WalletService.positiveInteger(fulfillmentId, 'Fulfillment ID');
    const safeOperationsUserId = WalletService.positiveInteger(operationsUserId, 'Operations user ID');
    const safeCarrier = cleanText(carrierName, 120);
    const safeTracking = cleanText(trackingNumber, 128);
    if (!safeCarrier || !safeTracking) throw new Error('Carrier name and tracking number are required to confirm pickup.');

    return WalletService.withFinancialTransaction(async (tx) => {
      const fulfillment = await this.getFulfillmentTx(tx, safeFulfillmentId);
      if (!fulfillment) throw new Error('COD fulfilment was not found.');
      if (fulfillment.status !== 'confirmed') {
        throw new Error('Only a confirmed COD order can be handed to the delivery partner.');
      }
      if (!fulfillment.delivery_partner_contacted_at) {
        throw new Error('Wait for the seller to request Toufiq pickup before confirming handoff.');
      }
      if (!fulfillment.delivery_fee_quoted_at || !fulfillment.delivery_deadline_at) {
        throw new Error('Set the buyer delivery quote and arrival deadline before confirming pickup.');
      }

      const update = await tx.run(
        `UPDATE cod_fulfillments
         SET status = 'shipped', delivery_partner_name = 'Toufiq Zariohi',
             delivery_partner_pickup_at = CURRENT_TIMESTAMP, carrier_name = ?, tracking_number = ?,
             collection_note = ?, dispatched_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'confirmed'`,
        [safeCarrier, safeTracking, cleanText(note), fulfillment.id]
      );
      if (update.changes !== 1) throw new Error('The COD fulfilment changed before pickup could be confirmed.');
      await this.addHistoryTx(
        tx,
        fulfillment.order_id,
        'shipped',
        `Toufiq Zariohi collected the parcel for ${safeCarrier}. Tracking: ${safeTracking}.`,
        safeOperationsUserId
      );
      const orderState = await this.syncOrderStateTx(tx, fulfillment.order_id);
      return { fulfillment: await this.getFulfillmentTx(tx, safeFulfillmentId), orderState };
    });
  }

  // A delivery quote is an operational decision, not seller-controlled listing
  // data. It is frozen before pickup so collection and reconciliation can use
  // the same amount that was communicated to the buyer.
  static async quoteDeliveryFee({ fulfillmentId, operationsUserId, deliveryFee, deliveryDeadline, note = '' }) {
    const safeFulfillmentId = WalletService.positiveInteger(fulfillmentId, 'Fulfillment ID');
    const safeOperationsUserId = WalletService.positiveInteger(operationsUserId, 'Operations user ID');
    const deliveryFeeMinor = Money.toMinor(deliveryFee, { allowZero: true });
    const deadlineIso = validatedDeliveryDeadline(deliveryDeadline);
    const safeNote = cleanText(note);

    return WalletService.withFinancialTransaction(async (tx) => {
      const fulfillment = await this.getFulfillmentTx(tx, safeFulfillmentId);
      if (!fulfillment) throw new Error('COD fulfilment was not found.');
      if (fulfillment.status !== 'confirmed' || fulfillment.delivery_partner_pickup_at) {
        throw new Error('A delivery quote can be set only before pickup for a confirmed COD order.');
      }

      const grossMinor = getAmountMinor(fulfillment, 'gross_amount_minor', 'gross_amount');
      const expectedCodMinor = grossMinor + deliveryFeeMinor;
      const update = await tx.run(
        `UPDATE cod_fulfillments
         SET customer_delivery_fee = ?, customer_delivery_fee_minor = ?,
             expected_cod_amount = ?, expected_cod_amount_minor = ?,
             delivery_fee_quoted_at = CURRENT_TIMESTAMP, delivery_fee_quoted_by = ?,
             delivery_fee_quote_note = ?, delivery_deadline_at = ?,
             delivery_deadline_set_at = CURRENT_TIMESTAMP, delivery_deadline_set_by = ?
         WHERE id = ? AND status = 'confirmed' AND delivery_partner_pickup_at IS NULL`,
        [
          Money.fromMinor(deliveryFeeMinor), deliveryFeeMinor,
          Money.fromMinor(expectedCodMinor), expectedCodMinor,
          safeOperationsUserId, safeNote, deadlineIso, safeOperationsUserId, fulfillment.id,
        ]
      );
      if (update.changes !== 1) throw new Error('The COD fulfilment changed before its delivery quote could be saved.');

      const total = await tx.get(
        `SELECT COALESCE(SUM(expected_cod_amount_minor), 0) AS total_minor
         FROM cod_fulfillments WHERE order_id = ? AND status <> 'cancelled'`,
        [fulfillment.order_id]
      );
      const orderTotalMinor = Money.assertMinor(Number(total?.total_minor || 0), { allowZero: true });
      await tx.run(
        'UPDATE orders SET total = ?, total_minor = ? WHERE id = ?',
        [Money.fromMinor(orderTotalMinor), orderTotalMinor, fulfillment.order_id]
      );
      await this.addHistoryTx(
        tx,
        fulfillment.order_id,
        'processing',
        `COD delivery quoted at ${Money.formatMinor(deliveryFeeMinor)} MAD with arrival deadline ${deadlineIso} by COD Operations.${safeNote ? ` ${safeNote}` : ''}`,
        safeOperationsUserId
      );
      return { fulfillment: await this.getFulfillmentTx(tx, safeFulfillmentId) };
    });
  }

  static async recordCollection({ fulfillmentId, financeUserId, carrierReference, collectedAmount, carrierDeliveryFee = 0, carrierReturnFee = 0, note = '' }) {
    const safeFulfillmentId = WalletService.positiveInteger(fulfillmentId, 'Fulfillment ID');
    const safeFinanceUserId = WalletService.positiveInteger(financeUserId, 'Finance user ID');
    const collectionMinor = Money.toMinor(collectedAmount);
    const deliveryFeeMinor = Money.toMinor(carrierDeliveryFee, { allowZero: true });
    const returnFeeMinor = Money.toMinor(carrierReturnFee, { allowZero: true });
    const safeReference = cleanText(carrierReference, 256);
    if (!safeReference) throw new Error('A carrier collection reference is required.');

    return WalletService.withFinancialTransaction(async (tx) => {
      const fulfillment = await this.getFulfillmentTx(tx, safeFulfillmentId);
      if (!fulfillment) throw new Error('COD fulfilment was not found.');
      if (fulfillment.status !== 'shipped') {
        throw new Error('Only a shipped COD fulfilment can have a carrier collection recorded.');
      }
      if (fulfillment.delivery_reported_at && fulfillment.delivery_report_outcome !== 'delivered') {
        throw new Error(`Toufiq reported this parcel as ${fulfillment.delivery_report_outcome}. Record the matching delivery exception instead of a cash collection.`);
      }
      await this.assertNoActiveDisputeTx(tx, fulfillment.id);
      const expectedAmount = getAmountMinor(fulfillment, 'expected_cod_amount_minor', 'expected_cod_amount');
      if (collectionMinor !== expectedAmount) {
        throw new Error(`Collected COD must equal the expected amount of ${Money.formatMinor(expectedAmount)} MAD.`);
      }
      const customerDeliveryFeeMinor = getAmountMinor(fulfillment, 'customer_delivery_fee_minor', 'customer_delivery_fee');
      if (deliveryFeeMinor !== customerDeliveryFeeMinor) {
        throw new Error(`Toufiq delivery fee must equal the ${Money.formatMinor(customerDeliveryFeeMinor)} MAD quote recorded by COD Operations.`);
      }
      if (deliveryFeeMinor > collectionMinor) {
        throw new Error('Carrier delivery fee cannot exceed the COD amount collected.');
      }

      const existingReference = await tx.get(
        WalletService.lockForUpdate('SELECT id FROM cod_fulfillments WHERE carrier_collection_reference = ?'),
        [safeReference]
      );
      if (existingReference && Number(existingReference.id) !== Number(fulfillment.id)) {
        throw new Error('This carrier collection reference is already linked to another fulfilment.');
      }

      const update = await tx.run(
        `UPDATE cod_fulfillments
         SET status = 'delivered', settlement_status = 'awaiting_remittance',
             collected_amount = ?, collected_amount_minor = ?,
             carrier_delivery_fee = ?, carrier_delivery_fee_minor = ?,
             carrier_return_fee = ?, carrier_return_fee_minor = ?,
             carrier_collection_reference = ?, collection_note = ?,
             delivered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'shipped'`,
        [
          Money.fromMinor(collectionMinor), collectionMinor,
          Money.fromMinor(deliveryFeeMinor), deliveryFeeMinor,
          Money.fromMinor(returnFeeMinor), returnFeeMinor,
          safeReference, cleanText(note), fulfillment.id,
        ]
      );
      if (update.changes !== 1) throw new Error('COD fulfilment changed before carrier collection was recorded.');
      await this.addHistoryTx(
        tx,
        fulfillment.order_id,
        'delivered',
        `Carrier collection recorded. Reference: ${safeReference}. Seller settlement awaits carrier remittance.`,
        safeFinanceUserId
      );
      const orderState = await this.syncOrderStateTx(tx, fulfillment.order_id);
      const updated = await this.getFulfillmentTx(tx, safeFulfillmentId);
      return { fulfillment: updated, orderState };
    });
  }

  // Delivery partners may report the real-world outcome, but reporting is not
  // a financial event. Finance must still independently record cash collection
  // or a return/refusal, with its real receipt/reference.
  static async reportDeliveryOutcome({ fulfillmentId, operationsUserId, outcome, note }) {
    const safeFulfillmentId = WalletService.positiveInteger(fulfillmentId, 'Fulfillment ID');
    const safeOperationsUserId = WalletService.positiveInteger(operationsUserId, 'Operations user ID');
    const safeOutcome = cleanText(outcome, 32);
    const safeNote = cleanText(note);
    if (!['delivered', 'refused', 'returned'].includes(safeOutcome)) {
      throw new Error('Unsupported delivery outcome.');
    }
    if (!safeNote) throw new Error('A delivery report note is required.');

    return WalletService.withFinancialTransaction(async (tx) => {
      const fulfillment = await this.getFulfillmentTx(tx, safeFulfillmentId);
      if (!fulfillment) throw new Error('COD fulfilment was not found.');
      if (fulfillment.status !== 'shipped') {
        throw new Error('Only a shipped COD fulfilment can receive a delivery report.');
      }
      if (fulfillment.delivery_reported_at) {
        throw new Error('A delivery outcome has already been reported. Finance must now record the final evidence.');
      }
      const update = await tx.run(
        `UPDATE cod_fulfillments
         SET delivery_report_outcome = ?, delivery_report_note = ?,
             delivery_reported_at = CURRENT_TIMESTAMP, delivery_reported_by = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'shipped' AND delivery_reported_at IS NULL`,
        [safeOutcome, safeNote, safeOperationsUserId, fulfillment.id]
      );
      if (update.changes !== 1) throw new Error('The delivery report changed before it could be recorded.');
      await this.addHistoryTx(
        tx,
        fulfillment.order_id,
        'delivery_reported',
        `Toufiq operations reported ${safeOutcome}: ${safeNote}`,
        safeOperationsUserId
      );
      return { fulfillment: await this.getFulfillmentTx(tx, safeFulfillmentId) };
    });
  }

  // Seller-managed COD deliberately has no carrier-to-platform remittance.
  // A finance reviewer confirms delivery from the carrier tracking evidence;
  // only then is the seller's independently collected commission payable.
  static async confirmSellerManagedDelivery({ fulfillmentId, financeUserId, note = '' }) {
    const safeFulfillmentId = WalletService.positiveInteger(fulfillmentId, 'Fulfillment ID');
    const safeFinanceUserId = WalletService.positiveInteger(financeUserId, 'Finance user ID');
    return WalletService.withFinancialTransaction(async (tx) => {
      const fulfillment = await this.getFulfillmentTx(tx, safeFulfillmentId);
      if (!fulfillment) throw new Error('COD fulfilment was not found.');
      if (fulfillment.status !== 'shipped') {
        throw new Error('Only a shipped COD fulfilment can be confirmed as delivered.');
      }
      await this.assertNoActiveDisputeTx(tx, fulfillment.id);
      if (!cleanText(fulfillment.carrier_name, 120) || !cleanText(fulfillment.tracking_number, 128)) {
        throw new Error('Carrier and tracking evidence are required before delivery can be confirmed.');
      }
      const reference = commissionReference(fulfillment);
      const update = await tx.run(
        `UPDATE cod_fulfillments
         SET status = 'delivered', settlement_status = 'awaiting_remittance',
             commission_payment_status = 'due', commission_reference = ?,
             commission_due_at = datetime('now', '+3 days'), collection_note = ?,
             delivered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'shipped' AND commission_payment_status = 'not_due'`,
        [reference, cleanText(note) || 'Delivery confirmed by rifKANDO finance from carrier evidence.', fulfillment.id]
      );
      if (update.changes !== 1) throw new Error('COD fulfilment changed before delivery confirmation.');
      await this.addHistoryTx(
        tx,
        fulfillment.order_id,
        'delivered',
        `Delivery confirmed. rifKANDO commission ${reference} is due within three days.`,
        safeFinanceUserId
      );
      const orderState = await this.syncOrderStateTx(tx, fulfillment.order_id);
      return { fulfillment: await this.getFulfillmentTx(tx, safeFulfillmentId), orderState };
    });
  }

  static async submitSellerManagedCommission({ fulfillmentId, sellerId, paymentReference, note = '' }) {
    const safeFulfillmentId = WalletService.positiveInteger(fulfillmentId, 'Fulfillment ID');
    const safeSellerId = WalletService.positiveInteger(sellerId, 'Seller ID');
    const safeReference = cleanText(paymentReference, 256);
    if (!safeReference) throw new Error('Your Attijari transfer reference is required.');

    return WalletService.withFinancialTransaction(async (tx) => {
      const fulfillment = await this.getFulfillmentTx(tx, safeFulfillmentId, safeSellerId);
      if (!fulfillment) throw new Error('COD fulfilment was not found.');
      if (!['due', 'submitted'].includes(fulfillment.commission_payment_status)) {
        throw new Error('This COD commission is not awaiting payment.');
      }
      if (fulfillment.commission_payment_status === 'submitted') {
        if (fulfillment.commission_payment_reference === safeReference) return { fulfillment, alreadySubmitted: true };
        throw new Error('A commission payment is already awaiting finance verification.');
      }
      const duplicate = await tx.get(
        WalletService.lockForUpdate('SELECT id FROM cod_fulfillments WHERE commission_payment_reference = ?'),
        [safeReference]
      );
      if (duplicate && Number(duplicate.id) !== Number(fulfillment.id)) {
        throw new Error('This transfer reference is already linked to another commission payment.');
      }
      const update = await tx.run(
        `UPDATE cod_fulfillments
         SET commission_payment_status = 'submitted', commission_payment_reference = ?,
             commission_payment_note = ?, commission_submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND seller_id = ? AND commission_payment_status = 'due'`,
        [safeReference, cleanText(note), fulfillment.id, safeSellerId]
      );
      if (update.changes !== 1) throw new Error('The commission payment state changed before it could be submitted.');
      await this.addHistoryTx(tx, fulfillment.order_id, 'commission_submitted', `Seller submitted commission payment reference: ${safeReference}.`, safeSellerId);
      return { fulfillment: await this.getFulfillmentTx(tx, safeFulfillmentId, safeSellerId), alreadySubmitted: false };
    });
  }

  static async verifySellerManagedCommission({ fulfillmentId, financeUserId, note = '' }) {
    const safeFulfillmentId = WalletService.positiveInteger(fulfillmentId, 'Fulfillment ID');
    const safeFinanceUserId = WalletService.positiveInteger(financeUserId, 'Finance user ID');
    return WalletService.withFinancialTransaction(async (tx) => {
      const fulfillment = await this.getFulfillmentTx(tx, safeFulfillmentId);
      if (!fulfillment) throw new Error('COD fulfilment was not found.');
      if (fulfillment.commission_payment_status === 'paid') return { fulfillment, alreadyProcessed: true };
      if (fulfillment.commission_payment_status !== 'submitted') {
        throw new Error('Verify the seller\'s actual Attijari transfer only after they submit its reference.');
      }
      await this.assertNoActiveDisputeTx(tx, fulfillment.id);
      const operation = await WalletService.createOperationTx(tx, {
        operationKey: `seller-managed-cod-commission:${safeFulfillmentId}`,
        operationType: 'seller_managed_cod_commission',
        referenceType: 'cod_fulfilment',
        referenceId: safeFulfillmentId,
        metadata: { financeUserId: safeFinanceUserId, paymentReference: fulfillment.commission_payment_reference },
      });
      if (operation.alreadyProcessed) return { fulfillment: await this.getFulfillmentTx(tx, safeFulfillmentId), alreadyProcessed: true };
      const update = await tx.run(
        `UPDATE cod_fulfillments
         SET commission_payment_status = 'paid', settlement_status = 'settled',
             commission_verified_at = CURRENT_TIMESTAMP, commission_verified_by = ?,
             settlement_note = ?, settled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND commission_payment_status = 'submitted'`,
        [safeFinanceUserId, cleanText(note) || 'Attijari commission transfer verified by rifKANDO finance.', fulfillment.id]
      );
      if (update.changes !== 1) throw new Error('The commission payment state changed before verification.');
      await tx.run(
        `UPDATE payment_splits SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE order_id = ? AND status = 'pending' AND party_type IN ('seller', 'platform', 'delivery')`,
        [fulfillment.order_id]
      );
      await this.addHistoryTx(tx, fulfillment.order_id, 'settled', `rifKANDO commission ${fulfillment.commission_reference} verified.`, safeFinanceUserId);
      const orderState = await this.syncOrderStateTx(tx, fulfillment.order_id);
      return { fulfillment: await this.getFulfillmentTx(tx, safeFulfillmentId), orderState, alreadyProcessed: false };
    });
  }

  static async settle({ fulfillmentId, financeUserId, settlementReference, remittedAmount, note = '' }) {
    const safeFulfillmentId = WalletService.positiveInteger(fulfillmentId, 'Fulfillment ID');
    const safeFinanceUserId = WalletService.positiveInteger(financeUserId, 'Finance user ID');
    const safeReference = cleanText(settlementReference, 256);
    if (!safeReference) throw new Error('A carrier remittance reference is required.');
    const remittedMinor = Money.toMinor(remittedAmount, { allowZero: true });

    return WalletService.withFinancialTransaction(async (tx) => {
      const fulfillment = await this.getFulfillmentTx(tx, safeFulfillmentId);
      if (!fulfillment) throw new Error('COD fulfilment was not found.');
      if (fulfillment.settlement_status === 'settled') {
        return { fulfillment, alreadyProcessed: true };
      }
      if (fulfillment.status !== 'delivered' || fulfillment.settlement_status !== 'awaiting_remittance') {
        throw new Error('Only carrier-collected COD fulfilments can be settled.');
      }
      await this.assertNoActiveDisputeTx(tx, fulfillment.id);
      const collectedMinor = getAmountMinor(fulfillment, 'collected_amount_minor', 'collected_amount');
      const carrierDeliveryMinor = getAmountMinor(fulfillment, 'carrier_delivery_fee_minor', 'carrier_delivery_fee');
      const expectedRemittanceMinor = Money.assertMinor(collectedMinor - carrierDeliveryMinor, { allowZero: true });
      if (remittedMinor !== expectedRemittanceMinor) {
        throw new Error(`Carrier remittance must equal ${Money.formatMinor(expectedRemittanceMinor)} MAD after the recorded delivery fee.`);
      }

      const operationKey = `cod-fulfilment-settlement:${safeFulfillmentId}`;
      const operation = await WalletService.createOperationTx(tx, {
        operationKey,
        operationType: 'cod_fulfilment_settlement',
        referenceType: 'cod_fulfilment',
        referenceId: safeFulfillmentId,
        metadata: { financeUserId: safeFinanceUserId, settlementReference: safeReference },
      });
      if (operation.alreadyProcessed) {
        const updated = await this.getFulfillmentTx(tx, safeFulfillmentId);
        return { fulfillment: updated, alreadyProcessed: true };
      }

      const split = await tx.get(
        WalletService.lockForUpdate(`
          SELECT * FROM payment_splits
          WHERE order_id = ? AND party_type = 'seller' AND party_id = ?
        `),
        [fulfillment.order_id, fulfillment.seller_id]
      );
      if (!split || split.status !== 'pending') {
        throw new Error('Seller settlement is not pending for this COD fulfilment.');
      }
      const sellerAmountMinor = getAmountMinor(split, 'amount_minor', 'amount');
      const splitUpdate = await tx.run(
        `UPDATE payment_splits
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'pending'`,
        [split.id]
      );
      if (splitUpdate.changes !== 1) throw new Error('Seller settlement was already processed.');

      await WalletService.moveBalanceTx(tx, {
        userId: fulfillment.seller_id,
        account: 'available_balance',
        delta: sellerAmountMinor,
        type: 'cod_settlement',
        referenceId: fulfillment.order_id,
        referenceType: 'order',
        description: `COD settlement for order #${fulfillment.order_number}`,
        idempotencyKey: `${operationKey}:seller:${fulfillment.seller_id}`,
        earnedDelta: sellerAmountMinor,
      });
      await tx.run(
        `UPDATE cod_fulfillments
         SET settlement_status = 'settled', carrier_settlement_reference = ?,
             remitted_amount = ?, remitted_amount_minor = ?, settlement_note = ?,
             settled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND settlement_status = 'awaiting_remittance'`,
        [safeReference, Money.fromMinor(remittedMinor), remittedMinor, cleanText(note), fulfillment.id]
      );

      const unsettled = await tx.get(
        // Aggregate rows cannot be locked with FOR UPDATE in PostgreSQL.
        // This surrounding SERIALIZABLE transaction retries if a concurrent
        // fulfilment state change invalidates the aggregate result.
        `SELECT COUNT(*) AS count
         FROM cod_fulfillments
         WHERE order_id = ? AND settlement_status != 'settled'`,
        [fulfillment.order_id]
      );
      if (Number(unsettled?.count || 0) === 0) {
        await tx.run(
          `UPDATE payment_splits
           SET status = 'completed', completed_at = CURRENT_TIMESTAMP
           WHERE order_id = ? AND party_type IN ('platform', 'delivery') AND status = 'pending'`,
          [fulfillment.order_id]
        );
      }
      await this.addHistoryTx(
        tx,
        fulfillment.order_id,
        'settled',
        `Carrier remittance reconciled. Reference: ${safeReference}. Seller balance is now available for payout.`,
        safeFinanceUserId
      );
      const orderState = await this.syncOrderStateTx(tx, fulfillment.order_id);
      const updated = await this.getFulfillmentTx(tx, safeFulfillmentId);
      return { fulfillment: updated, orderState, alreadyProcessed: false };
    });
  }

  // The launch model is deliberately manual: Toufiq remits the collected cash
  // to rifKANDO, then rifKANDO sends the already-calculated seller amount by
  // an external bank transfer. No wallet is credited until a real automated
  // payout provider exists.
  static async recordDeliveryPartnerRemittance({ fulfillmentId, financeUserId, settlementReference, remittedAmount, note = '' }) {
    const safeFulfillmentId = WalletService.positiveInteger(fulfillmentId, 'Fulfillment ID');
    const safeFinanceUserId = WalletService.positiveInteger(financeUserId, 'Finance user ID');
    const safeReference = cleanText(settlementReference, 256);
    const remittedMinor = Money.toMinor(remittedAmount, { allowZero: true });
    if (!safeReference) throw new Error('A Toufiq remittance reference is required.');

    return WalletService.withFinancialTransaction(async (tx) => {
      const fulfillment = await this.getFulfillmentTx(tx, safeFulfillmentId);
      if (!fulfillment) throw new Error('COD fulfilment was not found.');
      if (fulfillment.settlement_status === 'settled') return { fulfillment, alreadyProcessed: true };
      if (fulfillment.status !== 'delivered' || fulfillment.settlement_status !== 'awaiting_remittance') {
        throw new Error('Only a delivered COD fulfilment awaiting remittance can be reconciled.');
      }
      await this.assertNoActiveDisputeTx(tx, fulfillment.id);
      const collectedMinor = getAmountMinor(fulfillment, 'collected_amount_minor', 'collected_amount');
      const deliveryFeeMinor = getAmountMinor(fulfillment, 'carrier_delivery_fee_minor', 'carrier_delivery_fee');
      const expectedRemittanceMinor = Money.assertMinor(collectedMinor - deliveryFeeMinor, { allowZero: true });
      if (remittedMinor !== expectedRemittanceMinor) {
        throw new Error(`Toufiq remittance must equal ${Money.formatMinor(expectedRemittanceMinor)} MAD after the recorded delivery fee.`);
      }

      const duplicateReference = await tx.get(
        WalletService.lockForUpdate('SELECT id FROM cod_fulfillments WHERE carrier_settlement_reference = ?'),
        [safeReference]
      );
      if (duplicateReference && Number(duplicateReference.id) !== Number(fulfillment.id)) {
        throw new Error('This delivery-partner remittance reference is already linked to another fulfilment.');
      }

      const operationKey = `delivery-partner-cod-remittance:${safeFulfillmentId}`;
      const operation = await WalletService.createOperationTx(tx, {
        operationKey,
        operationType: 'delivery_partner_cod_remittance',
        referenceType: 'cod_fulfilment',
        referenceId: safeFulfillmentId,
        metadata: { financeUserId: safeFinanceUserId, settlementReference: safeReference },
      });
      if (operation.alreadyProcessed) {
        return { fulfillment: await this.getFulfillmentTx(tx, safeFulfillmentId), alreadyProcessed: true };
      }

      const update = await tx.run(
        `UPDATE cod_fulfillments
         SET settlement_status = 'settled', carrier_settlement_reference = ?,
             remitted_amount = ?, remitted_amount_minor = ?, settlement_note = ?,
             seller_payout_status = 'due', seller_payout_due_at = CURRENT_TIMESTAMP,
             settled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND settlement_status = 'awaiting_remittance'`,
        [safeReference, Money.fromMinor(remittedMinor), remittedMinor, cleanText(note), fulfillment.id]
      );
      if (update.changes !== 1) throw new Error('The COD remittance changed before it could be recorded.');
      await tx.run(
        `UPDATE payment_splits SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE order_id = ? AND party_type IN ('platform', 'delivery') AND status = 'pending'`,
        [fulfillment.order_id]
      );
      await this.addHistoryTx(
        tx,
        fulfillment.order_id,
        'remitted',
        `Toufiq remittance received. Reference: ${safeReference}. Seller payout is now due.`,
        safeFinanceUserId
      );
      const orderState = await this.syncOrderStateTx(tx, fulfillment.order_id);
      return { fulfillment: await this.getFulfillmentTx(tx, safeFulfillmentId), orderState, alreadyProcessed: false };
    });
  }

  static async recordManualSellerPayout({ fulfillmentId, financeUserId, payoutReference, note = '' }) {
    const safeFulfillmentId = WalletService.positiveInteger(fulfillmentId, 'Fulfillment ID');
    const safeFinanceUserId = WalletService.positiveInteger(financeUserId, 'Finance user ID');
    const safeReference = cleanText(payoutReference, 256);
    if (!safeReference) throw new Error('The seller bank-transfer reference is required.');

    return WalletService.withFinancialTransaction(async (tx) => {
      const fulfillment = await this.getFulfillmentTx(tx, safeFulfillmentId);
      if (!fulfillment) throw new Error('COD fulfilment was not found.');
      if (fulfillment.seller_payout_status === 'paid') return { fulfillment, alreadyProcessed: true };
      if (fulfillment.settlement_status !== 'settled' || fulfillment.seller_payout_status !== 'due') {
        throw new Error('Record the Toufiq remittance before recording the seller payout.');
      }
      await this.assertNoActiveDisputeTx(tx, fulfillment.id);
      const duplicate = await tx.get(
        WalletService.lockForUpdate('SELECT id FROM cod_fulfillments WHERE seller_payout_reference = ?'),
        [safeReference]
      );
      if (duplicate && Number(duplicate.id) !== Number(fulfillment.id)) {
        throw new Error('This seller payout reference is already linked to another COD fulfilment.');
      }

      const operationKey = `manual-seller-payout:${safeFulfillmentId}`;
      const operation = await WalletService.createOperationTx(tx, {
        operationKey,
        operationType: 'manual_cod_seller_payout',
        referenceType: 'cod_fulfilment',
        referenceId: safeFulfillmentId,
        metadata: { financeUserId: safeFinanceUserId, payoutReference: safeReference },
      });
      if (operation.alreadyProcessed) {
        return { fulfillment: await this.getFulfillmentTx(tx, safeFulfillmentId), alreadyProcessed: true };
      }

      const split = await tx.get(
        WalletService.lockForUpdate(`SELECT * FROM payment_splits WHERE order_id = ? AND party_type = 'seller' AND party_id = ?`),
        [fulfillment.order_id, fulfillment.seller_id]
      );
      if (!split || split.status !== 'pending') throw new Error('Seller payout is not pending for this COD fulfilment.');
      const update = await tx.run(
        `UPDATE cod_fulfillments
         SET seller_payout_status = 'paid', seller_payout_reference = ?, seller_payout_note = ?,
             seller_payout_at = CURRENT_TIMESTAMP, seller_payout_by = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND seller_payout_status = 'due'`,
        [safeReference, cleanText(note), safeFinanceUserId, fulfillment.id]
      );
      if (update.changes !== 1) throw new Error('The seller payout state changed before it could be recorded.');
      await tx.run(
        `UPDATE payment_splits SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'pending'`,
        [split.id]
      );
      await this.addHistoryTx(
        tx,
        fulfillment.order_id,
        'seller_paid',
        `Manual seller payout recorded. Reference: ${safeReference}.`,
        safeFinanceUserId
      );
      const orderState = await this.syncOrderStateTx(tx, fulfillment.order_id);
      return { fulfillment: await this.getFulfillmentTx(tx, safeFulfillmentId), orderState, alreadyProcessed: false };
    });
  }

  static async recordException({ fulfillmentId, financeUserId, status, note }) {
    const safeFulfillmentId = WalletService.positiveInteger(fulfillmentId, 'Fulfillment ID');
    const safeFinanceUserId = WalletService.positiveInteger(financeUserId, 'Finance user ID');
    if (!['refused', 'returned'].includes(status)) throw new Error('Unsupported carrier exception.');
    const safeNote = cleanText(note);
    if (!safeNote) throw new Error('A carrier exception note is required.');

    return WalletService.withFinancialTransaction(async (tx) => {
      const fulfillment = await this.getFulfillmentTx(tx, safeFulfillmentId);
      if (!fulfillment) throw new Error('COD fulfilment was not found.');
      const allowed = status === 'returned'
        ? ['shipped', 'refused']
        : ['shipped'];
      if (!allowed.includes(fulfillment.status)) {
        throw new Error('This carrier exception is not allowed for the current fulfilment state.');
      }
      if (fulfillment.delivery_reported_at && fulfillment.delivery_report_outcome === 'delivered') {
        throw new Error('The delivery partner reported this parcel as delivered. Resolve the collection record before recording a delivery exception.');
      }
      if (fulfillment.status === 'shipped' && fulfillment.delivery_reported_at && fulfillment.delivery_report_outcome !== status) {
        throw new Error(`The delivery partner reported this parcel as ${fulfillment.delivery_report_outcome}. Record the matching delivery exception first.`);
      }
      const update = await tx.run(
        `UPDATE cod_fulfillments
         SET status = ?, settlement_status = 'void', exception_note = ?,
             ${status === 'returned' ? 'returned_at' : 'refused_at'} = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, safeNote, fulfillment.id]
      );
      if (update.changes !== 1) throw new Error('Carrier exception could not be recorded.');
      if (status === 'returned') {
        await this.restoreSellerInventoryTx(tx, fulfillment.order_id, fulfillment.seller_id);
      }
      await this.addHistoryTx(tx, fulfillment.order_id, status, safeNote, safeFinanceUserId);
      await this.cancelFinancialSplitsIfTerminalTx(tx, fulfillment.order_id);
      const orderState = await this.syncOrderStateTx(tx, fulfillment.order_id);
      const updated = await this.getFulfillmentTx(tx, safeFulfillmentId);
      return { fulfillment: updated, orderState };
    });
  }
}

module.exports = CodFulfillmentService;
