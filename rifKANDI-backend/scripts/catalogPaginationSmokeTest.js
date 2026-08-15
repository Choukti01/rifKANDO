const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const testDirectory = path.join(os.tmpdir(), `rifkando-catalog-pagination-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkando.db');
process.env.JWT_SECRET = 'catalog-pagination-test-secret-that-is-long-enough';
process.env.SESSION_SECRET = 'catalog-pagination-session-secret-that-is-long-enough';
process.env.CLIENT_URL = 'https://www.rifkando.test';
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const app = require('../src/app');

const runStatement = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onComplete(error) {
    if (error) return reject(error);
    return resolve({ lastID: this.lastID });
  });
});

const closeDatabase = () => new Promise((resolve, reject) => {
  db.close((error) => (error ? reject(error) : resolve()));
});

const startServer = () => new Promise((resolve) => {
  const server = app.listen(0, '127.0.0.1', () => resolve(server));
});

const stopServer = (server) => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
});

const fetchJson = async (port, pathname) => {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`);
  return { response, body: await response.json() };
};

const seedCatalog = async () => {
  const seller = await runStatement(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'seller')",
    ['Catalog Pagination Seller', 'catalog-pagination-seller@example.test', 'not-used-in-this-test']
  );
  const buyer = await runStatement(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'buyer')",
    ['Catalog Pagination Buyer', 'catalog-pagination-buyer@example.test', 'not-used-in-this-test']
  );

  for (let index = 1; index <= 13; index += 1) {
    const suffix = String(index).padStart(2, '0');
    await runStatement(
      "INSERT INTO courses (title, description, price, category, level, instructor_id, status) VALUES (?, ?, ?, ?, ?, ?, 'published')",
      [`Course ${suffix}`, 'Catalog pagination test course.', index, 'Programming', 'beginner', seller.lastID]
    );
    await runStatement(
      "INSERT INTO services (title, description, price, category, provider_id, status) VALUES (?, ?, ?, ?, ?, 'published')",
      [`Service ${suffix}`, 'Catalog pagination test service.', index, 'Design', seller.lastID]
    );
    await runStatement(
      "INSERT INTO digital_products (title, description, price, category, seller_id, status, file_url) VALUES (?, ?, ?, ?, ?, 'published', ?)",
      [`Digital ${suffix}`, 'Catalog pagination test digital product.', index, 'Ebooks', seller.lastID, `private/digital-files-user-${seller.lastID}/file-${suffix}.pdf`]
    );
    await runStatement(
      `INSERT INTO findit_requests
        (request_number, buyer_id, title, description, category, city, preferred_condition, budget_max, budget_max_minor, status, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 'any', ?, ?, 'active', datetime('now', '+7 days'))`,
      [`FIND-SEED-${suffix}`, buyer.lastID, `FINDit Request ${suffix}`, 'Catalog pagination test buyer request.', 'Auto & Parts', 'Tangier', index * 100, index * 10000]
    );
  }
};

const assertCatalogPagination = async (port, pathname, collection) => {
  const querySeparator = pathname.includes('?') ? '&' : '?';
  const firstPage = await fetchJson(port, `${pathname}${querySeparator}page=1&limit=12`);
  assert.equal(firstPage.response.status, 200, `${pathname} first page must succeed`);
  assert.match(firstPage.response.headers.get('cache-control') || '', /max-age=\d+/, `${pathname} must be safely cacheable`);
  assert.equal(firstPage.body[collection].length, 12, `${pathname} must return the requested page size`);
  assert.deepEqual(firstPage.body.pagination, {
    page: 1,
    limit: 12,
    total: 13,
    totalPages: 2,
    hasNextPage: true,
  });

  const secondPage = await fetchJson(port, `${pathname}${querySeparator}page=2&limit=12`);
  assert.equal(secondPage.response.status, 200, `${pathname} second page must succeed`);
  assert.equal(secondPage.body[collection].length, 1, `${pathname} final page must contain the remaining record`);
  assert.equal(secondPage.body.pagination.hasNextPage, false, `${pathname} must identify the final page`);

  const cappedPage = await fetchJson(port, `${pathname}${querySeparator}limit=500`);
  assert.equal(cappedPage.body.pagination.limit, 50, `${pathname} must cap untrusted page sizes`);
};

const run = async () => {
  await db.ready;
  await seedCatalog();

  const server = await startServer();
  const port = server.address().port;
  try {
    await assertCatalogPagination(port, '/api/courses', 'courses');
    await assertCatalogPagination(port, '/api/services', 'services');
    await assertCatalogPagination(port, '/api/digital', 'products');
    await assertCatalogPagination(port, '/api/findit/requests', 'requests');

    const digitalPage = await fetchJson(port, '/api/digital?page=1&limit=12');
    assert.equal(Object.hasOwn(digitalPage.body.products[0], 'file_url'), false, 'catalog responses must not expose private digital file references');
  } finally {
    await stopServer(server);
  }

  console.log('Catalog pagination smoke test passed.');
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
