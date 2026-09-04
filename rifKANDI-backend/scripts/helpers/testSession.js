const sessionService = require('../../src/services/sessionService');

const getUserByEmail = (db, email) => new Promise((resolve, reject) => {
  db.get('SELECT id FROM users WHERE email = ?', [email], (error, user) => {
    if (error) reject(error);
    else resolve(user);
  });
});

const establishTestSession = async (userId) => {
  const session = await sessionService.createSession({
    userId,
    userAgent: 'rifkando-smoke-test',
    ip: '127.0.0.1',
  });
  const cookies = [];
  sessionService.setSessionCookies({
    cookie(name, value) {
      cookies.push(`${name}=${value}`);
    },
  }, session);
  return { cookies, csrfToken: session.csrfToken };
};

const establishTestSessionForEmail = async (db, email) => {
  const user = await getUserByEmail(db, email);
  if (!user) throw new Error(`Test user was not found: ${email}`);
  return establishTestSession(user.id);
};

module.exports = { establishTestSession, establishTestSessionForEmail };
