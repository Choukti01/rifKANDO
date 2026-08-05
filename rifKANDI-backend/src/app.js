const express = require('express');
const cors = require('cors');
const db = require('./config/database');
const { protect, authorize } = require('./middleware/auth');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const crypto = require('crypto');
const { pipeline } = require('node:stream/promises');
const { securityHeaders, createRateLimiter } = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const { getAllowedOrigins } = require('./config/validateEnv');
const { sendVerificationEmail, sendWelcomeEmail, sendLoginNotificationEmail } = require('./utils/sendEmail');
const storageService = require('./services/storageService');
// const EmailService = require('./services/emailService');



const app = express();

const requireSeller = authorize('seller');
const requireAdmin = authorize('admin');
const allowedOrigins = new Set(getAllowedOrigins());

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});
app.use(securityHeaders);

const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again later.'
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
  allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Request-ID'],
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

app.get('/health', async (req, res) => {
  try {
    await db.ready;
    await checkDatabaseHealth();
    return res.status(200).json({
      status: 'ok',
      service: 'rifkando-api',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unavailable',
      service: 'rifkando-api',
      requestId: req.requestId,
    });
  }
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
    if (req.user.role === 'admin') return next();
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Only sellers or administrators can update orders.' });
    }
    db.get(
      `SELECT 1 FROM order_items oi JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ? AND p.seller_id = ? LIMIT 1`,
      [order.id, req.user.id],
      (accessError, sellerItem) => {
        if (accessError) return res.status(500).json({ error: 'Unable to verify order access.' });
        if (!sellerItem) return res.status(403).json({ error: 'You are not a seller for this order.' });
        return next();
      }
    );
  });
};

// Update order status (seller) - SIMPLIFIED WORKING VERSION
app.patch('/api/orders/:id/status', protect, requireOrderStatusAccess, async (req, res) => {
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

    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
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

app.patch('/api/users/update-password', (req, res) => {
  res.status(410).json({
    error: 'Password authentication is not available. Manage your credentials through Google.'
  });
});

const registrationExpiryMs = 10 * 60 * 1000;
const registrationMaxAttempts = 5;

const hashRegistrationCode = (code) => crypto
  .createHmac('sha256', process.env.JWT_SECRET)
  .update(code)
  .digest('hex');

const createAuthenticatedResponse = (user) => {
  const jwt = require('jsonwebtoken');
  return {
    success: true,
    token: jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE }),
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
  };
};

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

    db.run('INSERT INTO users (name, email, password, phone, is_verified) VALUES (?, ?, ?, ?, 1)', [registration.name, email, registration.password_hash, registration.phone], function (createError) {
      if (createError) return res.status(409).json({ error: 'An account already exists for this email.' });
      const user = { id: this.lastID, name: registration.name, email, phone: registration.phone, role: 'buyer', seller_type: null, bio: '', city: '', country: 'Morocco', profilePicture: '', is_verified_seller: 0 };
      db.run('DELETE FROM pending_registrations WHERE email = ?', [email]);
      res.json(createAuthenticatedResponse(user));
      sendWelcomeEmail(email, registration.name).catch((emailError) => console.error('Welcome email failed:', emailError.message));
    });
  });
});

app.post('/api/auth/login', authRateLimit, (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const { password } = req.body;
  const bcrypt = require('bcryptjs');
  db.get('SELECT * FROM users WHERE email = ?', [email], async (error, user) => {
    if (error || !user || !(await bcrypt.compare(password || '', user.password))) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(createAuthenticatedResponse(user));
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
// Get current user
app.get('/api/auth/me', protect, (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        sellerType: req.user.seller_type,
        bio: req.user.bio,
        city: req.user.city,
        country: req.user.country,
        profilePicture: req.user.profilePicture,
        is_verified_seller: req.user.is_verified_seller || 0
      }
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

      db.get('SELECT id, name, email, phone, bio, city, country, role, seller_type, profilePicture, is_verified_seller, created_at FROM users WHERE id = ?',
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
        db.get('SELECT id, name, email, phone, bio, city, country, role, seller_type, profilePicture, is_verified_seller, created_at FROM users WHERE id = ?', 
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

app.post('/api/upload-digital-file', protect, requireSeller, (req, res, next) => {
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
    return res.status(201).json({
      success: true,
      storageReference: storageService.reference(key),
      fileName: path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_') || `download.${file.extension}`,
      fileSize: req.file.size,
      contentType: file.contentType,
    });
  } catch (error) {
    if (key) storageService.delete(key).catch(() => {});
    const status = error.message?.includes('Unsupported') || error.message?.includes('invalid') ? 400 : 500;
    console.error(JSON.stringify({ level: 'error', event: 'digital_file_upload_failed', error: error.message }));
    return res.status(status).json({ error: status === 400 ? error.message : 'Failed to store the digital file.' });
  }
});

// ==================== ADVANCED AUTH ENDPOINTS ====================

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
    const { sub, email, name, picture } = payload;
    
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Could not find the Google user' });
      }

      if (user?.is_verified) {
        const jwt = require('jsonwebtoken');
        const authToken = jwt.sign(
          { id: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRE }
        );
        
        const authenticatedUser = { id: user.id, name: user.name, email: user.email, role: user.role, profilePicture: user.profilePicture, is_verified_seller: user.is_verified_seller || 0 };
        return res.json({ success: true, token: authToken, user: authenticatedUser, data: { user: authenticatedUser } });
      }

      const sendCode = async () => {
        try {
          await sendGoogleVerificationCode({ email, googleSub: sub });
          res.status(202).json({
            success: true,
            verificationRequired: true,
            message: 'A verification code was sent to your Google email address.'
          });
        } catch (error) {
          console.error('Google verification email failed:', error.message);
          res.status(503).json({ error: 'Unable to send the verification email. Please try again later.' });
        }
      };

      if (user) {
        return sendCode();
      }

      const bcrypt = require('bcryptjs');
      const randomPassword = crypto.randomBytes(32).toString('base64url');
      const hashedPassword = await bcrypt.hash(randomPassword, 12);

      db.run(`
        INSERT INTO users (name, email, password, is_verified, profilePicture)
        VALUES (?, ?, ?, 0, ?)
      `, [name || email, email, hashedPassword, picture || ''], (insertError) => {
        if (insertError) {
          return res.status(400).json({ error: insertError.message });
        }
        sendCode();
      });
    });
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

app.post('/api/auth/google/verify', authRateLimit, async (req, res) => {
  const { code } = req.body;

  if (!/^\d{6}$/.test(code || '')) {
    return res.status(400).json({ error: 'Enter the six-digit verification code.' });
  }

  try {
    const { sub, email } = await verifyGoogleCredential(req.body.credential);
    db.get('SELECT * FROM google_verifications WHERE email = ?', [email], (error, verification) => {
      if (error) return res.status(500).json({ error: 'Could not verify the registration code.' });
      if (!verification || verification.google_sub !== sub || new Date(verification.expires_at) <= new Date()) {
        return res.status(400).json({ error: 'Verification code is invalid or expired.' });
      }
      if (verification.attempts >= googleVerificationMaxAttempts) {
        return res.status(429).json({ error: 'Too many incorrect codes. Request a new code.' });
      }

      const expectedHash = Buffer.from(verification.code_hash, 'hex');
      const providedHash = Buffer.from(hashGoogleVerificationCode(code), 'hex');
      if (!crypto.timingSafeEqual(expectedHash, providedHash)) {
        db.run('UPDATE google_verifications SET attempts = attempts + 1 WHERE email = ?', [email]);
        return res.status(400).json({ error: 'Verification code is invalid or expired.' });
      }

      db.run('UPDATE users SET is_verified = 1 WHERE email = ?', [email], (updateError) => {
        if (updateError) return res.status(500).json({ error: 'Could not activate the account.' });
        db.get('SELECT * FROM users WHERE email = ?', [email], (userError, user) => {
          if (userError || !user) return res.status(500).json({ error: 'Could not load the account.' });
          db.run('DELETE FROM google_verifications WHERE email = ?', [email]);
          const jwt = require('jsonwebtoken');
          const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
          const authenticatedUser = { id: user.id, name: user.name, email: user.email, role: user.role, profilePicture: user.profilePicture, is_verified_seller: user.is_verified_seller || 0 };
          res.json({ success: true, token, user: authenticatedUser, data: { user: authenticatedUser } });
        });
      });
    });
  } catch (error) {
    console.error('Google registration verification failed:', error.message);
    res.status(error.statusCode || 401).json({ error: error.message || 'Google credential is invalid or has expired.' });
  }
});

app.post('/api/auth/google/resend-verification', authRateLimit, async (req, res) => {
  try {
    const { sub, email } = await verifyGoogleCredential(req.body.credential);
    db.get('SELECT id, is_verified FROM users WHERE email = ?', [email], async (error, user) => {
      if (error) return res.status(500).json({ error: 'Could not find the Google user.' });
      if (!user || user.is_verified) return res.status(400).json({ error: 'No pending Google registration was found.' });
      try {
        await sendGoogleVerificationCode({ email, googleSub: sub });
        res.json({ success: true, message: 'A new verification code was sent.' });
      } catch (sendError) {
        console.error('Google verification resend failed:', sendError.message);
        res.status(503).json({ error: 'Unable to send the verification email. Please try again later.' });
      }
    });
  } catch (error) {
    res.status(error.statusCode || 401).json({ error: error.message || 'Google credential is invalid or has expired.' });
  }
});

// ==================== PRODUCT ENDPOINTS (UPDATED WITH SELLER VERIFICATION) ====================

// Get all products with search, filters, pagination, condition, and seller verification
app.get('/api/products', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  
  const search = req.query.search || '';
  const category = req.query.category || '';
  const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
  const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
  const minRating = req.query.minRating ? parseFloat(req.query.minRating) : null;
  const sortBy = req.query.sortBy || 'newest';
  const condition = req.query.condition || '';
  const verifiedOnly = req.query.verified === 'true';
  
  let whereClause = 'p.status = "published"';
  const params = [];
  
  if (condition) {
    whereClause += ` AND p.condition = ?`;
    params.push(condition);
  }
  if (search) {
    whereClause += ` AND (p.title LIKE ? OR p.description LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    whereClause += ` AND p.category = ?`;
    params.push(category);
  }
  if (minPrice !== null) {
    whereClause += ` AND p.price >= ?`;
    params.push(minPrice);
  }
  if (maxPrice !== null) {
    whereClause += ` AND p.price <= ?`;
    params.push(maxPrice);
  }
  if (minRating !== null) {
    whereClause += ` AND p.rating >= ?`;
    params.push(minRating);
  }
  if (verifiedOnly) {
    whereClause += ` AND u.is_verified_seller = 1`;
  }
  
  let orderBy = '';
  switch (sortBy) {
    case 'price_asc':
      orderBy = 'ORDER BY p.price ASC';
      break;
    case 'price_desc':
      orderBy = 'ORDER BY p.price DESC';
      break;
    case 'rating':
      orderBy = 'ORDER BY p.rating DESC';
      break;
    case 'popular':
      orderBy = 'ORDER BY p.sold DESC';
      break;
    default:
      orderBy = 'ORDER BY p.created_at DESC';
  }
  
  db.get(`SELECT COUNT(*) as total FROM products p JOIN users u ON p.seller_id = u.id WHERE ${whereClause}`, params, (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);
    
    db.all(`
      SELECT p.*, u.name as seller_name, u.id as seller_id, u.is_verified_seller as seller_verified
      FROM products p
      JOIN users u ON p.seller_id = u.id
      WHERE ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!rows.length) {
        return res.json({ success: true, products: [], pagination: { page, limit, total, totalPages } });
      }
      
      let completed = 0;
      rows.forEach((product) => {
        db.all('SELECT * FROM product_media WHERE product_id = ? ORDER BY display_order, id', [product.id], (err, media) => {
          if (!err) product.media = media || [];
          completed++;
          if (completed === rows.length) {
            res.json({ 
              success: true, 
              products: rows,
              pagination: { page, limit, total, totalPages }
            });
          }
        });
      });
    });
  });
});

// Get single product (include media, seller name, and seller verification)
app.get('/api/products/:id', (req, res) => {
  db.get(`
    SELECT p.*, u.name as seller_name, u.id as seller_id, u.is_verified_seller as seller_verified
    FROM products p
    JOIN users u ON p.seller_id = u.id
    WHERE p.id = ?
  `, [req.params.id], (err, product) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!product) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      db.all('SELECT * FROM product_media WHERE product_id = ? ORDER BY display_order, id', [product.id], (err, media) => {
        if (!err) product.media = media || [];
        res.json({ success: true, product });
      });
    }
  });
});

// Add product (seller only, with media) – includes condition
app.post('/api/products', protect, requireSeller, (req, res) => {
  const { title, description, price, old_price, category, stock, media, condition } = req.body;
  
  db.run(
    'INSERT INTO products (title, description, price, old_price, category, stock, seller_id, condition) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [title, description, price, old_price, category, stock, req.user.id, condition || 'new'],
    function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        const productId = this.lastID;
        if (media && media.length) {
          let inserted = 0;
          media.forEach((item, idx) => {
            db.run(
              'INSERT INTO product_media (product_id, media_type, media_url, display_order, is_primary) VALUES (?, ?, ?, ?, ?)',
              [productId, item.type, item.url, idx, idx === 0 ? 1 : 0],
              (err) => {
                if (err) console.error('Media insert error:', err);
                inserted++;
                if (inserted === media.length) {
                  res.json({ success: true, product: { id: productId, ...req.body } });
                }
              }
            );
          });
        } else {
          res.json({ success: true, product: { id: productId, ...req.body } });
        }
      }
    }
  );
});

// Update product (with media) – includes condition
app.put('/api/products/:id', protect, requireSeller, (req, res) => {
  const { title, description, price, old_price, category, stock, media, condition } = req.body;
  
  db.get('SELECT seller_id FROM products WHERE id = ?', [req.params.id], (err, product) => {
    if (err || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (product.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.run(`
      UPDATE products SET 
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        old_price = COALESCE(?, old_price),
        category = COALESCE(?, category),
        stock = COALESCE(?, stock),
        condition = COALESCE(?, condition)
      WHERE id = ?
    `, [title, description, price, old_price, category, stock, condition, req.params.id], function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      
      db.run('DELETE FROM product_media WHERE product_id = ?', [req.params.id], () => {
        if (media && media.length) {
          media.forEach((item, idx) => {
            db.run(
              'INSERT INTO product_media (product_id, media_type, media_url, display_order, is_primary) VALUES (?, ?, ?, ?, ?)',
              [req.params.id, item.type, item.url, idx, idx === 0 ? 1 : 0]
            );
          });
        }
        res.json({ success: true, message: 'Product updated' });
      });
    });
  });
});

// Delete product
app.delete('/api/products/:id', protect, requireSeller, (req, res) => {
  db.get('SELECT seller_id FROM products WHERE id = ?', [req.params.id], (err, product) => {
    if (err || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (product.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json({ success: true, message: 'Product deleted' });
      }
    });
  });
});

// Get seller's products (with media and seller verification)
app.get('/api/my-products', protect, requireSeller, (req, res) => {
  db.all(`
    SELECT p.*, u.name as seller_name, u.is_verified_seller as seller_verified
    FROM products p
    JOIN users u ON p.seller_id = u.id
    WHERE p.seller_id = ?
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      if (!rows.length) return res.json({ success: true, products: [] });
      let completed = 0;
      rows.forEach((product) => {
        db.all('SELECT * FROM product_media WHERE product_id = ? ORDER BY display_order, id', [product.id], (err, media) => {
          if (!err) product.media = media || [];
          completed++;
          if (completed === rows.length) {
            res.json({ success: true, products: rows });
          }
        });
      });
    }
  });
});

// Get reviews for a product
app.get('/api/products/:id/reviews', (req, res) => {
  const productId = req.params.id;
  db.all(`
    SELECT r.*, u.name as user_name
    FROM product_reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `, [productId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, reviews: rows });
  });
});

// Add a review (only if user purchased the product)
app.post('/api/products/:id/reviews', protect, (req, res) => {
  const productId = req.params.id;
  const { rating, comment } = req.body;
  
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }
  
  // Check if user purchased this product
  db.get('SELECT * FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.product_id = ? AND o.user_id = ?', [productId, req.user.id], (err, purchase) => {
    if (err || !purchase) {
      return res.status(403).json({ error: 'You can only review products you have purchased' });
    }
    
    // Check if already reviewed
    db.get('SELECT * FROM product_reviews WHERE product_id = ? AND user_id = ?', [productId, req.user.id], (err, existing) => {
      if (existing) {
        return res.status(400).json({ error: 'You have already reviewed this product' });
      }
      
      db.run('INSERT INTO product_reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
        [productId, req.user.id, rating, comment || ''],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          
          // Update product average rating
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

// ==================== COURSE ENDPOINTS ====================
// (unchanged – kept exactly as in original)
app.post('/api/courses', protect, requireSeller, (req, res) => {
  const { title, description, price, old_price, category, level, duration, what_you_learn, media } = req.body;

  db.run(`
    INSERT INTO courses (
      title, description, price, old_price, category, level,
      duration, what_you_learn, instructor_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
  `, [
    title, description, price, old_price || null, category, level,
    duration || 0, what_you_learn || '[]', req.user.id
  ], function(err) {
    if (err) {
      console.error('Course creation error:', err);
      res.status(400).json({ error: err.message });
    } else {
      const courseId = this.lastID;
      if (media && media.length) {
        let inserted = 0;
        media.forEach((item, idx) => {
          db.run(
            `INSERT INTO course_media (course_id, media_type, media_url, display_order, is_primary)
             VALUES (?, ?, ?, ?, ?)`,
            [courseId, item.type, item.url, idx, idx === 0 ? 1 : 0],
            (err) => {
              if (err) console.error('Media insert error:', err);
              inserted++;
              if (inserted === media.length) {
                res.json({ success: true, course: { id: courseId, ...req.body } });
              }
            }
          );
        });
      } else {
        res.json({ success: true, course: { id: courseId, ...req.body } });
      }
    }
  });
});

app.get('/api/courses', (req, res) => {
  db.all(`
    SELECT c.*, u.name as instructor_name, u.id as instructor_id
    FROM courses c
    JOIN users u ON c.instructor_id = u.id
    WHERE c.status = 'published' OR c.status IS NULL
    ORDER BY c.created_at DESC
  `, (err, rows) => {
    if (err) {
      console.error('Courses fetch error:', err);
      return res.status(500).json({ error: err.message });
    }
    if (!rows.length) {
      return res.json({ success: true, courses: [] });
    }
    let completed = 0;
    rows.forEach((course) => {
      db.all(`SELECT * FROM course_media WHERE course_id = ? ORDER BY display_order, id`, [course.id], (err, media) => {
        if (!err) course.media = media || [];
        completed++;
        if (completed === rows.length) {
          res.json({ success: true, courses: rows });
        }
      });
    });
  });
});

app.get('/api/courses/:id', (req, res) => {
  db.get(`
    SELECT c.*, u.name as instructor_name, u.id as instructor_id
    FROM courses c
    JOIN users u ON c.instructor_id = u.id
    WHERE c.id = ?
  `, [req.params.id], (err, course) => {
    if (err) {
      console.error('Course fetch error:', err);
      return res.status(500).json({ error: err.message });
    }
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    db.all(`
      SELECT * FROM course_lessons 
      WHERE course_id = ? 
      ORDER BY "order" ASC, id ASC
    `, [course.id], (err, lessons) => {
      if (err) {
        console.error('Lessons fetch error:', err);
        course.lessons = [];
      } else {
        course.lessons = lessons || [];
      }
      
      db.all(`SELECT * FROM course_media WHERE course_id = ? ORDER BY display_order, id`, [course.id], (err, media) => {
        if (!err) course.media = media || [];
        
        if (req.headers.authorization) {
          const jwt = require('jsonwebtoken');
          try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            db.get(`
              SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?
            `, [decoded.id, course.id], (err, enrollment) => {
              course.isEnrolled = !!enrollment;
              course.progress = enrollment?.progress || 0;
              res.json({ success: true, course });
            });
          } catch(e) {
            course.isEnrolled = false;
            course.progress = 0;
            res.json({ success: true, course });
          }
        } else {
          course.isEnrolled = false;
          course.progress = 0;
          res.json({ success: true, course });
        }
      });
    });
  });
});

app.get('/api/my-courses', protect, requireSeller, (req, res) => {
  db.all(`
    SELECT c.*,
      (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as students_count
    FROM courses c
    WHERE c.instructor_id = ?
    ORDER BY c.created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      if (!rows.length) return res.json({ success: true, courses: [] });
      let completed = 0;
      rows.forEach((course) => {
        db.all(`SELECT * FROM course_media WHERE course_id = ? ORDER BY display_order, id`, [course.id], (err, media) => {
          if (!err) course.media = media || [];
          completed++;
          if (completed === rows.length) {
            res.json({ success: true, courses: rows });
          }
        });
      });
    }
  });
});

app.put('/api/courses/:id', protect, requireSeller, (req, res) => {
  const { title, description, price, old_price, category, level, duration, what_you_learn, media } = req.body;
  const courseId = req.params.id;

  db.get('SELECT instructor_id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err || !course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructor_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    db.run(`
      UPDATE courses SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        old_price = COALESCE(?, old_price),
        category = COALESCE(?, category),
        level = COALESCE(?, level),
        duration = COALESCE(?, duration),
        what_you_learn = COALESCE(?, what_you_learn)
      WHERE id = ?
    `, [title, description, price, old_price, category, level, duration, what_you_learn, courseId], function(err) {
      if (err) return res.status(400).json({ error: err.message });

      db.run('DELETE FROM course_media WHERE course_id = ?', [courseId], () => {
        if (media && media.length) {
          media.forEach((item, idx) => {
            db.run(
              `INSERT INTO course_media (course_id, media_type, media_url, display_order, is_primary)
               VALUES (?, ?, ?, ?, ?)`,
              [courseId, item.type, item.url, idx, idx === 0 ? 1 : 0]
            );
          });
        }
        res.json({ success: true, message: 'Course updated' });
      });
    });
  });
});

app.post('/api/courses/:id/enroll', protect, (req, res) => {
  const courseId = req.params.id;
  const userId = req.user.id;

  db.get('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', 
    [userId, courseId], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (existing) {
      return res.status(400).json({ error: 'Already enrolled' });
    }

    db.run(`
      INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)
    `, [userId, courseId], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        db.run(`UPDATE courses SET students_count = students_count + 1 WHERE id = ?`, [courseId]);
        res.json({ success: true, message: 'Enrolled successfully' });
      }
    });
  });
});

app.put('/api/courses/:courseId/lessons/:lessonId/progress', protect, (req, res) => {
  const { courseId, lessonId } = req.params;
  const { completed } = req.body;
  
  db.run(`
    INSERT OR REPLACE INTO lesson_progress (user_id, course_id, lesson_id, completed)
    VALUES (?, ?, ?, ?)
  `, [req.user.id, courseId, lessonId, completed ? 1 : 0], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
    } else {
      db.get(`
        SELECT COUNT(*) as total_lessons FROM course_lessons WHERE course_id = ?
      `, [courseId], (err, result) => {
        if (err) return;
        
        db.get(`
          SELECT COUNT(*) as completed_lessons FROM lesson_progress 
          WHERE user_id = ? AND course_id = ? AND completed = 1
        `, [req.user.id, courseId], (err, progress) => {
          if (err) return;
          
          const percentComplete = result.total_lessons > 0 
            ? Math.round((progress.completed_lessons / result.total_lessons) * 100) 
            : 0;
          
          db.run(`
            UPDATE enrollments SET progress = ? WHERE user_id = ? AND course_id = ?
          `, [percentComplete, req.user.id, courseId]);
          
          res.json({ success: true });
        });
      });
    }
  });
});

app.post('/api/courses/:courseId/lessons', protect, requireSeller, (req, res) => {
  const { courseId } = req.params;
  const { title, description, duration, order, is_preview } = req.body;
  
  db.get('SELECT instructor_id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.run(`
      INSERT INTO course_lessons (course_id, title, description, duration, "order", is_preview)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [courseId, title, description, duration, order || 0, is_preview || 0], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json({ success: true, lessonId: this.lastID });
      }
    });
  });
});

app.put('/api/courses/:courseId/lessons/:lessonId', protect, requireSeller, (req, res) => {
  const { courseId, lessonId } = req.params;
  const { title, description, duration, order, is_preview } = req.body;
  
  db.get('SELECT instructor_id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err || !course || course.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.run(`
      UPDATE course_lessons SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        duration = COALESCE(?, duration),
        "order" = COALESCE(?, "order"),
        is_preview = COALESCE(?, is_preview)
      WHERE id = ? AND course_id = ?
    `, [title, description, duration, order, is_preview, lessonId, courseId], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json({ success: true });
      }
    });
  });
});

app.delete('/api/courses/:id', protect, requireSeller, (req, res) => {
  db.get('SELECT instructor_id FROM courses WHERE id = ?', [req.params.id], (err, course) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.run('DELETE FROM courses WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        db.run('DELETE FROM course_lessons WHERE course_id = ?', [req.params.id]);
        db.run('DELETE FROM enrollments WHERE course_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Course deleted' });
      }
    });
  });
});

app.delete('/api/courses/:courseId/lessons/:lessonId', protect, requireSeller, (req, res) => {
  const { courseId, lessonId } = req.params;
  
  db.get('SELECT instructor_id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!course || course.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.run('DELETE FROM course_lessons WHERE id = ? AND course_id = ?', [lessonId, courseId], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json({ success: true });
      }
    });
  });
});

// ==================== SERVICE ENDPOINTS ====================
// (unchanged – kept exactly as in original)
app.post('/api/services', protect, requireSeller, (req, res) => {
  const { title, description, price, old_price, category, delivery_time, revisions, image, media } = req.body;

  db.run(`
    INSERT INTO services (
      title, description, price, old_price, category, delivery_time, revisions, image, provider_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
  `, [
    title, description, price, old_price || null, category, delivery_time, revisions || 0, image || '🛠️', req.user.id
  ], function(err) {
    if (err) {
      console.error('Service creation error:', err);
      res.status(400).json({ error: err.message });
    } else {
      const serviceId = this.lastID;
      if (media && media.length) {
        let inserted = 0;
        media.forEach((item, idx) => {
          db.run(
            `INSERT INTO service_media (service_id, media_type, media_url, display_order, is_primary)
             VALUES (?, ?, ?, ?, ?)`,
            [serviceId, item.type, item.url, idx, idx === 0 ? 1 : 0],
            (err) => {
              if (err) console.error('Media insert error:', err);
              inserted++;
              if (inserted === media.length) {
                res.json({ success: true, service: { id: serviceId, ...req.body } });
              }
            }
          );
        });
      } else {
        res.json({ success: true, service: { id: serviceId, ...req.body } });
      }
    }
  });
});

app.get('/api/services', (req, res) => {
  db.all(`
    SELECT s.*, u.name as provider_name
    FROM services s
    JOIN users u ON s.provider_id = u.id
    WHERE s.status = 'published'
    ORDER BY s.created_at DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      if (!rows.length) return res.json({ success: true, services: [] });
      let completed = 0;
      rows.forEach((service) => {
        db.all(`SELECT * FROM service_media WHERE service_id = ? ORDER BY display_order, id`, [service.id], (err, media) => {
          if (!err) service.media = media || [];
          completed++;
          if (completed === rows.length) {
            res.json({ success: true, services: rows });
          }
        });
      });
    }
  });
});

app.get('/api/services/:id', (req, res) => {
  db.get(`
    SELECT s.*, u.name as provider_name, u.email as provider_email, u.id as provider_id
    FROM services s
    JOIN users u ON s.provider_id = u.id
    WHERE s.id = ?
  `, [req.params.id], (err, service) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!service) {
      res.status(404).json({ error: 'Service not found' });
    } else {
      db.all(`SELECT * FROM service_packages WHERE service_id = ? ORDER BY price`, [service.id], (err, packages) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          service.packages = packages || [];
          db.all(`SELECT * FROM service_media WHERE service_id = ? ORDER BY display_order, id`, [service.id], (err, media) => {
            if (!err) service.media = media || [];
            res.json({ success: true, service });
          });
        }
      });
    }
  });
});

app.get('/api/my-services', protect, requireSeller, (req, res) => {
  db.all(`
    SELECT s.*,
      (SELECT COUNT(*) FROM service_orders WHERE service_id = s.id) as orders_count
    FROM services s
    WHERE s.provider_id = ?
    ORDER BY s.created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      if (!rows.length) return res.json({ success: true, services: [] });
      let completed = 0;
      rows.forEach((service) => {
        db.all(`SELECT * FROM service_media WHERE service_id = ? ORDER BY display_order, id`, [service.id], (err, media) => {
          if (!err) service.media = media || [];
          completed++;
          if (completed === rows.length) {
            res.json({ success: true, services: rows });
          }
        });
      });
    }
  });
});

app.put('/api/services/:id', protect, requireSeller, (req, res) => {
  const { title, description, price, old_price, category, delivery_time, revisions, image, media } = req.body;
  const serviceId = req.params.id;

  db.get('SELECT provider_id FROM services WHERE id = ?', [serviceId], (err, service) => {
    if (err || !service) return res.status(404).json({ error: 'Service not found' });
    if (service.provider_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    db.run(`
      UPDATE services SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        old_price = COALESCE(?, old_price),
        category = COALESCE(?, category),
        delivery_time = COALESCE(?, delivery_time),
        revisions = COALESCE(?, revisions),
        image = COALESCE(?, image)
      WHERE id = ?
    `, [title, description, price, old_price, category, delivery_time, revisions, image, serviceId], function(err) {
      if (err) return res.status(400).json({ error: err.message });

      db.run('DELETE FROM service_media WHERE service_id = ?', [serviceId], () => {
        if (media && media.length) {
          media.forEach((item, idx) => {
            db.run(
              `INSERT INTO service_media (service_id, media_type, media_url, display_order, is_primary)
               VALUES (?, ?, ?, ?, ?)`,
              [serviceId, item.type, item.url, idx, idx === 0 ? 1 : 0]
            );
          });
        }
        res.json({ success: true, message: 'Service updated' });
      });
    });
  });
});

app.delete('/api/services/:id', protect, requireSeller, (req, res) => {
  db.get('SELECT provider_id FROM services WHERE id = ?', [req.params.id], (err, service) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    if (service.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.run('DELETE FROM services WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        db.run('DELETE FROM service_packages WHERE service_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Service deleted' });
      }
    });
  });
});

app.post('/api/services/:id/order', protect, (req, res) => {
  const serviceId = req.params.id;
  const { package_name, requirements, price } = req.body;
  const orderNumber = 'SRV-' + Date.now();

  db.get('SELECT provider_id, title FROM services WHERE id = ?', [serviceId], (err, service) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    db.run(`
      INSERT INTO service_orders (order_number, service_id, buyer_id, provider_id, package_name, price, requirements)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [orderNumber, serviceId, req.user.id, service.provider_id, package_name, price, requirements], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        db.run('UPDATE services SET orders_count = orders_count + 1 WHERE id = ?', [serviceId]);
        res.json({ 
          success: true, 
          order: { 
            id: this.lastID, 
            orderNumber,
            status: 'pending'
          } 
        });
      }
    });
  });
});

// ==================== DIGITAL PRODUCT ENDPOINTS ====================
// (unchanged – kept exactly as in original)
const privateDigitalKeyForSeller = (storageReference, sellerId) => {
  try {
    const key = storageService.keyFromReference(storageReference, 'private');
    const ownerPrefix = sellerId === undefined
      ? 'private/digital-files-user-'
      : `private/digital-files-user-${sellerId}/`;
    return key?.startsWith(ownerPrefix) ? key : null;
  } catch (_) {
    return null;
  }
};

const removePrivateDigitalFields = (product) => {
  if (!product) return product;
  delete product.file_url;
  delete product.file_name;
  delete product.file_content_type;
  return product;
};

app.post('/api/digital', protect, requireSeller, (req, res) => {
  const { title, description, price, old_price, category, file_url, file_name, file_content_type, file_size, download_limit, image, media } = req.body;
  const fileKey = privateDigitalKeyForSeller(file_url, req.user.id);
  if (!fileKey) return res.status(400).json({ error: 'Upload a private digital file before publishing this product.' });
  if (media && (!Array.isArray(media) || !media.every((item) => item?.type === 'image' && storageService.publicKeyFromUrl(item.url)))) {
    return res.status(400).json({ error: 'Digital product media must use uploaded public images.' });
  }

  db.run(`
    INSERT INTO digital_products (
      title, description, price, old_price, category, file_type, file_url, file_name, file_content_type, file_size, download_limit, image, seller_id, status
    ) VALUES (?, ?, ?, ?, ?, 'file', ?, ?, ?, ?, ?, ?, ?, 'published')
  `, [
    title, description, price, old_price || null, category, file_url, file_name || path.basename(fileKey), file_content_type || 'application/octet-stream', file_size || '', download_limit || 0, image || '💻', req.user.id
  ], function(err) {
    if (err) {
      console.error('Digital product creation error:', err);
      res.status(400).json({ error: err.message });
    } else {
      const productId = this.lastID;
      if (media && media.length) {
        let inserted = 0;
        media.forEach((item, idx) => {
          db.run(
            `INSERT INTO digital_media (digital_id, media_type, media_url, display_order, is_primary)
             VALUES (?, ?, ?, ?, ?)`,
            [productId, item.type, item.url, idx, idx === 0 ? 1 : 0],
            (err) => {
              if (err) console.error('Media insert error:', err);
              inserted++;
              if (inserted === media.length) {
                res.json({ success: true, product: { id: productId, ...req.body } });
              }
            }
          );
        });
      } else {
        res.json({ success: true, product: { id: productId, ...req.body } });
      }
    }
  });
});

app.get('/api/digital', (req, res) => {
  db.all(`
    SELECT d.*, u.name as seller_name, u.id as seller_id
    FROM digital_products d
    JOIN users u ON d.seller_id = u.id
    WHERE d.status = 'published'
    ORDER BY d.created_at DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      if (!rows.length) return res.json({ success: true, products: [] });
      let completed = 0;
      rows.forEach((product) => {
        db.all(`SELECT * FROM digital_media WHERE digital_id = ? ORDER BY display_order, id`, [product.id], (err, media) => {
          if (!err) product.media = media || [];
          completed++;
          if (completed === rows.length) {
            res.json({ success: true, products: rows.map(removePrivateDigitalFields) });
          }
        });
      });
    }
  });
});

app.get('/api/digital/:id', (req, res) => {
  db.get(`
    SELECT d.*, u.name as seller_name, u.id as seller_id
    FROM digital_products d
    JOIN users u ON d.seller_id = u.id
    WHERE d.id = ?
  `, [req.params.id], (err, product) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!product) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      db.all(`SELECT * FROM digital_media WHERE digital_id = ? ORDER BY display_order, id`, [product.id], (err, media) => {
        if (!err) product.media = media || [];
        res.json({ success: true, product: removePrivateDigitalFields(product) });
      });
    }
  });
});

app.get('/api/my-digital', protect, requireSeller, (req, res) => {
  db.all(`
    SELECT d.*, 
      (SELECT COUNT(*) FROM digital_purchases WHERE product_id = d.id) as sales_count
    FROM digital_products d
    WHERE d.seller_id = ?
    ORDER BY d.created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      if (!rows.length) return res.json({ success: true, products: [] });
      let completed = 0;
      rows.forEach((product) => {
        db.all(`SELECT * FROM digital_media WHERE digital_id = ? ORDER BY display_order, id`, [product.id], (err, media) => {
          if (!err) product.media = media || [];
          completed++;
          if (completed === rows.length) {
            res.json({ success: true, products: rows });
          }
        });
      });
    }
  });
});

app.put('/api/digital/:id', protect, requireSeller, async (req, res) => {
  try {
    const existing = await getDatabaseRow('SELECT * FROM digital_products WHERE id = ? AND seller_id = ?', [req.params.id, req.user.id]);
    if (!existing) return res.status(404).json({ error: 'Digital product not found.' });

    const { title, description, price, old_price, category, file_url, file_name, file_content_type, file_size, download_limit, image, media } = req.body;
    const fileKey = privateDigitalKeyForSeller(file_url || existing.file_url, req.user.id);
    if (!fileKey) return res.status(400).json({ error: 'Upload a private digital file before updating this product.' });
    if (media && (!Array.isArray(media) || !media.every((item) => item?.type === 'image' && storageService.publicKeyFromUrl(item.url)))) {
      return res.status(400).json({ error: 'Digital product media must use uploaded public images.' });
    }

    await runDatabaseStatement(`
      UPDATE digital_products SET
        title = ?, description = ?, price = ?, old_price = ?, category = ?, file_type = 'file',
        file_url = ?, file_name = ?, file_content_type = ?, file_size = ?, download_limit = ?, image = ?
      WHERE id = ?
    `, [
      title, description, price, old_price || null, category,
      file_url || existing.file_url,
      file_name || existing.file_name || path.basename(fileKey),
      file_content_type || existing.file_content_type || 'application/octet-stream',
      file_size || existing.file_size || '', download_limit || 0, image || existing.image,
      existing.id,
    ]);

    if (media) {
      await runDatabaseStatement('DELETE FROM digital_media WHERE digital_id = ?', [existing.id]);
      for (const [index, item] of media.entries()) {
        await runDatabaseStatement(
          'INSERT INTO digital_media (digital_id, media_type, media_url, display_order, is_primary) VALUES (?, ?, ?, ?, ?)',
          [existing.id, item.type, item.url, index, index === 0 ? 1 : 0]
        );
      }
    }
    return res.json({ success: true, message: 'Digital product updated.' });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'digital_product_update_failed', error: error.message }));
    return res.status(500).json({ error: 'Unable to update the digital product.' });
  }
});

app.delete('/api/digital/:id', protect, requireSeller, (req, res) => {
  db.get('SELECT seller_id FROM digital_products WHERE id = ?', [req.params.id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (product.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.run('DELETE FROM digital_products WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        db.run('DELETE FROM digital_media WHERE digital_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Product deleted' });
      }
    });
  });
});

app.post('/api/digital/:id/purchase', protect, (req, res) => {
  return res.status(410).json({ error: 'This legacy purchase endpoint is disabled. Request access and wait for the seller to approve it.' });
});

app.get('/api/my-purchases', protect, (req, res) => {
  db.all(`
    SELECT 
      p.id, p.order_number, p.product_id, p.seller_id, p.price, p.file_type,
      p.download_limit, p.download_count, p.last_downloaded_at, p.status, p.created_at,
      d.title, 
      d.image, 
      d.file_type, 
      d.file_name,
      d.download_limit,
      d.file_size,
      d.seller_id
    FROM digital_purchases p
    JOIN digital_products d ON p.product_id = d.id
    WHERE p.buyer_id = ?
    ORDER BY p.created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, purchases: rows });
    }
  });
});

const downloadDigitalProduct = async (req, res) => {
  try {
    const purchase = await getDatabaseRow(`
      SELECT dp.id, dp.download_limit, dp.download_count, d.file_url, d.file_name, d.file_content_type
      FROM digital_purchases dp
      JOIN digital_products d ON d.id = dp.product_id
      WHERE dp.product_id = ? AND dp.buyer_id = ?
      ORDER BY dp.id DESC
      LIMIT 1
    `, [req.params.id, req.user.id]);
    if (!purchase) return res.status(403).json({ error: 'You do not have download access to this product.' });
    if (purchase.download_limit > 0 && purchase.download_count >= purchase.download_limit) {
      return res.status(403).json({ error: 'Your download limit has been reached.' });
    }
    const key = privateDigitalKeyForSeller(purchase.file_url, undefined);
    if (!key) {
      return res.status(410).json({ error: 'This digital file must be migrated to private storage before it can be downloaded.' });
    }
    const reserved = await runDatabaseStatement(
      `UPDATE digital_purchases
       SET download_count = download_count + 1, last_downloaded_at = CURRENT_TIMESTAMP
       WHERE id = ? AND (download_limit = 0 OR download_count < download_limit)`,
      [purchase.id]
    );
    if (reserved.changes !== 1) return res.status(403).json({ error: 'Your download limit has been reached.' });
    await streamPrivateAttachment(res, key, purchase.file_name || `digital-${req.params.id}`, purchase.file_content_type || 'application/octet-stream');
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'digital_download_failed', error: error.message }));
    if (!res.headersSent) return res.status(500).json({ error: 'Unable to prepare this download.' });
  }
};

app.get('/api/digital/:id/download', protect, downloadDigitalProduct);

// ==================== BOOKING ENDPOINTS ====================
// (unchanged – kept exactly as in original)
app.post('/api/bookings', protect, requireSeller, (req, res) => {
  const { title, description, price, old_price, category, duration, location_type, location, max_participants, available_days, image, media } = req.body;

  db.run(`
    INSERT INTO bookings (
      title, description, price, old_price, category, duration, location_type, location,
      max_participants, available_days, image, provider_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
  `, [
    title, description, price, old_price || null, category, duration || 60, location_type || 'online',
    location || '', max_participants || 1, available_days || '[]', image || '📅', req.user.id
  ], function(err) {
    if (err) {
      console.error('Booking creation error:', err);
      res.status(400).json({ error: err.message });
    } else {
      const bookingId = this.lastID;
      if (media && media.length) {
        let inserted = 0;
        media.forEach((item, idx) => {
          db.run(
            `INSERT INTO booking_media (booking_id, media_type, media_url, display_order, is_primary)
             VALUES (?, ?, ?, ?, ?)`,
            [bookingId, item.type, item.url, idx, idx === 0 ? 1 : 0],
            (err) => {
              if (err) console.error('Media insert error:', err);
              inserted++;
              if (inserted === media.length) {
                res.json({ success: true, booking: { id: bookingId, ...req.body } });
              }
            }
          );
        });
      } else {
        res.json({ success: true, booking: { id: bookingId, ...req.body } });
      }
    }
  });
});

app.get('/api/bookings', (req, res) => {
  db.all(`
    SELECT b.*, u.name as provider_name, u.id as provider_id
    FROM bookings b
    JOIN users u ON b.provider_id = u.id
    WHERE b.status = 'published'
    ORDER BY b.created_at DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      if (!rows.length) return res.json({ success: true, bookings: [] });
      let completed = 0;
      rows.forEach((booking) => {
        db.all(`SELECT * FROM booking_media WHERE booking_id = ? ORDER BY display_order, id`, [booking.id], (err, media) => {
          if (!err) booking.media = media || [];
          completed++;
          if (completed === rows.length) {
            res.json({ success: true, bookings: rows });
          }
        });
      });
    }
  });
});

app.get('/api/bookings/:id', (req, res) => {
  db.get(`
    SELECT b.*, u.name as provider_name, u.email as provider_email, u.id as provider_id
    FROM bookings b
    JOIN users u ON b.provider_id = u.id
    WHERE b.id = ?
  `, [req.params.id], (err, booking) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
    } else {
      db.all(`SELECT * FROM booking_media WHERE booking_id = ? ORDER BY display_order, id`, [booking.id], (err, media) => {
        if (!err) booking.media = media || [];
        res.json({ success: true, booking });
      });
    }
  });
});

app.get('/api/my-bookings', protect, requireSeller, (req, res) => {
  db.all(`
    SELECT b.*,
      (SELECT COUNT(*) FROM appointments WHERE booking_id = b.id) as appointments_count
    FROM bookings b
    WHERE b.provider_id = ?
    ORDER BY b.created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      if (!rows.length) return res.json({ success: true, bookings: [] });
      let completed = 0;
      rows.forEach((booking) => {
        db.all(`SELECT * FROM booking_media WHERE booking_id = ? ORDER BY display_order, id`, [booking.id], (err, media) => {
          if (!err) booking.media = media || [];
          completed++;
          if (completed === rows.length) {
            res.json({ success: true, bookings: rows });
          }
        });
      });
    }
  });
});

app.put('/api/bookings/:id', protect, requireSeller, (req, res) => {
  const { title, description, price, old_price, category, duration, location_type, location, max_participants, available_days, image, media } = req.body;
  const bookingId = req.params.id;

  db.get('SELECT provider_id FROM bookings WHERE id = ?', [bookingId], (err, booking) => {
    if (err || !booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.provider_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    db.run(`
      UPDATE bookings SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        old_price = COALESCE(?, old_price),
        category = COALESCE(?, category),
        duration = COALESCE(?, duration),
        location_type = COALESCE(?, location_type),
        location = COALESCE(?, location),
        max_participants = COALESCE(?, max_participants),
        available_days = COALESCE(?, available_days),
        image = COALESCE(?, image)
      WHERE id = ?
    `, [title, description, price, old_price, category, duration, location_type, location, max_participants, available_days, image, bookingId], function(err) {
      if (err) return res.status(400).json({ error: err.message });

      db.run('DELETE FROM booking_media WHERE booking_id = ?', [bookingId], () => {
        if (media && media.length) {
          media.forEach((item, idx) => {
            db.run(
              `INSERT INTO booking_media (booking_id, media_type, media_url, display_order, is_primary)
               VALUES (?, ?, ?, ?, ?)`,
              [bookingId, item.type, item.url, idx, idx === 0 ? 1 : 0]
            );
          });
        }
        res.json({ success: true, message: 'Booking updated' });
      });
    });
  });
});

app.delete('/api/bookings/:id', protect, requireSeller, (req, res) => {
  db.get('SELECT provider_id FROM bookings WHERE id = ?', [req.params.id], (err, booking) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    db.run('DELETE FROM bookings WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        db.run('DELETE FROM booking_slots WHERE booking_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Booking deleted' });
      }
    });
  });
});

app.post('/api/bookings/:id/book', protect, (req, res) => {
  const bookingId = req.params.id;
  const { appointment_date, appointment_time, notes } = req.body;
  const bookingNumber = 'BKG-' + Date.now();

  db.get('SELECT * FROM bookings WHERE id = ?', [bookingId], (err, booking) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    db.run(`
      INSERT INTO appointments (booking_number, booking_id, client_id, provider_id, appointment_date, appointment_time, duration, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [bookingNumber, bookingId, req.user.id, booking.provider_id, appointment_date, appointment_time, booking.duration, notes || ''], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        db.run('UPDATE bookings SET bookings_count = bookings_count + 1 WHERE id = ?', [bookingId]);
        res.json({ 
          success: true, 
          appointment: { 
            id: this.lastID, 
            bookingNumber,
            status: 'pending'
          } 
        });
      }
    });
  });
});

app.get('/api/my-appointments', protect, (req, res) => {
  db.all(`
    SELECT a.*, b.title, b.image, b.duration, u.name as provider_name
    FROM appointments a
    JOIN bookings b ON a.booking_id = b.id
    JOIN users u ON a.provider_id = u.id
    WHERE a.client_id = ?
    ORDER BY a.appointment_date DESC
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, appointments: rows });
    }
  });
});

app.get('/api/provider-appointments', protect, requireSeller, (req, res) => {
  db.all(`
    SELECT a.*, b.title, u.name as client_name, u.email as client_email, u.phone as client_phone
    FROM appointments a
    JOIN bookings b ON a.booking_id = b.id
    JOIN users u ON a.client_id = u.id
    WHERE a.provider_id = ?
    ORDER BY a.appointment_date DESC
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, appointments: rows });
    }
  });
});

// ==================== CART ENDPOINTS ====================
app.get('/api/cart', protect, (req, res) => {
  db.all(`
    SELECT 
      c.product_id,
      c.quantity,
      p.title,
      p.price,
      p.image
    FROM cart c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true, cart: rows });
    }
  });
});

app.post('/api/cart', protect, (req, res) => {
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
    
    db.run(`
      INSERT INTO cart (user_id, product_id, quantity)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = quantity + ?
    `, [req.user.id, product_id, quantity, quantity], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json({ success: true, message: 'Added to cart' });
      }
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
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
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
      db.all(`
        SELECT oi.*, p.title, p.image
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id], (err, items) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          order.items = items;
          if (order.shipping_address) {
            try {
              order.shipping_address = JSON.parse(order.shipping_address);
            } catch(e) {
              order.shipping_address = {};
            }
          }
          res.json({ success: true, order });
        }
      });
    }
  });
});

app.put('/api/cart/:productId', protect, (req, res) => {
  const { quantity } = req.body;
  
  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: 'Quantity must be at least 1' });
  }
  
  db.run(`
    UPDATE cart SET quantity = ?
    WHERE user_id = ? AND product_id = ?
  `, [quantity, req.user.id, req.params.productId], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Item not found in cart' });
    } else {
      res.json({ success: true, message: 'Cart updated' });
    }
  });
});

app.delete('/api/cart/:productId', protect, (req, res) => {
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

app.post('/api/orders', protect, async (req, res) => {
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
                  const platformCommissionRate = 0.10;
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
                    const platformCommissionRate = 0.10;
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
app.patch('/api/users/update-me', protect, (req, res) => {
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
      db.get('SELECT id, name, email, phone, bio, city, country, role, seller_type, profilePicture, is_verified_seller, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json({ success: true, data: { user } });
        }
      });
    }
  });
});

app.patch('/api/users/update-password', protect, async (req, res) => {
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
    
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
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
app.patch('/api/users/update-seller-type', protect, (req, res) => {
  const { sellerType } = req.body;
  const valid = ['product', 'course', 'service', 'digital', 'booking'];
  if (!valid.includes(sellerType)) {
    return res.status(400).json({ error: 'Invalid seller type' });
  }
  db.run('UPDATE users SET seller_type = ?, role = "seller" WHERE id = ?', [sellerType, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT id, name, email, phone, bio, city, country, role, seller_type, profilePicture, is_verified_seller, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, data: { user } });
    });
  });
});

app.get('/api/users/:id', (req, res) => {
  db.get('SELECT id, name, email, phone, bio, city, country, seller_type, profilePicture, is_verified_seller, created_at FROM users WHERE id = ?', [req.params.id], (err, user) => {
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

// ==================== DIGITAL REQUESTS (Buyer Contact Seller) ====================
app.post('/api/digital/:id/request', protect, (req, res) => {
  const { phone, email } = req.body;
  const digitalId = req.params.id;
  const buyerId = req.user.id;
  db.run(
    'INSERT INTO digital_requests (digital_id, buyer_id, buyer_phone, buyer_email, status) VALUES (?, ?, ?, ?, ?)',
    [digitalId, buyerId, phone, email, 'pending'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Request sent. Seller will contact you soon.' });
    }
  );
});

app.get('/api/seller/digital-requests', protect, requireSeller, (req, res) => {
  db.all(`
    SELECT dr.*, d.title as product_title, u.name as buyer_name, u.email as buyer_email
    FROM digital_requests dr
    JOIN digital_products d ON dr.digital_id = d.id
    JOIN users u ON dr.buyer_id = u.id
    WHERE d.seller_id = ?
    ORDER BY dr.created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, requests: rows });
  });
});

app.patch('/api/seller/digital-requests/:id/complete', protect, requireSeller, async (req, res) => {
  try {
    const request = await getDatabaseRow(`
      SELECT dr.id, dr.digital_id, dr.buyer_id, d.seller_id, d.price, d.file_url, d.file_type, d.download_limit
      FROM digital_requests dr
      JOIN digital_products d ON d.id = dr.digital_id
      WHERE dr.id = ? AND d.seller_id = ?
    `, [req.params.id, req.user.id]);
    if (!request) return res.status(404).json({ error: 'Digital request not found.' });
    if (!privateDigitalKeyForSeller(request.file_url, request.seller_id)) {
      return res.status(409).json({ error: 'The product file must be migrated to private storage before access can be granted.' });
    }

    await runDatabaseStatement('UPDATE digital_requests SET status = ? WHERE id = ?', ['completed', request.id]);
    const existingPurchase = await getDatabaseRow(
      'SELECT id FROM digital_purchases WHERE product_id = ? AND buyer_id = ? ORDER BY id DESC LIMIT 1',
      [request.digital_id, request.buyer_id]
    );
    if (!existingPurchase) {
      await runDatabaseStatement(`
        INSERT INTO digital_purchases (order_number, product_id, buyer_id, seller_id, price, download_url, file_type, download_limit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `DIG-${Date.now()}-${request.id}`,
        request.digital_id,
        request.buyer_id,
        request.seller_id,
        request.price,
        request.file_url,
        request.file_type,
        request.download_limit,
      ]);
      await runDatabaseStatement('UPDATE digital_products SET downloads = downloads + 1 WHERE id = ?', [request.digital_id]);
    }
    return res.json({ success: true, message: 'Access granted. The buyer can now download the private file.' });
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'digital_access_grant_failed', error: error.message }));
    return res.status(500).json({ error: 'Unable to grant download access.' });
  }
});

app.get('/api/digital/:id/can-download', protect, (req, res) => {
  const digitalId = req.params.id;
  const buyerId = req.user.id;
  db.get('SELECT id FROM digital_purchases WHERE product_id = ? AND buyer_id = ? ORDER BY id DESC LIMIT 1', [digitalId, buyerId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, canDownload: !!row });
  });
});

app.patch('/api/:type/:id/status', protect, requireSeller, (req, res) => {
  const { type, id } = req.params;
  const { status } = req.body;
  const validTypes = ['products', 'courses', 'services', 'digital', 'bookings'];
  const validStatus = ['published', 'ended'];
  if (!validTypes.includes(type) || !validStatus.includes(status)) {
    return res.status(400).json({ error: 'Invalid type or status' });
  }
  let ownerField = '';
  if (type === 'products') ownerField = 'seller_id';
  else if (type === 'courses') ownerField = 'instructor_id';
  else if (type === 'services') ownerField = 'provider_id';
  else if (type === 'digital') ownerField = 'seller_id';
  else if (type === 'bookings') ownerField = 'provider_id';
  db.get(`SELECT ${ownerField} FROM ${type} WHERE id = ?`, [id], (err, item) => {
    if (err || !item) return res.status(404).json({ error: `${type.slice(0,-1)} not found` });
    if (item[ownerField] !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    db.run(`UPDATE ${type} SET status = ? WHERE id = ?`, [status, id], (err) => {
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
app.post('/api/services/:serviceId/packages', protect, requireSeller, (req, res) => {
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

app.put('/api/services/:serviceId/packages/:packageId', protect, requireSeller, (req, res) => {
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

app.delete('/api/services/:serviceId/packages/:packageId', protect, requireSeller, (req, res) => {
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
        u.is_verified_seller as other_user_verified,
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

const AIService = require('./services/aiService');

// ==================== AI ENDPOINTS ====================
app.get('/api/ai/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });
  
  try {
    const parsed = await AIService.parseSearchQuery(q);
    res.json({ success: true, parsed });
  } catch (error) {
    console.error('AI search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/generate-description', protect, async (req, res) => {
  const { title, category, keywords } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  
  try {
    const description = await AIService.generateDescription(title, category, keywords || '');
    res.json({ success: true, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/suggest-price', protect, async (req, res) => {
  const { title, category, similarPrices } = req.body;
  
  try {
    const price = await AIService.suggestPrice(title, category, similarPrices || []);
    res.json({ success: true, suggestedPrice: price });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/detect-fraud', protect, async (req, res) => {
  const { title, description, price, category } = req.body;
  
  try {
    const result = await AIService.detectFraud(title, description, price, category);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/ask', async (req, res) => {
  const { productTitle, productDescription, question } = req.body;
  
  try {
    const answer = await AIService.answerQuestion(productTitle, productDescription, question);
    res.json({ success: true, answer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ai/admin-report', protect, requireAdmin, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  
  try {
    db.get('SELECT COUNT(*) as totalProducts FROM products WHERE status = "published"', [], (err, total) => {
      db.get('SELECT COUNT(*) as newProducts FROM products WHERE created_at > datetime("now", "-7 days")', [], (err, newP) => {
        db.get('SELECT SUM(total) as totalSales FROM orders WHERE created_at > datetime("now", "-7 days")', [], (err, sales) => {
          db.all('SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY count DESC LIMIT 3', [], (err, cats) => {
            db.get('SELECT COUNT(*) as lowStock FROM products WHERE stock < 5 AND stock > 0', [], async (err, lowStock) => {
              const stats = {
                totalProducts: total?.totalProducts || 0,
                newProducts: newP?.newProducts || 0,
                totalSales: sales?.totalSales || 0,
                topCategories: cats.map(c => `${c.category} (${c.count})`).join(', '),
                lowStockCount: lowStock?.lowStock || 0
              };
              
              const report = await AIService.generateAdminReport(stats);
              res.json({ success: true, report, stats });
            });
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

app.post('/api/wallet/withdraw', protect, async (req, res) => {
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

app.get('/api/admin/withdrawals', protect, requireAdmin, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
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
app.patch('/api/admin/withdrawals/:id/process', protect, requireAdmin, async (req, res) => {
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

app.patch('/api/admin/withdrawals/:id/process', protect, requireAdmin, async (req, res) => {
  const { action, notes, providerReference } = req.body || {};
  try {
    const result = await WalletService.processWithdrawal({
      withdrawalId: req.params.id,
      action,
      adminId: req.user.id,
      notes,
      providerReference,
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
app.post('/api/orders/:id/cancel', protect, async (req, res) => {
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

app.post('/api/orders/:id/cancel', protect, async (req, res) => {
  try {
    await WalletService.cancelUnpaidOrder(req.params.id, req.user.id);
    return res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post('/api/orders/:id/refund-request', protect, async (req, res) => {
  try {
    const result = await WalletService.requestRefund({
      orderId: req.params.id,
      requesterId: req.user.id,
      reason: req.body?.reason,
    });
    return res.status(result.alreadyProcessed ? 200 : 201).json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/api/admin/refunds', protect, requireAdmin, async (req, res) => {
  try {
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

app.patch('/api/admin/refunds/:id/complete', protect, requireAdmin, async (req, res) => {
  try {
    const result = await WalletService.completeRefund({
      refundId: req.params.id,
      adminId: req.user.id,
      providerReference: req.body?.providerReference,
      notes: req.body?.notes,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/api/admin/finance/reconciliation', protect, requireAdmin, async (req, res) => {
  try {
    const [negativeWallets, withdrawalMismatches, cmiTransactionMismatches,
      paidOrdersWithoutGatewayRecord, paidOrdersWithoutEscrow, releasedEscrowMismatches] = await Promise.all([
      WalletService.all(`
        SELECT user_id, available_balance, escrow_balance, pending_withdrawal
        FROM wallets
        WHERE available_balance < 0 OR escrow_balance < 0 OR pending_withdrawal < 0
      `),
      WalletService.all(`
        SELECT w.user_id, w.pending_withdrawal,
               ROUND(COALESCE(SUM(r.amount), 0), 2) AS expected_pending_withdrawal
        FROM wallets w
        LEFT JOIN withdrawal_requests r ON r.user_id = w.user_id AND r.status = 'pending'
        GROUP BY w.user_id
        HAVING ABS(ROUND(w.pending_withdrawal - COALESCE(SUM(r.amount), 0), 2)) >= 0.01
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

app.get('/api/orders/:id/history', protect, (req, res) => {
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
    SELECT DISTINCT o.*, u.name as buyer_name
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    JOIN users u ON o.user_id = u.id
    WHERE p.seller_id = ?
    ORDER BY o.created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, orders: rows });
  });
});

const getDatabaseRow = (query, values) => new Promise((resolve, reject) => {
  db.get(query, values, (error, row) => (error ? reject(error) : resolve(row)));
});

const getDatabaseRows = (query, values) => new Promise((resolve, reject) => {
  db.all(query, values, (error, rows) => (error ? reject(error) : resolve(rows)));
});

const runDatabaseStatement = (query, values) => new Promise((resolve, reject) => {
  db.run(query, values, function callback(error) {
    if (error) return reject(error);
    return resolve({ lastID: this.lastID, changes: this.changes });
  });
});

const streamPrivateAttachment = async (res, key, filename, contentType) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', 'sandbox');
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
  await pipeline(await storageService.getPrivateStream(key), res);
};

app.get('/api/orders/:id/invoice', protect, async (req, res) => {
  try {
    const order = await getDatabaseRow('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not allowed to access this invoice.' });
    }

    let invoice = await getDatabaseRow('SELECT storage_reference, filename FROM order_invoices WHERE order_id = ?', [order.id]);
    let storageKey = invoice && storageService.keyFromReference(invoice.storage_reference, 'private');

    if (!storageKey) {
      const [user, items] = await Promise.all([
        getDatabaseRow('SELECT * FROM users WHERE id = ?', [order.user_id]),
        getDatabaseRows(`
          SELECT oi.*, COALESCE(NULLIF(oi.product_title, ''), p.title) AS title
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = ?
        `, [order.id]),
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
app.post('/api/products/:id/review', protect, async (req, res) => {
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
app.get('/api/admin/stats', protect, requireAdmin, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
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

app.get('/api/admin/recent-orders', protect, requireAdmin, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  
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

// ==================== SELLER VERIFICATION ADMIN ENDPOINTS ====================
app.get('/api/admin/unverified-sellers', protect, requireAdmin, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  
  db.all(`
    SELECT id, name, email, phone, seller_type, created_at
    FROM users
    WHERE role = 'seller' AND (is_verified_seller = 0 OR is_verified_seller IS NULL)
    ORDER BY created_at ASC
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, sellers: rows });
  });
});

app.put('/api/admin/verify-seller/:userId', protect, requireAdmin, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  
  const { userId } = req.params;
  const { verified } = req.body;
  if (typeof verified !== 'boolean') {
    return res.status(400).json({ error: 'verified must be boolean' });
  }
  
  db.run('UPDATE users SET is_verified_seller = ? WHERE id = ?', [verified ? 1 : 0, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: `Seller verification set to ${verified}` });
  });
});

// ==================== COD ADMIN PANEL ====================
app.get('/api/admin/cod-orders', protect, requireAdmin, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
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
app.post('/api/admin/cod-orders/:id/confirm', protect, requireAdmin, async (req, res) => {
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

app.post('/api/admin/cod-orders/:id/confirm', protect, requireAdmin, async (req, res) => {
  try {
    const result = await WalletService.settleCodOrder(req.params.id, req.user.id);
    return res.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      message: result.alreadyProcessed ? 'COD order was already settled' : 'Cash collected and seller credited',
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// ==================== CMI PAYMENT ENDPOINTS ====================
const CmiPaymentService = require('./services/cmiPaymentService');

app.post('/api/payment/cmi/initiate', protect, async (req, res) => {
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
      return res.send('OK');
    }
    await CmiPaymentService.processFailedPayment(oid, params);
    return res.send('FAIL');
  } catch (error) {
    console.error('CMI callback processing failed:', error.message);
    return res.status(500).send('ERROR');
  }
});

app.get('/api/payment/status/:orderId', protect, async (req, res) => {
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
app.post('/api/products/:id/offers', protect, (req, res) => {
  const productId = req.params.id;
  const buyerId = req.user.id;
  const { amount, message } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid offer amount is required' });
  }

  db.get('SELECT seller_id, price, condition FROM products WHERE id = ?', [productId], (err, product) => {
    if (err || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (product.condition !== 'joutiya') {
      return res.status(400).json({ error: 'Offers are only allowed on Joutiya items' });
    }
    if (amount > product.price) {
      return res.status(400).json({ error: `Offer cannot exceed the original price of ${product.price} MAD` });
    }

    db.get('SELECT id FROM product_offers WHERE product_id = ? AND buyer_id = ? AND status = "pending"',
      [productId, buyerId], (err, existing) => {
        if (existing) {
          return res.status(400).json({ error: 'You already have a pending offer for this product' });
        }

        db.run(`
          INSERT INTO product_offers (product_id, buyer_id, seller_id, amount, message, status)
          VALUES (?, ?, ?, ?, ?, 'pending')
        `, [productId, buyerId, product.seller_id, amount, message || ''], function(err) {
          if (err) {
            console.error('Offer insert error:', err);
            return res.status(500).json({ error: 'Failed to submit offer' });
          }
          res.json({
            success: true,
            message: `Offer of ${amount} MAD sent to seller`,
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

app.patch('/api/seller/offers/:offerId/respond', protect, requireSeller, (req, res) => {
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






// Configure multer for document uploads (accept images and PDFs)
const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 10, fieldSize: 64 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) cb(null, true);
    else cb(new Error('Only images and PDF files are allowed'));
  }
});

const validateVerificationDocument = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  if (!['national_id', 'passport'].includes(req.body.document_type)) {
    return res.status(400).json({ error: 'document_type must be national_id or passport.' });
  }

  try {
    if (req.file.mimetype === 'application/pdf') {
      if (req.file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Invalid PDF document.');
      req.verificationDocument = { extension: 'pdf', contentType: 'application/pdf' };
    } else {
      const metadata = await sharp(req.file.buffer, { failOn: 'error' }).metadata();
      if (!['jpeg', 'png', 'webp', 'gif'].includes(metadata.format)) throw new Error('Invalid image document.');
      const imageTypes = {
        jpeg: { extension: 'jpg', contentType: 'image/jpeg' },
        png: { extension: 'png', contentType: 'image/png' },
        webp: { extension: 'webp', contentType: 'image/webp' },
        gif: { extension: 'gif', contentType: 'image/gif' },
      };
      req.verificationDocument = imageTypes[metadata.format];
    }
    return next();
  } catch (error) {
    return res.status(400).json({ error: 'Verification document content is invalid.' });
  }
};

app.post('/api/seller/upload-verification', protect, requireSeller, documentUpload.single('document'), validateVerificationDocument, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  let key;
  try {
    key = storageService.createKey('private', 'verification', req.verificationDocument.extension);
    await storageService.put(key, req.file.buffer, {
      contentType: req.verificationDocument.contentType,
      cacheControl: 'private, no-store',
    });
    const documentUrl = storageService.reference(key);
    await new Promise((resolve, reject) => db.run(
      `INSERT INTO verification_documents (user_id, document_url, document_type, status)
       VALUES (?, ?, ?, 'pending')
       ON CONFLICT(user_id) DO UPDATE SET
         document_url = excluded.document_url,
         document_type = excluded.document_type,
         status = 'pending',
         updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, documentUrl, req.body.document_type],
      (error) => (error ? reject(error) : resolve())
    ));
    return res.json({ success: true, message: 'Verification document uploaded. Awaiting admin review.' });
  } catch (error) {
    if (key) storageService.delete(key).catch(() => {});
    console.error(JSON.stringify({ level: 'error', event: 'verification_document_upload_failed', error: error.message }));
    return res.status(500).json({ error: 'Failed to store verification document.' });
  }
});







app.get('/api/seller/verification-status', protect, requireSeller, (req, res) => {
  db.get('SELECT status, document_type, created_at, updated_at FROM verification_documents WHERE user_id = ?', [req.user.id], (err, doc) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, verification: doc || null });
  });
});





app.get('/api/admin/pending-verifications', protect, requireAdmin, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  db.all(`
    SELECT v.id, v.user_id, v.document_type, v.status, v.created_at, v.updated_at,
           u.name as user_name, u.email as user_email, u.seller_type
    FROM verification_documents v
    JOIN users u ON v.user_id = u.id
    WHERE v.status = 'pending'
    ORDER BY v.created_at ASC
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, verifications: rows });
  });
});

app.get('/api/admin/verification-documents/:docId/file', protect, requireAdmin, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  db.get('SELECT document_url, document_type FROM verification_documents WHERE id = ?', [req.params.docId], async (error, document) => {
    if (error) return res.status(500).json({ error: 'Unable to retrieve the verification document.' });
    if (!document?.document_url) return res.status(404).json({ error: 'Verification document not found.' });

    let documentKey;
    try {
      documentKey = storageService.keyFromReference(document.document_url, 'private');
    } catch (_) {
      return res.status(404).json({ error: 'Verification document not found.' });
    }
    if (documentKey) {
      try {
        const extension = path.extname(documentKey).toLowerCase();
        const contentTypes = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', 'sandbox');
        res.setHeader('Content-Type', contentTypes[extension] || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="verification-${req.params.docId}${extension}"`);
        await pipeline(await storageService.getPrivateStream(documentKey), res);
      } catch (streamError) {
        console.error(JSON.stringify({ level: 'error', event: 'verification_document_download_failed', error: streamError.message }));
        if (!res.headersSent) return res.status(404).json({ error: 'Verification document not found.' });
      }
      return;
    }

    const filename = path.basename(document.document_url);
    const verificationDir = path.join(__dirname, 'uploads', 'verification');
    const documentPath = path.join(verificationDir, filename);
    if (!documentPath.startsWith(verificationDir + path.sep) || !fs.existsSync(documentPath)) {
      return res.status(404).json({ error: 'Verification document not found.' });
    }

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', 'sandbox');
    res.setHeader('Content-Disposition', 'attachment');
    return res.sendFile(documentPath);
  });
});







app.patch('/api/admin/verify-document/:docId', protect, requireAdmin, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { docId } = req.params;
  const { action, admin_notes } = req.body; // action: 'approve' or 'reject'
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
  
  db.get('SELECT user_id FROM verification_documents WHERE id = ?', [docId], (err, doc) => {
    if (err || !doc) return res.status(404).json({ error: 'Document not found' });
    
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    db.run(
      `UPDATE verification_documents SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newStatus, admin_notes || null, req.user.id, docId],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        if (action === 'approve') {
          // Set user as verified seller
          db.run('UPDATE users SET is_verified_seller = 1 WHERE id = ?', [doc.user_id]);
        } else {
          // Optionally keep unverified
          db.run('UPDATE users SET is_verified_seller = 0 WHERE id = ?', [doc.user_id]);
        }
        res.json({ success: true, message: `Document ${action}d` });
      }
    );
  });
});









// ==================== 404 HANDLER ====================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', requestId: req.requestId });
});

app.use(errorHandler);

module.exports = app;
