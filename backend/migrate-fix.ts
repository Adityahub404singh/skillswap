import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  console.log('✅ Connected to database!');

  await client.query(`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_active_date DATE,
    ADD COLUMN IF NOT EXISTS location VARCHAR(100),
    ADD COLUMN IF NOT EXISTS micro_sessions_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS portfolio_public BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS seo_slug VARCHAR(100),
    ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS notification_last_sent TIMESTAMP
  `);
  console.log('✅ Users columns added!');

  await client.query(`
    ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS session_type VARCHAR(20) NOT NULL DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT
  `);
  console.log('✅ Sessions columns added!');

  await client.query(`
    CREATE TABLE IF NOT EXISTS feed_posts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      skills TEXT[] DEFAULT '{}',
      likes INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✅ feed_posts table ready!');

  await client.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type VARCHAR(30) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT false,
      action_url VARCHAR(300),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✅ notifications table ready!');

  // Generate SEO slugs for existing users
  await client.query(`
    UPDATE users 
    SET seo_slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || id
    WHERE seo_slug IS NULL
  `);
  console.log('✅ SEO slugs generated!');

  const verify = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name='users' ORDER BY ordinal_position
  `);
  console.log('\n📋 Final users columns:');
  verify.rows.forEach((r: any) => console.log('  ✓', r.column_name));

  await client.end();
  console.log('\n🎉 Migration complete! Run: npm run dev');
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
