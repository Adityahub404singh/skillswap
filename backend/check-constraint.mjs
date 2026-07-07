import { db } from "./src/db.js";
import { sql } from "drizzle-orm";
const result = await db.execute(sql`
  SELECT conname, pg_get_constraintdef(oid) as definition
  FROM pg_constraint
  WHERE conrelid = 'notifications'::regclass;
`);
console.log(result.rows);
process.exit(0);
