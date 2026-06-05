import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  console.log('Connected!');

  // Check current sessions columns
  const cols = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name='sessions' ORDER BY ordinal_position
  `);
  console.log('Current sessions columns:', cols.rows.map((r: any) => r.column_name).join(', '));

  // Add missing columns
  await client.query(`
    ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS session_type VARCHAR(20) NOT NULL DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
    ADD COLUMN IF NOT EXISTS teacher_rating REAL,
    ADD COLUMN IF NOT EXISTS learner_rating REAL,
    ADD COLUMN IF NOT EXISTS teacher_review TEXT,
    ADD COLUMN IF NOT EXISTS learner_review TEXT
  `);
  console.log('Sessions columns added!');

  // Verify
  const verify = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name='sessions' ORDER BY ordinal_position
  `);
  console.log('Final sessions columns:', verify.rows.map((r: any) => r.column_name).join(', '));

  await client.end();
  console.log('Done! Restart backend.');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
