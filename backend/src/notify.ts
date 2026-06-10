import { db } from "./db.js";
import { pgTable, serial, integer, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { sendEmail } from "./utils/mailer.js";
import { eq } from "drizzle-orm";

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

const usersForEmail = pgTable("users", {
  id:    serial("id").primaryKey(),
  name:  text("name").notNull(),
  email: text("email").notNull(),
});

export async function createNotification(userId: number, type: string, title: string, message: string, actionUrl?: string) {
  try {
    await db.insert(notificationsTable).values({ userId, type, title, message, actionUrl: actionUrl ?? null });

    const [user] = await db.select({ email: usersForEmail.email, name: usersForEmail.name })
                           .from(usersForEmail).where(eq(usersForEmail.id, userId)).limit(1);

    if (user && user.email) {
      const appUrl = process.env.FRONTEND_URL || "https://skillswap.app";
      const emailBody = `Hi ${user.name},\n\n${message}\n\nCheck it out here: ${appUrl}${actionUrl || "/dashboard"}\n\nThanks,\nSkillSwap Team`;
      await sendEmail(user.email, title, emailBody);
    }
  } catch (err: any) {
    console.error("[notify]", err.message);
  }
}

export const notify = {
  // 🌟 AUTOMATED RETENTION & ENGAGEMENT NOTIFICATIONS
  inactiveReminder: (userId: number, daysInactive: number) => 
    createNotification(userId, "marketing", "We Miss You!", `It's been ${daysInactive} days! Come back and learn a new skill today.`, "/explore"),
  
  profileIncomplete: (userId: number) => 
    createNotification(userId, "system", "Complete Your Profile 🚀", "Learners and Mentors trust complete profiles. Add your bio today!", "/profile"),
    
  adminBroadcast: (userId: number, title: string, message: string, url: string) => 
    createNotification(userId, "marketing", `📢 ${title}`, message, url),

  // 📝 EXISTING ACTION NOTIFICATIONS
  // 🌟 AUTOMATED RETENTION & ENGAGEMENT NOTIFICATIONS
  inactiveReminder: (userId: number, daysInactive: number) => 
    createNotification(userId, "marketing", "We Miss You!", `It's been ${daysInactive} days! Come back and learn a new skill today.`, "/explore"),
  
  profileIncomplete: (userId: number) => 
    createNotification(userId, "system", "Complete Your Profile 🚀", "Learners and Mentors trust complete profiles. Add your bio today!", "/profile"),
    
  adminBroadcast: (userId: number, title: string, message: string, url: string) => 
    createNotification(userId, "marketing", `📢 ${title}`, message, url),

  // 📝 EXISTING ACTION NOTIFICATIONS
  sessionBooked:    (mentorId: number, learnerName: string, skill: string) =>
    createNotification(mentorId, "session", "New Session Booked!", `${learnerName} booked ${skill} session.`, "/sessions"),

  sessionAccepted:  (studentId: number, mentorName: string, skill: string) =>
    createNotification(studentId, "session", "Session Accepted!", `${mentorName} accepted your ${skill} request.`, "/sessions"),

  sessionCompleted: (userId: number, skill: string, credits: number) =>
    createNotification(userId, "credit", "Session Done!", `${skill} session complete! +${credits} credits.`, "/wallet"),

  sessionCancelled: (userId: number, skill: string, credits: number) =>
    createNotification(userId, "session", "Session Cancelled", `${skill} cancelled. +${credits} credits refunded.`, "/wallet"),

  creditsEarned:    (userId: number, amount: number, reason: string) =>
    createNotification(userId, "credit", `+${amount} Credits!`, reason, "/wallet"),

  streakBonus:      (userId: number, streak: number, bonus: number) =>
    createNotification(userId, "streak", `${streak}-Day Streak!`, `Amazing streak! +${bonus} bonus credits.`, "/dashboard"),

  paymentSuccess:   (userId: number, credits: number, amount: number) =>
    createNotification(userId, "credit", "Payment Done!", `${credits} credits added for Rs.${amount}`, "/wallet"),
};


