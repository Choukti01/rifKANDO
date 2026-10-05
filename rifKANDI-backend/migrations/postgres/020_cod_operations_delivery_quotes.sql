-- Delivery is no longer seller-defined. COD Operations quotes the buyer's
-- delivery amount from the real parcel and destination before carrier pickup.
ALTER TABLE cod_fulfillments
  ADD COLUMN IF NOT EXISTS delivery_fee_quoted_at TIMESTAMPTZ;

ALTER TABLE cod_fulfillments
  ADD COLUMN IF NOT EXISTS delivery_fee_quoted_by BIGINT REFERENCES users(id);

ALTER TABLE cod_fulfillments
  ADD COLUMN IF NOT EXISTS delivery_fee_quote_note TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_cod_fulfillments_delivery_quote
  ON cod_fulfillments(status, delivery_fee_quoted_at, created_at ASC);
