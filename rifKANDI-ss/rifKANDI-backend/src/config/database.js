// config/database.js
const path = require('path');

let db;

if (process.env.NODE_ENV === 'production') {
  // ==================== CLOUDFLARE D1 ADAPTER ====================
  let d1Binding = null;

  function setD1(binding) {
    d1Binding = binding;
  }

  function getD1() {
    if (!d1Binding) throw new Error('D1 binding not set');
    return d1Binding;
  }

  db = {
    setD1,
    get: (sql, params, callback) => {
      const stmt = getD1().prepare(sql);
      stmt.bind(...params)
        .first()
        .then(row => callback(null, row))
        .catch(err => callback(err));
    },
    all: (sql, params, callback) => {
      const stmt = getD1().prepare(sql);
      stmt.bind(...params)
        .all()
        .then(({ results }) => callback(null, results))
        .catch(err => callback(err));
    },
    run: (sql, params, callback) => {
      const stmt = getD1().prepare(sql);
      stmt.bind(...params)
        .run()
        .then(result => {
          const ctx = { lastID: result.meta.last_row_id, changes: result.meta.changes };
          callback(null, ctx);
        })
        .catch(err => callback(err));
    },
    serialize: (callback) => callback(),
  };
} else {
  // ==================== LOCAL DEVELOPMENT (sqlite3) ====================
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, '../../rifkandi.db');
  const sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Database error:', err.message);
    } else {
      console.log('✅ SQLite Database connected!');
      console.log(`📁 Database: ${dbPath}`);
    }
  });

  // Create tables (your original table creation code)
  sqliteDb.serialize(() => {
    // Users table
    sqliteDb.run(`
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.run("ALTER TABLE users ADD COLUMN profilePicture TEXT DEFAULT ''", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.log('Note: profilePicture column might already exist');
      } else if (!err) {
        console.log('✅ Added profilePicture column to users table');
      }
    });

    sqliteDb.run("ALTER TABLE users ADD COLUMN is_verified_seller BOOLEAN DEFAULT 0", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.log('Note: is_verified_seller column might already exist');
      } else if (!err) {
        console.log('✅ Added is_verified_seller column to users table');
      }
    });

    // Products table
    sqliteDb.run(`
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

    sqliteDb.run("ALTER TABLE products ADD COLUMN condition TEXT DEFAULT 'new'", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.log('Note: condition column might already exist');
      } else if (!err) {
        console.log('✅ Added condition column to products table');
      }
    });

    // Product Media table
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Password resets table
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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

    // Digital Media table
    sqliteDb.run(`
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
    sqliteDb.run(`
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
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES digital_products(id),
        FOREIGN KEY (buyer_id) REFERENCES users(id),
        FOREIGN KEY (seller_id) REFERENCES users(id)
      )
    `);

    // Digital Files table
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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
    sqliteDb.run(`
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

    // Wallet & Escrow Tables
    sqliteDb.run(`
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

    sqliteDb.run(`
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

    sqliteDb.run(`
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

    sqliteDb.run(`
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

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS payment_splits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        party_type TEXT NOT NULL,
        party_id INTEGER,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (order_id) REFERENCES orders(id)
      )
    `, (err) => { if (err) console.error('Error creating payment_splits:', err); else console.log('✅ payment_splits table ready'); });

    // Initialize wallet for existing users
    sqliteDb.run(`
      INSERT OR IGNORE INTO wallets (user_id, available_balance, escrow_balance, pending_withdrawal, total_earned)
      SELECT id, 0, 0, 0, 0 FROM users
    `, (err) => { if (err) console.error('Error initializing wallets:', err); else console.log('✅ Wallets initialized for existing users'); });

    sqliteDb.run(`
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

    sqliteDb.run("ALTER TABLE order_items ADD COLUMN product_title TEXT", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.log('Note: product_title column might already exist');
      } else if (!err) console.log('✅ Added product_title column to order_items');
    });
    sqliteDb.run("ALTER TABLE order_items ADD COLUMN product_image TEXT", (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.log('Note: product_image column might already exist');
      } else if (!err) console.log('✅ Added product_image column to order_items');
    });

    sqliteDb.run(`
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

    sqliteDb.run(`
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

    sqliteDb.run(`
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

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS verification_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        document_url TEXT NOT NULL,
        document_type TEXT CHECK(document_type IN ('national_id', 'passport', 'business_license')),
        status TEXT DEFAULT 'pending',
        admin_notes TEXT,
        reviewed_by INTEGER,
        reviewed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
      )
    `, (err) => {
      if (err) console.error('Error creating verification_documents:', err);
      else console.log('✅ verification_documents table ready');
    });

    console.log('✅ All tables created/verified');
  });

  // Wrap sqliteDb methods to match the interface expected by app.js
  db = {
    get: (sql, params, callback) => sqliteDb.get(sql, params, callback),
    all: (sql, params, callback) => sqliteDb.all(sql, params, callback),
    run: (sql, params, callback) => sqliteDb.run(sql, params, function(err) {
      if (callback) callback(err, this);
    }),
    serialize: (callback) => sqliteDb.serialize(callback),
  };
}

module.exports = db;