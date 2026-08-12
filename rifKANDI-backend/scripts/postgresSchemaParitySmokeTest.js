const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rifkando-postgres-schema-parity-'));
const databasePath = path.join(temporaryDirectory, 'rifkandi.db');

process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = databasePath;
process.env.DATABASE_ENGINE = 'sqlite';

const db = require('../src/config/database');
const { EXPECTED_POSTGRES_TABLES } = require('../src/database/postgresSchemaContract');
const { loadPostgresMigrations } = require('../src/database/postgresMigrationRunner');

function all(database, sql) {
  return new Promise((resolve, reject) => {
    database.all(sql, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

function closeDatabase(database) {
  return new Promise((resolve, reject) => {
    database.close((error) => (error ? reject(error) : resolve()));
  });
}

function extractPostgresColumns(sql, table) {
  const tablePattern = new RegExp(`CREATE TABLE ${table} \\(([\\s\\S]*?)\\n\\);`, 'i');
  const match = sql.match(tablePattern);
  assert.ok(match, `Missing PostgreSQL table definition for ${table}`);

  const ignored = new Set(['FOREIGN', 'UNIQUE', 'CHECK', 'CONSTRAINT', 'PRIMARY']);
  const columns = new Set(match[1]
    .split('\n')
    .map((line) => line.trim().replace(/,$/, ''))
    .filter(Boolean)
    .map((line) => {
      const columnMatch = line.match(/^(?:"([A-Za-z_][A-Za-z0-9_]*)"|([A-Za-z_][A-Za-z0-9_]*))\s+/);
      if (!columnMatch) return null;
      const column = columnMatch[1] || columnMatch[2];
      return ignored.has(column.toUpperCase()) ? null : column;
    })
    .filter(Boolean));

  const alterColumnPattern = new RegExp(
    `ALTER TABLE\\s+${table}\\s+ADD COLUMN(?: IF NOT EXISTS)?\\s+(?:"([A-Za-z_][A-Za-z0-9_]*)"|([A-Za-z_][A-Za-z0-9_]*))`,
    'gi'
  );
  for (const alterMatch of sql.matchAll(alterColumnPattern)) {
    columns.add(alterMatch[1] || alterMatch[2]);
  }
  return columns;
}

async function main() {
  try {
    await db.ready;
    const migrations = await loadPostgresMigrations();
    const migrationSql = migrations.map((migration) => migration.sql).join('\n\n');

    for (const table of EXPECTED_POSTGRES_TABLES) {
      const sqliteColumns = await all(db, `PRAGMA table_info("${table}")`);
      const postgresColumns = extractPostgresColumns(migrationSql, table);
      const missingColumns = sqliteColumns
        .map((column) => column.name)
        .filter((column) => !postgresColumns.has(column));
      assert.deepStrictEqual(missingColumns, [], `PostgreSQL ${table} is missing SQLite columns: ${missingColumns.join(', ')}`);
    }

    console.log('PostgreSQL schema parity smoke test passed.');
  } finally {
    await closeDatabase(db).catch(() => undefined);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
