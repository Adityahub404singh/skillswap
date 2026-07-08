import { db } from "./src/db.js";
import { sql } from "drizzle-orm";

// Clear the corrupt oversized base64 avatar for user 18
await db.execute(sql`UPDATE users SET avatar = NULL WHERE id = 18;`);
console.log("✅ User 18 avatar cleared — dashboard should work now");
process.exit(0);
