import { Router } from "express";
import { db } from "../db.js";
import { eq } from "drizzle-orm";
import { usersTable } from "../db.js";
import { requireAuth, requireAdmin, AuthRequest } from "../middlewares/auth.js";

const router = Router();

// Mentor submits proof
router.post("/submit", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { skill, proofLink } = req.body;
    await db.update(usersTable)
      .set({ verifiedSkills: sql`jsonb_set(verified_skills, '{${skill}}', '"pending"')` })
      .where(eq(usersTable.id, req.userId!));
    res.json({ success: true, message: "Verification request submitted!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin approves
router.post("/approve", requireAdmin, async (req, res) => {
  const { userId, skill } = req.body;
  await db.update(usersTable)
    .set({ verifiedSkills: sql`jsonb_set(verified_skills, '{${skill}}', '"verified"')` })
    .where(eq(usersTable.id, userId));
  res.json({ success: true });
});

export default router;