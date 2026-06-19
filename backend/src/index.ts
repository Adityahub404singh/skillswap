import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import all your routers
import discoverRouter from "./routes/discover.js";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import paymentRouter from "./routes/payment.js";
import sessionsRouter from "./routes/sessions.js";
import healthRouter from "./routes/health.js";
import skillsRouter from "./routes/skills.js";
import gamificationRouter from "./routes/gamification.js";
import chatRouter from "./routes/chat.js";
import aiRouter from "./routes/ai.js";
import usersRouter from "./routes/users.js";
import matchingRouter from "./routes/matching.js";
import ratingsRouter from "./routes/ratings.js";
import notificationsRouter from "./routes/notifications.js";
import walletRouter from "./routes/wallet.js";
import verificationRouter from "./routes/verification.js";
import quizRouter from "./routes/quiz.js";
import platformRouter from "./routes/platform.js";

// Import your new combined Cron Jobs
import { startCronJobs } from "./utils/cronJobs.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

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
app.use("/api/chat", chatRouter);
app.use("/api/verification", verificationRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/platform", platformRouter);

// Start Server & Initialize Cron Jobs
app.listen(PORT, () => {
  // Yeh function tumhari cronJobs.ts file se call ho raha hai
  startCronJobs(); 
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("⏰ Retention & Session Cron Engines are Active!");
});