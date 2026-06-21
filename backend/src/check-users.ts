import "dotenv/config";
import { db } from "./db.js";
import { usersTable } from "./schema/users.js";

async function main() {
  const u = await db.select().from(usersTable);
  console.log(`Total users: ${u.length}\n`);
  u.forEach((x: any) => {
    console.log(`id=${x.id} | name="${x.name}" | email=${x.email} | avatar=${x.avatar || "(none)"}`);
  });
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });