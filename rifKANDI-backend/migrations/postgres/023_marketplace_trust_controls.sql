-- Public reviews may have one accountable seller response. Marketplace
-- moderation can also suspend a seller without deleting financial history.
ALTER TABLE product_reviews
  ADD COLUMN IF NOT EXISTS seller_reply TEXT,
  ADD COLUMN IF NOT EXISTS seller_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seller_reply_by BIGINT REFERENCES users(id);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS marketplace_status TEXT NOT NULL DEFAULT 'active'
    CHECK (marketplace_status IN ('active', 'suspended')),
  ADD COLUMN IF NOT EXISTS marketplace_status_note TEXT,
  ADD COLUMN IF NOT EXISTS marketplace_status_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marketplace_status_updated_by BIGINT REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_users_marketplace_status
  ON users(marketplace_status);

CREATE INDEX IF NOT EXISTS idx_product_reviews_seller_reply
  ON product_reviews(product_id, seller_reply_at DESC)
  WHERE seller_reply IS NOT NULL;
