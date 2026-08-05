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
  // Users table (with is_verified_seller column included directly)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'buyer',
      seller_type TEXT,
      bio TEXT,
      city TEXT,
      country TEXT DEFAULT 'Morocco',
      profilePicture TEXT DEFAULT '',
      is_verified BOOLEAN DEFAULT 0,
      is_verified_seller BOOLEAN DEFAULT 0,
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

  // Products table (with condition column)
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      old_price REAL,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (digital_id) REFERENCES digital_products(id) ON DELETE CASCADE,
      FOREIGN KEY (buyer_id) REFERENCES users(id)
    )
  `, (err) => { if (err) console.error('Error creating digital_requests:', err); else console.log('✅ digital_requests table ready'); });

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

  db.run('ALTER TABLE withdrawal_requests ADD COLUMN request_key TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) console.error('Error adding withdrawal request key:', err.message);
  });

  // The current verification record is private and may only be downloaded by
  // an administrator through the authenticated document endpoint.
  db.run(`
    CREATE TABLE IF NOT EXISTS verification_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      document_url TEXT NOT NULL,
      document_type TEXT NOT NULL CHECK (document_type IN ('national_id', 'passport')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      admin_notes TEXT,
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `, (err) => { if (err) console.error('Error creating verification_documents:', err); });
  db.run('ALTER TABLE withdrawal_requests ADD COLUMN provider_reference TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) console.error('Error adding withdrawal provider reference:', err.message);
  });
  db.run('ALTER TABLE orders ADD COLUMN payment_details TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) console.error('Error adding order payment details:', err.message);
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

module.exports = db;
