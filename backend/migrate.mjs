import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Running migration...");
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_active_date TEXT,
      ADD COLUMN IF NOT EXISTS verified_skills JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'
    `);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}
migrate();