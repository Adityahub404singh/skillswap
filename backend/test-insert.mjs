import { db } from "./src/db.js";
import { notificationsTable } from "./src/schema/index.js";
try {
  const result = await db.insert(notificationsTable).values({
    userId: 1,
    type: "marketing",
    title: "Test Notification",
    message: "This is a manual test insert to see the real error.",
    actionUrl: "/dashboard",
  }).returning();
  console.log("✅ SUCCESS:", result);
} catch (err) {
  console.error("❌ REAL ERROR:", err);
}
process.exit(0);
