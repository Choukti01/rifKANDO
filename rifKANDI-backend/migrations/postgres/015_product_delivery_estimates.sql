ALTER TABLE products ADD COLUMN IF NOT EXISTS origin_city TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS preparation_days INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS estimated_delivery_days INTEGER NOT NULL DEFAULT 3;

ALTER TABLE products
  ADD CONSTRAINT products_preparation_days_range CHECK (preparation_days BETWEEN 0 AND 14) NOT VALID;
ALTER TABLE products
  ADD CONSTRAINT products_estimated_delivery_days_range CHECK (estimated_delivery_days BETWEEN 1 AND 30) NOT VALID;
