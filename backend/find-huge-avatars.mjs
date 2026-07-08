import { db } from "./src/db.js";
import { sql } from "drizzle-orm";
const result = await db.execute(sql`
  SELECT id, name, LENGTH(avatar) as avatar_length
  FROM users
  WHERE LENGTH(avatar) > 2000
  ORDER BY avatar_length DESC;
`);
console.log(result.rows);
process.exit(0);
