-- FINDit is a standing buyer-demand board. Requests remain visible and accept
-- offers until the buyer cancels one or accepts a seller's offer. Keep the
-- legacy timestamp column only for backwards compatibility with old clients.
UPDATE findit_requests
SET status = CASE WHEN status = 'expired' THEN 'active' ELSE status END,
    expires_at = TIMESTAMPTZ '9999-12-31 23:59:59.999+00',
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'expired'
   OR expires_at <> TIMESTAMPTZ '9999-12-31 23:59:59.999+00';

DROP INDEX IF EXISTS idx_findit_requests_catalog;
CREATE INDEX idx_findit_requests_catalog
  ON findit_requests(status, created_at DESC);
