import { db } from "./src/db.js";
import { sql } from "drizzle-orm";
const result = await db.execute(sql`
  SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'notifications'
  ORDER BY ordinal_position;
`);
console.log(result.rows);
process.exit(0);
