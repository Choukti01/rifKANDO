-- A narrow delivery-team capability, intentionally separate from marketplace
-- roles and all finance/reconciliation controls.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS cod_operations_access BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_cod_operations_access
  ON users (cod_operations_access)
  WHERE cod_operations_access = TRUE;
