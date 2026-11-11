const assert = require('node:assert/strict');

const apiOrigin = String(process.env.API_BASE_URL || 'https://api.rifkando.com').replace(/\/$/, '');
const storefrontOrigin = String(process.env.STOREFRONT_URL || 'https://www.rifkando.com').replace(/\/$/, '');
const browserOrigin = String(process.env.STOREFRONT_ORIGIN || storefrontOrigin).replace(/\/$/, '');

const fetchWithTimeout = async (url, options = {}) => {
  const signal = AbortSignal.timeout(20_000);
  return fetch(url, { ...options, signal, redirect: 'follow' });
};

const expectOk = async (label, url, options) => {
  const response = await fetchWithTimeout(url, options);
  assert.equal(response.ok, true, `${label} returned HTTP ${response.status}`);
  return response;
};

const run = async () => {
  const storefront = await expectOk('Storefront', `${storefrontOrigin}/`);
  assert.match(storefront.headers.get('content-type') || '', /text\/html/i, 'Storefront must return HTML.');

  const corsHeaders = { Origin: browserOrigin };
  const health = await expectOk('API liveness', `${apiOrigin}/health`, { headers: corsHeaders });
  assert.equal((await health.json()).status, 'ok', 'API liveness payload is invalid.');
  assert.equal(health.headers.get('access-control-allow-origin'), browserOrigin, 'API CORS does not allow the storefront.');

  const database = await expectOk('Database readiness', `${apiOrigin}/ready`, { headers: corsHeaders });
  assert.equal((await database.json()).status, 'ready', 'Database readiness payload is invalid.');

  const storage = await expectOk('Storage readiness', `${apiOrigin}/ready/storage`, { headers: corsHeaders });
  const storageBody = await storage.json();
  assert.equal(storageBody.status, 'ready', 'Storage readiness payload is invalid.');
  assert.equal(storageBody.resource, 'storage', 'Storage readiness resource is invalid.');

  console.log(JSON.stringify({
    status: 'ready',
    storefront: storefrontOrigin,
    api: apiOrigin,
    checks: ['storefront', 'api', 'database', 'storage', 'cors'],
  }));
};

run().catch((error) => {
  console.error(`Production readiness check failed: ${error.message}`);
  process.exitCode = 1;
});
