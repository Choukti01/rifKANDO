ALTER TABLE users
  ADD COLUMN IF NOT EXISTS seller_started_at TIMESTAMPTZ;

UPDATE users
SET seller_started_at = created_at
WHERE role = 'seller' AND seller_started_at IS NULL;
