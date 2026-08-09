const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const testDirectory = path.join(os.tmpdir(), `rifkando-observability-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkando.db');
process.env.JWT_SECRET = 'observability-test-secret-that-is-long-enough';
process.env.SESSION_SECRET = 'observability-session-secret-that-is-long-enough';
process.env.CLIENT_URL = 'https://www.rifkando.test';
process.env.METRICS_TOKEN = 'observability-metrics-test-token';
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const app = require('../src/app');

const closeDatabase = () => new Promise((resolve, reject) => {
  db.close((error) => (error ? reject(error) : resolve()));
});

const startServer = () => new Promise((resolve) => {
  const server = app.listen(0, '127.0.0.1', () => resolve(server));
});

const stopServer = (server) => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
});

const request = (port, pathname, headers = {}) => fetch(`http://127.0.0.1:${port}${pathname}`, { headers });

const run = async () => {
  await db.ready;

  const server = await startServer();
  const port = server.address().port;
  try {
    const healthRequestId = 'health-check-request-001';
    const health = await request(port, '/health', { 'X-Request-ID': healthRequestId });
    const healthBody = await health.json();
    assert.equal(health.status, 200, 'liveness endpoint must stay available while the process is running');
    assert.equal(health.headers.get('x-request-id'), healthRequestId, 'valid client request IDs must be preserved for tracing');
    assert.equal(healthBody.requestId, healthRequestId, 'health response must expose its correlation ID');
    assert.equal(healthBody.status, 'ok');

    const readiness = await request(port, '/ready');
    assert.equal(readiness.status, 200, 'readiness endpoint must confirm database availability');
    assert.equal((await readiness.json()).status, 'ready');

    const hiddenMetrics = await request(port, '/metrics');
    assert.equal(hiddenMetrics.status, 404, 'metrics must not be discoverable without the monitoring token');

    const metrics = await request(port, '/metrics', { 'X-Metrics-Token': process.env.METRICS_TOKEN });
    const metricsBody = await metrics.json();
    assert.equal(metrics.status, 200, 'authorized monitoring must receive metrics');
    assert.equal(metrics.headers.get('cache-control'), 'no-store', 'metrics must never be cached');
    assert.equal(metricsBody.http.requestsTotal >= 3, true, 'metrics must include completed requests');
    assert.equal(metricsBody.http.requestsByRoute['GET /health'] >= 1, true, 'metrics must use low-cardinality route labels');
    assert.equal(metricsBody.http.requestsByStatus['200'] >= 2, true, 'metrics must count response statuses');
    assert.equal(metricsBody.http.requestsByStatus['404'] >= 1, true, 'metrics must count denied probes without leaking details');
    assert.equal(typeof metricsBody.process.memoryRssBytes, 'number');
  } finally {
    await stopServer(server);
  }

  console.log('Observability smoke test passed.');
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
