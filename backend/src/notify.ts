import { notificationsTable } from "./schema/index.js";
import { db } from "./db.js";
import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { sendEmail } from "./utils/mailer.js";
import { eq } from "drizzle-orm";

// 🔥 THE 100% BULLETPROOF FIX: Firebase Modular Imports (Red lines gayab ho jayengi)
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

// 🔥 FIREBASE INITIALIZATION
if (!getApps().length && process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("🔥 Firebase Admin Initialized Successfully");
  } catch (error) {
    console.error("Firebase Initialization Failed. Check JSON format in env.");
  }
}

// 🔥 FIX: Query mein fcmToken add kiya
const usersForEmail = pgTable("users", {
  id:       serial("id").primaryKey(),
  name:     text("name").notNull(),
  email:    text("email").notNull(),
  fcmToken: text("fcm_token"), 
});

export async function createNotification(userId: number, type: string, title: string, message: string, actionUrl?: string) {
  try {
    // 1. App Database mein In-App Notifications save karo
    await db.insert(notificationsTable).values({ userId, type, title, message, actionUrl: actionUrl ?? null });

    // 2. User ka email aur FCM token nikalo
    const [user] = await db.select({ 
        email: usersForEmail.email, 
        name: usersForEmail.name,
        fcmToken: usersForEmail.fcmToken 
      })
      .from(usersForEmail)
      .where(eq(usersForEmail.id, userId))
      .limit(1);

    // 3. 🔥 PUSH NOTIFICATION (FCM) - Agar user ke paas token hai
    if (user?.fcmToken && getApps().length > 0) {
      try {
        await getMessaging().send({
          token: user.fcmToken,
          notification: { title, body: message },
          data: { url: actionUrl || "/dashboard", type }
        });
        console.log(`[Push] Sent to phone for userId=${userId}`);
      } catch (pushErr) {
        console.error(`[Push] FCM Failed for userId=${userId}:`, pushErr);
      }
    }

    // 4. Email Notification
    if (user && user.email) {
      const appUrl = process.env.FRONTEND_URL || "https://skillswap.app";
      const emailBody = `Hi ${user.name},\n\n${message}\n\nCheck it out here: ${appUrl}${actionUrl || "/dashboard"}\n\nThanks,\nSkillSwap Team`;
      await sendEmail(user.email, title, emailBody);
    }

    console.log(`[notify] OK userId=${userId} type=${type}`);
  } catch (err: any) {
    console.error(`[notify] Failed for userId=${userId}, type=${type}:`, err.message);
    if (err.cause) {
      console.error(`[notify] Root cause for userId=${userId}:`, err.cause);
    }
  }
}

export const notify = {
  // 🚀 AUTOMATED RETENTION & ENGAGEMENT
  inactiveReminder: (userId: number, daysInactive: number) => 
    createNotification(userId, "marketing", "We Miss You!", `It's been ${daysInactive} days! Come back and learn a new skill today.`, "/explore"),
  
  profileIncomplete: (userId: number) => 
    createNotification(userId, "system", "Complete Your Profile 🚀", "Learners and Mentors trust complete profiles. Add your bio today!", "/profile"),
    
  adminBroadcast: (userId: number, title: string, message: string, url: string) => 
    createNotification(userId, "marketing", `📢 ${title}`, message, url),

  // 💬 CHATS & MATCHES (🌟 NEWLY ADDED)
  newMatch: (userId: number, matchName: string) =>
    createNotification(userId, "match", "New Match! 🎉", `You and ${matchName} liked each other!`, "/matches"),
    
  newMessage: (userId: number, senderName: string) =>
    createNotification(userId, "message", "New Message", `${senderName} sent you a message.`, "/chats"),

  // 📅 EXISTING ACTION NOTIFICATIONS
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