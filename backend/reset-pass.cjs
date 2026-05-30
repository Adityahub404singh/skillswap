require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
bcrypt.hash('Admin@123', 10).then(hash => {
  return pool.query("UPDATE users SET password_hash=$1 WHERE email='singhaditya4560@gmail.com'", [hash]);
}).then(r => { console.log('Password reset! Rows:', r.rowCount); pool.end(); })
  .catch(e => { console.error(e); pool.end(); });
