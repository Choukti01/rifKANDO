const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDirectory = path.join(os.tmpdir(), `rifkando-service-marketplace-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_ENGINE = 'sqlite';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkando.db');
process.env.JWT_SECRET = 'service-marketplace-test-secret-that-is-long-enough';
process.env.SESSION_SECRET = 'service-marketplace-session-secret-that-is-long-enough';
process.env.CLIENT_URL = 'https://www.rifkando.test';
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const app = require('../src/app');
const { establishTestSessionForEmail } = require('./helpers/testSession');

let nextPhoneSuffix = 1;
const runStatement = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onComplete(error) {
    if (error) return reject(error);
    return resolve({ lastID: this.lastID, changes: this.changes });
  });
});
const closeDatabase = () => new Promise((resolve, reject) => db.close((error) => (error ? reject(error) : resolve())));
const startServer = () => new Promise((resolve) => {
  const server = app.listen(0, '127.0.0.1', () => resolve(server));
});
const stopServer = (server) => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));

const createUser = async (name, role) => {
  const email = `${name.toLowerCase().replaceAll(' ', '-')}@services.test`;
  const result = await runStatement(
    'INSERT INTO users (name, email, password, phone, role, city, country) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, email, 'not-used-in-test', `06${String(nextPhoneSuffix++).padStart(8, '0')}`, role, 'Nador', 'Morocco']
  );
  return { id: result.lastID, email };
};
const sessionHeaders = async (user) => {
  const session = await establishTestSessionForEmail(db, user.email);
  return { Cookie: session.cookies.join('; '), 'X-CSRF-Token': session.csrfToken };
};
const fetchJson = async (port, pathname, options = {}) => {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, options);
  return { response, body: await response.json() };
};

async function run() {
  await db.ready;
  const seller = await createUser('Service Provider', 'seller');
  const buyer = await createUser('Service Client', 'buyer');
  const secondBuyer = await createUser('Second Client', 'buyer');
  const server = await startServer();
  const port = server.address().port;
  try {
    const sellerHeaders = await sessionHeaders(seller);
    const buyerHeaders = await sessionHeaders(buyer);
    const secondBuyerHeaders = await sessionHeaders(secondBuyer);

    const profile = await fetchJson(port, '/api/my-service-profile', {
      method: 'PUT', headers: { ...sellerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({
        headline: 'Professional visual designer', introduction: 'I help local brands present themselves clearly online.',
        experience_summary: 'Five years designing identity systems, menus, social templates, and launch assets.',
        skills: ['Brand design', 'Figma'], languages: ['Arabic', 'French'], credentials: [], availability: 'available', response_time: 'Usually within one business day',
      }),
    });
    assert.equal(profile.response.status, 200, 'provider can save a public professional profile');

    const created = await fetchJson(port, '/api/services', {
      method: 'POST', headers: { ...sellerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({
        title: 'Professional restaurant menu design', category: 'design', price: 450,
        description: 'A practical restaurant menu design for local businesses, prepared for print and social media use.',
        delivery_time: '3 days', revisions: 2, image: '', media: [],
        deliverables: ['Two initial menu concepts', 'Print-ready PDF'], client_requirements: ['Menu items and prices', 'Logo or business name'],
      }),
    });
    assert.equal(created.response.status, 201, 'provider can publish a service offer');
    const serviceId = created.body.service.id;

    const packageCreated = await fetchJson(port, `/api/services/${serviceId}/packages`, {
      method: 'POST', headers: { ...sellerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({
        name: 'Starter menu', price: 600, delivery_time: '3 days', revisions: 2, features: 'Two concepts\nPrint-ready PDF',
      }),
    });
    assert.equal(packageCreated.response.status, 201, `provider can create a package through the modular service route: ${JSON.stringify(packageCreated.body)}`);
    const packageId = packageCreated.body.package.id;

    const detail = await fetchJson(port, `/api/services/${serviceId}`);
    assert.equal(detail.response.status, 200, 'public service page loads');
    assert.deepEqual(detail.body.service.deliverables, ['Two initial menu concepts', 'Print-ready PDF']);
    assert.equal(detail.body.service.packages[0].id, packageId, 'public service page exposes real package choices');

    const requested = await fetchJson(port, `/api/services/${serviceId}/requests`, {
      method: 'POST', headers: { ...buyerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ packageId, requirements: 'I need a bilingual menu for a small café opening next month.' }),
    });
    assert.equal(requested.response.status, 201, 'buyer can create a request');
    const requestId = requested.body.request.id;

    const replay = await fetchJson(port, `/api/services/${serviceId}/requests`, {
      method: 'POST', headers: { ...buyerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ packageId, requirements: 'This duplicate request must be rejected safely.' }),
    });
    assert.equal(replay.response.status, 409, 'active duplicate requests are prevented');

    const unauthorizedTransition = await fetchJson(port, `/api/service-orders/${requestId}/status`, {
      method: 'PATCH', headers: { ...secondBuyerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete' }),
    });
    assert.equal(unauthorizedTransition.response.status, 409, 'unrelated users cannot change a service request');

    for (const [headers, action, note] of [
      [sellerHeaders, 'accept', 'The brief is clear. I can start this week.'],
      [sellerHeaders, 'start', 'I am preparing the first concepts.'],
      [sellerHeaders, 'submit', 'The first version is ready for your review.'],
      [buyerHeaders, 'request_revision', 'Please make the heading more visible.'],
      [sellerHeaders, 'start', 'I am applying the requested revision.'],
      [sellerHeaders, 'submit', 'The revised files are ready for approval.'],
      [buyerHeaders, 'complete', 'The final result is approved.'],
    ]) {
      const transition = await fetchJson(port, `/api/service-orders/${requestId}/status`, {
        method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note }),
      });
      assert.equal(transition.response.status, 200, `service transition ${action} succeeds`);
    }

    const review = await fetchJson(port, `/api/service-orders/${requestId}/review`, {
      method: 'POST', headers: { ...buyerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: 5, comment: 'Clear communication and a useful final result.' }),
    });
    assert.equal(review.response.status, 201, 'completed service buyer can review once');
    const repeatedReview = await fetchJson(port, `/api/service-orders/${requestId}/review`, {
      method: 'POST', headers: { ...buyerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: 5, comment: 'A second review must not be accepted.' }),
    });
    assert.equal(repeatedReview.response.status, 409, 'service reviews are one per completed request');

    const unavailable = await fetchJson(port, '/api/my-service-profile', {
      method: 'PUT', headers: { ...sellerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({
        headline: 'Professional visual designer', introduction: 'I help local brands present themselves clearly online.',
        experience_summary: 'Five years designing identity systems, menus, social templates, and launch assets.',
        skills: ['Brand design', 'Figma'], languages: ['Arabic', 'French'], credentials: [], availability: 'unavailable', response_time: 'Usually within one business day',
      }),
    });
    assert.equal(unavailable.response.status, 200);
    const unavailableRequest = await fetchJson(port, `/api/services/${serviceId}/requests`, {
      method: 'POST', headers: { ...secondBuyerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ packageId, requirements: 'I want to hire this provider while they are unavailable.' }),
    });
    assert.equal(unavailableRequest.response.status, 409, 'unavailable providers cannot receive new requests');
  } finally {
    await stopServer(server);
  }
  console.log('Service marketplace workflow smoke test passed.');
}

run()
  .then(closeDatabase)
  .catch(async (error) => {
    console.error(error.stack || error.message);
    await closeDatabase().catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(async () => { await fs.rm(testDirectory, { recursive: true, force: true }); });
