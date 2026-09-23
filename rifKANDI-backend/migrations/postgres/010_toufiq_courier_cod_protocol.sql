-- Manual courier protocol for the controlled Products + FINDit COD launch.
-- Toufiq collects from the buyer, remits cash to rifKANDO, and rifKANDO
-- records a separate real-world seller payout. No wallet balance is credited.

ALTER TABLE cod_fulfillments ADD COLUMN delivery_partner_name TEXT;
ALTER TABLE cod_fulfillments ADD COLUMN delivery_partner_contacted_at TIMESTAMPTZ;
ALTER TABLE cod_fulfillments ADD COLUMN delivery_partner_pickup_at TIMESTAMPTZ;

ALTER TABLE cod_fulfillments ADD COLUMN seller_payout_status TEXT NOT NULL DEFAULT 'not_due'
  CHECK (seller_payout_status IN ('not_due', 'due', 'paid', 'void'));
ALTER TABLE cod_fulfillments ADD COLUMN seller_payout_due_at TIMESTAMPTZ;
ALTER TABLE cod_fulfillments ADD COLUMN seller_payout_reference TEXT;
ALTER TABLE cod_fulfillments ADD COLUMN seller_payout_note TEXT;
ALTER TABLE cod_fulfillments ADD COLUMN seller_payout_at TIMESTAMPTZ;
ALTER TABLE cod_fulfillments ADD COLUMN seller_payout_by BIGINT REFERENCES users(id);

CREATE INDEX idx_cod_fulfillments_seller_payout
  ON cod_fulfillments(seller_payout_status, settlement_status, created_at ASC);
CREATE UNIQUE INDEX idx_cod_fulfillments_seller_payout_reference
  ON cod_fulfillments(seller_payout_reference)
  WHERE seller_payout_reference IS NOT NULL;
