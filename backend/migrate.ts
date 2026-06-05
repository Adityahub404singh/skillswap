import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  console.log('Connected to database...');

  const res = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name='users' ORDER BY ordinal_position
  `);
  console.log('Current columns:', res.rows.map((r: any) => r.column_name).join(', '));

  await client.query(`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_active_date DATE
  `);
  console.log('Columns added!');

  const res2 = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name='users' AND column_name IN ('current_streak','longest_streak','last_active_date')
  `);
  console.log('Verified new columns:', res2.rows.map((r: any) => r.column_name).join(', '));

  await client.end();
  console.log('Done! Restart backend now.');
}

main().catch(console.error);
