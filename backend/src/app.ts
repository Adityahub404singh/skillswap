import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import sessionsRouter from "./routes/sessions.js";
import walletRouter from "./routes/wallet.js";
import skillsRouter from "./routes/skills.js";
import notificationsRouter from "./routes/notifications.js";
import ratingsRouter from "./routes/ratings.js";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// Routes
app.use("/api/auth",          authRouter);
app.use("/api/users",         usersRouter);
app.use("/api/sessions",      sessionsRouter);
app.use("/api/wallet",        walletRouter);
app.use("/api/skills",        skillsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/ratings",       ratingsRouter);

// 404 handler
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

export default app;
