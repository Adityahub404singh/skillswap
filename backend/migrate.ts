import "dotenv/config";
import { pool } from "./src/db.js";

async function migrate() {
  console.log("🔄 Running migration...\n");

  const columns = [
    { table: "group_enrollments", col: "active_seconds",    type: "REAL DEFAULT 0" },
    { table: "group_enrollments", col: "last_heartbeat_at", type: "TIMESTAMP" },
    { table: "group_enrollments", col: "is_connected",      type: "INTEGER DEFAULT 0" },
    { table: "group_enrollments", col: "completed_at",      type: "TIMESTAMP" },
    { table: "group_enrollments", col: "refund_amount",     type: "INTEGER DEFAULT 0" },
    { table: "group_enrollments", col: "refund_reason",     type: "TEXT" },
    { table: "group_enrollments", col: "refunded_at",       type: "TIMESTAMP" },
    { table: "sessions",          col: "last_heartbeat_at", type: "TIMESTAMP" },
    { table: "sessions",          col: "active_minutes",    type: "REAL DEFAULT 0" },
  ];

  for (const { table, col, type } of columns) {
    try {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      console.log(`✅ ${table}.${col}`);
    } catch (e: any) {
      console.log(`❌ ${table}.${col}: ${e.message}`);
    }
  }

  console.log("\n📋 Final group_enrollments columns:");
  const r = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='group_enrollments' ORDER BY ordinal_position`);
  r.rows.forEach((c: any) => console.log(`  ${c.column_name}: ${c.data_type}`));

  await pool.end();
  console.log("\n✅ Done!");
  process.exit(0);
}

migrate().catch(e => { console.error("❌ Failed:", e.message); process.exit(1); });