import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by integer`);
  console.log("referred_by column added!");
} catch(e) {
  console.error("Error:", e.message);
} finally {
  pool.end();
}
