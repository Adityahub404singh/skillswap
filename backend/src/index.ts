import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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
app.use("/api/users", usersRouter);
app.use("/api/matching", matchingRouter);
app.use("/api/ratings", ratingsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/verification", verificationRouter);
app.use("/api/quiz", quizRouter);
app.use("/api/platform", platformRouter);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

