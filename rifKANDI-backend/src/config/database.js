const { getDatabaseEngine } = require('./postgresDatabase');

if (getDatabaseEngine() === 'postgres') {
  module.exports = require('./postgresDatabase').createPostgresDatabase();
} else {
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
// A Render /tmp database is erased whenever the service restarts. Production
// must therefore explicitly use the mounted persistent disk.
const dbPath = process.env.DATABASE_PATH || (
  isProduction
    ? '/var/data/rifkandi.db'
    : path.join(__dirname, '../../rifkandi.db')
);

let resolveDatabaseReady;
let rejectDatabaseReady;
const databaseReady = new Promise((resolve, reject) => {
  resolveDatabaseReady = resolve;
  rejectDatabaseReady = reject;
});

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    rejectDatabaseReady(err);
    console.error('❌ Database error:', err.message);
  } else {
    console.log('✅ SQLite Database connected!');
    console.log(`📁 Database: ${dbPath}`);
  }
});

// SQLite disables foreign keys by default. WAL and a busy timeout make this
// single-node database safer under concurrent web requests.
db.configure('busyTimeout', 5000);

// Create tables
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA synchronous = NORMAL');
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'buyer',
      seller_type TEXT,
      seller_started_at DATETIME,
      bio TEXT,
      city TEXT,
      country TEXT DEFAULT 'Morocco',
      profilePicture TEXT DEFAULT '',
      is_verified BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run("ALTER TABLE users ADD COLUMN profilePicture TEXT DEFAULT ''", (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('Note: profilePicture column might already exist');
    } else if (!err) {
      console.log('✅ Added profilePicture column to users table');
    }
  });

  db.run('ALTER TABLE users ADD COLUMN seller_started_at DATETIME', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('Note: seller_started_at column might already exist');
    } else if (!err) {
      console.log('Seller withdrawal eligibility column added to users table');
    }
  });

  db.run(`
    UPDATE users
    SET seller_started_at = created_at
    WHERE role = 'seller' AND seller_started_at IS NULL
  `, (err) => {
    if (err) console.error('Error backfilling seller_started_at:', err.message);
  });

  // Products table (with condition column)
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      old_price REAL,
      delivery_fee REAL NOT NULL DEFAULT 50,
      seller_id INTEGER,
      image TEXT,
      category TEXT,
      stock INTEGER DEFAULT 0,
      sold INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      views INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      condition TEXT DEFAULT 'new',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_id) REFERENCES users(id)
    )
  `);

  // Add condition column if it doesn't exist (for existing databases)
  db.run("ALTER TABLE products ADD COLUMN condition TEXT DEFAULT 'new'", (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('Note: condition column might already exist');
    } else if (!err) {
      console.log('✅ Added condition column to products table');
    }
  });

  // Product Media table
  db.run(`
    CREATE TABLE IF NOT EXISTS product_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      media_type TEXT CHECK(media_type IN ('image', 'video')),
      media_url TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      is_primary BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `, (err) => { if (err) console.error('Error creating product_media:', err); else console.log('✅ product_media table ready'); });

  // Product Reviews table
  db.run(`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => { if (err) console.error('Error creating product_reviews:', err); else console.log('✅ product_reviews table ready'); });

  // Cart table
  db.run(`
    CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE(user_id, product_id)
    )
  `);

  // Orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      total REAL NOT NULL,
      order_type TEXT NOT NULL DEFAULT 'product',
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      payment_status TEXT DEFAULT 'pending',
      shipping_address TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Order items table
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Favorites table
  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      item_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, item_id, item_type)
    )
  `);

  // Email verifications table
  db.run(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Server-side browser sessions. Refresh and CSRF values are hashed so a
  // database disclosure cannot be used to impersonate an active browser.
  db.run(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      refresh_token_hash TEXT NOT NULL UNIQUE,
      csrf_token_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME,
      revocation_reason TEXT,
      replaced_by TEXT,
      user_agent_hash TEXT,
      ip_hash TEXT,
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => { if (err) console.error('Error creating auth_sessions:', err.message); });
  db.run('CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active ON auth_sessions(user_id, revoked_at, expires_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON auth_sessions(expires_at)');
  db.run("DELETE FROM auth_sessions WHERE expires_at < datetime('now', '-7 days')");

  // Invoices are immutable snapshots. The object reference is private and is
  // only streamed after the buyer/admin authorization check in app.js.
  db.run(`
    CREATE TABLE IF NOT EXISTS order_invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE,
      storage_reference TEXT NOT NULL,
      filename TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `, (err) => { if (err) console.error('Error creating order_invoices:', err); });

  db.run(`
    CREATE TABLE IF NOT EXISTS pending_registrations (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS google_verifications (
      email TEXT PRIMARY KEY,
      google_sub TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Phone codes are hashed, expire quickly, and are retained only long enough
  // to defend against repeated guesses and SMS abuse.
  db.run(`
    CREATE TABLE IF NOT EXISTS phone_verification_challenges (
      phone TEXT PRIMARY KEY,
      purpose TEXT NOT NULL CHECK (purpose IN ('register', 'login')),
      code_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      send_count INTEGER NOT NULL DEFAULT 1,
      window_started_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => { if (err) console.error('Error creating phone verification challenges:', err.message); });
  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique
    ON users(phone)
    WHERE phone IS NOT NULL AND phone <> ''
  `, (err) => {
    if (err) console.error('Error creating unique user phone index:', err.message);
  });
  db.run("ALTER TABLE products ADD COLUMN delivery_fee REAL NOT NULL DEFAULT 50", () => {});

  // Password resets table
  db.run(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Courses table
  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      old_price REAL,
      instructor_id INTEGER NOT NULL,
      image TEXT,
      category TEXT,
      level TEXT DEFAULT 'beginner',
      duration INTEGER DEFAULT 0,
      students_count INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      what_you_learn TEXT,
      status TEXT DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instructor_id) REFERENCES users(id)
    )
  `);

  // Course Media table
  db.run(`
    CREATE TABLE IF NOT EXISTS course_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      media_type TEXT CHECK(media_type IN ('image', 'video')),
      media_url TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      is_primary BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
  `, (err) => { if (err) console.error('Error creating course_media:', err); else console.log('✅ course_media table ready'); });

  // Course lessons table
  db.run(`
    CREATE TABLE IF NOT EXISTS course_lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      video_url TEXT,
      duration INTEGER DEFAULT 0,
      is_preview BOOLEAN DEFAULT 0,
      "order" INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id)
    )
  `);

  // Lesson progress table
  db.run(`
    CREATE TABLE IF NOT EXISTS lesson_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      lesson_id INTEGER NOT NULL,
      completed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (lesson_id) REFERENCES course_lessons(id),
      UNIQUE(user_id, course_id, lesson_id)
    )
  `);

  // Enrollments table
  db.run(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      progress INTEGER DEFAULT 0,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (course_id) REFERENCES courses(id),
      UNIQUE(user_id, course_id)
    )
  `);

  // Services table
  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      old_price REAL,
      provider_id INTEGER NOT NULL,
      image TEXT,
      category TEXT,
      delivery_time TEXT,
      revisions INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      orders_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (provider_id) REFERENCES users(id)
    )
  `);

  // Service Media table
  db.run(`
    CREATE TABLE IF NOT EXISTS service_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      media_type TEXT CHECK(media_type IN ('image', 'video')),
      media_url TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      is_primary BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    )
  `, (err) => { if (err) console.error('Error creating service_media:', err); else console.log('✅ service_media table ready'); });

  // Service packages table
  db.run(`
    CREATE TABLE IF NOT EXISTS service_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      delivery_time TEXT,
      revisions INTEGER,
      features TEXT,
      FOREIGN KEY (service_id) REFERENCES services(id)
    )
  `);

  // Service orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS service_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE,
      service_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      provider_id INTEGER NOT NULL,
      package_name TEXT,
      price REAL,
      requirements TEXT,
      status TEXT DEFAULT 'pending',
      delivered_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (service_id) REFERENCES services(id),
      FOREIGN KEY (buyer_id) REFERENCES users(id),
      FOREIGN KEY (provider_id) REFERENCES users(id)
    )
  `);

  // Digital Products table
  db.run(`
    CREATE TABLE IF NOT EXISTS digital_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      old_price REAL,
      seller_id INTEGER NOT NULL,
      image TEXT,
      category TEXT,
      file_type TEXT DEFAULT 'url',
      file_url TEXT,
      file_name TEXT,
      file_content_type TEXT,
      file_size TEXT,
      file_size_bytes INTEGER,
      file_sha256 TEXT,
      download_limit INTEGER DEFAULT 0,
      downloads INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      reviews_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_id) REFERENCES users(id)
    )
  `);
  db.run('ALTER TABLE digital_products ADD COLUMN file_name TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) console.error('Error adding digital file name:', err.message);
  });

  db.run('ALTER TABLE digital_products ADD COLUMN file_content_type TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) console.error('Error adding digital file content type:', err.message);
  });
  db.run('ALTER TABLE digital_products ADD COLUMN file_size_bytes INTEGER', (err) => {
    if (err && !err.message.includes('duplicate column name')) console.error('Error adding digital file byte size:', err.message);
  });
  db.run('ALTER TABLE digital_products ADD COLUMN file_sha256 TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) console.error('Error adding digital file checksum:', err.message);
  });

  // Digital Media table
  db.run(`
    CREATE TABLE IF NOT EXISTS digital_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      digital_id INTEGER NOT NULL,
      media_type TEXT CHECK(media_type IN ('image', 'video')),
      media_url TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      is_primary BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (digital_id) REFERENCES digital_products(id) ON DELETE CASCADE
    )
  `, (err) => { if (err) console.error('Error creating digital_media:', err); else console.log('✅ digital_media table ready'); });

  // Digital Purchases table
  db.run(`
    CREATE TABLE IF NOT EXISTS digital_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE,
      product_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      price REAL,
      download_url TEXT,
      file_type TEXT,
      download_limit INTEGER DEFAULT 0,
      download_count INTEGER NOT NULL DEFAULT 0,
      last_downloaded_at DATETIME,
      download_file_name TEXT,
      download_file_content_type TEXT,
      download_file_size TEXT,
      download_file_size_bytes INTEGER,
      download_file_sha256 TEXT,
      granted_at DATETIME,
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES digital_products(id),
      FOREIGN KEY (buyer_id) REFERENCES users(id),
      FOREIGN KEY (seller_id) REFERENCES users(id)
    )
  `);
  db.run('ALTER TABLE digital_purchases ADD COLUMN download_count INTEGER NOT NULL DEFAULT 0', (err) => {
    if (err && !err.message.includes('duplicate column name')) console.error('Error adding digital download count:', err.message);
  });
  db.run('ALTER TABLE digital_purchases ADD COLUMN last_downloaded_at DATETIME', (err) => {
    if (err && !err.message.includes('duplicate column name')) console.error('Error adding digital download timestamp:', err.message);
  });
  for (const [column, type] of [
    ['download_file_name', 'TEXT'],
    ['download_file_content_type', 'TEXT'],
    ['download_file_size', 'TEXT'],
    ['download_file_size_bytes', 'INTEGER'],
    ['download_file_sha256', 'TEXT'],
    ['granted_at', 'DATETIME'],
  ]) {
    db.run(`ALTER TABLE digital_purchases ADD COLUMN ${column} ${type}`, (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error(`Error adding digital purchase ${column}:`, err.message);
    });
  }

  // Digital Files table
  db.run(`
    CREATE TABLE IF NOT EXISTS digital_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size TEXT,
      "order" INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES digital_products(id)
    )
  `);

  // Digital requests table
  db.run(`
    CREATE TABLE IF NOT EXISTS digital_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      digital_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      buyer_phone TEXT,
      buyer_email TEXT,
      status TEXT DEFAULT 'pending',
      buyer_message TEXT,
      decision_reason TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (digital_id) REFERENCES digital_products(id) ON DELETE CASCADE,
      FOREIGN KEY (buyer_id) REFERENCES users(id)
    )
  `, (err) => { if (err) console.error('Error creating digital_requests:', err); else console.log('✅ digital_requests table ready'); });

  for (const [column, type] of [
    ['buyer_message', 'TEXT'],
    ['decision_reason', 'TEXT'],
    ['updated_at', 'DATETIME'],
  ]) {
    db.run(`ALTER TABLE digital_requests ADD COLUMN ${column} ${type}`, (err) => {
      if (err && !err.message.includes('duplicate column name')) console.error(`Error adding digital request ${column}:`, err.message);
    });
  }

  // Messages table for chat
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      product_id INTEGER,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
  `, (err) => { if (err) console.error('Error creating messages:', err); else console.log('✅ messages table ready'); });

  // Bookings table
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      old_price REAL,
      provider_id INTEGER NOT NULL,
      image TEXT,
      category TEXT,
      duration INTEGER DEFAULT 60,
      location_type TEXT DEFAULT 'online',
      location TEXT,
      max_participants INTEGER DEFAULT 1,
      available_days TEXT,
      rating REAL DEFAULT 0,
      reviews_count INTEGER DEFAULT 0,
      bookings_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      timezone TEXT NOT NULL DEFAULT 'Africa/Casablanca',
      buffer_minutes INTEGER NOT NULL DEFAULT 0,
      minimum_notice_minutes INTEGER NOT NULL DEFAULT 60,
      booking_window_days INTEGER NOT NULL DEFAULT 60,
      max_bookings_per_day INTEGER,
      cancellation_notice_hours INTEGER NOT NULL DEFAULT 24,
      confirmation_mode TEXT NOT NULL DEFAULT 'instant',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (provider_id) REFERENCES users(id)
    )
  `);

  // Booking Media table
  db.run(`
    CREATE TABLE IF NOT EXISTS booking_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      media_type TEXT CHECK(media_type IN ('image', 'video')),
      media_url TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      is_primary BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    )
  `, (err) => { if (err) console.error('Error creating booking_media:', err); else console.log('✅ booking_media table ready'); });

  // Booking slots table
  db.run(`
    CREATE TABLE IF NOT EXISTS booking_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      is_available BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS booking_availability_windows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      weekday INTEGER NOT NULL CHECK(weekday BETWEEN 0 AND 6),
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      UNIQUE(booking_id, weekday, start_time, end_time)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS booking_date_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      date DATE NOT NULL,
      is_available BOOLEAN NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      UNIQUE(booking_id, date)
    )
  `);

  // Booking appointments table
  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_number TEXT UNIQUE,
      booking_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL,
      provider_id INTEGER NOT NULL,
      slot_id INTEGER,
      appointment_date DATE NOT NULL,
      appointment_time TIME NOT NULL,
      duration INTEGER DEFAULT 60,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      starts_at DATETIME,
      ends_at DATETIME,
      booking_timezone TEXT DEFAULT 'Africa/Casablanca',
      guest_count INTEGER NOT NULL DEFAULT 1,
      idempotency_key TEXT UNIQUE,
      cancelled_at DATETIME,
      cancelled_by INTEGER,
      cancellation_reason TEXT,
      confirmed_at DATETIME,
      completed_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (client_id) REFERENCES users(id),
      FOREIGN KEY (provider_id) REFERENCES users(id),
      FOREIGN KEY (slot_id) REFERENCES booking_slots(id)
    )
  `);

  // Fraud reports table
  db.run(`
    CREATE TABLE IF NOT EXISTS fraud_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      risk_score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      flags TEXT,
      ai_analysis TEXT,
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    )
  `, (err) => { if (err) console.error('Error creating fraud_reports:', err); else console.log('✅ fraud_reports table ready'); });

  // ==================== WALLET & ESCROW TABLES ====================

  // User wallets table
  db.run(`
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      available_balance REAL DEFAULT 0,
      escrow_balance REAL DEFAULT 0,
      pending_withdrawal REAL DEFAULT 0,
      total_earned REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => { if (err) console.error('Error creating wallets:', err); else console.log('✅ wallets table ready'); });

  // Escrow transactions (holds buyer money until delivery)
  db.run(`
    CREATE TABLE IF NOT EXISTS escrow_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      commission REAL DEFAULT 0,
      seller_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      release_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (buyer_id) REFERENCES users(id),
      FOREIGN KEY (seller_id) REFERENCES users(id)
    )
  `, (err) => { if (err) console.error('Error creating escrow_transactions:', err); else console.log('✅ escrow_transactions table ready'); });

  // Withdrawal requests
  db.run(`
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT DEFAULT 'bank_transfer',
      status TEXT DEFAULT 'pending',
      bank_details TEXT,
      processed_by INTEGER,
      processed_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (processed_by) REFERENCES users(id)
    )
  `, (err) => { if (err) console.error('Error creating withdrawal_requests:', err); else console.log('✅ withdrawal_requests table ready'); });

  // Transaction history (ledger)
  db.run(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_before REAL NOT NULL,
      balance_after REAL NOT NULL,
      reference_id INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => { if (err) console.error('Error creating wallet_transactions:', err); else console.log('✅ wallet_transactions table ready'); });

  // Payment splits table (for transparent accounting)
  db.run(`
    CREATE TABLE IF NOT EXISTS payment_splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      party_type TEXT NOT NULL,   -- 'seller', 'platform', 'delivery', 'gateway'
      party_id INTEGER,           -- seller_id (if type 'seller'), null otherwise
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending', -- 'pending', 'completed'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `, (err) => { if (err) console.error('Error creating payment_splits:', err); else console.log('✅ payment_splits table ready'); });

  // A COD fulfilment represents the physical parcel and its money lifecycle.
  // It is deliberately separate from the order: a seller can confirm and hand
  // over a parcel, finance records the carrier collection, and the seller is
  // credited only after the carrier remittance is reconciled.
  db.run(`
    CREATE TABLE IF NOT EXISTS cod_fulfillments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('product', 'findit')),
      status TEXT NOT NULL DEFAULT 'pending_confirmation'
        CHECK(status IN ('pending_confirmation', 'confirmed', 'shipped', 'delivered', 'refused', 'returned', 'cancelled')),
      settlement_status TEXT NOT NULL DEFAULT 'awaiting_delivery'
        CHECK(settlement_status IN ('awaiting_delivery', 'awaiting_remittance', 'settled', 'void')),
      gross_amount REAL NOT NULL,
      gross_amount_minor INTEGER NOT NULL,
      customer_delivery_fee REAL NOT NULL DEFAULT 0,
      customer_delivery_fee_minor INTEGER NOT NULL DEFAULT 0,
      expected_cod_amount REAL NOT NULL,
      expected_cod_amount_minor INTEGER NOT NULL,
      commission REAL NOT NULL,
      commission_minor INTEGER NOT NULL,
      seller_amount REAL NOT NULL,
      seller_amount_minor INTEGER NOT NULL,
      carrier_name TEXT,
      tracking_number TEXT,
      collected_amount REAL,
      collected_amount_minor INTEGER,
      carrier_delivery_fee REAL,
      carrier_delivery_fee_minor INTEGER,
      carrier_return_fee REAL,
      carrier_return_fee_minor INTEGER,
      remitted_amount REAL,
      remitted_amount_minor INTEGER,
      carrier_collection_reference TEXT,
      carrier_settlement_reference TEXT,
      collection_note TEXT,
      settlement_note TEXT,
      exception_note TEXT,
      commission_payment_status TEXT NOT NULL DEFAULT 'not_due',
      commission_reference TEXT,
      commission_due_at DATETIME,
      commission_payment_reference TEXT,
      commission_payment_note TEXT,
      commission_submitted_at DATETIME,
      commission_verified_at DATETIME,
      commission_verified_by INTEGER,
      confirmed_at DATETIME,
      dispatched_at DATETIME,
      delivered_at DATETIME,
      refused_at DATETIME,
      returned_at DATETIME,
      cancelled_at DATETIME,
      settled_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (seller_id) REFERENCES users(id),
      UNIQUE(order_id, seller_id)
    )
  `, (err) => { if (err) console.error('Error creating cod_fulfillments:', err); else console.log('✅ cod_fulfillments table ready'); });

  // Initialize wallet for existing users
  db.run(`
    INSERT OR IGNORE INTO wallets (user_id, available_balance, escrow_balance, pending_withdrawal, total_earned)
    SELECT id, 0, 0, 0, 0 FROM users
  `, (err) => { if (err) console.error('Error initializing wallets:', err); else console.log('✅ Wallets initialized for existing users'); });

  // Order status history table
  db.run(`
    CREATE TABLE IF NOT EXISTS order_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `, (err) => { if (err) console.error('Error creating order_status_history:', err); else console.log('✅ order_status_history table ready'); });

  // Add product_title and product_image columns to order_items
  db.run("ALTER TABLE order_items ADD COLUMN product_title TEXT", (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('Note: product_title column might already exist');
    } else if (!err) {
      console.log('✅ Added product_title column to order_items');
    }
  });

  db.run("ALTER TABLE order_items ADD COLUMN product_image TEXT", (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('Note: product_image column might already exist');
    } else if (!err) {
      console.log('✅ Added product_image column to order_items');
    }
  });

  // Email logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      type TEXT,
      status TEXT,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => { if (err) console.error('Error creating email_logs:', err); else console.log('✅ email_logs table ready'); });

  // Payment transactions table (for CMI and other gateways)
  db.run(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      cmi_oid TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_data TEXT,
      error_message TEXT,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `, (err) => { if (err) console.error('Error creating payment_transactions:', err); else console.log('✅ payment_transactions table ready'); });

  // ==================== FINANCIAL INTEGRITY TABLES ====================
  // The legacy wallet_transactions table remains for UI compatibility. New
  // movements are also recorded here with immutable, idempotent ledger keys.
  db.run(`
    CREATE TABLE IF NOT EXISTS wallet_ledger_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idempotency_key TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      account TEXT NOT NULL CHECK (account IN ('available_balance', 'escrow_balance', 'pending_withdrawal')),
      amount REAL NOT NULL,
      balance_before REAL NOT NULL,
      balance_after REAL NOT NULL,
      entry_type TEXT NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => { if (err) console.error('Error creating wallet_ledger_entries:', err); else console.log('✅ wallet ledger table ready'); });

  db.run(`
    CREATE TABLE IF NOT EXISTS financial_operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_key TEXT NOT NULL UNIQUE,
      operation_type TEXT NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => { if (err) console.error('Error creating financial_operations:', err); else console.log('✅ financial operations table ready'); });

  // A checkout retry must return the first created order rather than reserve
  // stock or charge a wallet a second time.
  db.run(`
    CREATE TABLE IF NOT EXISTS checkout_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      idempotency_key TEXT NOT NULL,
      order_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, idempotency_key),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `, (err) => { if (err) console.error('Error creating checkout_requests:', err); else console.log('✅ checkout idempotency table ready'); });

  // CMI refunds are confirmed manually using the gateway's payout reference;
  // this prevents an application action from claiming a card refund happened.
  db.run(`
    CREATE TABLE IF NOT EXISTS refund_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE,
      requested_by INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reason TEXT,
      provider_reference TEXT,
      processed_by INTEGER,
      processed_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (requested_by) REFERENCES users(id),
      FOREIGN KEY (processed_by) REFERENCES users(id)
    )
  `, (err) => { if (err) console.error('Error creating refund_requests:', err); else console.log('✅ refund requests table ready'); });

  // FINDit is a separate buyer-request marketplace. Its requests and offers
  // are not product catalogue listings. An accepted offer creates a normal
  // COD order with an immutable FINDit financial snapshot.
  db.run(`
    CREATE TABLE IF NOT EXISTS findit_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_number TEXT NOT NULL UNIQUE,
      buyer_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      city TEXT NOT NULL,
      preferred_condition TEXT NOT NULL DEFAULT 'any',
      budget_max REAL NOT NULL DEFAULT 0,
      budget_max_minor INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (buyer_id) REFERENCES users(id)
    )
  `, (err) => { if (err) console.error('Error creating findit_requests:', err); });
  db.run(`
    CREATE TABLE IF NOT EXISTS findit_request_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      media_url TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES findit_requests(id) ON DELETE CASCADE
    )
  `, (err) => { if (err) console.error('Error creating findit_request_media:', err); });
  db.run(`
    CREATE TABLE IF NOT EXISTS findit_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      price_minor INTEGER NOT NULL,
      delivery_fee REAL NOT NULL DEFAULT 0,
      delivery_fee_minor INTEGER NOT NULL DEFAULT 0,
      condition TEXT NOT NULL,
      estimated_delivery_days INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(request_id, seller_id),
      FOREIGN KEY (request_id) REFERENCES findit_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (seller_id) REFERENCES users(id)
    )
  `, (err) => { if (err) console.error('Error creating findit_offers:', err); });
  db.run(`
    CREATE TABLE IF NOT EXISTS findit_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE,
      request_id INTEGER NOT NULL,
      offer_id INTEGER NOT NULL UNIQUE,
      seller_id INTEGER NOT NULL,
      item_title TEXT NOT NULL,
      item_description TEXT NOT NULL,
      item_condition TEXT NOT NULL,
      price REAL NOT NULL,
      price_minor INTEGER NOT NULL,
      delivery_fee REAL NOT NULL DEFAULT 0,
      delivery_fee_minor INTEGER NOT NULL DEFAULT 0,
      commission REAL NOT NULL,
      commission_minor INTEGER NOT NULL,
      seller_amount REAL NOT NULL,
      seller_amount_minor INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (request_id) REFERENCES findit_requests(id),
      FOREIGN KEY (offer_id) REFERENCES findit_offers(id),
      FOREIGN KEY (seller_id) REFERENCES users(id)
    )
  `, (err) => { if (err) console.error('Error creating findit_orders:', err); });
  db.run(`
    CREATE TABLE IF NOT EXISTS findit_checkout_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      idempotency_key TEXT NOT NULL,
      order_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, idempotency_key),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `, (err) => { if (err) console.error('Error creating findit_checkout_requests:', err); });

  db.run('ALTER TABLE withdrawal_requests ADD COLUMN request_key TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) console.error('Error adding withdrawal request key:', err.message);
  });

  db.run('ALTER TABLE withdrawal_requests ADD COLUMN provider_reference TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) console.error('Error adding withdrawal provider reference:', err.message);
  });
  db.run('ALTER TABLE orders ADD COLUMN payment_details TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) console.error('Error adding order payment details:', err.message);
  });
  db.run("ALTER TABLE orders ADD COLUMN order_type TEXT NOT NULL DEFAULT 'product'", (err) => {
    if (err && !err.message.includes('duplicate column name')) console.error('Error adding order type:', err.message);
  });
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawal_requests_request_key ON withdrawal_requests(request_key)', (err) => {
    if (err) console.error('Error creating withdrawal request key index:', err.message);
  });
  db.run('CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_created ON wallet_ledger_entries(user_id, created_at DESC)', (err) => {
    if (err) console.error('Error creating wallet ledger index:', err.message);
  });
  db.run('CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_status ON payment_transactions(order_id, status)', (err) => {
    if (err) console.error('Error creating payment transaction index:', err.message);
  });
  db.run('CREATE INDEX IF NOT EXISTS idx_escrow_order_status ON escrow_transactions(order_id, status)', (err) => {
    if (err) console.error('Error creating escrow index:', err.message);
  });

  // Security and financial audit entries are append-only. Each entry is also
  // chained by an HMAC in AuditService, so a missing or altered row is
  // detectable during an integrity check.
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occurred_at TEXT NOT NULL,
      actor_user_id INTEGER,
      actor_role TEXT,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT,
      outcome TEXT NOT NULL,
      request_id TEXT,
      ip_address TEXT,
      user_agent_hash TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      previous_hash TEXT,
      entry_hash TEXT NOT NULL UNIQUE
    )
  `, (err) => { if (err) console.error('Error creating audit_logs:', err.message); });
  db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_occurred ON audit_logs(actor_user_id, occurred_at DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_occurred ON audit_logs(resource_type, resource_id, occurred_at DESC)');
  db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_action_occurred ON audit_logs(action, occurred_at DESC)');
  db.run(`
    CREATE TRIGGER IF NOT EXISTS prevent_audit_log_updates
    BEFORE UPDATE ON audit_logs
    BEGIN
      SELECT RAISE(ABORT, 'audit logs are immutable');
    END
  `);

  const bookingProtocolColumns = [
    ['bookings', 'timezone', "TEXT NOT NULL DEFAULT 'Africa/Casablanca'"],
    ['bookings', 'buffer_minutes', 'INTEGER NOT NULL DEFAULT 0'],
    ['bookings', 'minimum_notice_minutes', 'INTEGER NOT NULL DEFAULT 60'],
    ['bookings', 'booking_window_days', 'INTEGER NOT NULL DEFAULT 60'],
    ['bookings', 'max_bookings_per_day', 'INTEGER'],
    ['bookings', 'cancellation_notice_hours', 'INTEGER NOT NULL DEFAULT 24'],
    ['bookings', 'confirmation_mode', "TEXT NOT NULL DEFAULT 'instant'"],
    ['appointments', 'starts_at', 'DATETIME'],
    ['appointments', 'ends_at', 'DATETIME'],
    ['appointments', 'booking_timezone', "TEXT DEFAULT 'Africa/Casablanca'"],
    ['appointments', 'guest_count', 'INTEGER NOT NULL DEFAULT 1'],
    ['appointments', 'idempotency_key', 'TEXT'],
    ['appointments', 'cancelled_at', 'DATETIME'],
    ['appointments', 'cancelled_by', 'INTEGER'],
    ['appointments', 'cancellation_reason', 'TEXT'],
    ['appointments', 'confirmed_at', 'DATETIME'],
    ['appointments', 'completed_at', 'DATETIME'],
    ['appointments', 'updated_at', 'DATETIME'],
  ];
  for (const [table, column, definition] of bookingProtocolColumns) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error(`Error adding ${column} to ${table}:`, err.message);
      }
    });
  }
  db.run("UPDATE bookings SET timezone = 'Africa/Casablanca' WHERE timezone IS NULL OR timezone = ''");
  db.run("UPDATE bookings SET confirmation_mode = 'instant' WHERE confirmation_mode IS NULL OR confirmation_mode = ''");
  db.run("UPDATE appointments SET booking_timezone = 'Africa/Casablanca' WHERE booking_timezone IS NULL OR booking_timezone = ''");

  // `CREATE TABLE IF NOT EXISTS` does not evolve an existing local SQLite
  // table. Keep older development databases compatible before backfilling the
  // centime mirror below; this is intentionally additive and never changes
  // existing financial records.
  const codFulfillmentCompatibilityColumns = [
    ['remitted_amount', 'REAL'],
    ['commission_payment_status', "TEXT NOT NULL DEFAULT 'not_due'"],
    ['commission_reference', 'TEXT'],
    ['commission_due_at', 'DATETIME'],
    ['commission_payment_reference', 'TEXT'],
    ['commission_payment_note', 'TEXT'],
    ['commission_submitted_at', 'DATETIME'],
    ['commission_verified_at', 'DATETIME'],
    ['commission_verified_by', 'INTEGER'],
  ];
  for (const [column, definition] of codFulfillmentCompatibilityColumns) {
    db.run(`ALTER TABLE cod_fulfillments ADD COLUMN ${column} ${definition}`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error(`Error adding ${column} to cod_fulfillments:`, err.message);
      }
    });
  }

  db.run(`
    CREATE TRIGGER IF NOT EXISTS prevent_audit_log_deletes
    BEFORE DELETE ON audit_logs
    BEGIN
      SELECT RAISE(ABORT, 'audit logs are immutable');
    END
  `);

  // Monetary values are stored as integer centimes (minor MAD units). The
  // decimal columns remain only as a short-term API/display compatibility
  // mirror while application calculations use the *_minor columns below.
  const minorColumns = [
    ['products', 'price_minor', 'price'],
    ['products', 'old_price_minor', 'old_price'],
    ['products', 'delivery_fee_minor', 'delivery_fee'],
    ['orders', 'total_minor', 'total'],
    ['order_items', 'price_minor', 'price'],
    ['courses', 'price_minor', 'price'],
    ['courses', 'old_price_minor', 'old_price'],
    ['services', 'price_minor', 'price'],
    ['services', 'old_price_minor', 'old_price'],
    ['service_packages', 'price_minor', 'price'],
    ['service_orders', 'price_minor', 'price'],
    ['digital_products', 'price_minor', 'price'],
    ['digital_products', 'old_price_minor', 'old_price'],
    ['digital_purchases', 'price_minor', 'price'],
    ['bookings', 'price_minor', 'price'],
    ['bookings', 'old_price_minor', 'old_price'],
    ['wallets', 'available_balance_minor', 'available_balance'],
    ['wallets', 'escrow_balance_minor', 'escrow_balance'],
    ['wallets', 'pending_withdrawal_minor', 'pending_withdrawal'],
    ['wallets', 'total_earned_minor', 'total_earned'],
    ['escrow_transactions', 'amount_minor', 'amount'],
    ['escrow_transactions', 'commission_minor', 'commission'],
    ['escrow_transactions', 'seller_amount_minor', 'seller_amount'],
    ['withdrawal_requests', 'amount_minor', 'amount'],
    ['wallet_transactions', 'amount_minor', 'amount'],
    ['wallet_transactions', 'balance_before_minor', 'balance_before'],
    ['wallet_transactions', 'balance_after_minor', 'balance_after'],
    ['payment_splits', 'amount_minor', 'amount'],
    ['cod_fulfillments', 'gross_amount_minor', 'gross_amount'],
    ['cod_fulfillments', 'customer_delivery_fee_minor', 'customer_delivery_fee'],
    ['cod_fulfillments', 'expected_cod_amount_minor', 'expected_cod_amount'],
    ['cod_fulfillments', 'commission_minor', 'commission'],
    ['cod_fulfillments', 'seller_amount_minor', 'seller_amount'],
    ['cod_fulfillments', 'collected_amount_minor', 'collected_amount'],
    ['cod_fulfillments', 'carrier_delivery_fee_minor', 'carrier_delivery_fee'],
    ['cod_fulfillments', 'carrier_return_fee_minor', 'carrier_return_fee'],
    ['cod_fulfillments', 'remitted_amount_minor', 'remitted_amount'],
    ['payment_transactions', 'amount_minor', 'amount'],
    ['wallet_ledger_entries', 'amount_minor', 'amount'],
    ['wallet_ledger_entries', 'balance_before_minor', 'balance_before'],
    ['wallet_ledger_entries', 'balance_after_minor', 'balance_after'],
    ['refund_requests', 'amount_minor', 'amount'],
  ];
  for (const [table, minorColumn, decimalColumn] of minorColumns) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${minorColumn} INTEGER`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error(`Error adding ${minorColumn} to ${table}:`, err.message);
      }
    });
    db.run(
      `UPDATE ${table}
       SET ${minorColumn} = CAST(ROUND(${decimalColumn} * 100) AS INTEGER)
       WHERE ${minorColumn} IS NULL AND ${decimalColumn} IS NOT NULL`,
      (err) => {
        if (err) console.error(`Error backfilling ${minorColumn} on ${table}:`, err.message);
      }
    );
  }
  db.run('CREATE INDEX IF NOT EXISTS idx_products_price_minor ON products(price_minor)');
  db.run('CREATE INDEX IF NOT EXISTS idx_orders_total_minor ON orders(total_minor)');
  db.run('CREATE INDEX IF NOT EXISTS idx_payment_transactions_amount_minor ON payment_transactions(amount_minor)');

  // These indexes match the live catalogue, media, purchase, appointment, and
  // buyer-history queries. They make the current single-node SQLite service
  // materially faster without changing API responses or business behavior.
  const queryIndexes = [
    ['idx_products_catalog_created', 'products(status, created_at DESC)'],
    ['idx_products_catalog_condition_created', 'products(status, condition, created_at DESC)'],
    ['idx_courses_catalog_created', 'courses(status, created_at DESC)'],
    ['idx_services_catalog_created', 'services(status, created_at DESC)'],
    ['idx_digital_products_catalog_created', 'digital_products(status, created_at DESC)'],
    ['idx_bookings_catalog_created', 'bookings(status, created_at DESC)'],
    ['idx_orders_buyer_created', 'orders(user_id, created_at DESC)'],
    ['idx_digital_purchases_buyer_created', 'digital_purchases(buyer_id, created_at DESC)'],
    ['idx_digital_purchases_product_buyer', 'digital_purchases(product_id, buyer_id, id DESC)'],
    ['idx_digital_requests_product_buyer_status', 'digital_requests(digital_id, buyer_id, status, id DESC)'],
    ['idx_appointments_client_date', 'appointments(client_id, appointment_date DESC)'],
    ['idx_appointments_provider_date', 'appointments(provider_id, appointment_date DESC)'],
    ['idx_appointments_provider_schedule', 'appointments(provider_id, appointment_date, appointment_time, status)'],
    ['idx_appointments_booking_schedule', 'appointments(booking_id, appointment_date, appointment_time, status)'],
    ['idx_booking_availability_windows_schedule', 'booking_availability_windows(booking_id, weekday, start_time)'],
    ['idx_booking_date_overrides_schedule', 'booking_date_overrides(booking_id, date)'],
    ['idx_product_media_listing', 'product_media(product_id, display_order, id)'],
    ['idx_course_media_listing', 'course_media(course_id, display_order, id)'],
    ['idx_service_media_listing', 'service_media(service_id, display_order, id)'],
    ['idx_digital_media_listing', 'digital_media(digital_id, display_order, id)'],
    ['idx_booking_media_listing', 'booking_media(booking_id, display_order, id)'],
    ['idx_findit_requests_catalog', 'findit_requests(status, expires_at, created_at DESC)'],
    ['idx_findit_requests_buyer', 'findit_requests(buyer_id, created_at DESC)'],
    ['idx_findit_request_media_request', 'findit_request_media(request_id, display_order, id)'],
    ['idx_findit_offers_request_status', 'findit_offers(request_id, status, created_at DESC)'],
    ['idx_findit_offers_seller', 'findit_offers(seller_id, updated_at DESC)'],
    ['idx_findit_orders_seller', 'findit_orders(seller_id, order_id)'],
    ['idx_cod_fulfillments_seller_status', 'cod_fulfillments(seller_id, status, created_at DESC)'],
    ['idx_cod_fulfillments_finance', 'cod_fulfillments(settlement_status, status, created_at ASC)'],
    ['idx_cod_fulfillments_order', 'cod_fulfillments(order_id, seller_id)'],
    ['idx_cod_fulfillments_tracking', 'cod_fulfillments(carrier_name, tracking_number)'],
    ['idx_cod_fulfillments_commission_due', 'cod_fulfillments(seller_id, commission_payment_status, commission_due_at)'],
  ];
  for (const [name, definition] of queryIndexes) {
    db.run(`CREATE INDEX IF NOT EXISTS ${name} ON ${definition}`, (err) => {
      if (err) console.error(`Error creating ${name}:`, err.message);
    });
  }
  db.run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_cod_fulfillments_collection_reference
     ON cod_fulfillments(carrier_collection_reference)
     WHERE carrier_collection_reference IS NOT NULL`,
    (err) => {
      if (err) console.error('Error creating COD collection reference index:', err.message);
    }
  );
  db.run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_cod_fulfillments_commission_payment_reference
     ON cod_fulfillments(commission_payment_reference)
     WHERE commission_payment_reference IS NOT NULL`,
    (err) => {
      if (err) console.error('Error creating COD commission payment reference index:', err.message);
    }
  );
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_idempotency_key ON appointments(idempotency_key)', (err) => {
    if (err) console.error('Error creating appointment idempotency index:', err.message);
  });

  // ========== NEW: Product Offers table (for Joutiya items) ==========
  db.run(`
    CREATE TABLE IF NOT EXISTS product_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      buyer_id INTEGER NOT NULL,
      seller_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (buyer_id) REFERENCES users(id),
      FOREIGN KEY (seller_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating product_offers:', err);
    else console.log('✅ product_offers table ready');
  });

  db.run('ALTER TABLE product_offers ADD COLUMN amount_minor INTEGER', (err) => {
    if (err && !err.message.includes('duplicate column name')) console.error('Error adding amount_minor to product_offers:', err.message);
  });
  db.run(
    'UPDATE product_offers SET amount_minor = CAST(ROUND(amount * 100) AS INTEGER) WHERE amount_minor IS NULL AND amount IS NOT NULL',
    (err) => { if (err) console.error('Error backfilling amount_minor on product_offers:', err.message); }
  );

  console.log('✅ All tables created/verified');
  db.get('SELECT 1 AS ready', (error) => {
    if (error) {
      console.error('Database initialization failed:', error.message);
      rejectDatabaseReady(error);
      return;
    }
    console.log('Database schema is ready');
    resolveDatabaseReady();
  });
});

db.ready = databaseReady;
db.path = dbPath;
db.dialect = 'sqlite';

module.exports = db;
}
