import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import discoverRouter from "./routes/discover.js"
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import paymentRouter from "./routes/payment.js";
import sessionsRouter from "./routes/sessions.js";
import healthRouter from "./routes/health.js";
import skillsRouter from "./routes/skills.js";
import gamificationRouter from "./routes/gamification.js";
import aiRouter from "./routes/ai.js";
import usersRouter from "./routes/users.js";
import matchingRouter from "./routes/matching.js";
import ratingsRouter from "./routes/ratings.js";
import notificationsRouter from "./routes/notifications.js";
import walletRouter from "./routes/wallet.js";
import verificationRouter from "./routes/verification.js";
import quizRouter from "./routes/quiz.js";
import platformRouter from "./routes/platform.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/gamification", gamificationRouter);
app.use("/api/ai", aiRouter);
app.use("/api/discover", discoverRouter);
app.use("/api/users", usersRouter);
app.use("/api/matching", matchingRouter);
app.use("/api/ratings", ratingsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/verification", verificationRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/platform", platformRouter);

// 🤖 AUTOMATED RETENTION ENGINE (CRON JOB)
import { db } from "./db.js";
import { notify } from "./notify.js";
import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";

const usersForCron = pgTable("users", {
  id: serial("id").primaryKey(),
  lastActiveDate: text("last_active_date"),
  credits: integer("credits")
});

const startCronJobs = () => {
  // Runs every 24 hours
  setInterval(async () => {
    try {
      console.log("⏳ Running daily retention checks...");
      const users = await db.select().from(usersForCron);
      const now = new Date().getTime();
      
      users.forEach(user => {
        if (user.lastActiveDate) {
          const lastActive = new Date(user.lastActiveDate).getTime();
          const daysInactive = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
          
          // If inactive for 5 days, send "We Miss You" reminder
          if (daysInactive === 5) {
             notify.inactiveReminder(user.id, daysInactive);
          }
        }
      });
    } catch (e) {
      console.error("Cron Error:", e);
    }
  }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
};

app.listen(PORT, () => {
  startCronJobs();
  console.log(`🚀 Server running on port ${PORT}`);
});


