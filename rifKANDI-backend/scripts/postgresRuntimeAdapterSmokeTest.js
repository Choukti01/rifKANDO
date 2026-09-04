const assert = require('assert');
const {
  createPostgresDatabase,
  getDatabaseEngine,
  prepareRunStatement,
  quoteCaseSensitiveIdentifiers,
  replaceQuestionMarkPlaceholders,
  translateSql,
} = require('../src/config/postgresDatabase');

function callbackResult(register) {
  return new Promise((resolve, reject) => {
    register(function onResult(error, value) {
      if (error) reject(error);
      else resolve({ context: this, value });
    });
  });
}

function createFakePool() {
  const calls = [];
  const query = async (sql, parameters = []) => {
    calls.push({ sql, parameters });
    if (/^\s*INSERT\b/i.test(sql)) return { rowCount: 1, rows: [{ id: 42 }] };
    if (/^\s*SELECT\b/i.test(sql)) return { rowCount: 1, rows: [{ id: 7, status: 'pending' }] };
    return { rowCount: 1, rows: [] };
  };
  const client = {
    query,
    release() {
      calls.push({ sql: 'RELEASE' });
    },
  };

  return {
    calls,
    async query(sql, parameters) {
      return query(sql, parameters);
    },
    async connect() {
      return client;
    },
    async end() {
      calls.push({ sql: 'POOL_END' });
    },
  };
}

async function main() {
  assert.strictEqual(getDatabaseEngine(), 'sqlite');
  assert.strictEqual(getDatabaseEngine('postgres'), 'postgres');
  assert.throws(() => getDatabaseEngine('mysql'), /DATABASE_ENGINE/);
  assert.strictEqual(replaceQuestionMarkPlaceholders("SELECT '?' AS literal, id = ?"), "SELECT '?' AS literal, id = $1");
  assert.strictEqual(
    quoteCaseSensitiveIdentifiers("SELECT 'profilePicture' AS literal, profilePicture FROM users"),
    "SELECT 'profilePicture' AS literal, \"profilePicture\" FROM users"
  );
  assert.strictEqual(
    translateSql("SELECT * FROM password_resets WHERE used = 0 AND expires_at > datetime('now', '-7 days')"),
    "SELECT * FROM password_resets WHERE used = FALSE AND expires_at > CURRENT_TIMESTAMP + INTERVAL '-7 days'"
  );
  assert.strictEqual(
    translateSql('UPDATE products SET sold = MAX(COALESCE(sold, 0) - ?, 0) WHERE id = ?'),
    'UPDATE products SET sold = GREATEST(COALESCE(sold, 0) - $1, 0) WHERE id = $2'
  );
  assert.strictEqual(
    prepareRunStatement('INSERT OR IGNORE INTO wallets (user_id) VALUES (?)'),
    'INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id'
  );
  assert.strictEqual(
    prepareRunStatement('INSERT INTO users (name, is_verified, profilePicture) VALUES (?, TRUE, ?)'),
    'INSERT INTO users (name, is_verified, "profilePicture") VALUES ($1, TRUE, $2) RETURNING id'
  );

  const pool = createFakePool();
  const database = createPostgresDatabase({ pool, verifySchema: async () => undefined });
  await database.ready;

  const insert = await callbackResult((callback) => {
    database.run('INSERT INTO orders (order_number) VALUES (?)', ['RK-1'], callback);
  });
  assert.strictEqual(insert.context.lastID, 42);
  assert.strictEqual(insert.context.changes, 1);

  const selected = await callbackResult((callback) => {
    database.get('SELECT * FROM orders WHERE id = ?', [7], callback);
  });
  assert.deepStrictEqual(selected.value, { id: 7, status: 'pending' });

  const transactionResult = await database.withTransaction(async (transaction) => {
    const result = await transaction.run('INSERT INTO orders (order_number) VALUES (?)', ['RK-2']);
    const row = await transaction.get('SELECT * FROM orders WHERE id = ?', [result.lastID]);
    return row.id;
  });
  assert.strictEqual(transactionResult, 7);
  assert.ok(pool.calls.some((call) => call.sql === 'BEGIN ISOLATION LEVEL SERIALIZABLE'));
  assert.ok(pool.calls.some((call) => call.sql === 'COMMIT'));

  await new Promise((resolve, reject) => {
    database.close((error) => (error ? reject(error) : resolve()));
  });
  assert.ok(pool.calls.some((call) => call.sql === 'POOL_END'));
  console.log('PostgreSQL runtime adapter smoke test passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
