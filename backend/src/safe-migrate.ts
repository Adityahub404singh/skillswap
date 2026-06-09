import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    console.log("🚀 Safely injecting new tables into Neon DB...");
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "feedbacks" (
                "id" serial PRIMARY KEY NOT NULL,
                "user_id" integer,
                "rating" integer NOT NULL,
                "text" text NOT NULL,
                "is_read" boolean DEFAULT false,
                "created_at" timestamp DEFAULT now() NOT NULL
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "subscribers" (
                "id" serial PRIMARY KEY NOT NULL,
                "email" text NOT NULL UNIQUE,
                "source" text DEFAULT 'footer',
                "created_at" timestamp DEFAULT now() NOT NULL
            );
        `);
        console.log("✅ Safe Migration Complete! No data lost. All systems go.");
    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        process.exit(0);
    }
}
run();
