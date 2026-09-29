const db = require('../config/database');
const { all, get, run } = require('./bookingProtocolService');

const MAX_TITLE_LENGTH = 160;
const MAX_BODY_LENGTH = 600;
const VALID_KIND = /^[a-z0-9._-]{1,64}$/;

class NotificationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotificationError';
    this.isOperational = true;
  }
}

const cleanText = (value, limit, field) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || text.length > limit) throw new NotificationError(`${field} is invalid.`);
  return text;
};

const safeHref = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const href = String(value).trim();
  // Notifications only navigate inside rifKANDO. This prevents a server-side
  // notification from becoming an open-redirect or script-injection vector.
  if (!href.startsWith('/') || href.startsWith('//') || /[\r\n]/.test(href)) {
    throw new NotificationError('Notification link must be an internal path.');
  }
  return href.slice(0, 500);
};

const normalizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return '{}';
  const serialized = JSON.stringify(metadata);
  if (serialized.length > 4_000) throw new NotificationError('Notification metadata is too large.');
  return serialized;
};

const create = async ({ userId, kind, title, body, href = null, metadata = {} }, database = db) => {
  const safeUserId = Number(userId);
  const safeKind = String(kind || '').trim().toLowerCase();
  if (!Number.isSafeInteger(safeUserId) || safeUserId < 1) throw new NotificationError('Notification recipient is invalid.');
  if (!VALID_KIND.test(safeKind)) throw new NotificationError('Notification type is invalid.');

  const inserted = await run(database, `
    INSERT INTO notifications (user_id, kind, title, body, href, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    safeUserId,
    safeKind,
    cleanText(title, MAX_TITLE_LENGTH, 'Notification title'),
    cleanText(body, MAX_BODY_LENGTH, 'Notification message'),
    safeHref(href),
    normalizeMetadata(metadata),
  ]);
  return get(database, 'SELECT * FROM notifications WHERE id = ?', [inserted.lastID]);
};

const createForRoles = async (roles, notification, database = db) => {
  const normalizedRoles = [...new Set((roles || []).map((role) => String(role || '').trim()).filter(Boolean))];
  if (!normalizedRoles.length) return [];
  const users = await all(database, `SELECT id FROM users WHERE role IN (${normalizedRoles.map(() => '?').join(', ')})`, normalizedRoles);
  return Promise.all(users.map((user) => create({ ...notification, userId: user.id }, database)));
};

const listForUser = async (userId, limit = 20, database = db) => {
  const safeUserId = Number(userId);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  return all(database, `
    SELECT id, kind, title, body, href, read_at, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `, [safeUserId, safeLimit]);
};

const unreadCount = async (userId, database = db) => {
  const row = await get(database, 'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL', [userId]);
  return Number(row?.count || 0);
};

const markRead = async (userId, notificationId, database = db) => run(database, `
  UPDATE notifications SET read_at = CURRENT_TIMESTAMP
  WHERE id = ? AND user_id = ? AND read_at IS NULL
`, [notificationId, userId]);

const markAllRead = async (userId, database = db) => run(database, `
  UPDATE notifications SET read_at = CURRENT_TIMESTAMP
  WHERE user_id = ? AND read_at IS NULL
`, [userId]);

module.exports = {
  NotificationError,
  create,
  createForRoles,
  listForUser,
  unreadCount,
  markRead,
  markAllRead,
};
