-- Keep the materialized product-review count used by catalog and review flows.
-- The migration is additive, safe for existing live products, and preserves
-- the reviewed migration history for PostgreSQL deployments.
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;

UPDATE products p
SET review_count = review_totals.total
FROM (
  SELECT product_id, COUNT(*)::INTEGER AS total
  FROM product_reviews
  GROUP BY product_id
) AS review_totals
WHERE p.id = review_totals.product_id
  AND p.review_count <> review_totals.total;
