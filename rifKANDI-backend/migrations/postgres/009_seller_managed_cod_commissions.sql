-- Seller-managed COD: carriers remit cash to the seller, then the seller pays
-- rifKANDO's commission. These fields deliberately do not credit a wallet.
ALTER TABLE cod_fulfillments ADD COLUMN commission_payment_status TEXT NOT NULL DEFAULT 'not_due'
  CHECK (commission_payment_status IN ('not_due', 'due', 'submitted', 'paid', 'void'));
ALTER TABLE cod_fulfillments ADD COLUMN commission_reference TEXT;
ALTER TABLE cod_fulfillments ADD COLUMN commission_due_at TIMESTAMPTZ;
ALTER TABLE cod_fulfillments ADD COLUMN commission_payment_reference TEXT;
ALTER TABLE cod_fulfillments ADD COLUMN commission_payment_note TEXT;
ALTER TABLE cod_fulfillments ADD COLUMN commission_submitted_at TIMESTAMPTZ;
ALTER TABLE cod_fulfillments ADD COLUMN commission_verified_at TIMESTAMPTZ;
ALTER TABLE cod_fulfillments ADD COLUMN commission_verified_by BIGINT REFERENCES users(id);

ALTER TABLE products ADD COLUMN delivery_fee NUMERIC(14, 2) NOT NULL DEFAULT 50;
ALTER TABLE products ADD COLUMN delivery_fee_minor BIGINT NOT NULL DEFAULT 5000 CHECK(delivery_fee_minor >= 0);

CREATE UNIQUE INDEX idx_cod_fulfillments_commission_reference
  ON cod_fulfillments(commission_reference)
  WHERE commission_reference IS NOT NULL;
CREATE UNIQUE INDEX idx_cod_fulfillments_commission_payment_reference
  ON cod_fulfillments(commission_payment_reference)
  WHERE commission_payment_reference IS NOT NULL;
CREATE INDEX idx_cod_fulfillments_commission_due
  ON cod_fulfillments(seller_id, commission_payment_status, commission_due_at);
