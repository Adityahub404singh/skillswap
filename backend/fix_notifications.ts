import { pool } from './db.js';
async function fix() {
  const q = \
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      action_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );\;
  try {
    await pool.query(q);
    console.log('✅ Notifications table verified/created!');
  } catch (e) {
    console.log('⚠️ Error: ' + e.message);
  }
  process.exit();
}
fix();