const express = require('express');
const cors = require('cors');
const db = require('./config/database');
const {
  protect,
  optionalProtect,
  authorize,
  isAdmin,
  ROLES,
  ADMIN_ROLES,
  FINANCE_ROLES,
} = require('./middleware/auth');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const crypto = require('crypto');
const { pipeline } = require('node:stream/promises');
const { securityHeaders, createRateLimiter } = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const requestObservability = require('./middleware/requestObservability');
const {
  validateIdParams,
  validateCheckout,
  validateWithdrawal,
  validateWithdrawalDecision,
  validateRefundRequest,
  validateRefundCompletion,
  validateOrderStatus,
  validateCodSellerAction,
  validateCodCollection,
  validateCodSettlement,
  validateCodException,
  validateCmiInitiation,
  validateOffer,
  validateOfferResponse,
  validateCartItem,
  validateCartQuantity,
  validateProductCreate,
  validateProductUpdate,
  validateProfileUpdate,
  validatePasswordChange,
  validateSellerType,
  validateProductReview,
  validateCourseCreate,
  validateCourseUpdate,
  validateServiceCreate,
  validateServiceUpdate,
  validateDigitalCreate,
  validateDigitalUpdate,
  validateDigitalAccessRequest,
  validateDigitalAccessDecision,
  validateFinditRequestCreate,
  validateFinditOfferCreate,
  validateFinditOfferUpdate,
  validateFinditCheckout,
  validateLessonCreate,
  validateLessonUpdate,
  validateLessonProgress,
  validatePackageCreate,
  validatePackageUpdate,
  validateProductQuery,
} = require('./middleware/validateRequest');
const { getAllowedOrigins } = require('./config/validateEnv');
const { sendVerificationEmail, sendWelcomeEmail, sendLoginNotificationEmail } = require('./utils/sendEmail');
const storageService = require('./services/storageService');
const { createUploadReceipt, fileSha256 } = require('./services/digitalFileService');
const sessionService = require('./services/sessionService');
const AuditService = require('./services/auditService');
const Money = require('./services/moneyService');
const CodFulfillmentService = require('./services/codFulfillmentService');
const FeatureFlags = require('./services/featureFlagService');
const { snapshot: getObservabilitySnapshot } = require('./services/observabilityService');
const {
  OTP_MAX_ATTEMPTS,
  OTP_MAX_SENDS_PER_HOUR,
  OTP_TTL_MS,
  PhoneAuthError,
  generateCode: generatePhoneCode,
  hashCode: hashPhoneCode,
  normalizePhoneNumber,
  sendVerificationCode: sendPhoneVerificationCode,
  timingSafeCodeMatch,
} = require('./services/phoneAuthService');
const createProductRoutes = require('./routes/productRoutes');
const createCourseRoutes = require('./routes/courseRoutes');
const createServiceRoutes = require('./routes/serviceRoutes');
const createDigitalRoutes = require('./routes/digitalRoutes');
const createFindItRoutes = require('./routes/finditRoutes');
// const EmailService = require('./services/emailService');



const app = express();

const requireSeller = authorize(ROLES.SELLER);
const requireAdmin = authorize(...ADMIN_ROLES);
const requireFinance = authorize(...FINANCE_ROLES);
const requireFeature = FeatureFlags.requireFeature;
const allowedOrigins = new Set(getAllowedOrigins());

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(requestObservability);
app.use(securityHeaders);

const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again later.'
});

const phoneCodeRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 8,
  message: 'Too many SMS code requests. Please try again later.'
});

const googleVerificationExpiryMs = 10 * 60 * 1000;
const googleVerificationMaxAttempts = 5;

const hashGoogleVerificationCode = (code) => crypto
  .createHmac('sha256', process.env.JWT_SECRET)
  .update(code)
  .digest('hex');

const generateGoogleVerificationCode = () => crypto.randomInt(100000, 1000000).toString();

const verifyGoogleCredential = async (credential) => {
  if (!credential) {
    const error = new Error('Google credential is required');
    error.statusCode = 400;
    throw error;
  }

  const { OAuth2Client } = require('google-auth-library');
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();

  if (!payload.email || !payload.email_verified) {
    const error = new Error('Google account email is not verified');
    error.statusCode = 401;
    throw error;
  }

  return payload;
};

const sendGoogleVerificationCode = async ({ email, googleSub }) => {
  const code = generateGoogleVerificationCode();
  const expiresAt = new Date(Date.now() + googleVerificationExpiryMs).toISOString();

  await new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO google_verifications (email, google_sub, code_hash, expires_at, attempts)
      VALUES (?, ?, ?, ?, 0)
      ON CONFLICT(email) DO UPDATE SET
        google_sub = excluded.google_sub,
        code_hash = excluded.code_hash,
        expires_at = excluded.expires_at,
        attempts = 0,
        created_at = CURRENT_TIMESTAMP
    `, [email, googleSub, hashGoogleVerificationCode(code), expiresAt], (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  await sendVerificationEmail(email, code);
};

// ==================== CORS ====================

app.use(cors({
  origin(origin, callback) {
    // Server-to-server callbacks and health checks have no browser Origin.
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    const error = new Error('Origin is not allowed by CORS policy.');
    error.statusCode = 403;
    error.isOperational = true;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Idempotency-Key', 'X-Request-ID', 'X-CSRF-Token'],
  maxAge: 86400
}));


// Body parser

app.use(express.json({ limit: '1mb' }));

app.use(express.urlencoded({ 
  extended: true,
  limit: '50kb'
}));


// Serve static files for uploads

const publicUploadOptions = {
  fallthrough: false,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', 'sandbox');
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
};

// Only marketplace media and profile images are public. Identity documents and
// invoices are delivered through authenticated routes.
if (storageService.isLocal()) {
  app.use('/uploads/profile-pictures', express.static(storageService.localPath('public/profile-pictures'), publicUploadOptions));
  app.use('/uploads/media', express.static(storageService.localPath('public/media'), publicUploadOptions));
}
// Legacy local files remain readable during the storage migration. New uploads
// are stored below UPLOADS_DIR/public or in object storage.
app.use('/uploads/profile-pictures', express.static(path.join(__dirname, 'uploads/profile-pictures'), publicUploadOptions));
app.use('/uploads/media', express.static(path.join(__dirname, 'uploads/media'), publicUploadOptions));


// ==================== TEST ROUTES ====================

app.get('/test-db', (req, res) => {

  db.get(
    'SELECT datetime("now") as now',
    (err, row) => {

    if (err) {

      res.status(500).json({ 
        error: err.message 
      });

    } else {

      res.json({ 
        success: true, 
        time: row.now 
      });

    }

  });

});


app.get('/test', (req, res) => {

  res.json({ 
    message: 'API is working!' 
  });

});


const checkDatabaseHealth = () => new Promise((resolve, reject) => {
  db.get('SELECT 1 AS ready', (error) => {
    if (error) reject(error);
    else resolve();
  });
});

app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'rifkando-api',
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

app.get('/ready', async (req, res) => {
  try {
    await db.ready;
    await checkDatabaseHealth();
    return res.status(200).json({ status: 'ready', requestId: req.requestId });
  } catch (error) {
    return res.status(503).json({ status: 'not_ready', requestId: req.requestId });
  }
});

const hasValidMetricsToken = (providedToken) => {
  const configuredToken = Buffer.from(String(process.env.METRICS_TOKEN || ''));
  const suppliedToken = Buffer.from(String(providedToken || ''));
  if (!configuredToken.length || configuredToken.length !== suppliedToken.length) return false;
  return crypto.timingSafeEqual(configuredToken, suppliedToken);
};

app.get('/metrics', (req, res) => {
  if (!hasValidMetricsToken(req.get('X-Metrics-Token'))) {
    return res.status(404).json({ error: 'Route not found', requestId: req.requestId });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    service: 'rifkando-api',
    requestId: req.requestId,
    ...getObservabilitySnapshot(),
  });
});



// ==================== ORDER STATUS UPDATE (MOVED HERE TO TAKE PRIORITY) ====================
const requireOrderStatusAccess = (req, res, next) => {
  const transitions = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: []
  };
  const requestedStatus = req.body?.status;
  if (!Object.values(transitions).flat().includes(requestedStatus)) {
    return res.status(400).json({ error: 'Invalid order status.' });
  }

  db.get('SELECT id, status FROM orders WHERE id = ?', [req.params.id], (orderError, order) => {
    if (orderError || !order) return res.status(404).json({ error: 'Order not found.' });
    if (!transitions[order.status]?.includes(requestedStatus)) {
      return res.status(409).json({ error: 'This order status transition is not allowed.' });
    }
    if (isAdmin(req.user)) return next();
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Only sellers or administrators can update orders.' });
    }
    db.get(
      `SELECT 1
       FROM orders o
       WHERE o.id = ? AND (
         EXISTS (
           SELECT 1 FROM order_items oi JOIN products p ON p.id = oi.product_id
           WHERE oi.order_id = o.id AND p.seller_id = ?
         )
         OR EXISTS (
           SELECT 1 FROM findit_orders fo
           WHERE fo.order_id = o.id AND fo.seller_id = ?
         )
       ) LIMIT 1`,
      [order.id, req.user.id, req.user.id],
      (accessError, sellerItem) => {
        if (accessError) return res.status(500).json({ error: 'Unable to verify order access.' });
        if (!sellerItem) return res.status(403).json({ error: 'You are not a seller for this order.' });
        return next();
      }
    );
  });
};

// An order timeline contains fulfilment and staff activity. Only the buyer,
// an involved seller, or an administrator may see it. Returning 404 for both
// missing and inaccessible orders prevents authenticated ID enumeration.
const requireOrderHistoryAccess = (req, res, next) => {
  if (isAdmin(req.user)) return next();

  db.get(
    `SELECT 1
     FROM orders o
     WHERE o.id = ?
       AND (
         o.user_id = ?
         OR EXISTS (
           SELECT 1
           FROM order_items oi
           JOIN products p ON p.id = oi.product_id
           WHERE oi.order_id = o.id AND p.seller_id = ?
         )
         OR EXISTS (
           SELECT 1 FROM findit_orders fo
           WHERE fo.order_id = o.id AND fo.seller_id = ?
         )
       )
     LIMIT 1`,
    [req.params.id, req.user.id, req.user.id, req.user.id],
    (accessError, order) => {
      if (accessError) return res.status(500).json({ error: 'Unable to verify order access.' });
      if (!order) return res.status(404).json({ error: 'Order not found.' });
      return next();
    }
  );
};

// This legacy status endpoint is reserved for administrators. Sellers use the
// COD fulfilment flow, which requires carrier and settlement evidence.
app.patch('/api/orders/:id/status', protect, requireAdmin, validateIdParams('id'), validateOrderStatus, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  
  console.log('📦 Status update request:', { orderId: req.params.id, status, userId: req.user.id });

  if (!status) {
    return res.status(400).json({ error: 'No status provided' });
  }
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status: ${status}. Allowed: ${validStatuses.join(', ')}` });
  }

  if (status === 'delivered') {
    try {
      const result = await WalletService.releaseOrderEscrowsAfterDelivery(req.params.id, req.user.id);
      await AuditService.recordFromRequest(req, {
        action: 'order.status_changed',
        resourceType: 'order',
        resourceId: req.params.id,
        metadata: { toStatus: 'delivered', alreadyProcessed: result.alreadyProcessed },
      });
      return res.json({
        success: true,
        alreadyProcessed: result.alreadyProcessed,
        message: result.alreadyProcessed
          ? 'Order was already delivered'
          : `Order delivered; ${result.releasedEscrows} escrow release(s) processed`,
      });
    } catch (error) {
      return res.status(409).json({ error: error.message });
    }
  }

  // Check if order exists
  db.get('SELECT * FROM orders WHERE id = ?', [req.params.id], (err, order) => {
    if (err || !order) {
      console.log('❌ Order not found:', req.params.id);
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = order.status;
    if (status === 'cancelled' && order.payment_status === 'paid') {
      return res.status(409).json({
        error: 'A paid order cannot be cancelled through status updates. Use the refund workflow.'
      });
    }
    console.log(`📦 Updating order ${req.params.id} from ${oldStatus} to ${status}`);

    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id], async function onStatusUpdate(err) {
      if (err) {
        console.error('❌ Update error:', err);
        return res.status(500).json({ error: err.message });
      }

      // Log status change (ignore if history table fails)
      db.run(`INSERT INTO order_status_history (order_id, status, note, created_by)
              VALUES (?, ?, ?, ?)`,
        [req.params.id, status, `Status changed from ${oldStatus} to ${status}`, req.user.id], (logErr) => {
          if (logErr) console.error('History log error (non-critical):', logErr);
        });

      try {
        await AuditService.recordFromRequest(req, {
          action: 'order.status_changed',
          resourceType: 'order',
          resourceId: req.params.id,
          metadata: { fromStatus: oldStatus, toStatus: status },
        });
      } catch (auditError) {
        console.error(JSON.stringify({ level: 'error', event: 'audit_log_write_failed', action: 'order.status_changed', requestId: req.requestId, error: auditError.message }));
        return res.status(500).json({ error: 'Order status was updated but its audit record could not be written. Contact support with the request ID.', requestId: req.requestId });
      }

      console.log(`✅ Order ${req.params.id} status updated to ${status}`);
      res.json({ success: true, message: `Order status updated to ${status}` });
    });
  });
});

// ==================== AUTH ENDPOINTS ====================

// Legacy verification and password-reset routes remain disabled so the secure
// registration and login handlers below are the only active local auth flow.
const disabledPasswordAuthPaths = new Set([
  '/send-verification',
  '/verify-and-register',
  '/resend-verification',
  '/forgot-password',
  '/reset-password'
]);

app.use('/api/auth', (req, res, next) => {
  if (disabledPasswordAuthPaths.has(req.path)) {
    return res.status(410).json({
      error: 'This legacy authentication endpoint is no longer available.'
    });
  }
  next();
});

const registrationExpiryMs = 10 * 60 * 1000;
const registrationMaxAttempts = 5;

const hashRegistrationCode = (code) => crypto
  .createHmac('sha256', process.env.JWT_SECRET)
  .update(code)
  .digest('hex');

const createSessionResponse = (res, user, session) => {
  sessionService.setSessionCookies(res, session);
  const authenticatedUser = sessionService.publicUser(user);
  return {
    success: true,
    user: authenticatedUser,
    data: { user: authenticatedUser },
    csrfToken: session.csrfToken,
  };
};

const createAuthenticatedResponse = async (req, res, user) => {
  const session = await sessionService.createSession({
    userId: user.id,
    userAgent: req.get('user-agent'),
    ip: req.ip,
  });
  return createSessionResponse(res, user, session);
};

const getUserById = (id) => new Promise((resolve, reject) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (error, user) => {
    if (error) reject(error);
    else resolve(user);
  });
});

const hasTrustedBrowserOrigin = (req) => {
  const origin = req.get('origin');
  return !origin || allowedOrigins.has(origin);
};

const getRow = (sql, parameters = []) => new Promise((resolve, reject) => {
  db.get(sql, parameters, (error, row) => (error ? reject(error) : resolve(row)));
});

const runStatement = (sql, parameters = []) => new Promise((resolve, reject) => {
  db.run(sql, parameters, function onRun(error) {
    if (error) reject(error);
    else resolve({ changes: this.changes || 0, lastID: this.lastID });
  });
});

const isPhoneIdentityEmail = (email) => String(email || '').endsWith('@phone.rifkando.invalid');

async function issuePhoneChallenge(phone, purpose) {
  const current = await getRow('SELECT * FROM phone_verification_challenges WHERE phone = ?', [phone]);
  const now = Date.now();
  const currentWindow = current?.window_started_at ? new Date(current.window_started_at).getTime() : 0;
  const inWindow = Number.isFinite(currentWindow) && now - currentWindow < 60 * 60 * 1000;
  const sendCount = inWindow ? Number(current?.send_count || 0) : 0;
  if (sendCount >= OTP_MAX_SENDS_PER_HOUR) {
    throw new PhoneAuthError('Too many SMS code requests. Please try again later.', 429);
  }

  const code = generatePhoneCode();
  const expiresAt = new Date(now + OTP_TTL_MS).toISOString();
  const windowStartedAt = inWindow ? current.window_started_at : new Date(now).toISOString();
  await runStatement(`
    INSERT INTO phone_verification_challenges (phone, purpose, code_hash, expires_at, attempts, send_count, window_started_at)
    VALUES (?, ?, ?, ?, 0, ?, ?)
    ON CONFLICT(phone) DO UPDATE SET
      purpose = excluded.purpose,
      code_hash = excluded.code_hash,
      expires_at = excluded.expires_at,
      attempts = 0,
      send_count = excluded.send_count,
      window_started_at = excluded.window_started_at,
      created_at = CURRENT_TIMESTAMP
  `, [phone, purpose, hashPhoneCode(phone, code), expiresAt, sendCount + 1, windowStartedAt]);

  try {
    await sendPhoneVerificationCode(phone, code);
  } catch (error) {
    await runStatement('DELETE FROM phone_verification_challenges WHERE phone = ? AND code_hash = ?', [phone, hashPhoneCode(phone, code)]).catch(() => undefined);
    throw error;
  }
}

async function consumePhoneChallenge(phone, purpose, code) {
  if (!/^\d{6}$/.test(code || '')) {
    throw new PhoneAuthError('Enter the six-digit SMS code.');
  }
  const challenge = await getRow('SELECT * FROM phone_verification_challenges WHERE phone = ?', [phone]);
  if (!challenge || challenge.purpose !== purpose || new Date(challenge.expires_at).getTime() <= Date.now()) {
    throw new PhoneAuthError('The SMS code is invalid or expired.');
  }
  if (Number(challenge.attempts) >= OTP_MAX_ATTEMPTS) {
    throw new PhoneAuthError('Too many incorrect codes. Request a new code.', 429);
  }
  if (!timingSafeCodeMatch(phone, code, challenge.code_hash)) {
    await runStatement('UPDATE phone_verification_challenges SET attempts = attempts + 1 WHERE phone = ?', [phone]);
    throw new PhoneAuthError('The SMS code is invalid or expired.');
  }

  const consumed = await runStatement(
    'DELETE FROM phone_verification_challenges WHERE phone = ? AND purpose = ? AND code_hash = ?',
    [phone, purpose, challenge.code_hash]
  );
  if (consumed.changes !== 1) {
    throw new PhoneAuthError('The SMS code has already been used. Request a new code.', 409);
  }
}

function respondPhoneAuthError(res, error) {
  if (error instanceof PhoneAuthError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  console.error('Phone authentication failed:', error.message);
  return res.status(500).json({ error: 'Phone authentication is temporarily unavailable.' });
}

app.post('/api/auth/phone/register/request-code', authRateLimit, phoneCodeRateLimit, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const phone = normalizePhoneNumber(req.body?.phone);
    if (name.length < 2 || name.length > 120) {
      throw new PhoneAuthError('Enter your full name.');
    }
    const existingUser = await getRow('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingUser) return res.status(409).json({ error: 'An account already exists for this phone number. Please sign in.' });

    await issuePhoneChallenge(phone, 'register');
    return res.status(202).json({ success: true, verificationRequired: true, message: 'An SMS code was sent to your phone.' });
  } catch (error) {
    return respondPhoneAuthError(res, error);
  }
});

app.post('/api/auth/phone/register/verify', authRateLimit, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const phone = normalizePhoneNumber(req.body?.phone);
    if (name.length < 2 || name.length > 120) throw new PhoneAuthError('Enter your full name.');
    await consumePhoneChallenge(phone, 'register', req.body?.code);

    const existingUser = await getRow('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingUser) return res.status(409).json({ error: 'An account already exists for this phone number. Please sign in.' });

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('base64url'), 12);
    const internalEmail = `phone-${phone.slice(1)}@phone.rifkando.invalid`;
    const created = await runStatement(
      'INSERT INTO users (name, email, password, phone, is_verified) VALUES (?, ?, ?, ?, 1)',
      [name, internalEmail, passwordHash, phone]
    );
    const user = await getUserById(created.lastID);
    return res.status(201).json(await createAuthenticatedResponse(req, res, user));
  } catch (error) {
    return respondPhoneAuthError(res, error);
  }
});

app.post('/api/auth/phone/login/request-code', authRateLimit, phoneCodeRateLimit, async (req, res) => {
  try {
    const phone = normalizePhoneNumber(req.body?.phone);
    const user = await getRow('SELECT id FROM users WHERE phone = ?', [phone]);
    if (!user) return res.status(202).json({ success: true, message: 'If an account exists for this phone number, an SMS code has been sent.' });

    await issuePhoneChallenge(phone, 'login');
    return res.status(202).json({ success: true, verificationRequired: true, message: 'An SMS code was sent to your phone.' });
  } catch (error) {
    return respondPhoneAuthError(res, error);
  }
});

app.post('/api/auth/phone/login/verify', authRateLimit, async (req, res) => {
  try {
    const phone = normalizePhoneNumber(req.body?.phone);
    const user = await getRow('SELECT * FROM users WHERE phone = ?', [phone]);
    if (!user) throw new PhoneAuthError('The SMS code is invalid or expired.');
    await consumePhoneChallenge(phone, 'login', req.body?.code);
    const response = await createAuthenticatedResponse(req, res, user);
    if (!isPhoneIdentityEmail(user.email)) {
      sendLoginNotificationEmail(user.email, user.name).catch((emailError) => console.error('Login notification email failed:', emailError.message));
    }
    return res.json(response);
  } catch (error) {
    return respondPhoneAuthError(res, error);
  }
});

app.post('/api/auth/register', authRateLimit, async (req, res) => {
  const name = req.body.name?.trim();
  const email = req.body.email?.trim().toLowerCase();
  const { password, phone = '' } = req.body;
  if (!name || !/^\S+@\S+\.\S+$/.test(email || '') || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Provide a name, valid email, and password of at least 8 characters.' });
  }

  db.get('SELECT id FROM users WHERE email = ?', [email], async (lookupError, user) => {
    if (lookupError) return res.status(500).json({ error: 'Could not create the account.' });
    if (user) return res.status(409).json({ error: 'An account already exists for this email.' });
    try {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 12);
      const code = crypto.randomInt(100000, 1000000).toString();
      const expiresAt = new Date(Date.now() + registrationExpiryMs).toISOString();
      db.run(`
        INSERT INTO pending_registrations (email, name, phone, password_hash, code_hash, expires_at, attempts)
        VALUES (?, ?, ?, ?, ?, ?, 0)
        ON CONFLICT(email) DO UPDATE SET
          name = excluded.name, phone = excluded.phone, password_hash = excluded.password_hash,
          code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, created_at = CURRENT_TIMESTAMP
      `, [email, name, phone, passwordHash, hashRegistrationCode(code), expiresAt], async (saveError) => {
        if (saveError) return res.status(500).json({ error: 'Could not start email verification.' });
        try {
          await sendVerificationEmail(email, code);
          res.status(202).json({ success: true, verificationRequired: true, message: 'Verification code sent.' });
        } catch (emailError) {
          console.error('Registration verification email failed:', emailError.message);
          res.status(503).json({ error: 'Unable to send the verification email. Please try again later.' });
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Could not create the account.' });
    }
  });
});

app.post('/api/auth/verify-email', authRateLimit, (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const { code } = req.body;
  if (!/^\d{6}$/.test(code || '') || !email) return res.status(400).json({ error: 'Enter a valid email and six-digit code.' });

  db.get('SELECT * FROM pending_registrations WHERE email = ?', [email], (lookupError, registration) => {
    if (lookupError) return res.status(500).json({ error: 'Could not verify the account.' });
    if (!registration || new Date(registration.expires_at) <= new Date()) return res.status(400).json({ error: 'Verification code is invalid or expired.' });
    if (registration.attempts >= registrationMaxAttempts) return res.status(429).json({ error: 'Too many incorrect codes. Register again to request a new code.' });

    if (!crypto.timingSafeEqual(Buffer.from(registration.code_hash, 'hex'), Buffer.from(hashRegistrationCode(code), 'hex'))) {
      db.run('UPDATE pending_registrations SET attempts = attempts + 1 WHERE email = ?', [email]);
      return res.status(400).json({ error: 'Verification code is invalid or expired.' });
    }

    db.run('INSERT INTO users (name, email, password, phone, is_verified) VALUES (?, ?, ?, ?, 1)', [registration.name, email, registration.password_hash, registration.phone], async function (createError) {
      if (createError) return res.status(409).json({ error: 'An account already exists for this email.' });
      const user = { id: this.lastID, name: registration.name, email, phone: registration.phone, role: 'buyer', seller_type: null, bio: '', city: '', country: 'Morocco', profilePicture: '', is_verified_seller: 0 };
      db.run('DELETE FROM pending_registrations WHERE email = ?', [email]);
      try {
        res.json(await createAuthenticatedResponse(req, res, user));
        sendWelcomeEmail(email, registration.name).catch((emailError) => console.error('Welcome email failed:', emailError.message));
      } catch (sessionError) {
        res.status(500).json({ error: 'Could not establish a secure session.' });
      }
    });
  });
});

app.post('/api/auth/login', authRateLimit, (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const { password } = req.body;
  const bcrypt = require('bcryptjs');
  db.get('SELECT * FROM users WHERE email = ?', [email], async (error, user) => {
    if (error || !user || !(await bcrypt.compare(password || '', user.password))) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(await createAuthenticatedResponse(req, res, user));
    sendLoginNotificationEmail(user.email, user.name).catch((emailError) => console.error('Login notification email failed:', emailError.message));
  });
});

/* Legacy duplicate authentication handlers. The verified handlers above are
 * authoritative; this implementation is intentionally disabled. */
/*
// Register user
app.post('/api/auth/register', authRateLimit, async (req, res) => {
  const { name, email, password, phone } = req.body;
  
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash(password, 10);
  
  db.run(
    'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
    [name, email, hashedPassword, phone],
    async function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
          { id: this.lastID, email: email },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRE }
        );
        
        // Send welcome email (don't await – fire and forget, or await properly)
        try {
          // await EmailService.sendWelcomeEmail(email, name);
        } catch (emailErr) {
          console.error('Failed to send welcome email:', emailErr.message);
        }
        
        res.json({ 
          success: true, 
          token,
          user: { id: this.lastID, name, email, phone, role: 'buyer' }
        });
      }
    }
  );
});

// Login user
app.post('/api/auth/login', authRateLimit, (req, res) => {
  const { email, password } = req.body;
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        sellerType: user.seller_type,
        bio: user.bio,
        city: user.city,
        country: user.country,
        profilePicture: user.profilePicture,
        is_verified_seller: user.is_verified_seller || 0
      }
    });
  });
});

*/
app.post('/api/auth/refresh', authRateLimit, async (req, res) => {
  if (!hasTrustedBrowserOrigin(req)) return res.status(403).json({ error: 'Origin is not allowed.' });
  try {
    const cookies = sessionService.readCookies(req);
    const session = await sessionService.rotateRefreshToken({
      refreshToken: cookies[sessionService.REFRESH_COOKIE],
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });
    if (!session) {
      sessionService.clearSessionCookies(res);
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    const user = await getUserById(session.userId);
    if (!user) {
      await sessionService.revokeSession(session.id, 'missing_user');
      sessionService.clearSessionCookies(res);
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    return res.json(createSessionResponse(res, user, session));
  } catch (error) {
    sessionService.clearSessionCookies(res);
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
});

app.post('/api/auth/logout', protect, async (req, res) => {
  try {
    await sessionService.revokeSession(req.authSession.id, 'logout');
  } finally {
    sessionService.clearSessionCookies(res);
  }
  return res.status(204).end();
});

app.post('/api/auth/logout-all', protect, async (req, res) => {
  try {
    await sessionService.revokeAllUserSessions(req.user.id, 'logout_all');
  } finally {
    sessionService.clearSessionCookies(res);
  }
  return res.status(204).end();
});

// Get current user and the per-session CSRF token required for unsafe requests.
app.get('/api/auth/me', protect, (req, res) => {
  const csrfToken = sessionService.readCookies(req)[sessionService.CSRF_COOKIE];
  if (!sessionService.hasValidCsrfToken(req.authSession, csrfToken)) {
    return res.status(401).json({ error: 'Your session must be refreshed.' });
  }
  res.json({
    success: true,
    csrfToken,
    data: {
      user: sessionService.publicUser(req.user)
    }
  });
});

// ==================== PROFILE PICTURE ENDPOINTS ====================

// Configure multer for profile pictures
const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, fieldSize: 64 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload profile picture
app.post('/api/users/upload-profile-picture', 
  protect, 
  profileUpload.single('profilePicture'),
  async (req, res) => {
    let uploadedKey;
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const oldProfilePicture = req.user.profilePicture;
      uploadedKey = storageService.createKey('public', 'profile-pictures', 'jpg');
      const image = await sharp(req.file.buffer, { failOn: 'error' })
        .rotate()
        .resize(400, 400, { fit: 'cover', position: 'center', withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
      await storageService.put(uploadedKey, image, {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000, immutable',
      });
      const imageUrl = storageService.publicUrl(uploadedKey);

      await new Promise((resolve, reject) => db.run(
        'UPDATE users SET profilePicture = ? WHERE id = ?',
        [imageUrl, req.user.id],
        (error) => (error ? reject(error) : resolve())
      ));

      const oldKey = storageService.publicKeyFromUrl(oldProfilePicture);
      if (oldKey) {
        storageService.delete(oldKey).catch((error) => {
          console.error(JSON.stringify({ level: 'warn', event: 'profile_picture_cleanup_failed', error: error.message }));
        }
        );
      }

      db.get('SELECT id, name, email, phone, bio, city, country, role, seller_type, profilePicture, created_at FROM users WHERE id = ?',
        [req.user.id],
        (error, user) => {
          if (error) return res.status(500).json({ error: 'Failed to load the updated profile.' });
          return res.json({ success: true, profilePicture: imageUrl, user });
        }
      );
    } catch (error) {
      if (uploadedKey) {
        storageService.delete(uploadedKey).catch(() => {});
      }
      if (error.message?.includes('Input buffer')) {
        return res.status(400).json({ error: 'The uploaded image is invalid.' });
      }
      console.error(JSON.stringify({ level: 'error', event: 'profile_picture_upload_failed', error: error.message }));
      return res.status(500).json({ error: 'Failed to upload profile picture.' });
    }
  }
);

// Remove profile picture
app.delete('/api/users/profile-picture', protect, async (req, res) => {
  try {
    const oldProfilePicture = req.user.profilePicture;
    
    // Update user - remove profile picture
    db.run(
      'UPDATE users SET profilePicture = ? WHERE id = ?',
      ['', req.user.id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        const oldKey = storageService.publicKeyFromUrl(oldProfilePicture);
        if (oldKey) {
          storageService.delete(oldKey).catch((error) => {
            console.error(JSON.stringify({ level: 'warn', event: 'profile_picture_cleanup_failed', error: error.message }));
          });
        }
        
        // Get updated user
        db.get('SELECT id, name, email, phone, bio, city, country, role, seller_type, profilePicture, created_at FROM users WHERE id = ?',
          [req.user.id], 
          (err, user) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({
              success: true,
              message: 'Profile picture removed',
              profilePicture: '',
              user: user
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Remove error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== MEDIA UPLOAD FOR PRODUCTS ====================

const allowedPublicMediaTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 10, fieldSize: 64 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedPublicMediaTypes.has(file.mimetype)) return cb(null, true);
    return cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'));
  }
});

const persistPublicMedia = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  try {
    const metadata = await sharp(req.file.buffer, { failOn: 'error' }).metadata();
    const formats = {
      jpeg: { extension: 'jpg', contentType: 'image/jpeg' },
      png: { extension: 'png', contentType: 'image/png' },
      webp: { extension: 'webp', contentType: 'image/webp' },
      gif: { extension: 'gif', contentType: 'image/gif' },
    };
    const format = formats[metadata.format];
    if (!format) throw new Error('The uploaded file is not a supported image.');
    const key = storageService.createKey('public', 'media', format.extension);
    await storageService.put(key, req.file.buffer, {
      contentType: format.contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    });
    req.publicMedia = { url: storageService.publicUrl(key), type: 'image' };
    return next();
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Invalid upload.' });
  }
};

// ==================== MEDIA UPLOAD ROUTE ====================
app.post('/api/upload-media', protect, requireSeller, (req, res, next) => {
  mediaUpload.single('media')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Invalid upload.' });
    }
    return next();
  });
}, persistPublicMedia, (req, res) => res.json({ success: true, ...req.publicMedia }));

// FINDit reference photos are intentionally available to marketplace sellers,
// but are re-encoded, size-limited images and cannot be used for private IDs
// or arbitrary file delivery.
const findItMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 4, fieldSize: 32 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Only JPEG, PNG, and WebP reference images are allowed.'));
  },
});

app.post('/api/upload-findit-media', protect, (req, res, next) => {
  findItMediaUpload.single('media')(req, res, (error) => {
    if (error) return res.status(400).json({ error: error.message || 'Invalid reference image.' });
    return next();
  });
}, async (req, res) => {
  let key;
  try {
    if (!req.file) return res.status(400).json({ error: 'No reference image was uploaded.' });
    key = storageService.createKey('public', 'findit-reference-images', 'jpg');
    const image = await sharp(req.file.buffer, { failOn: 'error' })
      .rotate()
      .resize(1_800, 1_800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    await storageService.put(key, image, {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000, immutable',
    });
    return res.status(201).json({ success: true, url: storageService.publicUrl(key), type: 'image' });
  } catch (error) {
    if (key) storageService.delete(key).catch(() => {});
    return res.status(400).json({ error: 'The uploaded reference image is invalid.' });
  }
});

const privateDigitalUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1, fields: 10, fieldSize: 64 * 1024 },
});

const inspectPrivateDigitalFile = async (file) => {
  const imageFormats = {
    jpeg: { extension: 'jpg', contentType: 'image/jpeg' },
    png: { extension: 'png', contentType: 'image/png' },
    webp: { extension: 'webp', contentType: 'image/webp' },
  };
  if (file.mimetype.startsWith('image/')) {
    const metadata = await sharp(file.buffer, { failOn: 'error' }).metadata();
    if (!imageFormats[metadata.format]) throw new Error('Unsupported image file.');
    return imageFormats[metadata.format];
  }
  if (file.mimetype === 'application/pdf' && file.buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return { extension: 'pdf', contentType: 'application/pdf' };
  }
  const zipMagic = file.buffer.subarray(0, 4).toString('ascii');
  if (['application/zip', 'application/x-zip-compressed', 'application/epub+zip'].includes(file.mimetype) && ['PK\u0003\u0004', 'PK\u0005\u0006'].includes(zipMagic)) {
    return { extension: file.mimetype === 'application/epub+zip' ? 'epub' : 'zip', contentType: file.mimetype === 'application/epub+zip' ? 'application/epub+zip' : 'application/zip' };
  }
  if (file.mimetype === 'audio/mpeg' && (file.buffer.subarray(0, 3).toString('ascii') === 'ID3' || (file.buffer[0] === 0xff && (file.buffer[1] & 0xe0) === 0xe0))) {
    return { extension: 'mp3', contentType: 'audio/mpeg' };
  }
  if (file.mimetype === 'video/mp4' && file.buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    return { extension: 'mp4', contentType: 'video/mp4' };
  }
  if (file.mimetype === 'application/x-mobipocket-ebook' && file.buffer.subarray(60, 68).toString('ascii') === 'BOOKMOBI') {
    return { extension: 'mobi', contentType: 'application/x-mobipocket-ebook' };
  }
  throw new Error('Unsupported or invalid digital file.');
};

app.post('/api/upload-digital-file', protect, requireSeller, requireFeature('digital'), (req, res, next) => {
  privateDigitalUpload.single('file')(req, res, (error) => {
    if (error) return res.status(400).json({ error: error.message || 'Invalid digital file.' });
    return next();
  });
}, async (req, res) => {
  let key;
  try {
    if (!req.file) return res.status(400).json({ error: 'No digital file uploaded.' });
    const file = await inspectPrivateDigitalFile(req.file);
    key = storageService.createKey('private', `digital-files-user-${req.user.id}`, file.extension);
    await storageService.put(key, req.file.buffer, { contentType: file.contentType, cacheControl: 'private, no-store' });
    const fileName = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_') || `download.${file.extension}`;
    const sha256 = fileSha256(req.file.buffer);
    const upload = createUploadReceipt({
      key,
      sellerId: req.user.id,
      fileName,
      fileSize: req.file.size,
      contentType: file.contentType,
      sha256,
    });
    return res.status(201).json({
      success: true,
      storageReference: storageService.reference(key),
      fileName,
      fileSize: req.file.size,
      contentType: file.contentType,
      sha256,
      uploadReceipt: upload.receipt,
      uploadReceiptExpiresAt: upload.expiresAt,
    });
  } catch (error) {
    if (key) storageService.delete(key).catch(() => {});
    const status = error.message?.includes('Unsupported') || error.message?.includes('invalid') ? 400 : 500;
    console.error(JSON.stringify({ level: 'error', event: 'digital_file_upload_failed', error: error.message }));
    return res.status(status).json({ error: status === 400 ? error.message : 'Failed to store the digital file.' });
  }
});

// ==================== ADVANCED AUTH ENDPOINTS ====================

// These routes predate the verified registration flow above and returned
// browser-readable JWTs (including a development verification code). Keep the
// paths explicitly disabled so they cannot be re-enabled accidentally.
const disabledLegacyAuthRoutes = new Set([
  '/api/auth/send-verification',
  '/api/auth/verify-and-register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
]);
app.use((req, res, next) => {
  if (disabledLegacyAuthRoutes.has(req.path)) {
    return res.status(410).json({ error: 'This legacy authentication endpoint is no longer available.' });
  }
  return next();
});

const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
app.post('/api/auth/send-verification', authRateLimit, async (req, res) => {
  const { email, name } = req.body;
  
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required' });
  }
  
  try {
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (user) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      db.run('DELETE FROM email_verifications WHERE email = ?', [email]);
      
      db.run(`
        INSERT INTO email_verifications (email, code, expires_at)
        VALUES (?, ?, ?)
      `, [email, code, expiresAt.toISOString()], async (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to save verification code' });
        }
        
        console.log(`\n🔐 VERIFICATION CODE FOR ${email}: ${code}\n`);
        
        res.json({ 
          success: true, 
          message: 'Verification code sent',
          devCode: code 
        });
      });
    });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify and register
app.post('/api/auth/verify-and-register', authRateLimit, async (req, res) => {
  const { name, email, password, phone, code } = req.body;
  
  try {
    db.get(`
      SELECT * FROM email_verifications 
      WHERE email = ? AND code = ? AND expires_at > datetime('now')
    `, [email, code], async (err, verification) => {
      if (err || !verification) {
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }
      
      db.run('DELETE FROM email_verifications WHERE email = ?', [email]);
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      db.run(`
        INSERT INTO users (name, email, password, phone, role, is_verified)
        VALUES (?, ?, ?, ?, 'buyer', 1)
      `, [name, email, hashedPassword, phone], function(err) {
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
          { id: this.lastID, email: email },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRE }
        );
        
        console.log(`✅ User registered: ${email} (ID: ${this.lastID})`);
        
        res.json({
          success: true,
          token,
          user: { 
            id: this.lastID, 
            name, 
            email, 
            phone, 
            role: 'buyer', 
            isVerified: true 
          }
        });
      });
    });
  } catch (error) {
    console.error('Verify and register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend verification
app.post('/api/auth/resend-verification', authRateLimit, async (req, res) => {
  const { email, name } = req.body;
  
  try {
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    db.run(`
      INSERT OR REPLACE INTO email_verifications (email, code, expires_at)
      VALUES (?, ?, ?)
    `, [email, code, expiresAt.toISOString()], async (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      console.log(`\n🔐 NEW VERIFICATION CODE FOR ${email}: ${code}\n`);
      
      res.json({ 
        success: true, 
        message: 'New verification code sent',
        devCode: code 
      });
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot password
app.post('/api/auth/forgot-password', authRateLimit, async (req, res) => {
  const { email } = req.body;
  
  try {
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'Email not found' });
      }
      
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      db.run('DELETE FROM password_resets WHERE email = ?', [email]);
      db.run(`
        INSERT INTO password_resets (email, code, expires_at)
        VALUES (?, ?, ?)
      `, [email, code, expiresAt.toISOString()], async (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        console.log(`\n🔑 PASSWORD RESET CODE FOR ${email}: ${code}\n`);
        
        res.json({ 
          success: true, 
          message: 'Reset code sent',
          devCode: code 
        });
      });
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password
app.post('/api/auth/reset-password', authRateLimit, async (req, res) => {
  const { email, code, newPassword } = req.body;
  
  try {
    db.get(`
      SELECT * FROM password_resets 
      WHERE email = ? AND code = ? AND expires_at > datetime('now') AND used = 0
    `, [email, code], async (err, reset) => {
      if (err || !reset) {
        return res.status(400).json({ error: 'Invalid or expired reset code' });
      }
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      db.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
      db.run('UPDATE password_resets SET used = 1 WHERE id = ?', [reset.id]);
      
      console.log(`✅ Password reset for: ${email}`);
      
      res.json({ success: true, message: 'Password reset successfully' });
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Google OAuth
app.post('/api/auth/google', authRateLimit, async (req, res) => {
  try {
    const payload = await verifyGoogleCredential(req.body.credential);
    const { email, name, picture } = payload;
    const existingRecord = await getRow('SELECT id FROM users WHERE email = ?', [email]);
    if (existingRecord) {
      const existingUser = await getUserById(existingRecord.id);
      return res.json(await createAuthenticatedResponse(req, res, existingUser));
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('base64url'), 12);
    const created = await runStatement(
      'INSERT INTO users (name, email, password, is_verified, profilePicture) VALUES (?, ?, ?, 1, ?)',
      [name || email, email, passwordHash, picture || '']
    );
    const user = await getUserById(created.lastID);
    return res.status(201).json(await createAuthenticatedResponse(req, res, user));
  } catch (error) {
    const audienceMismatch = /audience|recipient|client.?id/i.test(error.message || '');
    console.error('Google token verification failed:', error.message);
    res.status(401).json({
      error: audienceMismatch
        ? 'Google OAuth client ID does not match the client that issued this credential'
        : 'Google credential is invalid or has expired',
      code: audienceMismatch ? 'GOOGLE_CLIENT_ID_MISMATCH' : 'GOOGLE_CREDENTIAL_INVALID'
    });
  }
});

app.all(['/api/auth/google/verify', '/api/auth/google/resend-verification'], (_req, res) => {
  res.status(410).json({ error: 'Google accounts are verified directly by Google. Sign in again to continue.' });
});

// Focused launch guards. The course, service, and digital implementations and
// their data remain intact, but API access is unavailable until each domain is
// explicitly reopened. These must be registered before the routers so they
// also protect legacy endpoints that live later in this module.
app.use('/api/courses', requireFeature('courses'));
app.use('/api/my-courses', requireFeature('courses'));
app.use('/api/my-courses-stats', requireFeature('courses'));
app.use('/api/services', requireFeature('services'));
app.use('/api/my-services', requireFeature('services'));
app.use('/api/digital', requireFeature('digital'));
app.use('/api/my-digital', requireFeature('digital'));
app.use('/api/my-purchases', requireFeature('digital'));
app.use('/api/seller/digital-requests', requireFeature('digital'));

app.use('/api', createProductRoutes({
  db,
  protect,
  requireSeller,
  isAdmin,
  validateIdParams,
  validateProductCreate,
  validateProductQuery,
  validateProductReview,
  validateProductUpdate,
  Money,
}));

app.use('/api', createCourseRoutes({
  db,
  protect,
  optionalProtect,
  requireSeller,
  validateIdParams,
  validateCourseCreate,
  validateCourseUpdate,
  validateLessonCreate,
  validateLessonProgress,
  validateLessonUpdate,
}));

app.use('/api', createServiceRoutes({
  db,
  protect,
  requireSeller,
  validateIdParams,
  validateServiceCreate,
  validateServiceUpdate,
}));

app.use('/api', createDigitalRoutes({
  db,
  protect,
  requireSeller,
  validateIdParams,
  validateDigitalCreate,
  validateDigitalUpdate,
  validateDigitalAccessRequest,
  validateDigitalAccessDecision,
  requireFeature,
  storageService,
  path,
  getDatabaseRow,
  runDatabaseStatement,
  streamPrivateAttachment,
  auditService: AuditService,
}));

// Booking routes are intentionally no longer mounted. Historical booking data
// remains retained, but the product no longer accepts or exposes bookings.
app.use('/api', createFindItRoutes({
  db,
  protect,
  requireSeller,
  validateIdParams,
  validateFinditRequestCreate,
  validateFinditOfferCreate,
  validateFinditOfferUpdate,
  validateFinditCheckout,
  auditService: AuditService,
}));

// ==================== CART ENDPOINTS ====================
app.get('/api/cart', protect, (req, res) => {
  db.all(`
    SELECT 
      c.product_id,
      c.quantity,
      p.title,
      p.price,
      p.image,
      p.stock,
      p.status,
      u.name as seller_name
    FROM cart c
    JOIN products p ON c.product_id = p.id
    JOIN users u ON p.seller_id = u.id
    WHERE c.user_id = ?
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, cart: rows });
    }
  });
});

app.post('/api/cart', protect, validateCartItem, (req, res) => {
  const { product_id, quantity } = req.body;
  
  if (!product_id || !quantity || quantity < 1) {
    return res.status(400).json({ error: 'Invalid product or quantity' });
  }
  
  db.get('SELECT * FROM products WHERE id = ?', [product_id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    if (product.status && product.status !== 'published') {
      return res.status(400).json({ error: 'This product is not currently available.' });
    }

    db.get('SELECT quantity FROM cart WHERE user_id = ? AND product_id = ?', [req.user.id, product_id], (cartError, cartItem) => {
      if (cartError) return res.status(500).json({ error: cartError.message });
      const requestedQuantity = (cartItem?.quantity || 0) + quantity;
      if (product.stock < requestedQuantity) {
        return res.status(400).json({ error: `Only ${product.stock} item(s) are currently available.` });
      }

      db.run(`
        INSERT INTO cart (user_id, product_id, quantity)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = quantity + ?
      `, [req.user.id, product_id, quantity, quantity], function onCartUpsert(insertError) {
        if (insertError) {
          res.status(400).json({ error: insertError.message });
        } else {
          res.json({ success: true, message: 'Added to cart' });
        }
      });
    });
  });
});

app.delete('/api/cart', protect, (req, res) => {
  db.run('DELETE FROM cart WHERE user_id = ?', [req.user.id], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
    } else {
      res.json({ success: true, message: 'Cart cleared' });
    }
  });
});

app.get('/api/orders', protect, (req, res) => {
  db.all(`
    SELECT o.*, 
      ((SELECT COUNT(*) FROM order_items WHERE order_id = o.id)
        + (SELECT COUNT(*) FROM findit_orders WHERE order_id = o.id)) as item_count
    FROM orders o
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, orders: rows });
    }
  });
});

app.get('/api/orders/:id', protect, (req, res) => {
  db.get(`
    SELECT * FROM orders WHERE id = ? AND user_id = ?
  `, [req.params.id, req.user.id], (err, order) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!order) {
      res.status(404).json({ error: 'Order not found' });
    } else {
      const itemQuery = order.order_type === 'findit'
        ? `SELECT fo.id, fo.item_title AS title, fo.item_description AS description,
                  fo.item_condition AS condition, fo.price, fo.price_minor, 1 AS quantity,
                  fo.delivery_fee, fo.delivery_fee_minor, '' AS image
           FROM findit_orders fo WHERE fo.order_id = ?`
        : `SELECT oi.*, p.title, p.image
           FROM order_items oi
           LEFT JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = ?`;
      db.all(itemQuery, [order.id], (err, items) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          db.all(`
            SELECT id, source, status, settlement_status, carrier_name, tracking_number,
                   confirmed_at, dispatched_at, delivered_at, refused_at, returned_at, cancelled_at, settled_at
            FROM cod_fulfillments
            WHERE order_id = ?
            ORDER BY id ASC
          `, [order.id], (fulfillmentError, fulfillments) => {
            if (fulfillmentError) return res.status(500).json({ error: fulfillmentError.message });
            order.items = items;
            order.fulfillments = fulfillments;
            if (order.shipping_address) {
              try {
                order.shipping_address = JSON.parse(order.shipping_address);
              } catch(e) {
                order.shipping_address = {};
              }
            }
            return res.json({ success: true, order });
          });
        }
      });
    }
  });
});

app.put('/api/cart/:productId', protect, validateIdParams('productId'), validateCartQuantity, (req, res) => {
  const { quantity } = req.body;
  
  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: 'Quantity must be at least 1' });
  }
  
  db.get(`
    SELECT p.stock, p.status
    FROM cart c
    JOIN products p ON p.id = c.product_id
    WHERE c.user_id = ? AND c.product_id = ?
  `, [req.user.id, req.params.productId], (lookupError, cartProduct) => {
    if (lookupError) return res.status(500).json({ error: lookupError.message });
    if (!cartProduct) return res.status(404).json({ error: 'Item not found in cart' });
    if ((cartProduct.status && cartProduct.status !== 'published') || cartProduct.stock < quantity) {
      return res.status(400).json({ error: `Only ${cartProduct.stock} item(s) are currently available.` });
    }

    db.run(`
      UPDATE cart SET quantity = ?
      WHERE user_id = ? AND product_id = ?
    `, [quantity, req.user.id, req.params.productId], function onCartUpdate(updateError) {
      if (updateError) {
        res.status(400).json({ error: updateError.message });
      } else {
        res.json({ success: true, message: 'Cart updated' });
      }
    });
  });
});

app.delete('/api/cart/:productId', protect, validateIdParams('productId'), (req, res) => {
  db.run(`
    DELETE FROM cart WHERE user_id = ? AND product_id = ?
  `, [req.user.id, req.params.productId], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Item not found in cart' });
    } else {
      res.json({ success: true, message: 'Removed from cart' });
    }
  });
});

app.delete('/api/cart', protect, (req, res) => {
  db.run('DELETE FROM cart WHERE user_id = ?', [req.user.id], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
    } else {
      res.json({ success: true, message: 'Cart cleared' });
    }
  });
});

const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
  return `RIF-${year}${month}${day}-${random}`;
};

app.post('/api/orders', protect, requireFeature('checkout'), validateCheckout, async (req, res) => {
  const { shippingAddress, paymentMethod, notes, items, total } = req.body || {};
  const idempotencyKey = req.get('Idempotency-Key');
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header is required to place an order.' });
  }

  try {
    const result = await WalletService.createMarketplaceOrder({
      buyerId: req.user.id,
      orderNumber: generateOrderNumber(),
      paymentMethod,
      shippingAddress,
      notes,
      items,
      expectedTotal: total,
      idempotencyKey,
    });
    const order = result.order;
    return res.status(result.alreadyCreated ? 200 : 201).json({
      success: true,
      alreadyCreated: result.alreadyCreated,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        total: Number(order.total),
        status: order.status,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
      },
    });
  } catch (error) {
    console.error('Secure checkout failed:', error.message);
    return res.status(400).json({ error: error.message });
  }
});

/* Legacy checkout implementation retained only for migration reference.
 * It trusted client totals and made non-atomic financial updates, so it is
 * deliberately disabled in favour of the transaction-backed route below.
 */
/*
app.post('/api/orders', protect, async (req, res) => {
  const { shippingAddress, paymentMethod, notes, items, total } = req.body;
  const orderNumber = generateOrderNumber();
  const buyerId = req.user.id;

  if (paymentMethod === 'wallet') {
    const wallet = await WalletService.getWallet(buyerId);
    if (!wallet || wallet.available_balance < total) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }
  }

  for (const item of items) {
    const product = await new Promise((resolve, reject) => {
      db.get('SELECT stock, title FROM products WHERE id = ?', [item.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!product) {
      return res.status(404).json({ error: `Product not found` });
    }
    
    if (product.stock < item.quantity) {
      return res.status(400).json({ 
        error: `Insufficient stock for "${product.title}". Only ${product.stock} left in stock.` 
      });
    }
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.run(`
      INSERT INTO orders (order_number, user_id, total, payment_method, payment_status, shipping_address, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [orderNumber, buyerId, total, paymentMethod, 'pending', JSON.stringify(shippingAddress), notes || ''], async function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(400).json({ error: err.message });
      }

      const orderId = this.lastID;
      let completed = 0;
      const sellerItemsMap = new Map();

      for (const item of items) {
        db.get('SELECT seller_id, title, image FROM products WHERE id = ?', [item.id], (err, product) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(400).json({ error: err.message });
          }
          
          if (!sellerItemsMap.has(product.seller_id)) {
            sellerItemsMap.set(product.seller_id, []);
          }
          sellerItemsMap.get(product.seller_id).push({ 
            ...item, 
            title: product.title, 
            image: product.image || '' 
          });
          
          db.run(`
            INSERT INTO order_items (order_id, product_id, quantity, price, product_title, product_image)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [orderId, item.id, item.quantity, item.price, product.title, product.image || ''], (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(400).json({ error: err.message });
            }
            
            db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.id]);
            
            completed++;
            if (completed === items.length) {
              (async () => {
                try {
                  if (paymentMethod === 'wallet') {
                    await WalletService.deductFunds(buyerId, total, 'purchase', orderId, `Order #${orderNumber}`);
                  }
                  
                  const commission = total * 0.05;
                  for (const [sellerId, sellerItems] of sellerItemsMap) {
                    const sellerTotal = sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    await WalletService.createEscrow(orderId, buyerId, sellerId, sellerTotal, commission);
                  }
                  
                  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                  const platformCommissionRate = 0.05;
                  const platformCommission = subtotal * platformCommissionRate;

                  let gatewayFee = 0;
                  if (paymentMethod === 'cmi') {
                    gatewayFee = subtotal * 0.025;
                  }

                  let deliveryCost = 25;
                  if (shippingAddress?.city === 'Casablanca' || shippingAddress?.city === 'Rabat') deliveryCost = 25;
                  else if (shippingAddress?.city === 'Marrakech' || shippingAddress?.city === 'Agadir') deliveryCost = 30;
                  else deliveryCost = 35;

                  for (const [sellerId, sellerItems] of sellerItemsMap) {
                    const sellerTotal = sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const sellerEarns = sellerTotal - (sellerTotal * platformCommissionRate);
                    await db.run(`INSERT INTO payment_splits (order_id, party_type, party_id, amount) VALUES (?, 'seller', ?, ?)`,
                      [orderId, sellerId, sellerEarns]);
                  }
                  await db.run(`INSERT INTO payment_splits (order_id, party_type, amount) VALUES (?, 'platform', ?)`,
                    [orderId, platformCommission]);
                  await db.run(`INSERT INTO payment_splits (order_id, party_type, amount) VALUES (?, 'delivery', ?)`,
                    [orderId, deliveryCost]);
                  if (paymentMethod === 'cmi') {
                    await db.run(`INSERT INTO payment_splits (order_id, party_type, amount) VALUES (?, 'gateway', ?)`,
                      [orderId, gatewayFee]);
                  }

                  if (paymentMethod === 'wallet') {
                    const platformCommissionRate = 0.05;
                    for (const [sellerId, sellerItems] of sellerItemsMap) {
                      const sellerTotal = sellerItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                      const sellerEarns = sellerTotal - (sellerTotal * platformCommissionRate);
                      await WalletService.addFunds(sellerId, sellerEarns, 'sale', orderId, `Sale #${orderNumber} (auto‑credited)`);
                      await db.run(`
                        UPDATE payment_splits 
                        SET status = 'completed', completed_at = datetime('now')
                        WHERE order_id = ? AND party_type = 'seller' AND party_id = ?
                      `, [orderId, sellerId]);
                    }
                    await db.run(`
                      UPDATE payment_splits 
                      SET status = 'completed', completed_at = datetime('now')
                      WHERE order_id = ? AND party_type IN ('platform', 'delivery')
                    `, [orderId]);
                  }

                  db.run('DELETE FROM cart WHERE user_id = ?', [buyerId], () => {
                    db.run('COMMIT');
                    res.json({
                      success: true,
                      order: {
                        id: orderId,
                        orderNumber,
                        total,
                        status: 'pending',
                        paymentMethod,
                        createdAt: new Date().toISOString()
                      }
                    });
                  });
                } catch (walletError) {
                  console.error('Wallet error:', walletError);
                  db.run('ROLLBACK');
                  res.status(400).json({ error: walletError.message });
                }
              })();
            }
          });
        });
      }
    });
  });
});
*/

// ==================== FAVORITES ENDPOINTS ====================
app.get('/api/favorites', protect, (req, res) => {
  db.all(`
    SELECT f.* FROM favorites f
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      const favorites = [];
      let completed = 0;
      
      if (rows.length === 0) {
        return res.json({ success: true, favorites: [] });
      }
      
      rows.forEach((fav, index) => {
        let table = '';
        switch(fav.item_type) {
          case 'product': table = 'products'; break;
          case 'course': table = 'courses'; break;
          case 'service': table = 'services'; break;
          case 'digital': table = 'digital_products'; break;
          case 'booking': table = 'bookings'; break;
        }
        
        db.get(`SELECT * FROM ${table} WHERE id = ?`, [fav.item_id], (err, item) => {
          if (err) {
            console.error('Error fetching favorite item:', err);
          }
          if (item) {
            favorites.push({
              id: fav.id,
              item_id: fav.item_id,
              type: fav.item_type,
              title: item.title,
              price: item.price,
              image: item.image,
              rating: item.rating || 0,
              seller_name: item.seller_name || item.provider_name || item.instructor_name || 'Seller'
            });
          }
          completed++;
          if (completed === rows.length) {
            res.json({ success: true, favorites });
          }
        });
      });
    }
  });
});

app.post('/api/favorites', protect, (req, res) => {
  const { item_id, item_type } = req.body;
  
  db.run(`
    INSERT INTO favorites (user_id, item_id, item_type)
    VALUES (?, ?, ?)
  `, [req.user.id, item_id, item_type], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Item already in favorites' });
      } else {
        res.status(400).json({ error: err.message });
      }
    } else {
      res.json({ success: true, message: 'Added to favorites', favoriteId: this.lastID });
    }
  });
});

app.delete('/api/favorites/:itemId/:itemType', protect, (req, res) => {
  const { itemId, itemType } = req.params;
  
  db.run(`
    DELETE FROM favorites WHERE user_id = ? AND item_id = ? AND item_type = ?
  `, [req.user.id, itemId, itemType], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
    } else {
      res.json({ success: true, message: 'Removed from favorites' });
    }
  });
});

app.get('/api/favorites/check/:itemId/:itemType', protect, (req, res) => {
  const { itemId, itemType } = req.params;
  
  db.get(`
    SELECT * FROM favorites WHERE user_id = ? AND item_id = ? AND item_type = ?
  `, [req.user.id, itemId, itemType], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, isFavorite: !!row });
    }
  });
});

// ==================== USER PROFILE ENDPOINTS ====================
app.patch('/api/users/update-me', protect, validateProfileUpdate, (req, res) => {
  const { name, phone, bio, city, country } = req.body;
  
  db.run(`
    UPDATE users SET 
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      bio = COALESCE(?, bio),
      city = COALESCE(?, city),
      country = COALESCE(?, country)
    WHERE id = ?
  `, [name, phone, bio, city, country, req.user.id], function(err) {
    if (err) {
      console.error('Update error:', err);
      res.status(400).json({ error: err.message });
    } else {
      db.get('SELECT id, name, email, phone, bio, city, country, role, seller_type, profilePicture, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json({ success: true, data: { user } });
        }
      });
    }
  });
});

app.patch('/api/users/update-password', protect, validatePasswordChange, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const bcrypt = require('bcryptjs');
  
  db.get('SELECT * FROM users WHERE id = ?', [req.user.id], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id], async function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        await sessionService.revokeOtherUserSessions(req.user.id, req.authSession.id, 'password_changed');
        res.json({ success: true, message: 'Password updated successfully' });
      }
    });
  });
});

app.get('/api/my-products-stats', protect, requireSeller, (req, res) => {
  db.all('SELECT * FROM products WHERE seller_id = ?', [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, products: rows });
    }
  });
});

app.get('/api/my-courses-stats', protect, requireSeller, (req, res) => {
  db.all('SELECT * FROM courses WHERE instructor_id = ?', [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, courses: rows });
    }
  });
});

// ==================== SELLER TYPE & PUBLIC PROFILE ====================
app.patch('/api/users/update-seller-type', protect, validateSellerType, (req, res) => {
  const { sellerType } = req.body;
  const valid = ['product', 'course', 'service', 'digital'];
  if (!valid.includes(sellerType)) {
    return res.status(400).json({ error: 'Invalid seller type' });
  }
  db.run(
    'UPDATE users SET seller_type = ?, role = "seller", seller_started_at = COALESCE(seller_started_at, CURRENT_TIMESTAMP) WHERE id = ?',
    [sellerType, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT id, name, email, phone, bio, city, country, role, seller_type, profilePicture, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, data: { user } });
      });
    }
  );
});

app.get('/api/users/:id', (req, res) => {
  db.get('SELECT id, name, email, phone, bio, city, country, seller_type, profilePicture, created_at FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  });
});

app.get('/api/users/:id/products', (req, res) => {
  db.all('SELECT p.*, u.name as seller_name FROM products p JOIN users u ON p.seller_id = u.id WHERE p.seller_id = ? AND p.status = "published" ORDER BY p.created_at DESC', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.json({ success: true, products: [] });
    let completed = 0;
    rows.forEach(product => {
      db.all('SELECT * FROM product_media WHERE product_id = ? ORDER BY display_order, id', [product.id], (err, media) => {
        if (!err) product.media = media || [];
        completed++;
        if (completed === rows.length) res.json({ success: true, products: rows });
      });
    });
  });
});

app.patch('/api/:type/:id/status', protect, requireSeller, (req, res) => {
  const { type, id } = req.params;
  const { status } = req.body;
  const resources = {
    products: { table: 'products', ownerField: 'seller_id' },
    courses: { table: 'courses', ownerField: 'instructor_id' },
    services: { table: 'services', ownerField: 'provider_id' },
    digital: { table: 'digital_products', ownerField: 'seller_id' },
    bookings: { table: 'bookings', ownerField: 'provider_id' },
  };
  const validStatus = ['published', 'ended'];
  const resource = resources[type];
  if (!resource || !validStatus.includes(status)) {
    return res.status(400).json({ error: 'Invalid type or status' });
  }
  db.get(`SELECT ${resource.ownerField} FROM ${resource.table} WHERE id = ?`, [id], (err, item) => {
    if (err || !item) return res.status(404).json({ error: `${type.slice(0,-1)} not found` });
    if (item[resource.ownerField] !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    db.run(`UPDATE ${resource.table} SET status = ? WHERE id = ?`, [status, id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: `Status updated to ${status}` });
    });
  });
});

// ==================== COURSE LESSONS ENDPOINTS ====================
app.post('/api/courses/:courseId/lessons', protect, requireSeller, (req, res) => {
  const { courseId } = req.params;
  const { title, description, duration, video_url, is_preview, order } = req.body;
  
  db.get('SELECT instructor_id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err || !course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructor_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    
    db.run(
      `INSERT INTO course_lessons (course_id, title, description, duration, video_url, is_preview, "order")
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [courseId, title, description, duration || 0, video_url || '', is_preview ? 1 : 0, order || 0],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, lessonId: this.lastID });
      }
    );
  });
});

app.put('/api/courses/:courseId/lessons/:lessonId', protect, requireSeller, (req, res) => {
  const { courseId, lessonId } = req.params;
  const { title, description, duration, video_url, is_preview, order } = req.body;
  
  db.get('SELECT instructor_id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err || !course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructor_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    
    db.run(
      `UPDATE course_lessons SET 
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        duration = COALESCE(?, duration),
        video_url = COALESCE(?, video_url),
        is_preview = COALESCE(?, is_preview),
        "order" = COALESCE(?, "order")
       WHERE id = ? AND course_id = ?`,
      [title, description, duration, video_url, is_preview ? 1 : 0, order, lessonId, courseId],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  });
});

app.delete('/api/courses/:courseId/lessons/:lessonId', protect, requireSeller, (req, res) => {
  const { courseId, lessonId } = req.params;
  
  db.get('SELECT instructor_id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err || !course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructor_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    
    db.run('DELETE FROM course_lessons WHERE id = ? AND course_id = ?', [lessonId, courseId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

app.patch('/api/courses/:courseId/lessons/reorder', protect, requireSeller, (req, res) => {
  const { courseId } = req.params;
  const { lessons } = req.body;
  
  db.get('SELECT instructor_id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err || !course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructor_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    
    let completed = 0;
    if (!lessons || !lessons.length) return res.json({ success: true });
    
    lessons.forEach(lesson => {
      db.run('UPDATE course_lessons SET "order" = ? WHERE id = ? AND course_id = ?', 
        [lesson.order, lesson.id, courseId], 
        (err) => {
          if (err) console.error('Reorder error:', err);
          completed++;
          if (completed === lessons.length) {
            res.json({ success: true });
          }
        });
    });
  });
});

// ==================== SERVICE PACKAGES ENDPOINTS ====================
app.post('/api/services/:serviceId/packages', protect, requireSeller, validateIdParams('serviceId'), validatePackageCreate, (req, res) => {
  const { serviceId } = req.params;
  const { name, price, delivery_time, revisions, features } = req.body;
  
  db.get('SELECT provider_id FROM services WHERE id = ?', [serviceId], (err, service) => {
    if (err || !service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    if (service.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.run(
      `INSERT INTO service_packages (service_id, name, price, delivery_time, revisions, features)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [serviceId, name, price, delivery_time || null, revisions || 0, features || null],
      function(err) {
        if (err) {
          console.error('Package creation error:', err);
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, packageId: this.lastID });
      }
    );
  });
});

app.put('/api/services/:serviceId/packages/:packageId', protect, requireSeller, validateIdParams('serviceId', 'packageId'), validatePackageUpdate, (req, res) => {
  const { serviceId, packageId } = req.params;
  const { name, price, delivery_time, revisions, features } = req.body;
  
  db.get('SELECT provider_id FROM services WHERE id = ?', [serviceId], (err, service) => {
    if (err || !service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    if (service.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.run(
      `UPDATE service_packages SET 
        name = COALESCE(?, name),
        price = COALESCE(?, price),
        delivery_time = COALESCE(?, delivery_time),
        revisions = COALESCE(?, revisions),
        features = COALESCE(?, features)
       WHERE id = ? AND service_id = ?`,
      [name, price, delivery_time, revisions, features, packageId, serviceId],
      function(err) {
        if (err) {
          console.error('Package update error:', err);
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
      }
    );
  });
});

app.delete('/api/services/:serviceId/packages/:packageId', protect, requireSeller, validateIdParams('serviceId', 'packageId'), (req, res) => {
  const { serviceId, packageId } = req.params;
  
  db.get('SELECT provider_id FROM services WHERE id = ?', [serviceId], (err, service) => {
    if (err || !service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    if (service.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.run('DELETE FROM service_packages WHERE id = ? AND service_id = ?', [packageId, serviceId], function(err) {
      if (err) {
        console.error('Package delete error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  });
});

// ==================== CHAT / MESSAGING ENDPOINTS (SIMPLIFIED) ====================
app.post('/api/messages', protect, (req, res) => {
  const { receiver_id, product_id, message } = req.body;
  const sender_id = req.user.id;
  
  if (!receiver_id || !message) {
    return res.status(400).json({ error: 'Receiver and message are required' });
  }
  
  db.run(
    'INSERT INTO messages (sender_id, receiver_id, product_id, message) VALUES (?, ?, ?, ?)',
    [sender_id, receiver_id, product_id || null, message],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, messageId: this.lastID });
    }
  );
});

app.get('/api/messages/conversation', protect, (req, res) => {
  const { other_user_id, product_id } = req.query;
  const current_user_id = req.user.id;
  
  if (!other_user_id) {
    return res.status(400).json({ error: 'other_user_id is required' });
  }
  
  db.all(`
    SELECT m.*, u.name as sender_name
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
    AND (m.product_id = ? OR m.product_id IS NULL)
    ORDER BY m.created_at ASC
  `, [current_user_id, other_user_id, other_user_id, current_user_id, product_id || null],
  (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.run(`
      UPDATE messages SET is_read = 1 
      WHERE receiver_id = ? AND sender_id = ?
    `, [current_user_id, other_user_id]);
    
    res.json({ success: true, messages: rows || [] });
  });
});

// Get all conversations for a user (UPDATED with seller verified flag)
app.get('/api/messages/conversations', protect, (req, res) => {
  const userId = req.user.id;
  
  db.all(`
    SELECT DISTINCT 
      CASE 
        WHEN sender_id = ? THEN receiver_id
        ELSE sender_id
      END as other_user_id
    FROM messages
    WHERE sender_id = ? OR receiver_id = ?
  `, [userId, userId, userId], (err, users) => {
    if (err) {
      console.error('Error getting conversation users:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (!users || users.length === 0) {
      return res.json({ success: true, conversations: [] });
    }
    
    const userIds = users.map(u => u.other_user_id);
    const placeholders = userIds.map(() => '?').join(',');
    
    db.all(`
      SELECT 
        u.id as other_user_id,
        u.name as other_user_name,
        u.profilePicture as other_user_avatar,
        (
          SELECT message FROM messages 
          WHERE ((sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?))
          ORDER BY created_at DESC LIMIT 1
        ) as last_message,
        (
          SELECT created_at FROM messages 
          WHERE ((sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?))
          ORDER BY created_at DESC LIMIT 1
        ) as last_message_time,
        (
          SELECT COUNT(*) FROM messages 
          WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0
        ) as unread_count
      FROM users u
      WHERE u.id IN (${placeholders})
      ORDER BY last_message_time DESC
    `, [userId, userId, userId, userId, userId, ...userIds], (err, conversations) => {
      if (err) {
        console.error('Error getting conversations:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, conversations: conversations || [] });
    });
  });
});

app.get('/api/messages/unread-count', protect, (req, res) => {
  db.get('SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0', [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, count: row?.count || 0 });
  });
});

const WalletService = require('./services/walletService');

// ==================== WALLET & PAYMENT ENDPOINTS ====================
app.get('/api/wallet/balance', protect, async (req, res) => {
  try {
    const wallet = await WalletService.getWallet(req.user.id);
    res.json({ success: true, wallet });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/wallet/transactions', protect, async (req, res) => {
  try {
    const transactions = await WalletService.getTransactions(req.user.id);
    res.json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/wallet/withdraw', protect, validateWithdrawal, async (req, res) => {
  const { amount, method, bankDetails } = req.body;
  const requestKey = req.get('Idempotency-Key');
  
  if (!amount || amount < 100) {
    return res.status(400).json({ error: 'Minimum withdrawal amount is 100 MAD' });
  }
  if (!requestKey) {
    return res.status(400).json({ error: 'Idempotency-Key header is required for withdrawals.' });
  }
  
  try {
    const result = await WalletService.requestWithdrawal(req.user.id, amount, method, bankDetails, requestKey);
    await AuditService.recordFromRequest(req, {
      action: 'withdrawal.requested',
      resourceType: 'withdrawal',
      resourceId: result.requestId,
      metadata: { method, alreadyProcessed: result.alreadyProcessed },
    });
    res.status(result.alreadyProcessed ? 200 : 201).json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      message: 'Withdrawal request submitted',
      requestId: result.requestId,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/admin/withdrawals', protect, requireFinance, async (req, res) => {
  try {
    await AuditService.recordFromRequest(req, {
      action: 'finance.withdrawals_viewed',
      resourceType: 'withdrawal',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to record this privileged action.', requestId: req.requestId });
  }
  db.all(`
    SELECT w.*, u.name as user_name, u.email as user_email
    FROM withdrawal_requests w
    JOIN users u ON w.user_id = u.id
    WHERE w.status = 'pending'
    ORDER BY w.created_at ASC
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, withdrawals: rows });
  });
});

/* Legacy withdrawal processing was not atomic and did not require a payout reference. */
/*
app.patch('/api/admin/withdrawals/:id/process', protect, requireFinance, validateIdParams('id'), validateWithdrawalDecision, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  
  const { id } = req.params;
  const { action, notes } = req.body;
  
  db.get('SELECT * FROM withdrawal_requests WHERE id = ?', [id], async (err, withdrawal) => {
    if (err || !withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
    
    if (action === 'approve') {
      db.run(`
        UPDATE withdrawal_requests 
        SET status = 'completed', processed_by = ?, processed_at = datetime('now'), notes = ?
        WHERE id = ?
      `, [req.user.id, notes || '', id]);
      
      db.run(`
        UPDATE wallets 
        SET pending_withdrawal = pending_withdrawal - ?
        WHERE user_id = ?
      `, [withdrawal.amount, withdrawal.user_id]);
      
      res.json({ success: true, message: 'Withdrawal approved' });
      
    } else if (action === 'reject') {
      db.run(`
        UPDATE withdrawal_requests 
        SET status = 'rejected', processed_by = ?, processed_at = datetime('now'), notes = ?
        WHERE id = ?
      `, [req.user.id, notes || '', id]);
      
      db.run(`
        UPDATE wallets 
        SET available_balance = available_balance + ?, 
            pending_withdrawal = pending_withdrawal - ?
        WHERE user_id = ?
      `, [withdrawal.amount, withdrawal.amount, withdrawal.user_id]);
      
      res.json({ success: true, message: 'Withdrawal rejected' });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  });
});
*/

app.patch('/api/admin/withdrawals/:id/process', protect, requireFinance, validateIdParams('id'), validateWithdrawalDecision, async (req, res) => {
  const { action, notes, providerReference } = req.body || {};
  try {
    const result = await WalletService.processWithdrawal({
      withdrawalId: req.params.id,
      action,
      adminId: req.user.id,
      notes,
      providerReference,
    });
    await AuditService.recordFromRequest(req, {
      action: 'withdrawal.processed',
      resourceType: 'withdrawal',
      resourceId: req.params.id,
      metadata: { decision: action, status: result.status, alreadyProcessed: result.alreadyProcessed },
    });
    return res.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      status: result.status,
      message: result.alreadyProcessed ? 'Withdrawal was already processed' : `Withdrawal ${result.status}`,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

const EmailService = require('./services/emailService');
const InvoiceService = require('./services/invoiceService');

// ==================== BUYER ORDER CANCELLATION ====================
/* Legacy cancellation could credit a wallet twice under concurrent requests. */
/*
app.post('/api/orders/:id/cancel', protect, validateIdParams('id'), async (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id;

  db.get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId], (err, order) => {
    if (err) {
      console.error('Cancel DB error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: `Cannot cancel order with status '${order.status}'. Only pending orders can be cancelled.` });
    }

    db.run('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', orderId], function(err) {
      if (err) {
        console.error('Cancel update error:', err);
        return res.status(500).json({ error: 'Failed to cancel order' });
      }

      if (order.payment_method === 'wallet') {
        db.run('UPDATE wallets SET available_balance = available_balance + ? WHERE user_id = ?', [order.total, userId], (err) => {
          if (err) {
            console.error('Refund error:', err);
          } else {
            db.run(`
              INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, reference_id, description)
              SELECT ?, 'refund', ?, available_balance - ?, available_balance, ?, 'Order cancellation refund'
              FROM wallets WHERE user_id = ?
            `, [userId, order.total, order.total, orderId, userId]);
            console.log(`💰 Refunded ${order.total} MAD to wallet for order ${orderId}`);
          }
        });
      }

      db.run(`INSERT INTO order_status_history (order_id, status, note, created_by)
              VALUES (?, ?, ?, ?)`,
        [orderId, 'cancelled', 'Order cancelled by buyer', userId]);

      console.log(`✅ Order ${orderId} cancelled by user ${userId}`);
      res.json({ success: true, message: 'Order cancelled successfully' });
    });
  });
});
*/

app.post('/api/orders/:id/cancel', protect, validateIdParams('id'), async (req, res) => {
  try {
    await WalletService.cancelUnpaidOrder(req.params.id, req.user.id);
    await AuditService.recordFromRequest(req, {
      action: 'order.cancelled',
      resourceType: 'order',
      resourceId: req.params.id,
      metadata: { paymentMethod: 'unpaid' },
    });
    return res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post('/api/orders/:id/refund-request', protect, validateIdParams('id'), validateRefundRequest, async (req, res) => {
  try {
    const result = await WalletService.requestRefund({
      orderId: req.params.id,
      requesterId: req.user.id,
      reason: req.body?.reason,
    });
    await AuditService.recordFromRequest(req, {
      action: 'refund.requested',
      resourceType: 'refund',
      resourceId: result.requestId,
      metadata: { orderId: req.params.id, alreadyProcessed: result.alreadyProcessed },
    });
    return res.status(result.alreadyProcessed ? 200 : 201).json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/api/admin/refunds', protect, requireFinance, async (req, res) => {
  try {
    await AuditService.recordFromRequest(req, {
      action: 'finance.refunds_viewed',
      resourceType: 'refund',
    });
    const refunds = await WalletService.all(`
      SELECT r.*, o.order_number, u.name AS requester_name, u.email AS requester_email
      FROM refund_requests r
      JOIN orders o ON o.id = r.order_id
      JOIN users u ON u.id = r.requested_by
      ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.created_at ASC
    `);
    return res.json({ success: true, refunds });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/refunds/:id/complete', protect, requireFinance, validateIdParams('id'), validateRefundCompletion, async (req, res) => {
  try {
    const result = await WalletService.completeRefund({
      refundId: req.params.id,
      adminId: req.user.id,
      providerReference: req.body?.providerReference,
      notes: req.body?.notes,
    });
    await AuditService.recordFromRequest(req, {
      action: 'refund.completed',
      resourceType: 'refund',
      resourceId: req.params.id,
      metadata: { status: result.status, alreadyProcessed: result.alreadyProcessed },
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/api/admin/finance/reconciliation', protect, requireFinance, async (req, res) => {
  try {
    await AuditService.recordFromRequest(req, {
      action: 'finance.reconciliation_viewed',
      resourceType: 'reconciliation',
    });
    const [negativeWallets, withdrawalMismatches, cmiTransactionMismatches,
      paidOrdersWithoutGatewayRecord, paidOrdersWithoutEscrow, releasedEscrowMismatches] = await Promise.all([
      WalletService.all(`
        SELECT user_id, available_balance, escrow_balance, pending_withdrawal,
               available_balance_minor, escrow_balance_minor, pending_withdrawal_minor
        FROM wallets
        WHERE available_balance_minor < 0 OR escrow_balance_minor < 0 OR pending_withdrawal_minor < 0
      `),
      WalletService.all(`
        SELECT w.user_id, w.pending_withdrawal, w.pending_withdrawal_minor,
               COALESCE(SUM(r.amount_minor), 0) AS expected_pending_withdrawal_minor
        FROM wallets w
        LEFT JOIN withdrawal_requests r ON r.user_id = w.user_id AND r.status = 'pending'
        GROUP BY w.user_id
        HAVING w.pending_withdrawal_minor != COALESCE(SUM(r.amount_minor), 0)
      `),
      WalletService.all(`
        SELECT pt.id, pt.order_id, pt.cmi_oid, pt.status AS transaction_status, o.payment_status
        FROM payment_transactions pt
        JOIN orders o ON o.id = pt.order_id
        WHERE (pt.status = 'completed' AND o.payment_status NOT IN ('paid', 'refunded'))
           OR (pt.status = 'refunded' AND o.payment_status != 'refunded')
      `),
      WalletService.all(`
        SELECT o.id, o.order_number, o.total, o.payment_status
        FROM orders o
        WHERE o.payment_method = 'cmi' AND o.payment_status = 'paid'
          AND NOT EXISTS (
            SELECT 1 FROM payment_transactions pt
            WHERE pt.order_id = o.id AND pt.status IN ('completed', 'refunded')
          )
      `),
      WalletService.all(`
        SELECT o.id, o.order_number, o.payment_method, o.total
        FROM orders o
        WHERE o.payment_method IN ('cmi', 'wallet') AND o.payment_status = 'paid'
          AND NOT EXISTS (SELECT 1 FROM escrow_transactions e WHERE e.order_id = o.id)
      `),
      WalletService.all(`
        SELECT e.id, e.order_id, e.seller_id, e.seller_amount
        FROM escrow_transactions e
        WHERE e.status = 'released'
          AND NOT EXISTS (
            SELECT 1 FROM payment_splits ps
            WHERE ps.order_id = e.order_id AND ps.party_type = 'seller'
              AND ps.party_id = e.seller_id AND ps.status = 'completed'
          )
      `),
    ]);

    const issueCount = negativeWallets.length + withdrawalMismatches.length
      + cmiTransactionMismatches.length + paidOrdersWithoutGatewayRecord.length
      + paidOrdersWithoutEscrow.length + releasedEscrowMismatches.length;
    return res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      issueCount,
      checks: {
        negativeWallets,
        withdrawalMismatches,
        cmiTransactionMismatches,
        paidOrdersWithoutGatewayRecord,
        paidOrdersWithoutEscrow,
        releasedEscrowMismatches,
      },
      note: 'CMI settlement must also be compared with the merchant portal or an imported gateway statement; no gateway credentials are used by this read-only report.',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/:id/history', protect, requireOrderHistoryAccess, (req, res) => {
  db.all(`
    SELECT h.*, u.name as updated_by_name
    FROM order_status_history h
    LEFT JOIN users u ON h.created_by = u.id
    WHERE h.order_id = ?
    ORDER BY h.created_at ASC
  `, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, history: rows });
  });
});

app.get('/api/seller/orders', protect, requireSeller, (req, res) => {
  db.all(`
    SELECT
      f.id AS fulfillment_id, f.source AS fulfillment_source,
      f.status AS fulfillment_status, f.settlement_status,
      f.gross_amount, f.gross_amount_minor, f.customer_delivery_fee, f.customer_delivery_fee_minor,
      f.expected_cod_amount, f.expected_cod_amount_minor, f.commission, f.commission_minor,
      f.seller_amount, f.seller_amount_minor, f.carrier_name, f.tracking_number,
      f.confirmed_at, f.dispatched_at, f.delivered_at, f.settled_at, f.created_at AS fulfillment_created_at,
      o.id AS order_id, o.order_number, o.order_type, o.total, o.total_minor,
      o.status AS order_status, o.payment_status, o.payment_method, o.shipping_address, o.notes,
      o.created_at, u.name AS buyer_name,
      COALESCE(
        fo.item_title,
        (SELECT COALESCE(NULLIF(oi.product_title, ''), p.title)
         FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = o.id ORDER BY oi.id ASC LIMIT 1)
      ) AS item_title,
      COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id = o.id), 1) AS seller_item_count
    FROM cod_fulfillments f
    JOIN orders o ON o.id = f.order_id
    JOIN users u ON u.id = o.user_id
    LEFT JOIN findit_orders fo ON fo.order_id = o.id AND f.source = 'findit'
    WHERE f.seller_id = ?
    ORDER BY f.created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, orders: rows });
  });
});

app.patch('/api/seller/cod-fulfillments/:id', protect, requireSeller, validateIdParams('id'), validateCodSellerAction, async (req, res) => {
  try {
    const result = await CodFulfillmentService.sellerAction({
      fulfillmentId: req.params.id,
      sellerId: req.user.id,
      ...req.body,
    });
    await AuditService.recordFromRequest(req, {
      action: `cod_fulfillment.seller_${req.body.action}`,
      resourceType: 'cod_fulfillment',
      resourceId: req.params.id,
      metadata: { orderId: result.fulfillment.order_id, status: result.fulfillment.status },
    });
    return res.json({ success: true, fulfillment: result.fulfillment, order: result.orderState });
  } catch (error) {
    return res.status(400).json({ error: error.message, requestId: req.requestId });
  }
});

function getDatabaseRow(query, values) {
  return new Promise((resolve, reject) => {
  db.get(query, values, (error, row) => (error ? reject(error) : resolve(row)));
  });
}

const getDatabaseRows = (query, values) => new Promise((resolve, reject) => {
  db.all(query, values, (error, rows) => (error ? reject(error) : resolve(rows)));
});

function runDatabaseStatement(query, values) {
  return new Promise((resolve, reject) => {
    db.run(query, values, function callback(error) {
      if (error) return reject(error);
      return resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

async function streamPrivateAttachment(res, key, filename, contentType) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', 'sandbox');
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
  await pipeline(await storageService.getPrivateStream(key), res);
}

app.get('/api/orders/:id/invoice', protect, async (req, res) => {
  try {
    const order = await getDatabaseRow('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (!isAdmin(req.user) && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not allowed to access this invoice.' });
    }

    let invoice = await getDatabaseRow('SELECT storage_reference, filename FROM order_invoices WHERE order_id = ?', [order.id]);
    let storageKey = invoice && storageService.keyFromReference(invoice.storage_reference, 'private');

    if (!storageKey) {
      const itemQuery = order.order_type === 'findit'
        ? `SELECT fo.id, fo.item_title AS title, fo.item_description AS description,
                  fo.price, fo.price_minor, 1 AS quantity, fo.delivery_fee, fo.delivery_fee_minor
           FROM findit_orders fo WHERE fo.order_id = ?`
        : `SELECT oi.*, COALESCE(NULLIF(oi.product_title, ''), p.title) AS title
           FROM order_items oi
           LEFT JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = ?`;
      const [user, items] = await Promise.all([
        getDatabaseRow('SELECT * FROM users WHERE id = ?', [order.user_id]),
        getDatabaseRows(itemQuery, [order.id]),
      ]);
      if (!user) return res.status(404).json({ error: 'Invoice customer record not found.' });

      const filename = `invoice-${order.order_number}.pdf`;
      const contents = await InvoiceService.generateInvoiceBuffer(order, user, items);
      const newKey = storageService.createKey('private', 'invoices', 'pdf');
      const storageReference = storageService.reference(newKey);
      await storageService.put(newKey, contents, { contentType: 'application/pdf', cacheControl: 'private, no-store' });
      try {
        const created = await runDatabaseStatement(
          'INSERT OR IGNORE INTO order_invoices (order_id, storage_reference, filename, sha256) VALUES (?, ?, ?, ?)',
          [order.id, storageReference, filename, crypto.createHash('sha256').update(contents).digest('hex')]
        );
        if (created.changes === 1) {
          invoice = { storage_reference: storageReference, filename };
          storageKey = newKey;
        } else {
          await storageService.delete(newKey);
          invoice = await getDatabaseRow('SELECT storage_reference, filename FROM order_invoices WHERE order_id = ?', [order.id]);
          storageKey = invoice && storageService.keyFromReference(invoice.storage_reference, 'private');
        }
      } catch (error) {
        await storageService.delete(newKey).catch(() => {});
        throw error;
      }
    }

    if (!storageKey || !invoice?.filename) return res.status(404).json({ error: 'Invoice file not found.' });
    await streamPrivateAttachment(res, storageKey, invoice.filename, 'application/pdf');
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'invoice_download_failed', error: error.message }));
    if (!res.headersSent) return res.status(500).json({ error: 'Unable to prepare the invoice.' });
  }
});

// ==================== RATINGS & REVIEWS ====================
app.post('/api/products/:id/review', protect, validateIdParams('id'), validateProductReview, async (req, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.id;
  
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }
  
  db.get(`
    SELECT oi.id FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.product_id = ? AND o.user_id = ? AND o.status = 'delivered'
  `, [productId, req.user.id], (err, purchase) => {
    if (err || !purchase) {
      return res.status(403).json({ error: 'You can only review products you have purchased and received' });
    }
    
    db.get('SELECT * FROM product_reviews WHERE product_id = ? AND user_id = ?', [productId, req.user.id], (err, existing) => {
      if (existing) {
        return res.status(400).json({ error: 'You have already reviewed this product' });
      }
      
      db.run('INSERT INTO product_reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
        [productId, req.user.id, rating, comment || ''], function(err) {
          if (err) return res.status(500).json({ error: err.message });
          
          db.get('SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM product_reviews WHERE product_id = ?', [productId], (err, result) => {
            if (!err && result) {
              db.run('UPDATE products SET rating = ?, reviews_count = ? WHERE id = ?',
                [Math.round(result.avg_rating * 10) / 10, result.review_count, productId]);
            }
            res.json({ success: true, message: 'Review added' });
          });
        });
    });
  });
});

app.get('/api/products/:id/reviews', (req, res) => {
  db.all(`
    SELECT r.*, u.name as user_name
    FROM product_reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, reviews: rows });
  });
});

// ==================== ADMIN DASHBOARD (UPDATED WITH SELLER VERIFICATION) ====================
app.get('/api/admin/feature-flags', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    await AuditService.recordFromRequest(req, {
      action: 'operations.feature_flags_viewed',
      resourceType: 'feature_flags',
    });
    return res.json({
      success: true,
      environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
      flags: FeatureFlags.getFeatureFlags(),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to retrieve feature flags.', requestId: req.requestId });
  }
});

app.get('/api/admin/stats', protect, requireAdmin, async (req, res) => {
  try {
    await AuditService.recordFromRequest(req, {
      action: 'admin.dashboard_viewed',
      resourceType: 'admin_dashboard',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to record this privileged action.', requestId: req.requestId });
  }
  const stats = {};
  let completed = 0;
  
  db.get('SELECT COUNT(*) as total FROM users', [], (err, row) => { stats.totalUsers = row?.total || 0; completed++; checkComplete(); });
  db.get('SELECT COUNT(*) as total FROM products WHERE status = "published"', [], (err, row) => { stats.totalProducts = row?.total || 0; completed++; checkComplete(); });
  db.get('SELECT COUNT(*) as total FROM orders', [], (err, row) => { stats.totalOrders = row?.total || 0; completed++; checkComplete(); });
  db.get('SELECT COALESCE(SUM(total), 0) as totalRevenue FROM orders WHERE status != "cancelled"', [], (err, row) => { stats.totalRevenue = row?.totalRevenue || 0; completed++; checkComplete(); });
  db.get('SELECT COUNT(*) as total FROM orders WHERE status = "pending"', [], (err, row) => { stats.pendingOrders = row?.total || 0; completed++; checkComplete(); });
  db.get('SELECT COUNT(*) as total FROM withdrawal_requests WHERE status = "pending"', [], (err, row) => { stats.pendingWithdrawals = row?.total || 0; completed++; checkComplete(); });
  
  function checkComplete() {
    if (completed === 6) {
      res.json({ success: true, stats });
    }
  }
});

app.get('/api/admin/recent-orders', protect, requireAdmin, async (req, res) => {
  try {
    await AuditService.recordFromRequest(req, {
      action: 'admin.recent_orders_viewed',
      resourceType: 'order',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to record this privileged action.', requestId: req.requestId });
  }
  db.all(`
    SELECT o.*, u.name as user_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
    LIMIT 10
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, orders: rows });
  });
});

app.get('/api/admin/audit-logs', protect, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    await AuditService.recordFromRequest(req, {
      action: 'admin.audit_logs_viewed',
      resourceType: 'audit_log',
    });
    const [entries, integrity] = await Promise.all([
      AuditService.list({ limit: req.query.limit, beforeId: req.query.beforeId }),
      AuditService.verifyIntegrity(),
    ]);
    return res.json({ success: true, entries, integrity });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to retrieve audit logs.', requestId: req.requestId });
  }
});

// ==================== COD ADMIN PANEL ====================
app.get('/api/admin/cod-fulfillments', protect, requireFinance, async (req, res) => {
  try {
    const fulfillments = await getDatabaseRows(`
      SELECT
        f.id AS fulfillment_id, f.source, f.status, f.settlement_status,
        f.gross_amount, f.gross_amount_minor, f.customer_delivery_fee, f.customer_delivery_fee_minor,
        f.expected_cod_amount, f.expected_cod_amount_minor, f.commission, f.commission_minor,
        f.seller_amount, f.seller_amount_minor, f.carrier_name, f.tracking_number,
        f.collected_amount, f.collected_amount_minor, f.carrier_delivery_fee, f.carrier_delivery_fee_minor,
        f.carrier_return_fee, f.carrier_return_fee_minor, f.carrier_collection_reference,
        f.remitted_amount, f.remitted_amount_minor,
        f.carrier_settlement_reference, f.collection_note, f.settlement_note, f.exception_note,
        f.confirmed_at, f.dispatched_at, f.delivered_at, f.refused_at, f.returned_at, f.cancelled_at,
        f.settled_at, f.created_at,
        o.id AS order_id, o.order_number, o.order_type, o.shipping_address, o.notes, o.created_at AS order_created_at,
        buyer.name AS buyer_name, buyer.email AS buyer_email,
        seller.name AS seller_name, seller.email AS seller_email,
        COALESCE(
          fo.item_title,
          (SELECT COALESCE(NULLIF(oi.product_title, ''), p.title)
           FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
           WHERE oi.order_id = o.id ORDER BY oi.id ASC LIMIT 1)
        ) AS item_title
      FROM cod_fulfillments f
      JOIN orders o ON o.id = f.order_id
      JOIN users buyer ON buyer.id = o.user_id
      JOIN users seller ON seller.id = f.seller_id
      LEFT JOIN findit_orders fo ON fo.order_id = o.id AND f.source = 'findit'
      ORDER BY
        CASE f.settlement_status
          WHEN 'awaiting_remittance' THEN 0
          WHEN 'awaiting_delivery' THEN 1
          WHEN 'settled' THEN 2
          ELSE 3
        END,
        f.created_at ASC
    `, []);
    await AuditService.recordFromRequest(req, {
      action: 'finance.cod_fulfillments_viewed',
      resourceType: 'cod_fulfillment',
      metadata: { resultCount: fulfillments.length },
    });
    return res.json({ success: true, fulfillments });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load COD fulfilments.', requestId: req.requestId });
  }
});

app.post('/api/admin/cod-fulfillments/:id/record-collection', protect, requireFinance, validateIdParams('id'), validateCodCollection, async (req, res) => {
  try {
    const result = await CodFulfillmentService.recordCollection({
      fulfillmentId: req.params.id,
      financeUserId: req.user.id,
      ...req.body,
    });
    await AuditService.recordFromRequest(req, {
      action: 'finance.cod_collection_recorded',
      resourceType: 'cod_fulfillment',
      resourceId: req.params.id,
      metadata: { orderId: result.fulfillment.order_id, status: result.fulfillment.status },
    });
    return res.json({ success: true, fulfillment: result.fulfillment, order: result.orderState });
  } catch (error) {
    return res.status(400).json({ error: error.message, requestId: req.requestId });
  }
});

app.post('/api/admin/cod-fulfillments/:id/settle', protect, requireFinance, validateIdParams('id'), validateCodSettlement, async (req, res) => {
  try {
    const result = await CodFulfillmentService.settle({
      fulfillmentId: req.params.id,
      financeUserId: req.user.id,
      ...req.body,
    });
    await AuditService.recordFromRequest(req, {
      action: 'finance.cod_remittance_reconciled',
      resourceType: 'cod_fulfillment',
      resourceId: req.params.id,
      metadata: { orderId: result.fulfillment.order_id, alreadyProcessed: result.alreadyProcessed },
    });
    return res.json({ success: true, fulfillment: result.fulfillment, alreadyProcessed: result.alreadyProcessed });
  } catch (error) {
    return res.status(400).json({ error: error.message, requestId: req.requestId });
  }
});

app.post('/api/admin/cod-fulfillments/:id/exception', protect, requireFinance, validateIdParams('id'), validateCodException, async (req, res) => {
  try {
    const result = await CodFulfillmentService.recordException({
      fulfillmentId: req.params.id,
      financeUserId: req.user.id,
      ...req.body,
    });
    await AuditService.recordFromRequest(req, {
      action: 'finance.cod_exception_recorded',
      resourceType: 'cod_fulfillment',
      resourceId: req.params.id,
      metadata: { orderId: result.fulfillment.order_id, status: result.fulfillment.status },
    });
    return res.json({ success: true, fulfillment: result.fulfillment, order: result.orderState });
  } catch (error) {
    return res.status(400).json({ error: error.message, requestId: req.requestId });
  }
});

app.get('/api/admin/cod-orders', protect, requireFinance, async (req, res) => {
  try {
    await AuditService.recordFromRequest(req, {
      action: 'finance.cod_orders_viewed',
      resourceType: 'order',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to record this privileged action.', requestId: req.requestId });
  }
  const sql = `
    SELECT 
      o.id, o.order_number, o.total, o.created_at, o.shipping_address, o.notes,
      u.name as customer_name,
      u.email as customer_email
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.payment_method = 'cash' 
      AND o.status = 'delivered'
      AND NOT EXISTS (
        SELECT 1 FROM payment_splits ps 
        WHERE ps.order_id = o.id AND ps.party_type = 'seller' AND ps.status = 'completed'
      )
    ORDER BY o.created_at ASC
  `;

  db.all(sql, [], (err, orders) => {
    if (err) {
      console.error('Error fetching COD orders:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, orders });
  });
});

/* Legacy COD settlement could credit sellers more than once under concurrent requests. */
/*
app.post('/api/admin/cod-orders/:id/confirm', protect, requireFinance, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  const orderId = req.params.id;
  const platformRate = 0.10;

  db.get('SELECT * FROM orders WHERE id = ? AND payment_method = "cash" AND status = "delivered"', [orderId], async (err, order) => {
    if (err || !order) {
      return res.status(404).json({ error: 'Order not found or not eligible' });
    }

    db.get('SELECT id FROM payment_splits WHERE order_id = ? AND party_type = "seller" AND status = "completed"', [orderId], (err, existing) => {
      if (existing) {
        return res.status(400).json({ error: 'Seller already paid for this order' });
      }

      db.all(`
        SELECT oi.*, p.seller_id, p.title
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [orderId], async (err, items) => {
        if (err) {
          console.error('Error fetching order items:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (items.length === 0) {
          return res.status(400).json({ error: 'No items found for this order' });
        }

        const sellerMap = new Map();
        items.forEach(item => {
          if (!sellerMap.has(item.seller_id)) {
            sellerMap.set(item.seller_id, []);
          }
          sellerMap.get(item.seller_id).push(item);
        });

        for (const [sellerId, sellerItems] of sellerMap.entries()) {
          const sellerTotal = sellerItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
          const sellerEarns = sellerTotal - (sellerTotal * platformRate);

          await WalletService.addFunds(sellerId, sellerEarns, 'cod_settlement', orderId, `COD settlement for order ${order.order_number}`);

          db.run(`
            UPDATE payment_splits 
            SET status = 'completed', completed_at = datetime('now')
            WHERE order_id = ? AND party_type = 'seller' AND party_id = ?
          `, [orderId, sellerId]);
        }

        db.run(`
          UPDATE payment_splits 
          SET status = 'completed', completed_at = datetime('now')
          WHERE order_id = ? AND party_type IN ('platform', 'delivery')
        `, [orderId]);

        res.json({ success: true, message: 'Cash collected and seller credited' });
      });
    });
  });
});
*/

app.post('/api/admin/cod-orders/:id/confirm', protect, requireFinance, validateIdParams('id'), async (req, res) => {
  return res.status(410).json({
    error: 'Direct COD settlement is no longer available. Record carrier collection and remittance on the COD fulfilment instead.',
  });
});

// ==================== CMI PAYMENT ENDPOINTS ====================
const CmiPaymentService = require('./services/cmiPaymentService');

app.post('/api/payment/cmi/initiate', protect, requireFeature('cmi_payments'), validateCmiInitiation, async (req, res) => {
  const { orderId } = req.body;
  
  if (!orderId) {
    return res.status(400).json({ error: 'Order ID required' });
  }
  
  db.get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, req.user.id], async (err, order) => {
    if (err || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    db.get('SELECT * FROM users WHERE id = ?', [req.user.id], async (err, user) => {
      db.all(`
        SELECT oi.*, p.title
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [orderId], async (err, items) => {
        try {
          const { htmlForm, oid } = await CmiPaymentService.initiatePayment(order, user);
          await AuditService.recordFromRequest(req, {
            action: 'payment.cmi_initiated',
            resourceType: 'order',
            resourceId: orderId,
            metadata: { paymentMethod: 'cmi' },
          });
          res.json({
            success: true,
            htmlForm: htmlForm,
            oid: oid,
            redirectUrl: null
          });
        } catch (error) {
          console.error('CMI initiation error:', error);
          res.status(500).json({ error: 'Failed to initiate payment' });
        }
      });
    });
  });
});

app.get('/api/payment/success', async (req, res) => {
  const { oid } = req.query;
  // A customer browser return can be forged or abandoned. It may display a
  // status page, but only the signed server-to-server callback changes money.
  return res.redirect(`${process.env.CLIENT_URL}/payment/success?order_id=${encodeURIComponent(oid || '')}`);
});

app.get('/api/payment/fail', async (req, res) => {
  // Like the success URL, this browser destination must never alter payment state.
  res.redirect(`${process.env.CLIENT_URL}/payment/failed`);
});

app.post('/api/payment/callback', async (req, res) => {
  const params = req.body || {};

  const { oid, result, ProcReturnCode } = params;
  if (!CmiPaymentService.verifyPayment(params)) {
    console.warn('Rejected CMI callback with an invalid signature.');
    return res.status(400).send('INVALID');
  }

  try {
    if (result === 'success' || ProcReturnCode === '00') {
      await CmiPaymentService.processSuccessPayment(oid, params);
      await AuditService.recordFromRequest(req, {
        action: 'payment.cmi_callback_processed',
        resourceType: 'payment',
        resourceId: oid,
        metadata: { outcome: 'success' },
      });
      return res.send('OK');
    }
    await CmiPaymentService.processFailedPayment(oid, params);
    await AuditService.recordFromRequest(req, {
      action: 'payment.cmi_callback_processed',
      resourceType: 'payment',
      resourceId: oid,
      metadata: { outcome: 'failed' },
    });
    return res.send('FAIL');
  } catch (error) {
    console.error('CMI callback processing failed:', error.message);
    return res.status(500).send('ERROR');
  }
});

app.get('/api/payment/status/:orderId', protect, validateIdParams('orderId'), async (req, res) => {
  const { orderId } = req.params;
  
  db.get(`
    SELECT pt.*, o.payment_status, o.status as order_status
    FROM payment_transactions pt
    JOIN orders o ON pt.order_id = o.id
    WHERE pt.order_id = ? AND o.user_id = ?
  `, [orderId, req.user.id], (err, transaction) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, transaction });
  });
});

// ==================== PRODUCT OFFERS (JOUTIYA) ====================
app.post('/api/products/:id/offers', protect, validateIdParams('id'), validateOffer, (req, res) => {
  const productId = req.params.id;
  const buyerId = req.user.id;
  const { amount, message } = req.body;
  const amountMinor = Money.toMinor(amount);

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid offer amount is required' });
  }

  db.get('SELECT seller_id, price, price_minor, condition FROM products WHERE id = ?', [productId], (err, product) => {
    if (err || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (product.condition !== 'joutiya') {
      return res.status(400).json({ error: 'Offers are only allowed on Joutiya items' });
    }
    const productPriceMinor = Number.isSafeInteger(product.price_minor)
      ? product.price_minor
      : Money.toMinor(product.price);
    if (amountMinor > productPriceMinor) {
      return res.status(400).json({ error: `Offer cannot exceed the original price of ${Money.fromMinor(productPriceMinor)} MAD` });
    }

    db.get('SELECT id FROM product_offers WHERE product_id = ? AND buyer_id = ? AND status = "pending"',
      [productId, buyerId], (err, existing) => {
        if (existing) {
          return res.status(400).json({ error: 'You already have a pending offer for this product' });
        }

        db.run(`
          INSERT INTO product_offers (product_id, buyer_id, seller_id, amount, amount_minor, message, status)
          VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `, [productId, buyerId, product.seller_id, Money.fromMinor(amountMinor), amountMinor, message || ''], function(err) {
          if (err) {
            console.error('Offer insert error:', err);
            return res.status(500).json({ error: 'Failed to submit offer' });
          }
          res.json({
            success: true,
            message: `Offer of ${Money.fromMinor(amountMinor)} MAD sent to seller`,
            offerId: this.lastID
          });
        });
      });
  });
});

app.get('/api/seller/offers', protect, requireSeller, (req, res) => {
  db.all(`
    SELECT 
      o.*,
      p.title as product_title,
      p.price as product_price,
      u.name as buyer_name,
      u.email as buyer_email
    FROM product_offers o
    JOIN products p ON o.product_id = p.id
    JOIN users u ON o.buyer_id = u.id
    WHERE o.seller_id = ?
    ORDER BY o.created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, offers: rows });
  });
});

app.patch('/api/seller/offers/:offerId/respond', protect, requireSeller, validateIdParams('offerId'), validateOfferResponse, (req, res) => {
  const { offerId } = req.params;
  const { action } = req.body;
  const sellerId = req.user.id;

  if (!['accept', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be accept or reject' });
  }

  db.get('SELECT * FROM product_offers WHERE id = ? AND seller_id = ?', [offerId, sellerId], (err, offer) => {
    if (err || !offer) {
      return res.status(404).json({ error: 'Offer not found or not yours' });
    }
    if (offer.status !== 'pending') {
      return res.status(400).json({ error: `Offer already ${offer.status}` });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    db.run('UPDATE product_offers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, offerId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: `Offer ${action}ed` });
      });
  });
});












/* Retired seller verification handler. Kept disabled until its final source deletion. */
/*
app.patch('/api/admin/verify-document/:docId', protect, requireVerificationReviewer, validateIdParams('docId'), (req, res) => {
  const { docId } = req.params;
  const { action, admin_notes } = req.body; // action: 'approve' or 'reject'
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
  
  db.get('SELECT user_id FROM verification_documents WHERE id = ?', [docId], (err, doc) => {
    if (err || !doc) return res.status(404).json({ error: 'Document not found' });
    
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    db.run(
      `UPDATE verification_documents SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newStatus, admin_notes || null, req.user.id, docId],
      async function onVerificationDocumentUpdate(err) {
        if (err) return res.status(500).json({ error: err.message });

        db.run('UPDATE users SET is_verified_seller = ? WHERE id = ?', [action === 'approve' ? 1 : 0, doc.user_id], async (userError) => {
          if (userError) return res.status(500).json({ error: 'Verification document was updated but seller verification could not be updated.' });
          try {
            await AuditService.recordFromRequest(req, {
              action: 'verification.reviewed',
              resourceType: 'verification_document',
              resourceId: docId,
              metadata: { decision: action, sellerId: doc.user_id },
            });
          } catch (auditError) {
            return res.status(500).json({ error: 'Verification decision was updated but its audit record could not be written. Contact support with the request ID.', requestId: req.requestId });
          }
          return res.json({ success: true, message: `Document ${action}d` });
        });
      }
    );
  });
});









*/

// ==================== 404 HANDLER ====================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', requestId: req.requestId });
});

app.use(errorHandler);

module.exports = app;
