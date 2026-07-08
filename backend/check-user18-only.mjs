import { db } from "./src/db.js";
import { sql } from "drizzle-orm";
const user = await db.execute(sql`SELECT * FROM users WHERE id = 18;`);
console.log("=====USER18START=====");
console.log(JSON.stringify(user.rows, null, 2));
console.log("=====USER18END=====");
process.exit(0);
