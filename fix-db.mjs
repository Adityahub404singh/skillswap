import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "backend", ".env") });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

pool.query("ALTER TABLE notifications DROP COLUMN IF EXISTS is_read")
  .then(() => { 
      console.log("✅ is_read column cleared for safe recreation!"); 
      process.exit(0); 
  })
  .catch((e) => { 
      console.log("Info: ", e.message); 
      process.exit(0); 
  });