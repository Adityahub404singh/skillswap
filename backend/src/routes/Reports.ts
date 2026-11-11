import { Router, type IRouter } from "express";
import { db } from "../db.js";
import { and, eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { reportsTable, usersTable } from "../schema/index.js";
import { z } from "zod";

const router: IRouter = Router();

const reportSchema = z.object({
  reason: z.enum(["spam", "abuse", "fake_profile", "inappropriate", "other"]),
  message: z.string().trim().max(500).optional(),
}).strict();

function getAuthenticatedUserId(req: AuthRequest): number | null {
  const id = Number(req.userId);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// POST /api/reports/:userId
router.post("/:userId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const reporterId = getAuthenticatedUserId(req);
    if (!reporterId) {
      return res.status(401).json({ error: "Invalid login session. Please log in again." });
    }

    const reportedUserId = Number(req.params.userId);
    if (!Number.isSafeInteger(reportedUserId) || reportedUserId <= 0) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    if (reportedUserId === reporterId) {
      return res.status(400).json({ error: "You cannot report yourself" });
    }

    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid report details",
        details: parsed.error.flatten(),
      });
    }

    const [target] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, reportedUserId))
      .limit(1);

    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    const [existing] = await db
      .select({ id: reportsTable.id })
      .from(reportsTable)
      .where(
        and(
          eq(reportsTable.reporterId, reporterId),
          eq(reportsTable.reportedUserId, reportedUserId),
          eq(reportsTable.status, "pending"),
        ),
      )
      .limit(1);

    if (existing) {
      return res.status(409).json({
        error: "You've already reported this user. Our team is reviewing it.",
      });
    }

    const [created] = await db
      .insert(reportsTable)
      .values({
        reporterId,
        reportedUserId,
        reason: parsed.data.reason,
        message: parsed.data.message?.trim() || null,
      })
      .returning({ id: reportsTable.id });

    return res.status(201).json({
      success: true,
      reportId: created?.id,
      message: "Report submitted. Our team will review it shortly.",
    });
  } catch (error: any) {
    // The partial unique index in the migration is the final concurrency guard.
    if (error?.code === "23505") {
      return res.status(409).json({
        error: "You've already reported this user. Our team is reviewing it.",
      });
    }

    console.error("[reports] create failed:", error);
    return res.status(500).json({ error: "Failed to submit report" });
  }
});

export default router;
