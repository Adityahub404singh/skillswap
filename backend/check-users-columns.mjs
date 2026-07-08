import { db } from "./src/db.js";
import { sql } from "drizzle-orm";
const result = await db.execute(sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'users'
  ORDER BY ordinal_position;
`);
console.log(result.rows.map(r => r.column_name).join("\n"));
process.exit(0);
