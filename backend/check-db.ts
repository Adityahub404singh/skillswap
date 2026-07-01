import "dotenv/config";
import { pool } from "./src/db.js";

async function main() {
  console.log("Testing DB connection...");
  const r = await pool.query("SELECT 1 as test");
  console.log("✅ DB connected:", r.rows);

  const cols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'group_enrollments'
    ORDER BY ordinal_position
  `);
  console.log("\n📋 group_enrollments columns:");
  cols.rows.forEach((c: any) => console.log(`  ${c.column_name}: ${c.data_type}`));

  const scols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'sessions'
    ORDER BY ordinal_position
  `);
  console.log("\n📋 sessions columns:");
  scols.rows.forEach((c: any) => console.log(`  ${c.column_name}: ${c.data_type}`));

  await pool.end();
  process.exit(0);
}

main().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });