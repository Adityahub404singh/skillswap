import app from "./app.js";
import cron from "node-cron";
import { db, sessionsTable, usersTable } from "./db.js";
import { eq, sql } from "drizzle-orm";
import { pgTable, serial, integer, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { sendSessionReminder } from "./utils/email.js";

const notificationsTable = pgTable("notifications", {
  id:        serial("id").primaryKey(),
  userId:    integer("user_id").notNull(),
  type:      varchar("type", { length: 30 }).notNull(),
  title:     varchar("title", { length: 200 }).notNull(),
  message:   text("message").notNull(),
  isRead:    boolean("is_read").notNull().default(false),
  actionUrl: varchar("action_url", { length: 300 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

// Helper to quickly send DB notifications
async function notify(userId: number, title: string, message: string, type: string = "system") {
  try {
    await db.insert(notificationsTable).values({ userId, type, title, message });
  } catch (err) {
    console.error("Failed to send notification to user", userId);
  }
}

// 1. Session Reminder (Every 5 mins)
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
      
      if (mentor) {
        sendSessionReminder(mentor.email, mentor.name, session.skill, session.meetLink || "").catch(() => {});
        notify(mentor.id, "Session Starting Soon!", `Your teaching session for ${session.skill} starts in 30 minutes!`, "session_reminder");
      }
      if (student) {
        sendSessionReminder(student.email, student.name, session.skill, session.meetLink || "").catch(() => {});
        notify(student.id, "Session Starting Soon!", `Your learning session for ${session.skill} starts in 30 minutes!`, "session_reminder");
      }
      console.log(`[cron] Reminder sent for session ${session.id}`);
    }
  } catch (err) {
    console.error("[cron] Reminder error:", err);
  }
});



// 3. Smart Streak Loss Warning (Runs Daily at 4 PM)
cron.schedule("0 16 * * *", async () => {
  try {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const users = await db.select().from(usersTable);
    
    const atRiskUsers = users.filter(u => u.currentStreak > 0 && u.lastActiveDate === yesterday);
    
    for (const user of atRiskUsers) {
      notify(user.id, "Don't lose your streak! ??", `You have a ${user.currentStreak}-day streak on the line. Learn or teach today to keep it!`, "system");
    }
    console.log(`[cron] Sent streak warning to ${atRiskUsers.length} users.`);
  } catch (err) {
    console.error("[cron] Streak warning error:", err);
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`[cron] Background Jobs Started (Reminders, Escrow, Engagement)`);
});
