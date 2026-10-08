-- Product reviews are earned only after the matching COD fulfilment reaches
-- the delivered state. Store the order reference as immutable evidence while
-- preserving older imported reviews that do not have delivery provenance.
ALTER TABLE product_reviews
  ADD COLUMN IF NOT EXISTS order_id BIGINT REFERENCES orders(id);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_user
  ON product_reviews(product_id, user_id);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_created
  ON product_reviews(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_product_order
  ON order_items(product_id, order_id);

CREATE INDEX IF NOT EXISTS idx_cod_fulfillments_review_delivery
  ON cod_fulfillments(order_id, seller_id, source, status, delivered_at DESC);

-- The partial predicate lets historical unlinked rows stay intact. New,
-- delivery-backed reviews have a database-level idempotency guard.
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_reviews_verified_product_user
  ON product_reviews(product_id, user_id)
  WHERE order_id IS NOT NULL;
