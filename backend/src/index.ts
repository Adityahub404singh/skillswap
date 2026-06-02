import app from "./app.js";
import cron from "node-cron";
import { db, sessionsTable, usersTable } from "./db.js";
import { eq, and, between } from "drizzle-orm";
import { sendSessionReminder } from "./utils/email.js";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

// Reminder cron — har 5 min check karo
cron.schedule("*/5 * * * *", async () => {
  try {
    const now = new Date();
    const in35 = new Date(now.getTime() + 35 * 60 * 1000);
    const in25 = new Date(now.getTime() + 25 * 60 * 1000);

    const sessions = await db.select().from(sessionsTable);
    const upcoming = sessions.filter(s => {
      if (s.status !== "accepted") return false;
      const d = new Date(s.scheduledDate as string).getTime();
      return d >= in25.getTime() && d <= in35.getTime();
    });

    for (const session of upcoming) {
      const [mentor] = await db.select().from(usersTable).where(eq(usersTable.id, Number(session.mentorId))).limit(1);
      const [student] = await db.select().from(usersTable).where(eq(usersTable.id, Number(session.studentId))).limit(1);
      if (mentor) sendSessionReminder(mentor.email, mentor.name, session.skill, session.meetLink || "").catch(console.error);
      if (student) sendSessionReminder(student.email, student.name, session.skill, session.meetLink || "").catch(console.error);
      console.log(`[cron] Reminder sent for session ${session.id}`);
    }
  } catch (err) {
    console.error("[cron] Reminder error:", err);
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`[cron] Session reminder job started`);
});
