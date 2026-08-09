require('dotenv').config();

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { createPostgresPool, inspectPostgresConnection } = require('../src/config/postgres');
const { EXPECTED_POSTGRES_TABLES } = require('../src/database/postgresSchemaContract');

function openReadOnlyDatabase(databasePath) {
  return new Promise((resolve, reject) => {
    const database = new sqlite3.Database(databasePath, sqlite3.OPEN_READONLY, (error) => {
      if (error) reject(error);
      else resolve(database);
    });
  });
}

function all(database, sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, parameters, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

function get(database, sql, parameters = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, parameters, (error, row) => (error ? reject(error) : resolve(row)));
  });
}

function close(database) {
  return new Promise((resolve, reject) => {
    database.close((error) => (error ? reject(error) : resolve()));
  });
}

async function inspectSqliteSource(databasePath) {
  const absolutePath = path.resolve(databasePath);
  const database = await openReadOnlyDatabase(absolutePath);

  try {
    const quickCheck = await get(database, 'PRAGMA quick_check');
    if (quickCheck.quick_check !== 'ok') {
      throw new Error(`SQLite quick_check failed: ${quickCheck.quick_check}`);
    }

    const foreignKeyViolations = await all(database, 'PRAGMA foreign_key_check');
    if (foreignKeyViolations.length > 0) {
      throw new Error(`SQLite source has ${foreignKeyViolations.length} foreign-key violation(s)`);
    }
    const tableRows = await all(database, `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name ASC
    `);
    const tableNames = new Set(tableRows.map((row) => row.name));
    const missingTables = EXPECTED_POSTGRES_TABLES.filter((table) => !tableNames.has(table));

    if (missingTables.length > 0) {
      throw new Error(`SQLite source is missing required tables: ${missingTables.join(', ')}`);
    }

    const rowCounts = {};
    for (const table of EXPECTED_POSTGRES_TABLES) {
      const row = await get(database, `SELECT COUNT(*) AS count FROM "${table}"`);
      rowCounts[table] = Number(row.count);
    }

    return {
      databasePath: absolutePath,
      tables: EXPECTED_POSTGRES_TABLES.length,
      foreignKeyViolations: foreignKeyViolations.length,
      rowCounts,
    };
  } finally {
    await close(database);
  }
}

async function inspectPostgresTarget() {
  const pool = createPostgresPool();

  try {
    const [connection, tableResult, migrationResult] = await Promise.all([
      inspectPostgresConnection(pool),
      pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `),
      pool.query(`SELECT to_regclass('public.schema_migrations') AS migration_table`),
    ]);
    const tableNames = new Set(tableResult.rows.map((row) => row.table_name));

    return {
      database: connection.database_name,
      server: connection.server_version.split(',')[0],
      migrationTablePresent: Boolean(migrationResult.rows[0].migration_table),
      expectedTablesPresent: EXPECTED_POSTGRES_TABLES.filter((table) => tableNames.has(table)).length,
      missingExpectedTables: EXPECTED_POSTGRES_TABLES.filter((table) => !tableNames.has(table)),
    };
  } finally {
    await pool.end();
  }
}

function parseArguments(argumentsList) {
  const parsed = { target: false, json: false, sqlitePath: null };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (argument === '--sqlite-path') {
      parsed.sqlitePath = argumentsList[index + 1];
      index += 1;
    } else if (argument === '--target') {
      parsed.target = true;
    } else if (argument === '--json') {
      parsed.json = true;
    } else {
      throw new Error('Usage: node scripts/postgresPreflight.js --sqlite-path <path> [--target] [--json]');
    }
  }

  if (!parsed.sqlitePath) {
    throw new Error('Usage: node scripts/postgresPreflight.js --sqlite-path <path> [--target] [--json]');
  }

  return parsed;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const source = await inspectSqliteSource(options.sqlitePath);
  const result = { source };

  if (options.target) {
    result.target = await inspectPostgresTarget();
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`SQLite preflight passed: ${source.tables} required tables, ${source.foreignKeyViolations} foreign-key violations.`);
  if (result.target) {
    console.log(`PostgreSQL target has ${result.target.expectedTablesPresent}/${EXPECTED_POSTGRES_TABLES.length} expected tables.`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`PostgreSQL preflight failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  inspectPostgresTarget,
  inspectSqliteSource,
};
