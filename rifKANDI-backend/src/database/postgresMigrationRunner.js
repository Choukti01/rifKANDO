const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const POSTGRES_MIGRATIONS_DIRECTORY = path.resolve(__dirname, '../../migrations/postgres');
const MIGRATION_FILE_PATTERN = /^(\d+)_([a-z0-9][a-z0-9_-]*)\.sql$/;
const MIGRATION_LOCK_ID = 734_116_492;

function checksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function loadPostgresMigrations(directory = POSTGRES_MIGRATIONS_DIRECTORY) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const migrationFiles = entries
    .filter((entry) => entry.isFile() && MIGRATION_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'));

  if (migrationFiles.length === 0) {
    throw new Error(`No PostgreSQL migration files were found in ${directory}`);
  }

  return Promise.all(migrationFiles.map(async (filename) => {
    const match = filename.match(MIGRATION_FILE_PATTERN);
    const sql = await fs.readFile(path.join(directory, filename), 'utf8');

    if (!sql.trim()) {
      throw new Error(`PostgreSQL migration ${filename} is empty`);
    }

    return {
      filename,
      version: match[1],
      name: match[2],
      sql,
      checksum: checksum(sql),
    };
  }));
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query(`
    SELECT version, name, checksum, applied_at
    FROM schema_migrations
    ORDER BY version ASC
  `);

  return result.rows;
}

function validateMigrationHistory(migrations, appliedMigrations) {
  const availableByVersion = new Map(migrations.map((migration) => [migration.version, migration]));

  for (const applied of appliedMigrations) {
    const localMigration = availableByVersion.get(applied.version);

    if (!localMigration) {
      throw new Error(
        `Applied PostgreSQL migration ${applied.version} is missing from this release. Restore the migration file before continuing.`
      );
    }

    if (localMigration.checksum !== applied.checksum) {
      throw new Error(
        `Checksum mismatch for PostgreSQL migration ${applied.version}. Applied migration files are immutable.`
      );
    }
  }
}

async function getMigrationPlan(pool, directory = POSTGRES_MIGRATIONS_DIRECTORY) {
  const migrations = await loadPostgresMigrations(directory);
  const client = await pool.connect();

  try {
    await ensureMigrationTable(client);
    const applied = await getAppliedMigrations(client);
    validateMigrationHistory(migrations, applied);
    const appliedVersions = new Set(applied.map((migration) => migration.version));

    return {
      applied,
      pending: migrations.filter((migration) => !appliedVersions.has(migration.version)),
    };
  } finally {
    client.release();
  }
}

async function applyPostgresMigrations(pool, directory = POSTGRES_MIGRATIONS_DIRECTORY) {
  const migrations = await loadPostgresMigrations(directory);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_ID]);
    await ensureMigrationTable(client);

    const applied = await getAppliedMigrations(client);
    validateMigrationHistory(migrations, applied);
    const appliedVersions = new Set(applied.map((migration) => migration.version));
    const pending = migrations.filter((migration) => !appliedVersions.has(migration.version));

    for (const migration of pending) {
      await client.query(migration.sql);
      await client.query(
        `INSERT INTO schema_migrations (version, name, checksum)
         VALUES ($1, $2, $3)`,
        [migration.version, migration.name, migration.checksum]
      );
    }

    await client.query('COMMIT');
    return pending.map(({ version, name, checksum: migrationChecksum }) => ({
      version,
      name,
      checksum: migrationChecksum,
    }));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  POSTGRES_MIGRATIONS_DIRECTORY,
  applyPostgresMigrations,
  getMigrationPlan,
  loadPostgresMigrations,
  validateMigrationHistory,
};
