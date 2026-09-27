const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const { createPostgresPool } = require('../src/config/postgres');
const storage = require('../src/services/storageService');

const apply = process.argv.includes('--apply');
const legacyRoot = path.resolve(__dirname, '../src/uploads');
const publicReferenceColumns = [
  { table: 'users', id: 'id', column: 'profilePicture', quoted: true },
  { table: 'products', id: 'id', column: 'image' },
  { table: 'product_media', id: 'id', column: 'media_url' },
  { table: 'course_media', id: 'id', column: 'media_url' },
  { table: 'service_media', id: 'id', column: 'media_url' },
  { table: 'digital_media', id: 'id', column: 'media_url' },
  { table: 'booking_media', id: 'id', column: 'media_url' },
  { table: 'findit_request_media', id: 'id', column: 'media_url' },
];

const contentTypes = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
};

const quote = (identifier, quoted) => quoted ? `"${identifier}"` : identifier;
const contentTypeFor = (filePath) => contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

const sourceForPublicKey = (key) => {
  const relativeKey = key.slice('public/'.length);
  const candidates = [
    path.join(storage.localRoot, key),
    path.join(legacyRoot, key),
    path.join(legacyRoot, relativeKey),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null;
};

async function main() {
  if (storage.isLocal()) throw new Error('Set OBJECT_STORAGE_DRIVER=s3 before migrating uploads.');
  if (String(process.env.DATABASE_ENGINE).toLowerCase() !== 'postgres') {
    throw new Error('Legacy upload migration requires the production PostgreSQL database.');
  }

  const pool = createPostgresPool();
  const objectResults = new Map();
  const summary = { mode: apply ? 'apply' : 'dry-run', referenced: 0, migrated: 0, updated: 0, missing: 0, skipped: 0 };

  try {
    for (const target of publicReferenceColumns) {
      const column = quote(target.column, target.quoted);
      const result = await pool.query(`SELECT ${target.id} AS id, ${column} AS value FROM ${target.table} WHERE ${column} LIKE '/uploads/%'`);

      for (const row of result.rows) {
        summary.referenced += 1;
        const key = storage.publicKeyFromUrl(row.value);
        if (!key) {
          summary.skipped += 1;
          continue;
        }

        let object = objectResults.get(key);
        if (!object) {
          const source = sourceForPublicKey(key);
          object = { source, migrated: false };
          objectResults.set(key, object);
          if (!source) {
            summary.missing += 1;
          } else if (apply) {
            await storage.put(key, await fs.promises.readFile(source), {
              contentType: contentTypeFor(source),
              cacheControl: 'public, max-age=31536000, immutable',
            });
            object.migrated = true;
            summary.migrated += 1;
          }
        }

        if (!object.source) continue;
        if (!apply) continue;

        const destination = storage.publicUrl(key);
        const update = await pool.query(
          `UPDATE ${target.table} SET ${column} = $1 WHERE ${target.id} = $2 AND ${column} = $3`,
          [destination, row.id, row.value]
        );
        summary.updated += update.rowCount;
      }
    }
  } finally {
    await pool.end();
  }

  console.log(JSON.stringify(summary));
  if (!apply) console.log('Dry run only. Re-run with --apply after reviewing this summary.');
  if (summary.missing > 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error(`Legacy upload migration failed: ${error.message}`);
  process.exitCode = 1;
});
