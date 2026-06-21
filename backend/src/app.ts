import { startCronJobs } from "./utils/cronJobs.js";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import sessionsRouter from "./routes/sessions.js";
import walletRouter from "./routes/wallet.js";
import skillsRouter from "./routes/skills.js";
import notificationsRouter from "./routes/notifications.js";
import matchingRouter from "./routes/matching.js";
import ratingsRouter from "./routes/ratings.js";
import paymentRouter from "./routes/payment.js";
import adminRouter from "./routes/admin.js";
import aiRouter from "./routes/ai.js";
import gamificationRouter from "./routes/gamification.js";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));

// ✅ Single body parser registered ONCE, before any routes, with a proper limit.
// This fixes the 413 "Payload Too Large" error that was happening because a
// second express.json() (with no limit override) was registered earlier and
// intercepting requests before they ever reached the 10mb version below.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
const strictLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15 });

app.use(globalLimiter);

app.get("/health", (_req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);

app.use("/api/auth", strictLimiter, authRouter);
app.use("/api/users", usersRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/match", matchingRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/admin", adminRouter);
app.use("/api/ai", aiRouter);
app.use("/api/gamification", gamificationRouter);
app.use("/api/ratings", ratingsRouter);

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

startCronJobs();

export default app;