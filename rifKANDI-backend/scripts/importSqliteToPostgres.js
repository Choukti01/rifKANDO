require('dotenv').config();

const { createPostgresPool } = require('../src/config/postgres');
const {
  importSqliteToPostgres,
  prepareSqliteImport,
} = require('../src/database/sqliteToPostgresImporter');

const APPLY_CONFIRMATION = 'import-sqlite-data';

function usage() {
  return [
    'Usage:',
    '  node scripts/importSqliteToPostgres.js --source <sqlite-backup-path> --dry-run',
    '  SQLITE_IMPORT_SOURCE_SHA256=<hash-from-dry-run> POSTGRES_DATA_IMPORT_CONFIRM=import-sqlite-data node scripts/importSqliteToPostgres.js --source <sqlite-backup-path> --apply',
  ].join('\n');
}

function parseArguments(argumentsList) {
  const options = { apply: false, dryRun: false, source: null };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (argument === '--source') {
      options.source = argumentsList[index + 1];
      index += 1;
    } else if (argument === '--dry-run') {
      options.dryRun = true;
    } else if (argument === '--apply') {
      options.apply = true;
    } else {
      throw new Error(usage());
    }
  }

  if (!options.source || options.apply === options.dryRun) {
    throw new Error(usage());
  }

  return options;
}

function printPreparedSource(preparedSource) {
  const rowTotal = Object.values(preparedSource.source.rowCounts)
    .reduce((total, count) => total + count, 0);

  console.log(`SQLite backup preflight passed: ${preparedSource.source.tables} tables, ${rowTotal} rows, 0 foreign-key violations.`);
  console.log(`Source backup SHA-256: ${preparedSource.sourceChecksum}`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const preparedSource = await prepareSqliteImport(options.source);
  printPreparedSource(preparedSource);

  if (options.dryRun) {
    console.log('Dry run complete. No PostgreSQL connection was made and no data was copied.');
    return;
  }

  if (process.env.POSTGRES_DATA_IMPORT_CONFIRM !== APPLY_CONFIRMATION) {
    throw new Error(
      `Refusing to import. Set POSTGRES_DATA_IMPORT_CONFIRM=${APPLY_CONFIRMATION} after reviewing the source backup.`
    );
  }

  if (process.env.SQLITE_IMPORT_SOURCE_SHA256 !== preparedSource.sourceChecksum) {
    throw new Error('SQLITE_IMPORT_SOURCE_SHA256 must exactly match the hash printed by the reviewed dry run.');
  }

  const pool = createPostgresPool();
  try {
    const result = await importSqliteToPostgres({
      pool,
      preparedSource,
      onProgress: ({ table, imported }) => {
        console.log(`Imported ${table}: ${imported} rows`);
      },
    });
    console.log(`SQLite to PostgreSQL import completed and verified. Source SHA-256: ${result.sourceChecksum}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`SQLite to PostgreSQL import failed: ${error.message}`);
  process.exitCode = 1;
});
