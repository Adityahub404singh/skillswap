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

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}));
app.use(express.json());

// Global limit: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit for sensitive actions
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: "Too many sensitive actions detected, please slow down." },
});

app.use(globalLimiter);

app.get("/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// ROUTES (Auth and Users restored!)
app.use("/api/auth", strictLimiter, authRouter);
app.use("/api/users",         usersRouter);
app.use("/api/sessions", strictLimiter, sessionsRouter);
app.use("/api/wallet",        walletRouter);
app.use("/api/skills",        skillsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/match",         matchingRouter);
app.use("/api/ratings",       ratingsRouter);

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

export default app;
