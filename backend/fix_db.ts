import { pool } from "./db.js";

async function fixSchema() {
  const queries = [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(100);',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by INTEGER;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_skills JSONB;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS badges JSONB;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_public BOOLEAN DEFAULT true;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS seo_slug VARCHAR(100);',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_last_sent TIMESTAMP;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS micro_sessions_count INTEGER DEFAULT 0;'
  ];

  for (const q of queries) {
    try {
      await pool.query(q);
      console.log('✅ Executed: ' + q.substring(0, 30) + '...');
    } catch (e) {
      console.log('⚠️ Skipped/Error (might exist): ' + q.substring(0, 30));
    }
  }
  process.exit();
}

fixSchema();