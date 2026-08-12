require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const db = require('../src/config/database');
const storageService = require('../src/services/storageService');

const APPLY_CONFIRMATION = 'remove-seller-verification';
const RETIRED_TABLES = Object.freeze([
  'seller_verification_files',
  'seller_verification_challenges',
  'seller_verification_cases',
  'verification_documents',
]);

const all = (sql, parameters = []) => new Promise((resolve, reject) => {
  db.all(sql, parameters, (error, rows) => (error ? reject(error) : resolve(rows || [])));
});

const run = (sql, parameters = []) => new Promise((resolve, reject) => {
  db.run(sql, parameters, function onRun(error) {
    if (error) reject(error);
    else resolve({ changes: this.changes || 0 });
  });
});

const close = () => new Promise((resolve, reject) => {
  db.close((error) => (error ? reject(error) : resolve()));
});

function usage() {
  return [
    'Usage:',
    '  node scripts/decommissionSellerVerification.js --dry-run',
    `  SELLER_VERIFICATION_DECOMMISSION_CONFIRM=${APPLY_CONFIRMATION} node scripts/decommissionSellerVerification.js --apply`,
  ].join('\n');
}

async function tableExists(tableName) {
  if (db.dialect === 'postgres') {
    const rows = await all(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?`,
      [tableName]
    );
    return rows.length > 0;
  }

  const rows = await all(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [tableName]
  );
  return rows.length > 0;
}

async function userBadgeColumnExists() {
  if (db.dialect === 'postgres') {
    const rows = await all(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_verified_seller'`
    );
    return rows.length > 0;
  }

  const columns = await all('PRAGMA table_info(users)');
  return columns.some((column) => column.name === 'is_verified_seller');
}

function privateStorageKey(reference) {
  try {
    return storageService.keyFromReference(reference, 'private');
  } catch (_) {
    return null;
  }
}

function legacyVerificationPath(reference) {
  if (privateStorageKey(reference)) return null;
  const fileName = path.basename(String(reference || ''));
  if (!fileName || fileName !== String(reference || '').split(/[\\/]/).pop()) return null;

  const directory = path.resolve(__dirname, '../src/uploads/verification');
  const candidate = path.resolve(directory, fileName);
  return candidate.startsWith(`${directory}${path.sep}`) ? candidate : null;
}

async function collectReferences() {
  const references = [];
  const counts = {};

  if (await tableExists('seller_verification_files')) {
    const rows = await all('SELECT storage_reference AS reference FROM seller_verification_files WHERE storage_reference IS NOT NULL');
    counts.sellerVerificationFiles = rows.length;
    references.push(...rows.map((row) => row.reference));
  }

  if (await tableExists('verification_documents')) {
    const rows = await all('SELECT document_url AS reference FROM verification_documents WHERE document_url IS NOT NULL');
    counts.legacyVerificationDocuments = rows.length;
    references.push(...rows.map((row) => row.reference));
  }

  return { counts, references: [...new Set(references.filter(Boolean))] };
}

async function deleteStoredDocuments(references) {
  const storageKeys = [...new Set(references.map(privateStorageKey).filter(Boolean))];
  const legacyPaths = [...new Set(references.map(legacyVerificationPath).filter(Boolean))];

  for (const key of storageKeys) {
    await storageService.delete(key);
  }
  for (const documentPath of legacyPaths) {
    await fs.rm(documentPath, { force: true });
  }

  return { storageObjects: storageKeys.length, legacyFiles: legacyPaths.length };
}

async function removeDatabaseRecords() {
  const removed = {};
  for (const table of RETIRED_TABLES) {
    if (await tableExists(table)) {
      removed[table] = (await run(`DELETE FROM ${table}`)).changes;
    }
  }

  const badgesReset = await userBadgeColumnExists()
    ? (await run('UPDATE users SET is_verified_seller = 0 WHERE is_verified_seller <> 0')).changes
    : 0;
  return { removed, badgesReset };
}

async function main() {
  const [command] = process.argv.slice(2);
  if (!['--dry-run', '--apply'].includes(command) || process.argv.length !== 3) {
    throw new Error(usage());
  }

  await db.ready;
  const { counts, references } = await collectReferences();
  const privateReferences = references.filter(privateStorageKey).length;
  const legacyReferences = references.length - privateReferences;
  const hasBadgeColumn = await userBadgeColumnExists();

  if (command === '--dry-run') {
    console.log(JSON.stringify({
      mode: 'dry-run',
      verificationRows: counts,
      storedPrivateObjects: privateReferences,
      legacyLocalFileReferences: legacyReferences,
      databaseTablesToClear: RETIRED_TABLES,
      sellerBadgesToReset: hasBadgeColumn ? 'all currently true is_verified_seller values' : 'not applicable',
    }, null, 2));
    return;
  }

  if (process.env.SELLER_VERIFICATION_DECOMMISSION_CONFIRM !== APPLY_CONFIRMATION) {
    throw new Error(`Refusing to delete identity documents. Set SELLER_VERIFICATION_DECOMMISSION_CONFIRM=${APPLY_CONFIRMATION} after verifying a backup.`);
  }

  const deletedFiles = await deleteStoredDocuments(references);
  const databaseChanges = await removeDatabaseRecords();
  console.log(JSON.stringify({ mode: 'applied', deletedFiles, databaseChanges }, null, 2));
}

main()
  .catch((error) => {
    console.error(`Seller verification decommission failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => close().catch(() => undefined));
