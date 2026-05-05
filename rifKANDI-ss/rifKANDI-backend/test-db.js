const dotenv = require('dotenv');
dotenv.config();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Connection successful!');
    console.log('Database time:', result.rows[0].current_time);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    pool.end();
  }
}

testConnection();