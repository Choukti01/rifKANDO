const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} = require('@aws-sdk/client-s3');

const STORAGE_REFERENCE_PREFIX = 'storage://';
const PUBLIC_STORAGE_PREFIX = 'public/';
const PRIVATE_STORAGE_PREFIX = 'private/';

const normalizePath = (value) => String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');

const isSafeKey = (key) => {
  const normalized = normalizePath(key);
  return normalized === key &&
    normalized.length > 0 &&
    !normalized.includes('../') &&
    !normalized.includes('/..') &&
    !normalized.includes('\0');
};

const encodeKeyForUrl = (key) => key.split('/').map(encodeURIComponent).join('/');

class StorageService {
  constructor() {
    this.driver = (process.env.OBJECT_STORAGE_DRIVER || 'local').toLowerCase();
    this.localRoot = path.resolve(
      process.env.UPLOADS_DIR || (
        process.env.NODE_ENV === 'production'
          ? '/var/data/uploads'
          : path.join(__dirname, '..', 'uploads')
      )
    );
    this.publicBaseUrl = (process.env.OBJECT_STORAGE_PUBLIC_BASE_URL || '').replace(/\/$/, '');
    this.publicBucket = process.env.OBJECT_STORAGE_PUBLIC_BUCKET;
    this.privateBucket = process.env.OBJECT_STORAGE_PRIVATE_BUCKET;

    if (!['local', 's3'].includes(this.driver)) {
      throw new Error('OBJECT_STORAGE_DRIVER must be either local or s3.');
    }

    if (this.driver === 's3') {
      this.client = new S3Client({
        region: process.env.OBJECT_STORAGE_REGION,
        endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
        forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === 'true',
        credentials: process.env.OBJECT_STORAGE_ACCESS_KEY_ID && process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY
          ? {
            accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID,
            secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
          }
          : undefined,
      });
    }
  }

  isLocal() {
    return this.driver === 'local';
  }

  localPath(key) {
    this.assertKey(key);
    const objectPath = path.resolve(this.localRoot, key);
    if (objectPath !== this.localRoot && !objectPath.startsWith(`${this.localRoot}${path.sep}`)) {
      throw new Error('Invalid storage key.');
    }
    return objectPath;
  }

  assertKey(key, visibility) {
    if (!isSafeKey(key)) throw new Error('Invalid storage key.');
    if (visibility === 'public' && !key.startsWith(PUBLIC_STORAGE_PREFIX)) {
      throw new Error('Expected a public storage key.');
    }
    if (visibility === 'private' && !key.startsWith(PRIVATE_STORAGE_PREFIX)) {
      throw new Error('Expected a private storage key.');
    }
  }

  createKey(visibility, category, extension) {
    const prefix = visibility === 'public' ? PUBLIC_STORAGE_PREFIX : PRIVATE_STORAGE_PREFIX;
    const safeCategory = String(category || '')
      .replace(/[^a-z0-9-]/gi, '-')
      .replace(/^-+|-+$/g, '');
    const safeExtension = String(extension || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (!safeCategory || !safeExtension) throw new Error('Invalid storage object metadata.');
    return `${prefix}${safeCategory}/${crypto.randomUUID()}.${safeExtension}`;
  }

  reference(key) {
    this.assertKey(key, 'private');
    return `${STORAGE_REFERENCE_PREFIX}${key}`;
  }

  keyFromReference(reference, visibility) {
    if (!String(reference || '').startsWith(STORAGE_REFERENCE_PREFIX)) return null;
    const key = String(reference).slice(STORAGE_REFERENCE_PREFIX.length);
    this.assertKey(key, visibility);
    return key;
  }

  publicUrl(key) {
    this.assertKey(key, 'public');
    if (this.isLocal()) {
      return `/uploads/${key.slice(PUBLIC_STORAGE_PREFIX.length)}`;
    }
    return `${this.publicBaseUrl}/${encodeKeyForUrl(key)}`;
  }

  publicKeyFromUrl(value) {
    if (!value) return null;
    const localMatch = String(value).match(/^\/uploads\/(profile-pictures|media|findit-reference-images)\/([^/?#]+)$/);
    if (localMatch) return `${PUBLIC_STORAGE_PREFIX}${localMatch[1]}/${decodeURIComponent(localMatch[2])}`;

    if (!this.publicBaseUrl || !String(value).startsWith(`${this.publicBaseUrl}/`)) return null;
    const key = decodeURIComponent(String(value).slice(this.publicBaseUrl.length + 1));
    this.assertKey(key, 'public');
    return key;
  }

  async put(key, body, { contentType, cacheControl } = {}) {
    this.assertKey(key);
    const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
    if (this.isLocal()) {
      const objectPath = this.localPath(key);
      await fs.promises.mkdir(path.dirname(objectPath), { recursive: true });
      await fs.promises.writeFile(objectPath, payload, { mode: 0o640 });
      return;
    }
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucketForKey(key),
      Key: key,
      Body: payload,
      ContentType: contentType || 'application/octet-stream',
      CacheControl: cacheControl,
    }));
  }

  async getPrivateStream(key) {
    this.assertKey(key, 'private');
    if (this.isLocal()) return fs.createReadStream(this.localPath(key));
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucketForKey(key), Key: key }));
    if (!response.Body) throw new Error('Storage object has no content.');
    return response.Body instanceof Readable ? response.Body : Readable.from(response.Body);
  }

  async delete(key) {
    if (!key) return;
    this.assertKey(key);
    if (this.isLocal()) {
      await fs.promises.rm(this.localPath(key), { force: true });
      return;
    }
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucketForKey(key), Key: key }));
  }

  bucketForKey(key) {
    this.assertKey(key);
    return key.startsWith(PUBLIC_STORAGE_PREFIX) ? this.publicBucket : this.privateBucket;
  }
}

module.exports = new StorageService();
