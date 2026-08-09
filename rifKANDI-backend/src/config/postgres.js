const { Pool } = require('pg');

function parsePositiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, maximum);
}

function shouldUseTls() {
  if (process.env.POSTGRES_SSL === 'true') return true;
  if (process.env.POSTGRES_SSL === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

function createPostgresPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for PostgreSQL migration commands');
  }

  return new Pool({
    connectionString,
    max: parsePositiveInteger(process.env.POSTGRES_POOL_MAX, 5, 20),
    connectionTimeoutMillis: parsePositiveInteger(process.env.POSTGRES_CONNECT_TIMEOUT_MS, 10_000, 60_000),
    idleTimeoutMillis: parsePositiveInteger(process.env.POSTGRES_IDLE_TIMEOUT_MS, 30_000, 300_000),
    ssl: shouldUseTls() ? { rejectUnauthorized: false } : false,
  });
}

async function inspectPostgresConnection(pool) {
  const result = await pool.query(`
    SELECT
      current_database() AS database_name,
      current_user AS database_user,
      version() AS server_version
  `);

  return result.rows[0];
}

module.exports = {
  createPostgresPool,
  inspectPostgresConnection,
};
