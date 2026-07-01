 import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { db } from '../db.js';
import { sessionsTable } from '../schema/sessions.js';
import { usersTable } from '../schema/users.js';
import { transactionsTable } from '../schema/transactions.js';
import { eq, and, lte, sql } from 'drizzle-orm';

// 🔒 Same secret the protected clear-escrow route checks against
const CRON_SECRET = process.env.CRON_SECRET || "dev-cron-secret-change-in-prod";
// Set BASE_URL in .env for production (e.g. https://api.skillswap.com)
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

// 📧 Email Setup using Nodemailer (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Set in .env
    pass: process.env.EMAIL_PASS, // Set in .env (App Password)
  },
});

// 🔥 Ek hi function jisme saare Cron Jobs chalenge
export function startCronJobs() {
  console.log("⏰ Initializing all background Cron Jobs...");

  // =========================================================================
  // CRON JOB 1: STALE SESSION CLEANUP (Runs every hour)
  // =========================================================================
  cron.schedule('0 * * * *', async () => {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const staleSessions = await db.select().from(sessionsTable).limit(200)
        .where(and(eq(sessionsTable.status, 'requested'), lte(sessionsTable.createdAt, yesterday)));

      if (staleSessions.length > 0) console.log(`🧹 Cleaning up ${staleSessions.length} stale sessions...`);

      for (const session of staleSessions) {
        await db.update(sessionsTable)
          .set({ status: 'cancelled', cancelReason: 'Auto-cancelled: Mentor did not respond' })
          .where(eq(sessionsTable.id, session.id));
          
        await db.update(usersTable)
          .set({ credits: sql`${usersTable.credits} + ${session.creditsAmount}` })
          .where(eq(usersTable.id, session.studentId));
          
        await db.insert(transactionsTable).values({
          userId: session.studentId, type: 'refund', amount: session.creditsAmount,
          description: `Auto-Refund: Mentor unresponsive for ${session.skill}`, sessionId: session.id,
        } as any);
      }
    } catch (e) {
      console.error('Session Cleanup Cron Error:', e);
    }
  });

  // =========================================================================
  // CRON JOB 2: AUTOMATED RETENTION EMAILS (Runs every day at 12:00 PM Noon)
  // =========================================================================
  cron.schedule('0 12 * * *', async () => {
    console.log("🚀 Running Daily User Retention Email Engine...");
    
    try {
      // Get all users from db
      const users = await db.select().from(usersTable).limit(500);
      const now = new Date().getTime();

      for (const user of users) {
        if (!user.lastActiveDate || !user.email) continue;

        const lastActive = new Date(user.lastActiveDate).getTime();
        const daysInactive = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));

        let subject = "";
        let htmlMessage = "";

        // 🔥 DAY 2: MOTIVATIONAL & CREDIT REMINDER
        if (daysInactive === 2) {
          subject = `🚨 Don't let your skills rust, ${user.name?.split(' ')[0] || 'Champion'}! 🚀`;
          htmlMessage = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
              <div style="background: linear-gradient(135deg, #4f46e5 0%, #ec4899 100%); padding: 30px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: -0.5px;">SkillSwap</h1>
              </div>
              <div style="padding: 40px 30px;">
                <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">Ready for your next breakthrough? ⚡</h2>
                <p style="color: #475569; font-size: 16px; line-height: 1.6;">It's been 48 hours since we last saw you. Did you know you have <strong>${user.credits || 0} Credits</strong> waiting in your wallet? 💰</p>
                <p style="color: #475569; font-size: 16px; line-height: 1.6;">Don't lose your learning momentum. The best time to master a new skill or teach someone is right now.</p>
                <div style="text-align: center; margin-top: 35px;">
                  <a href="https://skillswap.com" style="background: linear-gradient(to right, #4f46e5, #ec4899); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(236, 72, 153, 0.3);">Claim Your Session Now</a>
                </div>
              </div>
            </div>
          `;
        } 
        
        // 🔥 DAY 4: FOMO (FEAR OF MISSING OUT) & SOCIAL PROOF
        else if (daysInactive === 4) {
          subject = `👀 Someone is looking for exactly what you know!`;
          htmlMessage = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
              <div style="background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); padding: 30px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: -0.5px;">SkillSwap</h1>
              </div>
              <div style="padding: 40px 30px;">
                <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">You're missing out, ${user.name?.split(' ')[0] || 'Friend'}! 📉</h2>
                <p style="color: #475569; font-size: 16px; line-height: 1.6;">Your profile has been visible, but because you're offline, you're missing out on potential matches and the chance to boost your <strong>Trust Score</strong>! 🏆</p>
                <p style="color: #475569; font-size: 16px; line-height: 1.6;">Other users are climbing the leaderboard. Jump back in, swipe on new profiles, and let's get you to the top!</p>
                <div style="text-align: center; margin-top: 35px;">
                  <a href="https://skillswap.com" style="background: linear-gradient(to right, #f97316, #ef4444); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3);">Boost My Score</a>
                </div>
              </div>
            </div>
          `;
        }

        if (subject) {
          await transporter.sendMail({
            from: `"SkillSwap Team" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: subject,
            html: htmlMessage
          });
          console.log(`📧 Retention Email sent to: ${user.email} (Inactive for ${daysInactive} days)`);
        }
      }
    } catch (e) {
      console.error("Retention Email Cron Error:", e);
    }
  });

  // =========================================================================
  // 🌟 CRON JOB 3: ESCROW CLEARANCE ENGINE (Runs every hour)
  // =========================================================================
  // 🔥 FIX: Ye ab dobara escrow logic nahi likhta (jo sessions.ts ke
  // /system/cron/clear-escrow route se DUPLICATE tha aur double-payout
  // ka risk create kar raha tha). Ab ye SIRF us protected route ko
  // call karta hai — single source of truth.
  cron.schedule('0 * * * *', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/sessions/system/cron/clear-escrow`, {
        method: "POST",
        headers: { "X-Cron-Secret": CRON_SECRET },
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("❌ [ESCROW CRON] Clear-escrow call failed:", data);
        return;
      }

      if (data.clearedCount > 0) {
        console.log(`🏦 [ESCROW] Cleared ${data.clearedCount} sessions. Total paid: ${data.totalClearedAmt} cr.`);
      }
    } catch (err: any) {
      console.error("❌ [ESCROW CRON ERROR]:", err);
    }
  });
}