const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const testDirectory = path.join(os.tmpdir(), `rifkando-minor-migration-${crypto.randomUUID()}`);
const databasePath = path.join(testDirectory, 'rifkando.db');
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = databasePath;
fsSync.mkdirSync(testDirectory, { recursive: true });

const openLegacyDatabase = () => new Promise((resolve, reject) => {
  const legacy = new sqlite3.Database(databasePath, (error) => (error ? reject(error) : resolve(legacy)));
});

const run = (database, sql, parameters = []) => new Promise((resolve, reject) => {
  database.run(sql, parameters, function onRun(error) {
    if (error) reject(error);
    else resolve({ lastID: this.lastID, changes: this.changes });
  });
});

const get = (database, sql, parameters = []) => new Promise((resolve, reject) => {
  database.get(sql, parameters, (error, row) => (error ? reject(error) : resolve(row)));
});

const close = (database) => new Promise((resolve, reject) => {
  database.close((error) => (error ? reject(error) : resolve()));
});

const test = async () => {
  const legacy = await openLegacyDatabase();
  await run(legacy, `
    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      title TEXT,
      description TEXT,
      price REAL NOT NULL,
      old_price REAL,
      seller_id INTEGER,
      image TEXT,
      category TEXT,
      stock INTEGER DEFAULT 0,
      sold INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      views INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      condition TEXT DEFAULT 'new',
      created_at DATETIME
    )
  `);
  await run(legacy, 'INSERT INTO products (id, title, price, old_price) VALUES (?, ?, ?, ?)', [1, 'Legacy product', 123.45, 199.99]);
  await close(legacy);

  const db = require('../src/config/database');
  await db.ready;
  const product = await get(db, 'SELECT price_minor, old_price_minor FROM products WHERE id = 1');
  assert.deepEqual(product, { price_minor: 12345, old_price_minor: 19999 });
  await close(db);
  console.log('Minor-unit migration smoke test passed.');
};

test()
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await fs.rm(testDirectory, { recursive: true, force: true });
  });
