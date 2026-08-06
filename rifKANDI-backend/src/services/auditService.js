const crypto = require('node:crypto');
const db = require('../config/database');

const MAX_ACTION_LENGTH = 128;
const MAX_RESOURCE_LENGTH = 96;
const MAX_RESOURCE_ID_LENGTH = 128;
const MAX_METADATA_DEPTH = 3;
const MAX_METADATA_KEYS = 20;
const MAX_METADATA_ARRAY_ITEMS = 20;
const MAX_METADATA_STRING_LENGTH = 256;
const SENSITIVE_KEY = /(?:pass(?:word)?|secret|token|authorization|cookie|csrf|bank|account|rib|iban|card|document(?:_url)?|storage|signature|hash|email|phone|address)/i;

const run = (sql, parameters = []) => new Promise((resolve, reject) => {
  db.run(sql, parameters, function onRun(error) {
    if (error) reject(error);
    else resolve({ changes: this.changes, lastID: this.lastID });
  });
});

const get = (sql, parameters = []) => new Promise((resolve, reject) => {
  db.get(sql, parameters, (error, row) => (error ? reject(error) : resolve(row)));
});

const all = (sql, parameters = []) => new Promise((resolve, reject) => {
  db.all(sql, parameters, (error, rows) => (error ? reject(error) : resolve(rows)));
});

const limitedString = (value, maxLength) => String(value ?? '').trim().slice(0, maxLength);

const assertIdentifier = (value, field, maxLength) => {
  const normalized = limitedString(value, maxLength);
  if (!/^[a-z][a-z0-9._:-]*$/i.test(normalized)) {
    throw new Error(`${field} is invalid for audit logging.`);
  }
  return normalized;
};

const stableStringify = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
};

const sanitizeMetadata = (value, depth = 0) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return limitedString(value, MAX_METADATA_STRING_LENGTH);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (depth >= MAX_METADATA_DEPTH) return '[truncated]';
  if (Array.isArray(value)) {
    return value.slice(0, MAX_METADATA_ARRAY_ITEMS).map((item) => sanitizeMetadata(item, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEY.test(key))
      .slice(0, MAX_METADATA_KEYS)
      .reduce((result, [key, item]) => {
        result[limitedString(key, 60)] = sanitizeMetadata(item, depth + 1);
        return result;
      }, {});
  }
  return limitedString(value, MAX_METADATA_STRING_LENGTH);
};

const auditSecret = () => {
  const secret = process.env.AUDIT_LOG_SECRET || process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret || String(secret).length < 32) {
    throw new Error('AUDIT_LOG_SECRET must be configured with at least 32 characters.');
  }
  return secret;
};

const hmac = (value) => crypto.createHmac('sha256', auditSecret()).update(value).digest('hex');

class AuditService {
  static writeTail = Promise.resolve();

  static async record({
    actorUserId = null,
    actorRole = null,
    action,
    resourceType,
    resourceId = null,
    outcome = 'success',
    requestId = null,
    ipAddress = null,
    userAgent = null,
    metadata = {},
  }) {
    const previous = this.writeTail;
    const write = previous.catch(() => undefined).then(async () => {
      await db.ready;

      const normalized = {
        occurredAt: new Date().toISOString(),
        actorUserId: actorUserId === null || actorUserId === undefined ? null : Number(actorUserId),
        actorRole: actorRole ? assertIdentifier(actorRole, 'Actor role', 40) : null,
        action: assertIdentifier(action, 'Action', MAX_ACTION_LENGTH),
        resourceType: assertIdentifier(resourceType, 'Resource type', MAX_RESOURCE_LENGTH),
        resourceId: resourceId === null || resourceId === undefined ? null : limitedString(resourceId, MAX_RESOURCE_ID_LENGTH),
        outcome: assertIdentifier(outcome, 'Outcome', 32),
        requestId: requestId ? limitedString(requestId, 64) : null,
        ipAddress: ipAddress ? limitedString(ipAddress, 64) : null,
        userAgentHash: userAgent ? hmac(limitedString(userAgent, 1024)) : null,
        metadata: sanitizeMetadata(metadata),
      };

      if (normalized.actorUserId !== null && (!Number.isInteger(normalized.actorUserId) || normalized.actorUserId <= 0)) {
        throw new Error('Actor user ID is invalid for audit logging.');
      }

      const previousEntry = await get('SELECT entry_hash FROM audit_logs ORDER BY id DESC LIMIT 1');
      const previousHash = previousEntry?.entry_hash || null;
      const canonicalPayload = stableStringify({ ...normalized, previousHash });
      const entryHash = hmac(canonicalPayload);
      const inserted = await run(
        `INSERT INTO audit_logs (
          occurred_at, actor_user_id, actor_role, action, resource_type, resource_id,
          outcome, request_id, ip_address, user_agent_hash, metadata, previous_hash, entry_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          normalized.occurredAt,
          normalized.actorUserId,
          normalized.actorRole,
          normalized.action,
          normalized.resourceType,
          normalized.resourceId,
          normalized.outcome,
          normalized.requestId,
          normalized.ipAddress,
          normalized.userAgentHash,
          stableStringify(normalized.metadata),
          previousHash,
          entryHash,
        ]
      );

      return { id: inserted.lastID, entryHash };
    });

    this.writeTail = write.catch(() => undefined);
    return write;
  }

  static recordFromRequest(req, entry) {
    return this.record({
      ...entry,
      actorUserId: req.user?.id ?? null,
      actorRole: req.user?.role ?? null,
      requestId: req.requestId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  static async list({ limit = 100, beforeId = null } = {}) {
    const safeLimit = Math.max(1, Math.min(Number.parseInt(limit, 10) || 100, 200));
    const safeBeforeId = beforeId === null || beforeId === undefined || beforeId === ''
      ? null
      : Number.parseInt(beforeId, 10);
    if (safeBeforeId !== null && (!Number.isInteger(safeBeforeId) || safeBeforeId <= 0)) {
      throw new Error('beforeId must be a positive integer.');
    }

    const rows = await all(
      `SELECT id, occurred_at, actor_user_id, actor_role, action, resource_type,
              resource_id, outcome, request_id, ip_address, metadata, previous_hash, entry_hash
       FROM audit_logs
       WHERE (? IS NULL OR id < ?)
       ORDER BY id DESC
       LIMIT ?`,
      [safeBeforeId, safeBeforeId, safeLimit]
    );
    return rows.map((row) => ({ ...row, metadata: JSON.parse(row.metadata || '{}') }));
  }

  static async verifyIntegrity() {
    const rows = await all('SELECT * FROM audit_logs ORDER BY id ASC');
    let previousHash = null;

    for (const row of rows) {
      const metadata = JSON.parse(row.metadata || '{}');
      const canonicalPayload = stableStringify({
        occurredAt: row.occurred_at,
        actorUserId: row.actor_user_id,
        actorRole: row.actor_role,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        outcome: row.outcome,
        requestId: row.request_id,
        ipAddress: row.ip_address,
        userAgentHash: row.user_agent_hash,
        metadata,
        previousHash,
      });
      const expectedHash = hmac(canonicalPayload);
      if (row.previous_hash !== previousHash || row.entry_hash !== expectedHash) {
        return { valid: false, checked: rows.length, firstBrokenEntryId: row.id };
      }
      previousHash = row.entry_hash;
    }

    return { valid: true, checked: rows.length, firstBrokenEntryId: null };
  }
}

module.exports = AuditService;
