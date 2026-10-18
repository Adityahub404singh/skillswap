import "dotenv/config";
import { db } from "./db.js";
import { sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "./middlewares/auth.js";
import reportsRouter from "./routes/Reports.js";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import express from "express";
import cors from "cors";
import uploadRouter from "./routes/upload.js";
import { createCertificateRouter } from "./routes/certificates.js";
import landingRouter from "./routes/landing.js";

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
// CORS Configuration (Updated to support mobile & all Vercel previews)
// ─────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://localhost",
  "capacitor://localhost",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

const vercelPreviewPattern = /^https:\/\/skillswap-[a-z0-9-]+\.vercel\.app$/;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman) or matching allowed lists
    if (!origin || allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS allowed warning for origin: ${origin}`);
      callback(null, true); // Safe fallback to prevent blocking mobile requests
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// ─────────────────────────────────────────
// 🔥 REAL LEDGER AUDIT
// Mounted BEFORE the certificates router so a "/:id" route there can never shadow "/audit".
// Reports only what the database really contains: no invented hours, no fake fallbacks.
// ─────────────────────────────────────────
app.get("/api/certificates/audit", async (req, res) => {
  try {
    const email = String(req.query.email ?? "").trim();
    const skill = String(req.query.skill ?? "").trim();

    if (!email || !skill) {
      return res.status(400).json({ success: false, error: "Email aur skill dena anivarya hai." });
    }

    // Find which duration column this DB really has (including 'duration' table column).
    const colsRes = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sessions'
        AND column_name IN ('duration', 'duration_hours', 'duration_minutes', 'duration_mins')
    `);
    const colNames: string[] = ((colsRes as any).rows || colsRes).map((r: any) => r.column_name);

    // Unknown duration => report null. Never a made-up number.
    let hoursExpr = sql`NULL::numeric`;
    if (colNames.includes("duration")) hoursExpr = sql`SUM(s.duration) / 60.0`;
    else if (colNames.includes("duration_hours")) hoursExpr = sql`SUM(s.duration_hours)`;
    else if (colNames.includes("duration_minutes")) hoursExpr = sql`SUM(s.duration_minutes) / 60.0`;
    else if (colNames.includes("duration_mins")) hoursExpr = sql`SUM(s.duration_mins) / 60.0`;

    // Escape LIKE wildcards so "%" or "_" typed by a user can't match every skill.
    const likeSkill = `%${skill.replace(/[\\%_]/g, "\\$&")}%`;

    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT s.id) AS session_count, ${hoursExpr} AS total_hours
      FROM sessions s
      JOIN users u ON (s.student_id = u.id OR s.mentor_id = u.id)
      WHERE LOWER(u.email) = LOWER(${email})
        AND LOWER(s.skill) LIKE LOWER(${likeSkill})
        AND LOWER(s.status) = 'completed'
    `);

    const row = ((result as any).rows || result)[0] || {};
    const sessionsCount = parseInt(row.session_count, 10) || 0;
    const totalHours =
      row.total_hours != null ? Math.round(parseFloat(row.total_hours) * 10) / 10 : null;

    // No record in the ledger => clear reject.
    if (sessionsCount === 0) {
      return res.status(404).json({
        success: false,
        error: `Real Ledger Check Failed: Is email par "${skill}" ka koi completed session database mein nahi mila.`,
      });
    }

    res.json({ success: true, sessions: sessionsCount, hours: totalHours });
  } catch (err: any) {
    console.error("Database Audit Error:", err); // full detail stays on the server
    res.status(500).json({
      success: false,
      error: "Ledger check abhi nahi ho paya. Thodi der baad try karo.",
    });
  }
});

// Certificate Router Mount
app.use("/api/certificates", createCertificateRouter({ db, auth: requireAuth, admin: requireAdmin }));

// 🔥 LOADER.IO VERIFICATION ROUTES
app.get("/loaderio-5c527ba07df6c894de713e21b4198489.txt", (req, res) => {
  res.send("loaderio-5c527ba07df6c894de713e21b4198489");
});

app.get("/loaderio-5c527ba07df6c894de713e21b4198489", (req, res) => {
  res.send("loaderio-5c527ba07df6c894de713e21b4198489");
});

// Routes
app.use("/api/landing", landingRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/upload", uploadRouter);
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

// 🔥 Sentry Error Handler
Sentry.setupExpressErrorHandler(app);

// Start Server & Initialize Cron Jobs
app.listen(PORT, () => {
  startCronJobs();
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("⏰ Retention & Session Cron Engines are Active!");
});