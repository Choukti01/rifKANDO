-- A buyer-facing delivery deadline is set per confirmed COD fulfillment by
-- COD Operations. Sellers retain control over preparation only.
ALTER TABLE cod_fulfillments
  ADD COLUMN IF NOT EXISTS delivery_deadline_at TIMESTAMPTZ;

ALTER TABLE cod_fulfillments
  ADD COLUMN IF NOT EXISTS delivery_deadline_set_at TIMESTAMPTZ;

ALTER TABLE cod_fulfillments
  ADD COLUMN IF NOT EXISTS delivery_deadline_set_by BIGINT REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_cod_fulfillments_delivery_deadline
  ON cod_fulfillments(status, delivery_deadline_at ASC);
