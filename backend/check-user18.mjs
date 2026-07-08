import { db } from "./src/db.js";
import { sql } from "drizzle-orm";

console.log("=== USER 18 RAW ROW ===");
try {
  const user = await db.execute(sql`SELECT * FROM users WHERE id = 18;`);
  console.log(JSON.stringify(user.rows, null, 2));
} catch (e) {
  console.error("USER QUERY ITSELF FAILED:", e);
}

console.log("=== USER 18 SESSIONS (raw) ===");
try {
  const sess = await db.execute(sql`SELECT * FROM sessions WHERE student_id = 18 OR mentor_id = 18;`);
  console.log(JSON.stringify(sess.rows, null, 2));
} catch (e) {
  console.error("SESSIONS QUERY ITSELF FAILED:", e);
}

process.exit(0);
