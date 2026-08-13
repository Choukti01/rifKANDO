const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  loadPostgresMigrations,
  validateMigrationHistory,
} = require('../src/database/postgresMigrationRunner');
const {
  EXPECTED_POSTGRES_TABLES,
  REQUIRED_MINOR_UNIT_COLUMNS,
} = require('../src/database/postgresSchemaContract');
const { initDb } = require('../src/config/initDb');

async function main() {
  const migrations = await loadPostgresMigrations();
  assert.strictEqual(migrations[0].version, '001');
  assert.match(migrations[0].checksum, /^[a-f0-9]{64}$/);

  const sellerEligibilityMigration = migrations.find((migration) => migration.version === '002');
  assert.ok(sellerEligibilityMigration, 'Seller withdrawal eligibility must be versioned as migration 002.');
  assert.match(sellerEligibilityMigration.sql, /ALTER TABLE users\s+ADD COLUMN IF NOT EXISTS seller_started_at TIMESTAMPTZ/i);

  const sellerVerificationRemovalMigration = migrations.find((migration) => migration.version === '003');
  assert.ok(sellerVerificationRemovalMigration, 'Seller verification removal must be versioned as migration 003.');
  assert.match(sellerVerificationRemovalMigration.sql, /UPDATE users\s+SET is_verified_seller = FALSE/i);
  assert.match(sellerVerificationRemovalMigration.sql, /ALTER TABLE users DROP COLUMN IF EXISTS is_verified_seller/i);
  assert.match(sellerVerificationRemovalMigration.sql, /DROP TABLE IF EXISTS verification_documents/i);

  const phoneAuthenticationMigration = migrations.find((migration) => migration.version === '004');
  assert.ok(phoneAuthenticationMigration, 'Phone authentication must be versioned as migration 004.');
  assert.match(phoneAuthenticationMigration.sql, /CREATE TABLE phone_verification_challenges/i);
  assert.match(phoneAuthenticationMigration.sql, /CREATE UNIQUE INDEX idx_users_phone_unique/i);

  const bookingProtocolMigration = migrations.find((migration) => migration.version === '005');
  assert.ok(bookingProtocolMigration, 'Professional booking protocol must be versioned as migration 005.');
  assert.match(bookingProtocolMigration.sql, /CREATE TABLE booking_availability_windows/i);
  assert.match(bookingProtocolMigration.sql, /CREATE TABLE booking_date_overrides/i);
  assert.match(bookingProtocolMigration.sql, /ADD COLUMN IF NOT EXISTS idempotency_key TEXT/i);

  const baselineSql = migrations[0].sql;
  const allMigrationSql = migrations.map((migration) => migration.sql).join('\n');
  for (const table of EXPECTED_POSTGRES_TABLES) {
    assert.match(allMigrationSql, new RegExp(`CREATE TABLE ${table} \\(`), `Missing PostgreSQL table: ${table}`);
  }

  for (const [table, column] of REQUIRED_MINOR_UNIT_COLUMNS) {
    const tableStart = baselineSql.indexOf(`CREATE TABLE ${table} (`);
    const tableEnd = baselineSql.indexOf('\n);', tableStart);
    assert.ok(tableStart >= 0 && tableEnd > tableStart, `Unable to inspect ${table}`);
    assert.match(baselineSql.slice(tableStart, tableEnd), new RegExp(`\\b${column} BIGINT\\b`));
  }

  assert.match(baselineSql, /CREATE FUNCTION prevent_audit_log_mutation\(\)/);
  assert.match(baselineSql, /CREATE TRIGGER prevent_audit_log_updates/);
  assert.match(baselineSql, /CREATE TRIGGER prevent_audit_log_deletes/);

  assert.throws(
    () => validateMigrationHistory(migrations, [{ version: '001', checksum: 'different' }]),
    /Checksum mismatch/
  );
  assert.throws(() => initDb(), /is retired/);

  const scriptPath = path.join(__dirname, 'migratePostgres.js');
  const output = execFileSync(process.execPath, [scriptPath, '--dry-run'], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: '' },
  });
  assert.match(output, /No database connection was made/);
  assert.match(output, /001  initial_schema/);
  assert.match(output, /002  seller_withdrawal_eligibility/);
  assert.match(output, /003  remove_seller_verification/);
  assert.match(output, /004  phone_otp_authentication/);
  assert.match(output, /005  professional_booking_protocol/);

  assert.ok(fs.existsSync(path.join(__dirname, '../migrations/postgres/001_initial_schema.sql')));
  assert.ok(fs.existsSync(path.join(__dirname, '../migrations/postgres/002_seller_withdrawal_eligibility.sql')));
  assert.ok(fs.existsSync(path.join(__dirname, '../migrations/postgres/003_remove_seller_verification.sql')));
  assert.ok(fs.existsSync(path.join(__dirname, '../migrations/postgres/004_phone_otp_authentication.sql')));
  assert.ok(fs.existsSync(path.join(__dirname, '../migrations/postgres/005_professional_booking_protocol.sql')));
  console.log('PostgreSQL migration smoke test passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
