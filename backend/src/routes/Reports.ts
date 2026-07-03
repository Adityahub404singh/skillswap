import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { reportsTable, usersTable } from "../schema/index.js";
import { z } from "zod";

const router: IRouter = Router();

const reportSchema = z.object({
  reason: z.enum(["spam", "abuse", "fake_profile", "inappropriate", "other"]),
  message: z.string().max(500).optional(),
});

// POST /api/reports/:userId — Report a user (abuse, spam, fake profile, etc.)
router.post("/:userId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const reportedUserId = parseInt(req.params.userId as string);
    const reporterId = req.userId!;

    if (isNaN(reportedUserId)) return res.status(400).json({ error: "Invalid user ID" });
    if (reportedUserId === reporterId) {
      return res.status(400).json({ error: "You cannot report yourself" });
    }

    const body = reportSchema.parse(req.body);

    const [target] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, reportedUserId));
    if (!target) return res.status(404).json({ error: "User not found" });

    // Duplicate-report guard — ek user ko baar baar spam report na kar sake
    const existing = await db.select().from(reportsTable).where(
      and(
        eq(reportsTable.reporterId, reporterId),
        eq(reportsTable.reportedUserId, reportedUserId),
        eq(reportsTable.status, "pending")
      )
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "You've already reported this user. Our team is reviewing it." });
    }

    await db.insert(reportsTable).values({
      reporterId,
      reportedUserId,
      reason: body.reason,
      message: body.message,
    });

    res.json({ success: true, message: "Report submitted. Our team will review it shortly." });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.message });
    console.error("Report error:", err);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

export default router;