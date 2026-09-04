const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const testDirectory = path.join(os.tmpdir(), `rifkando-digital-delivery-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkando.db');
process.env.UPLOADS_DIR = path.join(testDirectory, 'uploads');
process.env.OBJECT_STORAGE_DRIVER = 'local';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-digital-tests';
process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-digital-tests';
process.env.AUDIT_LOG_SECRET = 'test-audit-secret-that-is-long-enough-for-digital-tests';
process.env.CLIENT_URL = 'https://www.rifkando.test';
process.env.BACKEND_URL = 'https://api.rifkando.test';
process.env.FEATURE_FLAGS = 'checkout=true,cmi_payments=false,wallet_payments=false,digital_downloads=true,courses=false,services=false,digital=true';
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const app = require('../src/app');
const { establishTestSessionForEmail } = require('./helpers/testSession');
const storage = require('../src/services/storageService');
const { createUploadReceipt, fileSha256 } = require('../src/services/digitalFileService');

const runStatement = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onComplete(error) {
    if (error) reject(error);
    else resolve({ lastID: this.lastID, changes: this.changes });
  });
});
const getRow = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row))));
const closeDatabase = () => new Promise((resolve, reject) => db.close((error) => (error ? reject(error) : resolve())));
const startServer = () => new Promise((resolve) => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
const stopServer = (server) => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
const cookiesFrom = (response) => (typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [response.headers.get('set-cookie')].filter(Boolean)).map((value) => value.split(';')[0]);
const request = (port, pathname, { method = 'GET', cookies = [], csrfToken, body } = {}) => {
  const headers = { Origin: 'https://www.rifkando.test' };
  if (cookies.length) headers.Cookie = cookies.join('; ');
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(`http://127.0.0.1:${port}${pathname}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
};
const login = async (_port, email, _password) => establishTestSessionForEmail(db, email);
const uploadReceipt = (sellerId, contents, name) => {
  const key = storage.createKey('private', `digital-files-user-${sellerId}`, 'pdf');
  return storage.put(key, contents, { contentType: 'application/pdf' }).then(() => {
    const reference = storage.reference(key);
    const receipt = createUploadReceipt({
      key, sellerId, fileName: name, fileSize: contents.length, contentType: 'application/pdf', sha256: fileSha256(contents),
    });
    return { key, reference, receipt: receipt.receipt };
  });
};

async function run() {
  await db.ready;
  const password = 'correct horse battery staple';
  const hash = await bcrypt.hash(password, 12);
  const seller = await runStatement("INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'seller', 1)", ['Digital Seller', 'digital-seller@example.test', hash]);
  const buyer = await runStatement("INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, 'buyer', 1)", ['Digital Buyer', 'digital-buyer@example.test', hash]);
  const originalBytes = Buffer.from('%PDF-rifkando-original-delivery');
  const original = await uploadReceipt(seller.lastID, originalBytes, 'original-guide.pdf');
  const server = await startServer();
  const port = server.address().port;
  try {
    const sellerSession = await login(port, 'digital-seller@example.test', password);
    const buyerSession = await login(port, 'digital-buyer@example.test', password);
    const create = await request(port, '/api/digital', {
      method: 'POST', cookies: sellerSession.cookies, csrfToken: sellerSession.csrfToken,
      body: {
        title: 'Secure PDF guide', description: 'A complete private PDF delivery test.', price: 42, category: 'ebooks', image: '📘', download_limit: 3,
        file_type: 'file', file_url: original.reference, upload_receipt: original.receipt, media: [],
      },
    });
    assert.equal(create.status, 201, 'seller can publish a validated private file');
    const created = await create.json();
    const productId = created.product.id;

    const publicProduct = await request(port, `/api/digital/${productId}`);
    const publicPayload = await publicProduct.json();
    assert.equal(publicProduct.status, 200);
    assert.equal(publicPayload.product.file_url, undefined, 'private storage reference must never be public');
    assert.equal(publicPayload.product.file_name, undefined, 'private file name must never be public');

    const firstRequest = await request(port, `/api/digital/${productId}/request`, { method: 'POST', cookies: buyerSession.cookies, csrfToken: buyerSession.csrfToken, body: { message: 'Please grant my access.' } });
    assert.equal(firstRequest.status, 201, 'buyer can request account-based access');
    const duplicateRequest = await request(port, `/api/digital/${productId}/request`, { method: 'POST', cookies: buyerSession.cookies, csrfToken: buyerSession.csrfToken, body: {} });
    assert.equal(duplicateRequest.status, 409, 'duplicate pending requests are prevented');

    const queue = await request(port, '/api/seller/digital-requests', { cookies: sellerSession.cookies });
    const queuePayload = await queue.json();
    assert.equal(queue.status, 200);
    assert.equal(queuePayload.requests[0].buyer_email, undefined, 'seller queue must not disclose buyer email');
    const requestId = queuePayload.requests[0].id;

    const grant = await request(port, `/api/seller/digital-requests/${requestId}/decision`, { method: 'POST', cookies: sellerSession.cookies, csrfToken: sellerSession.csrfToken, body: { action: 'grant' } });
    assert.equal(grant.status, 200, 'seller can grant secure access');
    const access = await request(port, `/api/digital/${productId}/can-download`, { cookies: buyerSession.cookies });
    assert.equal((await access.json()).canDownload, true);

    const replacementBytes = Buffer.from('%PDF-rifkando-replacement-delivery');
    const replacement = await uploadReceipt(seller.lastID, replacementBytes, 'replacement-guide.pdf');
    const replace = await request(port, `/api/digital/${productId}`, {
      method: 'PUT', cookies: sellerSession.cookies, csrfToken: sellerSession.csrfToken,
      body: {
        title: 'Secure PDF guide', description: 'A complete private PDF delivery test.', price: 42, category: 'ebooks', image: '📘', download_limit: 3,
        file_type: 'file', file_url: replacement.reference, upload_receipt: replacement.receipt, media: [],
      },
    });
    assert.equal(replace.status, 200, 'seller can replace a delivery file with a new validated upload');

    const buyerDownload = await request(port, `/api/digital/${productId}/download`, { cookies: buyerSession.cookies });
    assert.equal(buyerDownload.status, 200, 'granted buyer can download');
    assert.match(buyerDownload.headers.get('content-disposition') || '', /original-guide\.pdf/i, 'buyer must keep the originally granted filename');
    assert.deepEqual(Buffer.from(await buyerDownload.arrayBuffer()), originalBytes, 'buyer must keep the originally granted file version');
    const purchase = await getRow('SELECT download_count, download_url, download_file_name FROM digital_purchases WHERE product_id = ? AND buyer_id = ?', [productId, buyer.lastID]);
    assert.equal(purchase.download_count, 1);
    assert.equal(purchase.download_url, original.reference);
    assert.equal(purchase.download_file_name, 'original-guide.pdf');
    const audit = await getRow("SELECT id FROM audit_logs WHERE action = 'digital.access_granted' AND resource_id = ?", [String(productId)]);
    assert.ok(audit, 'seller access grants must be audit logged');
  } finally {
    await stopServer(server);
  }
  console.log('Digital delivery HTTP smoke test passed.');
}

run()
  .then(closeDatabase)
  .catch(async (error) => {
    console.error(error.stack || error.message);
    await closeDatabase().catch(() => undefined);
    process.exitCode = 1;
  })
  .finally(async () => { await fs.rm(testDirectory, { recursive: true, force: true }); });
