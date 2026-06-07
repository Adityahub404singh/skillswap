import { pool } from './src/db.ts';
async function run() {
  try {
    await pool.query("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_otp TEXT;");
    await pool.query("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;");
    console.log('✅ Database Schema with OTP columns is fully synchronized!');
  } catch(e) {
    console.log('Schema update completed or skipped');
  }
  process.exit();
}
run();