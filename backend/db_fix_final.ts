import { pool } from './db.js';
async function run() {
  const queries = [
    'UPDATE users SET average_rating = 0 WHERE average_rating IS NULL',
    'UPDATE users SET credits = 50 WHERE credits IS NULL',
    'UPDATE users SET sessions_completed = 0 WHERE sessions_completed IS NULL',
    'UPDATE users SET trust_score = 0 WHERE trust_score IS NULL',
    'UPDATE users SET micro_sessions_count = 0 WHERE micro_sessions_count IS NULL'
  ];
  for (const q of queries) {
    try { await pool.query(q + ';'); console.log('✅ Applied: ' + q); }
    catch (e) { console.log('⚠️ Skip/Error: ' + e.message); }
  }
  process.exit();
}
run();