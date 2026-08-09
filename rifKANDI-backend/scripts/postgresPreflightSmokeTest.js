const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rifkando-postgres-preflight-'));
const databasePath = path.join(temporaryDirectory, 'rifkandi.db');

process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = databasePath;

const db = require('../src/config/database');
const { EXPECTED_POSTGRES_TABLES } = require('../src/database/postgresSchemaContract');
const { inspectSqliteSource } = require('./postgresPreflight');

function closeDatabase(database) {
  return new Promise((resolve, reject) => {
    database.close((error) => (error ? reject(error) : resolve()));
  });
}

async function main() {
  try {
    await db.ready;
    await closeDatabase(db);

    const result = await inspectSqliteSource(databasePath);
    assert.strictEqual(result.tables, EXPECTED_POSTGRES_TABLES.length);
    assert.strictEqual(result.foreignKeyViolations, 0);
    assert.deepStrictEqual(Object.keys(result.rowCounts).sort(), [...EXPECTED_POSTGRES_TABLES].sort());
    console.log('PostgreSQL preflight smoke test passed.');
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
