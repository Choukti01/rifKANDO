const assert = require('node:assert');

const originalEnvironment = process.env.NODE_ENV;
const { PublicCatalogSnapshotService } = require('../src/services/publicCatalogSnapshotService');

const remoteStorage = {
  isLocal: () => false,
  publicBaseUrl: 'https://media.example.test',
  publicBucket: 'public-catalog',
};

try {
  process.env.NODE_ENV = 'development';
  assert.equal(
    new PublicCatalogSnapshotService({}, remoteStorage).isAvailable(),
    false,
    'development servers must not publish a shared public catalog snapshot',
  );

  process.env.NODE_ENV = 'production';
  assert.equal(
    new PublicCatalogSnapshotService({}, remoteStorage).isAvailable(),
    true,
    'production servers with public object storage must publish snapshots',
  );

  assert.equal(
    new PublicCatalogSnapshotService({}, { ...remoteStorage, isLocal: () => true }).isAvailable(),
    false,
    'local object storage must never be treated as a shared public snapshot target',
  );

  console.log('Public catalog snapshot safety smoke test passed.');
} finally {
  if (originalEnvironment === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnvironment;
}
