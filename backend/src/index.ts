import "dotenv/config";

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import express from "express";
import cors from "cors";

// Import routers
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
import { startCronJobs } from "./utils/cronJobs.js";

// 🔥 SENTRY INIT (Fixed for v10)
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    nodeProfilingIntegration(),
    Sentry.expressIntegration(),
  ],
  tracesSampleRate: 1.0,
});

const app = express();
const PORT = process.env.PORT || 3001;

// ─────────────────────────────────────────
// CORS — wildcard "*" + credentials:true is INVALID per browser spec.
// Browsers reject that combo silently, so we whitelist explicit origins.
// FRONTEND_URL env var lets prod (Vercel) and Render stay in sync without
// hardcoding the domain here.
// ─────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000", // agar kabhi alag dev port use kiya
  process.env.FRONTEND_URL, // e.g. https://skillswap.vercel.app — set in Render + local .env
].filter(Boolean) as string[];

// Vercel preview deployments har baar naya random URL banate hain
// (e.g. skillswap-yyks-iv4462u3r-bmaditya-7561s-projects.vercel.app),
// isliye fixed list ke saath-saath pattern match bhi rakhte hain taaki
// preview links bhi automatically allow ho jayein bina manual env update ke.
const vercelPreviewPattern = /^https:\/\/skillswap-[a-z0-9-]+\.vercel\.app$/;

app.use(cors({
  origin: (origin, callback) => {
    // origin undefined hota hai server-to-server calls / curl / Postman mein — allow karo
    if (!origin || allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

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

// 🔥 Sentry Error Handler (No Handlers property used)
Sentry.setupExpressErrorHandler(app);

// Start Server & Initialize Cron Jobs
app.listen(PORT, () => {
  startCronJobs();
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("⏰ Retention & Session Cron Engines are Active!");
});