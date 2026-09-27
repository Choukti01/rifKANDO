const assert = require('node:assert/strict');
const crypto = require('node:crypto');
require('dotenv').config();
const storage = require('../src/services/storageService');

const readStream = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
};

const run = async () => {
  assert.equal(storage.isLocal(), false, 'Set OBJECT_STORAGE_DRIVER=s3 before running this preflight.');

  const runId = crypto.randomUUID();
  const payload = Buffer.from(`rifKANDO R2 preflight ${runId}`, 'utf8');
  const privateKey = `private/preflight/${runId}.txt`;
  const publicKey = `public/preflight/${runId}.txt`;

  try {
    await storage.put(privateKey, payload, { contentType: 'text/plain', cacheControl: 'no-store' });
    await storage.put(publicKey, payload, { contentType: 'text/plain', cacheControl: 'no-store' });

    const privatePayload = await readStream(await storage.getPrivateStream(privateKey));
    assert.deepEqual(privatePayload, payload, 'Private bucket read-back did not match the object written.');

    const publicResponse = await fetch(`${storage.publicUrl(publicKey)}?preflight=${encodeURIComponent(runId)}`, {
      cache: 'no-store',
      redirect: 'error',
    });
    assert.equal(publicResponse.ok, true, `Public media URL returned HTTP ${publicResponse.status}.`);
    assert.deepEqual(Buffer.from(await publicResponse.arrayBuffer()), payload, 'Public media URL did not return the object written.');

    console.log('R2 storage preflight passed. Both buckets, private reads, and the public media URL are working.');
  } finally {
    await Promise.allSettled([storage.delete(privateKey), storage.delete(publicKey)]);
  }
};

run().catch((error) => {
  console.error(`R2 storage preflight failed: ${error.message}`);
  process.exitCode = 1;
});
