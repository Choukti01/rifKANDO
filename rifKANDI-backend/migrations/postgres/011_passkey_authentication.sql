-- WebAuthn passkeys are public-key credentials. No biometric data is ever
-- sent to or retained by rifKANDO.

CREATE TABLE passkey_challenges (
  token_hash TEXT PRIMARY KEY,
  purpose TEXT NOT NULL CHECK (purpose IN ('registration', 'authentication')),
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  webauthn_user_id TEXT,
  registration_name TEXT,
  registration_email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_passkey_challenges_expiry ON passkey_challenges(expires_at);

CREATE TABLE passkey_credentials (
  credential_id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  webauthn_user_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT NOT NULL DEFAULT '[]',
  device_type TEXT NOT NULL,
  backed_up BOOLEAN NOT NULL DEFAULT FALSE,
  name TEXT NOT NULL DEFAULT 'Passkey',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_passkey_credentials_user ON passkey_credentials(user_id, created_at ASC);
