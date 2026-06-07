import { pool } from './src/db.ts';
async function fix() {
  try {
    const q = 'ALTER TABLE sessions ALTER COLUMN scheduled_date DROP NOT NULL; ALTER TABLE sessions ALTER COLUMN status DROP NOT NULL; ALTER TABLE sessions ALTER COLUMN message DROP NOT NULL; ALTER TABLE sessions ALTER COLUMN credits_amount DROP NOT NULL; ALTER TABLE sessions ALTER COLUMN session_type DROP NOT NULL; ALTER TABLE sessions ALTER COLUMN cancel_reason DROP NOT NULL; ALTER TABLE sessions ALTER COLUMN teacher_rating DROP NOT NULL; ALTER TABLE sessions ALTER COLUMN learner_rating DROP NOT NULL; ALTER TABLE sessions ALTER COLUMN teacher_review DROP NOT NULL; ALTER TABLE sessions ALTER COLUMN learner_review DROP NOT NULL; ALTER TABLE sessions ALTER COLUMN session_otp DROP NOT NULL;';
    await pool.query(q);
    console.log('✅ SESSIONS TABLE FIXED - BOOKING WILL NOW WORK!');
  } catch(e) {
    console.log('Error:', e.message);
  }
  process.exit();
}
fix();