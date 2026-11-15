
import "dotenv/config";

import express from "express";
import cors, { type CorsOptions } from "cors";

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

import { db, pool } from "./db.js";
import { sql } from "drizzle-orm";

import {
  requireAuth,
  requireAdmin,
  type AuthRequest,
} from "./middlewares/auth.js";

// SkillSwap Connect
import { createConnectRouter } from "./connect/routes/index.js";
import { connectAuthenticate } from "./connect/middleware/auth.js";
import { startConnectRuntime } from "./connect/workers/connect-runtime.js";

// Existing routes
import reportsRouter from "./routes/Reports.js";
import uploadRouter from "./routes/upload.js";
import { createCertificateRouter } from "./routes/certificates.js";

import landingRouter from "./routes/landing.js";
import landingPulseRouter from "./routes/landing-pulse.js";

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

// =====================================================
// SENTRY INITIALIZATION
// =====================================================

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  integrations: [
    nodeProfilingIntegration(),
    Sentry.expressIntegration(),
  ],

  tracesSampleRate: 1.0,
});

// =====================================================
// EXPRESS APP
// =====================================================

const app = express();

const PORT = Number(process.env.PORT) || 3001;

// =====================================================
// CORS CONFIGURATION
// =====================================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://localhost",
  "https://skillswap.app",
  "https://www.skillswap.app",
  "capacitor://localhost",
  process.env.FRONTEND_URL,
]
  .filter((origin): origin is string => Boolean(origin))
  .map((origin) => origin.replace(/\/$/, ""));

// Matches deployments such as:
// https://skillswap-feature-branch.vercel.app
const vercelPreviewPattern =
  /^https:\/\/skillswap-[a-z0-9-]+\.vercel\.app$/i;

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Requests without an Origin header can include server-to-server
    // requests, health checks and command-line clients.
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/$/, "");

    if (
      allowedOrigins.includes(normalizedOrigin) ||
      vercelPreviewPattern.test(normalizedOrigin)
    ) {
      return callback(null, true);
    }

    console.warn(`CORS blocked unlisted origin: ${origin}`);

    return callback(
      new Error("CORS origin is not allowed")
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  optionsSuccessStatus: 204,
};

// CORS must run before routes and authentication.
app.use(cors(corsOptions));

// =====================================================
// BODY PARSERS
// =====================================================

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    limit: "1mb",
    extended: true,
  })
);

// =====================================================
// CERTIFICATE LEDGER AUDIT
// =====================================================

// This endpoint is authenticated.
// A user can only inspect their own session records.

app.get(
  "/api/certificates/audit",
  requireAuth,
  async (req, res) => {
    try {
      const authReq = req as AuthRequest;

      const authenticatedUserId = String(
        authReq.userId ?? ""
      ).trim();

      if (!authenticatedUserId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const email = String(
        req.query.email ?? ""
      ).trim();

      const skill = String(
        req.query.skill ?? ""
      ).trim();

      if (!email || !skill) {
        return res.status(400).json({
          success: false,
          error: "Email aur skill dena anivarya hai.",
        });
      }

      // Find the duration column available in the current schema.
      const colsRes = await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'sessions'
          AND column_name IN (
            'duration',
            'duration_hours',
            'duration_minutes',
            'duration_mins'
          )
      `);

      const columnRows: any[] =
        (colsRes as any).rows ?? colsRes;

      const colNames: string[] = columnRows.map(
        (row: any) => row.column_name
      );

      // Duration is converted to hours.
      // The "duration" column is treated as minutes,
      // matching the previous implementation.
      let hoursExpr = sql`NULL::numeric`;

      if (colNames.includes("duration")) {
        hoursExpr = sql`
          SUM(s.duration) / 60.0
        `;
      } else if (colNames.includes("duration_hours")) {
        hoursExpr = sql`
          SUM(s.duration_hours)
        `;
      } else if (colNames.includes("duration_minutes")) {
        hoursExpr = sql`
          SUM(s.duration_minutes) / 60.0
        `;
      } else if (colNames.includes("duration_mins")) {
        hoursExpr = sql`
          SUM(s.duration_mins) / 60.0
        `;
      }

      // Match only the authenticated user's records.
      // strpos avoids SQL LIKE wildcard escaping problems.
      const result = await db.execute(sql`
        SELECT
          COUNT(DISTINCT s.id) AS session_count,
          ${hoursExpr} AS total_hours

        FROM sessions s

        JOIN users u
          ON (
            s.student_id = u.id
            OR s.mentor_id = u.id
          )

        WHERE u.id = ${authenticatedUserId}
          AND LOWER(u.email) = LOWER(${email})
          AND STRPOS(
            LOWER(s.skill),
            LOWER(${skill})
          ) > 0
          AND LOWER(s.status) = 'completed'
      `);

      const resultRows: any[] =
        (result as any).rows ?? result;

      const row = resultRows[0] ?? {};

      const sessionsCount =
        Number.parseInt(
          String(row.session_count ?? "0"),
          10
        ) || 0;

      const rawHours =
        row.total_hours != null
          ? Number.parseFloat(String(row.total_hours))
          : null;

      const totalHours =
        rawHours !== null && Number.isFinite(rawHours)
          ? Math.round(rawHours * 10) / 10
          : null;

      if (sessionsCount === 0) {
        return res.status(404).json({
          success: false,
          error:
            "Is skill ke liye koi completed session record nahi mila.",
        });
      }

      return res.status(200).json({
        success: true,
        sessions: sessionsCount,
        hours: totalHours,
      });

    } catch (error) {
      console.error(
        "Certificate Ledger Audit Error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Ledger check abhi nahi ho paya. Thodi der baad try karo.",
      });
    }
  }
);

// =====================================================
// CERTIFICATE ROUTER
// =====================================================

app.use(
  "/api/certificates",
  createCertificateRouter({
    db,
    auth: requireAuth,
    admin: requireAdmin,
  })
);

// =====================================================
// LOADER.IO VERIFICATION
// =====================================================

const loaderVerificationToken =
  "loaderio-5c527ba07df6c894de713e21b4198489";

app.get(
  `/${loaderVerificationToken}.txt`,
  (_req, res) => {
    res.type("text/plain").send(loaderVerificationToken);
  }
);

app.get(
  `/${loaderVerificationToken}`,
  (_req, res) => {
    res.type("text/plain").send(loaderVerificationToken);
  }
);

// =====================================================
// EXISTING API ROUTES
// =====================================================

app.use("/api/landing", landingRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

app.use("/api/landing", landingPulseRouter);

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

// =====================================================
// SKILLSWAP CONNECT
// =====================================================

// Connect routes use the existing authentication system.
// No separate JWT implementation is introduced here.

app.use(
  "/api/connect",
  createConnectRouter({
    pool,
    authenticate: connectAuthenticate,
  })
);

// =====================================================
// SENTRY ERROR HANDLER
// =====================================================

// Keep this after all routes so Sentry can capture
// errors thrown by route handlers.

Sentry.setupExpressErrorHandler(app);

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
  (
    error: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled API Error:", error);

    if (res.headersSent) {
      return;
    }

    const statusCode =
      Number(error.statusCode ?? error.status) || 500;

    return res.status(statusCode).json({
      success: false,
      error:
        statusCode >= 500
          ? "Internal server error"
          : error.message || "Request failed",
    });
  }
);

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  try {
    startCronJobs();
    startConnectRuntime(pool);

    console.log(
      "Retention, Session & Connect Email/Reminder Engines are Active!"
    );
  } catch (error) {
    console.error(
      "Cron Job Initialization Failed:",
      error
    );
  }
});
