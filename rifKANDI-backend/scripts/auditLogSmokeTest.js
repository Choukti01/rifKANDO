const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDirectory = path.join(os.tmpdir(), `rifkando-audit-${crypto.randomUUID()}`);
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(testDirectory, 'rifkando.db');
process.env.AUDIT_LOG_SECRET = 'audit-test-secret-that-is-at-least-thirty-two-characters';
fsSync.mkdirSync(testDirectory, { recursive: true });

const db = require('../src/config/database');
const AuditService = require('../src/services/auditService');

const runQuery = (sql, parameters = []) => new Promise((resolve, reject) => {
  db.run(sql, parameters, function onRun(error) {
    if (error) reject(error);
    else resolve({ changes: this.changes, lastID: this.lastID });
  });
});

const closeDatabase = () => new Promise((resolve, reject) => {
  db.close((error) => (error ? reject(error) : resolve()));
});

const run = async () => {
  await db.ready;
  const actor = await runQuery(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'super_admin')",
    ['Audit Operator', 'audit-operator@test.local', 'not-a-real-password']
  );

  await Promise.all([
    AuditService.record({
      actorUserId: actor.lastID,
      actorRole: 'super_admin',
      action: 'withdrawal.processed',
      resourceType: 'withdrawal',
      resourceId: '1001',
      requestId: 'request-a',
      ipAddress: '127.0.0.1',
      userAgent: 'audit-test-agent',
      metadata: { decision: 'approve', bankDetails: 'must-not-be-stored', token: 'must-not-be-stored' },
    }),
    AuditService.record({
      actorUserId: actor.lastID,
      actorRole: 'super_admin',
      action: 'refund.completed',
      resourceType: 'refund',
      resourceId: '1002',
      requestId: 'request-b',
      ipAddress: '127.0.0.1',
      userAgent: 'audit-test-agent',
      metadata: { status: 'completed' },
    }),
  ]);

  const entries = await AuditService.list({ limit: 10 });
  assert.equal(entries.length, 2, 'every committed event should receive one audit entry');
  assert.deepEqual(entries.find((entry) => entry.action === 'withdrawal.processed').metadata, { decision: 'approve' });
  assert.equal((await AuditService.verifyIntegrity()).valid, true, 'the audit hash chain must validate');

  await assert.rejects(
    runQuery("UPDATE audit_logs SET action = 'changed' WHERE id = ?", [entries[0].id]),
    /audit logs are immutable/
  );
  await assert.rejects(
    runQuery('DELETE FROM audit_logs WHERE id = ?', [entries[0].id]),
    /audit logs are immutable/
  );
  assert.equal((await AuditService.verifyIntegrity()).valid, true, 'rejected writes must leave the chain valid');

  console.log('Audit log smoke test passed.');
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
