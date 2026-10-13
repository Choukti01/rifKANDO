-- Public service scope: providers state what is included and what a client
-- needs to supply before work begins. Lists are intentionally kept as JSONB
-- to preserve their order and avoid exposing any private documents.

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS client_requirements JSONB NOT NULL DEFAULT '[]'::jsonb;
