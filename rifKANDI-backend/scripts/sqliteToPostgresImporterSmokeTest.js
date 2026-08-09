const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rifkando-sqlite-importer-'));
const databasePath = path.join(temporaryDirectory, 'rifkandi.db');

process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = databasePath;

const db = require('../src/config/database');
const { EXPECTED_POSTGRES_TABLES } = require('../src/database/postgresSchemaContract');
const {
  SQLITE_IMPORT_ORDER,
  getSafeBatchSize,
  normalizeSourceValue,
  prepareSqliteImport,
  quoteIdentifier,
} = require('../src/database/sqliteToPostgresImporter');

function closeDatabase(database) {
  return new Promise((resolve, reject) => {
    database.close((error) => (error ? reject(error) : resolve()));
  });
}

async function main() {
  try {
    await db.ready;
    await closeDatabase(db);

    const preparedSource = await prepareSqliteImport(databasePath);
    assert.strictEqual(preparedSource.source.tables, EXPECTED_POSTGRES_TABLES.length);
    assert.match(preparedSource.sourceChecksum, /^[a-f0-9]{64}$/);
    assert.deepStrictEqual([...SQLITE_IMPORT_ORDER].sort(), [...EXPECTED_POSTGRES_TABLES].sort());
    assert.strictEqual(normalizeSourceValue('users', 'is_verified', 1), true);
    assert.strictEqual(normalizeSourceValue('users', 'is_verified', 0), false);
    assert.strictEqual(normalizeSourceValue('orders', 'created_at', '2026-08-09 12:00:00'), '2026-08-09T12:00:00Z');
    assert.strictEqual(getSafeBatchSize(400, 500), 150);
    assert.strictEqual(quoteIdentifier('wallet_ledger_entries'), '"wallet_ledger_entries"');
    assert.throws(() => quoteIdentifier('users; DROP TABLE users'), /Unsafe SQL identifier/);

    const scriptPath = path.join(__dirname, 'importSqliteToPostgres.js');
    const output = execFileSync(process.execPath, [scriptPath, '--source', databasePath, '--dry-run'], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: '' },
    });
    assert.match(output, /SQLite backup preflight passed/);
    assert.match(output, /No PostgreSQL connection was made and no data was copied/);

    console.log('SQLite to PostgreSQL importer smoke test passed.');
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
