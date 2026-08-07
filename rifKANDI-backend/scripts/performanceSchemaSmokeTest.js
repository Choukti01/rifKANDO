const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const testDirectory = path.join(os.tmpdir(), `rifkando-performance-schema-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkando.db');
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row)));
});

const closeDatabase = () => new Promise((resolve, reject) => {
  db.close((error) => (error ? reject(error) : resolve()));
});

const requiredIndexes = [
  'idx_products_catalog_created',
  'idx_products_catalog_condition_created',
  'idx_courses_catalog_created',
  'idx_services_catalog_created',
  'idx_digital_products_catalog_created',
  'idx_bookings_catalog_created',
  'idx_orders_buyer_created',
  'idx_digital_purchases_buyer_created',
  'idx_digital_purchases_product_buyer',
  'idx_appointments_client_date',
  'idx_appointments_provider_date',
  'idx_product_media_listing',
  'idx_course_media_listing',
  'idx_service_media_listing',
  'idx_digital_media_listing',
  'idx_booking_media_listing',
];

const run = async () => {
  await db.ready;
  for (const name of requiredIndexes) {
    const index = await get("SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?", [name]);
    assert.equal(index?.name, name, `${name} must exist for its production query path`);
  }
  console.log('Performance schema smoke test passed.');
};

run()
  .then(closeDatabase)
  .catch(async (error) => {
    console.error(error.stack || error.message);
    try {
      await closeDatabase();
    } catch (_) {
      // Preserve the original failure.
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await fs.rm(testDirectory, { recursive: true, force: true });
  });
