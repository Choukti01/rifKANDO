-- Secure digital delivery metadata. Private files are immutable once access
-- is granted: each purchase keeps a snapshot of the exact object and its
-- metadata, so future seller uploads never rewrite a buyer's entitlement.

ALTER TABLE digital_products ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE digital_products ADD COLUMN IF NOT EXISTS file_sha256 TEXT;

ALTER TABLE digital_purchases ADD COLUMN IF NOT EXISTS download_file_name TEXT;
ALTER TABLE digital_purchases ADD COLUMN IF NOT EXISTS download_file_content_type TEXT;
ALTER TABLE digital_purchases ADD COLUMN IF NOT EXISTS download_file_size TEXT;
ALTER TABLE digital_purchases ADD COLUMN IF NOT EXISTS download_file_size_bytes BIGINT;
ALTER TABLE digital_purchases ADD COLUMN IF NOT EXISTS download_file_sha256 TEXT;
ALTER TABLE digital_purchases ADD COLUMN IF NOT EXISTS granted_at TIMESTAMPTZ;

ALTER TABLE digital_requests ADD COLUMN IF NOT EXISTS buyer_message TEXT;
ALTER TABLE digital_requests ADD COLUMN IF NOT EXISTS decision_reason TEXT;
ALTER TABLE digital_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX idx_digital_requests_product_buyer_status
  ON digital_requests(digital_id, buyer_id, status, id DESC);
CREATE UNIQUE INDEX idx_digital_requests_one_pending_request
  ON digital_requests(digital_id, buyer_id)
  WHERE status = 'pending';
