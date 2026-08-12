-- Phone-only accounts are authenticated with short-lived, hashed SMS codes.

CREATE TABLE phone_verification_challenges (
  phone TEXT PRIMARY KEY,
  purpose TEXT NOT NULL CHECK (purpose IN ('register', 'login')),
  code_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  send_count INTEGER NOT NULL DEFAULT 1,
  window_started_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_phone_unique
  ON users(phone)
  WHERE phone IS NOT NULL AND phone <> '';
