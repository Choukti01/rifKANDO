require('dotenv').config();

const { createPostgresPool } = require('../src/config/postgres');
const {
  applyPostgresMigrations,
  loadPostgresMigrations,
} = require('../src/database/postgresMigrationRunner');

const APPLY_CONFIRMATION = 'apply-postgres-schema';

function usage() {
  return [
    'Usage:',
    '  node scripts/migratePostgres.js --dry-run',
    '  POSTGRES_MIGRATION_CONFIRM=apply-postgres-schema node scripts/migratePostgres.js --apply',
  ].join('\n');
}

async function printDryRun() {
  const migrations = await loadPostgresMigrations();
  console.log('PostgreSQL migration plan. No database connection was made.');

  for (const migration of migrations) {
    console.log(`${migration.version}  ${migration.name}  ${migration.checksum.slice(0, 12)}`);
  }
}

async function apply() {
  if (process.env.POSTGRES_MIGRATION_CONFIRM !== APPLY_CONFIRMATION) {
    throw new Error(
      `Refusing to apply migrations. Set POSTGRES_MIGRATION_CONFIRM=${APPLY_CONFIRMATION} after reviewing the plan.`
    );
  }

  const pool = createPostgresPool();

  try {
    const applied = await applyPostgresMigrations(pool);

    if (applied.length === 0) {
      console.log('PostgreSQL schema is already current.');
      return;
    }

    console.log(`Applied ${applied.length} PostgreSQL migration(s):`);
    for (const migration of applied) {
      console.log(`${migration.version}  ${migration.name}`);
    }
  } finally {
    await pool.end();
  }
}

async function main() {
  const argumentsList = process.argv.slice(2);

  if (argumentsList.length !== 1 || !['--dry-run', '--apply'].includes(argumentsList[0])) {
    throw new Error(usage());
  }

  if (argumentsList[0] === '--dry-run') {
    await printDryRun();
    return;
  }

  await apply();
}

main().catch((error) => {
  console.error(`PostgreSQL migration failed: ${error.message}`);
  process.exitCode = 1;
});
