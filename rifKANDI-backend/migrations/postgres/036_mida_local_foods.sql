-- Mida is a physical local-food catalogue that intentionally uses the
-- existing product, cart, COD, fulfilment, reporting and review workflows.
-- These fields add food-specific transparency without creating a second
-- financial or delivery system.
ALTER TABLE products ADD COLUMN IF NOT EXISTS marketplace_section TEXT NOT NULL DEFAULT 'products';
ALTER TABLE products ADD COLUMN IF NOT EXISTS food_channel TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS food_unit TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS food_origin TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS food_storage TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS allergen_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS pickup_available BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE products ADD CONSTRAINT products_marketplace_section_check
  CHECK (marketplace_section IN ('products', 'mida'));
ALTER TABLE products ADD CONSTRAINT products_food_channel_check
  CHECK (food_channel IS NULL OR food_channel IN ('market', 'kitchen'));
ALTER TABLE products ADD CONSTRAINT products_food_storage_check
  CHECK (food_storage IS NULL OR food_storage IN ('ambient', 'refrigerated', 'frozen', 'fresh'));

CREATE INDEX IF NOT EXISTS products_mida_catalog_idx
  ON products (marketplace_section, food_channel, status, created_at DESC);
