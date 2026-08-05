const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const testDirectory = path.join(os.tmpdir(), `rifkando-storage-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.OBJECT_STORAGE_DRIVER = 'local';
process.env.UPLOADS_DIR = testDirectory;

const storage = require('../src/services/storageService');

const readStream = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
};

const run = async () => {
  const publicKey = storage.createKey('public', 'media', 'png');
  await storage.put(publicKey, Buffer.from('public-image'), { contentType: 'image/png' });
  assert.equal(storage.publicUrl(publicKey).startsWith('/uploads/media/'), true);
  assert.equal(storage.publicKeyFromUrl(storage.publicUrl(publicKey)), publicKey);

  const privateKey = storage.createKey('private', 'verification', 'pdf');
  await storage.put(privateKey, Buffer.from('%PDF-test'), { contentType: 'application/pdf' });
  const reference = storage.reference(privateKey);
  assert.equal(storage.keyFromReference(reference, 'private'), privateKey);
  assert.deepEqual(await readStream(await storage.getPrivateStream(privateKey)), Buffer.from('%PDF-test'));
  assert.throws(() => storage.localPath('private/../secrets.txt'), /Invalid storage key/);

  await storage.delete(publicKey);
  await storage.delete(privateKey);
  console.log('Storage smoke test passed.');
};

run()
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await fs.rm(testDirectory, { recursive: true, force: true });
  });
