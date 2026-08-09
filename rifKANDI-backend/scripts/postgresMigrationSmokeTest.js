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
  assert.strictEqual(migrations.length, 1, 'The PostgreSQL baseline must be versioned as one immutable migration');
  assert.strictEqual(migrations[0].version, '001');
  assert.match(migrations[0].checksum, /^[a-f0-9]{64}$/);

  const baselineSql = migrations[0].sql;
  for (const table of EXPECTED_POSTGRES_TABLES) {
    assert.match(baselineSql, new RegExp(`CREATE TABLE ${table} \\(`), `Missing PostgreSQL table: ${table}`);
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

  assert.ok(fs.existsSync(path.join(__dirname, '../migrations/postgres/001_initial_schema.sql')));
  console.log('PostgreSQL migration smoke test passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
