-- Internal courier workflow records. These are operational facts only;
-- money collection, remittance, commission, and seller payout remain
-- finance-controlled transactions.

ALTER TABLE cod_fulfillments ADD COLUMN delivery_report_outcome TEXT
  CHECK (delivery_report_outcome IN ('delivered', 'refused', 'returned'));
ALTER TABLE cod_fulfillments ADD COLUMN delivery_report_note TEXT;
ALTER TABLE cod_fulfillments ADD COLUMN delivery_reported_at TIMESTAMPTZ;
ALTER TABLE cod_fulfillments ADD COLUMN delivery_reported_by BIGINT REFERENCES users(id);

CREATE INDEX idx_cod_fulfillments_operations_queue
  ON cod_fulfillments(status, delivery_reported_at, created_at ASC);
