-- A seller must acknowledge a COD parcel before it can enter fulfilment.
ALTER TABLE cod_fulfillments
  ADD COLUMN IF NOT EXISTS confirmation_expires_at TIMESTAMPTZ;

UPDATE cod_fulfillments
SET confirmation_expires_at = created_at + INTERVAL '24 hours'
WHERE confirmation_expires_at IS NULL
  AND status = 'pending_confirmation';

CREATE INDEX IF NOT EXISTS idx_cod_fulfillments_confirmation_deadline
  ON cod_fulfillments(status, confirmation_expires_at ASC);
