-- rifKANDO does not collect seller identity documents during onboarding.
-- This removes the retired verification data model from PostgreSQL before use.

UPDATE users
SET is_verified_seller = FALSE
WHERE is_verified_seller IS DISTINCT FROM FALSE;

ALTER TABLE users DROP COLUMN IF EXISTS is_verified_seller;

DROP TABLE IF EXISTS seller_verification_files;
DROP TABLE IF EXISTS seller_verification_challenges;
DROP TABLE IF EXISTS seller_verification_cases;
DROP TABLE IF EXISTS verification_documents;
