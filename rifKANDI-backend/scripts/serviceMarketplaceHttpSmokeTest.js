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
process.env.UPLOADS_DIR = path.join(testDirectory, 'uploads');
process.env.SELLER_COMMISSION_ACCOUNT_HOLDER = 'rifKANDO Test Account';
process.env.SELLER_COMMISSION_BANK_NAME = 'Attijariwafa bank';
process.env.SELLER_COMMISSION_RIB = '123456789012345678901234';
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
  const founder = await createUser('Founder Controller', 'admin');
  await runStatement('UPDATE users SET email = ? WHERE id = ?', ['achoukti1999@gmail.com', founder.id]);
  const server = await startServer();
  const port = server.address().port;
  try {
    const sellerHeaders = await sessionHeaders(seller);
    const buyerHeaders = await sessionHeaders(buyer);
    const secondBuyerHeaders = await sessionHeaders(secondBuyer);
    const founderHeaders = await sessionHeaders({ ...founder, email: 'achoukti1999@gmail.com' });

    const profile = await fetchJson(port, '/api/my-service-profile', {
      method: 'PUT', headers: { ...sellerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({
        headline: 'Professional visual designer', introduction: 'I help local brands present themselves clearly online.',
        experience_summary: 'Five years designing identity systems, menus, social templates, and launch assets.',
        skills: ['Brand design', 'Figma'], languages: ['Arabic', 'French'], credentials: [], availability: 'available', response_time: 'Usually within one business day',
      }),
    });
    assert.equal(profile.response.status, 200, 'provider can save a public professional profile');

    const payoutProfile = await fetchJson(port, '/api/my-service-payout-profile', {
      method: 'PUT', headers: { ...sellerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({
        account_holder: 'Service Provider Test', payout_method: 'bank_transfer', bank_name: 'Test Bank',
        rib: '123456789012345678901234', payout_phone: '0600000000',
      }),
    });
    assert.equal(payoutProfile.response.status, 200, 'provider can save private payout details');
    const privatePayoutProfile = await fetchJson(port, '/api/my-service-payout-profile', { headers: sellerHeaders });
    assert.equal(privatePayoutProfile.response.status, 200, 'provider can read their own private payout details');
    assert.equal(privatePayoutProfile.body.profile.rib, '123456789012345678901234');

    // Credentials are optional public proof—not identity verification. Exercise
    // both supported formats and prove that the published profile only accepts
    // URLs generated by the dedicated credential upload route.
    const uploadCredential = async (filename, contentType, content) => {
      const form = new FormData();
      form.append('credential', new Blob([content], { type: contentType }), filename);
      return fetchJson(port, '/api/upload-service-credential', {
        method: 'POST', headers: sellerHeaders, body: form,
      });
    };
    const diplomaPdf = await uploadCredential('design-diploma.pdf', 'application/pdf', Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'));
    assert.equal(diplomaPdf.response.status, 201, 'provider can upload a valid PDF credential proof');
    assert.equal(diplomaPdf.body.type, 'pdf');
    assert.match(diplomaPdf.body.url, /service-credential-proofs\/.+\.pdf$/, 'PDF proof is stored in the dedicated public prefix');
    const certificateImage = await uploadCredential('figma-certificate.png', 'image/png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));
    assert.equal(certificateImage.response.status, 201, 'provider can upload a valid image credential proof');
    assert.equal(certificateImage.body.type, 'image');

    const credentials = [
      { title: 'Visual design diploma', issuer: 'Design Institute', year: '2024', proof_url: diplomaPdf.body.url, proof_type: diplomaPdf.body.type },
      { title: 'Figma certificate', issuer: 'Figma Academy', year: '2025', proof_url: certificateImage.body.url, proof_type: certificateImage.body.type },
    ];
    const profileWithCredentials = await fetchJson(port, '/api/my-service-profile', {
      method: 'PUT', headers: { ...sellerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({
        headline: 'Professional visual designer', introduction: 'I help local brands present themselves clearly online.',
        experience_summary: 'Five years designing identity systems, menus, social templates, and launch assets.',
        skills: ['Brand design', 'Figma'], languages: ['Arabic', 'French'], credentials, availability: 'available', response_time: 'Usually within one business day',
      }),
    });
    assert.equal(profileWithCredentials.response.status, 200, 'provider can publish public credential metadata with dedicated proof URLs');
    const forgedCredential = await fetchJson(port, '/api/my-service-profile', {
      method: 'PUT', headers: { ...sellerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({
        headline: 'Professional visual designer', introduction: 'I help local brands present themselves clearly online.',
        experience_summary: 'Five years designing identity systems, menus, social templates, and launch assets.',
        skills: ['Brand design', 'Figma'], languages: ['Arabic', 'French'],
        credentials: [{ ...credentials[0], proof_url: 'https://example.test/untrusted-diploma.pdf' }], availability: 'available', response_time: 'Usually within one business day',
      }),
    });
    assert.equal(forgedCredential.response.status, 422, 'arbitrary external credential links are rejected');
    const publicProvider = await fetchJson(port, `/api/service-providers/${seller.id}`);
    assert.equal(publicProvider.response.status, 200, 'a unified public profile exposes a provider professional layer');
    assert.deepEqual(publicProvider.body.profile.credentials, credentials, 'only the provider’s approved public credential metadata is visible');

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
    ]) {
      const transition = await fetchJson(port, `/api/service-orders/${requestId}/status`, {
        method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note }),
      });
      assert.equal(transition.response.status, 200, `service transition ${action} succeeds`);
    }

    const blockedStart = await fetchJson(port, `/api/service-orders/${requestId}/status`, {
      method: 'PATCH', headers: { ...sellerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start' }),
    });
    assert.equal(blockedStart.response.status, 409, 'provider cannot begin before a bank transfer is verified');
    const instructions = await fetchJson(port, `/api/service-orders/${requestId}/payment-instructions`, {
      method: 'POST', headers: buyerHeaders,
    });
    assert.equal(instructions.response.status, 200, 'buyer can open bank transfer instructions after acceptance');
    assert.equal(instructions.body.instructions.amount, 600, 'payment amount uses the selected package amount');
    assert.equal(instructions.body.instructions.rib, process.env.SELLER_COMMISSION_RIB, 'bank details originate only from server configuration');
    const submitTransfer = await fetchJson(port, `/api/service-orders/${requestId}/payment-submission`, {
      method: 'POST', headers: { ...buyerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ transferReference: 'ATW-TEST-2026-001', note: 'Transferred from the client account.' }),
    });
    assert.equal(submitTransfer.response.status, 200, 'buyer can submit a transfer reference for review');
    const unauthorizedReconciliation = await fetchJson(port, '/api/admin/service-reconciliation', { headers: sellerHeaders });
    assert.equal(unauthorizedReconciliation.response.status, 403, 'provider cannot access private service reconciliation');
    const reconciliation = await fetchJson(port, '/api/admin/service-reconciliation', { headers: founderHeaders });
    assert.equal(reconciliation.response.status, 200, 'named founder can access service reconciliation');
    assert.equal(reconciliation.body.transfers[0].payment_status, 'submitted', 'submitted transfer is visible to the founder');
    const verified = await fetchJson(port, `/api/admin/service-reconciliation/${reconciliation.body.transfers[0].id}/verify`, {
      method: 'POST', headers: { ...founderHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', note: 'Matched to the bank account.' }),
    });
    assert.equal(verified.response.status, 200, 'founder can verify a submitted transfer');
    const startAfterVerification = await fetchJson(port, `/api/service-orders/${requestId}/status`, {
      method: 'PATCH', headers: { ...sellerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start', note: 'Payment verified; work has started.' }),
    });
    assert.equal(startAfterVerification.response.status, 200, 'provider can begin after founder verification');

    const privateWorkroom = await fetchJson(port, `/api/service-orders/${requestId}/workroom`, { headers: secondBuyerHeaders });
    assert.equal(privateWorkroom.response.status, 403, 'unrelated users cannot read a private service workroom');
    const invalidDelivery = await fetchJson(port, `/api/service-orders/${requestId}/workroom/entries`, {
      method: 'POST', headers: { ...buyerHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'delivery', body: 'A buyer must not be able to impersonate a provider delivery.', delivery_url: 'https://example.test/deliverable' }),
    });
    assert.equal(invalidDelivery.response.status, 409, 'only the provider can deliver work');
    const delivery = await fetchJson(port, `/api/service-orders/${requestId}/workroom/entries`, {
      method: 'POST', headers: { ...sellerHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'delivery', body: 'The first version is ready for your review.', delivery_url: 'https://example.test/first-version' }),
    });
    assert.equal(delivery.response.status, 201, 'provider can deliver work through the private workroom');
    assert.equal(delivery.body.status, 'submitted', 'delivery atomically moves the service request to submitted');
    const buyerWorkroom = await fetchJson(port, `/api/service-orders/${requestId}/workroom`, { headers: buyerHeaders });
    assert.equal(buyerWorkroom.response.status, 200, 'buyer can read their private service workroom');
    assert.equal(buyerWorkroom.body.workroom.entries[0].entry_type, 'delivery');
    const revision = await fetchJson(port, `/api/service-orders/${requestId}/workroom/entries`, {
      method: 'POST', headers: { ...buyerHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'revision', body: 'Please make the heading more visible.' }),
    });
    assert.equal(revision.response.status, 201, 'buyer can request a revision through the workroom');
    assert.equal(revision.body.status, 'revision_requested', 'revision atomically returns the project to the provider');

    for (const [headers, action, note] of [
      [sellerHeaders, 'start', 'I am applying the requested revision.'],
    ]) {
      const transition = await fetchJson(port, `/api/service-orders/${requestId}/status`, {
        method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note }),
      });
      assert.equal(transition.response.status, 200, `service transition ${action} succeeds`);
    }
    const revisedDelivery = await fetchJson(port, `/api/service-orders/${requestId}/workroom/entries`, {
      method: 'POST', headers: { ...sellerHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'delivery', body: 'The revised files are ready for approval.', delivery_url: 'https://example.test/revised-version' }),
    });
    assert.equal(revisedDelivery.response.status, 201, 'provider can submit a revised delivery');
    const openedDispute = await fetchJson(port, `/api/service-orders/${requestId}/disputes`, {
      method: 'POST', headers: { ...buyerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({
        reason: 'not_as_agreed', description: 'The final version still misses a required bilingual section.',
      }),
    });
    assert.equal(openedDispute.response.status, 201, 'buyer can open a verified-payment service dispute');
    const heldDisputes = await fetchJson(port, '/api/admin/service-reconciliation', { headers: founderHeaders });
    assert.equal(heldDisputes.response.status, 200);
    assert.equal(heldDisputes.body.transfers[0].payout_status, 'withheld', 'an open dispute holds provider settlement');
    const resolvedDispute = await fetchJson(port, `/api/admin/service-disputes/${openedDispute.body.dispute.id}/resolve`, {
      method: 'POST', headers: { ...founderHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({
        action: 'resolve_provider', note: 'The delivery evidence meets the agreed service scope.', reference: '',
      }),
    });
    assert.equal(resolvedDispute.response.status, 200, 'founder can resolve a service dispute with an auditable note');
    const completion = await fetchJson(port, `/api/service-orders/${requestId}/status`, {
      method: 'PATCH', headers: { ...buyerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', note: 'The final result is approved.' }),
    });
    assert.equal(completion.response.status, 200, 'buyer can complete the reviewed service request');

    const duePayouts = await fetchJson(port, '/api/admin/service-reconciliation', { headers: founderHeaders });
    assert.equal(duePayouts.response.status, 200);
    assert.equal(duePayouts.body.transfers[0].payout_status, 'due', 'provider payout becomes due only after buyer completion');
    const payout = await fetchJson(port, `/api/admin/service-reconciliation/${duePayouts.body.transfers[0].id}/payout`, {
      method: 'POST', headers: { ...founderHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ payoutReference: 'SELLER-TEST-001', note: 'Transferred to the provider.' }),
    });
    assert.equal(payout.response.status, 200, 'founder can record a post-completion seller payout');

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
