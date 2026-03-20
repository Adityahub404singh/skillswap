import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import skillsRouter from "./skills.js";
import matchingRouter from "./matching.js";
import sessionsRouter from "./sessions.js";
import walletRouter from "./wallet.js";
import ratingsRouter from "./ratings.js";
import aiRouter from "./ai.js";
import adminRouter from "./admin.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/skills", skillsRouter);
router.use("/match", matchingRouter);
router.use("/sessions", sessionsRouter);
router.use("/wallet", walletRouter);
router.use("/ratings", ratingsRouter);
router.use("/ai", aiRouter);
router.use("/admin", adminRouter);

export default router;
