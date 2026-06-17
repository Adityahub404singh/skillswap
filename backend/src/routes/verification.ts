import { Router } from "express";
import { db } from "../db.js";
import { eq, sql } from "drizzle-orm"; // 🔥 FIX: 'sql' imported here
import { usersTable } from "../schema/index.js"; // 🔥 FIX: Schema correctly imported
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

// Mentor submits proof
router.post("/submit", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { skill, proofLink } = req.body;
    await db.update(usersTable)
      // 🔥 FIX: Changed to verifiedSkillsV2 to match your schema
      .set({ verifiedSkillsV2: sql`jsonb_set(COALESCE(${usersTable.verifiedSkillsV2}, '{}'::jsonb), '{${skill}}', '"pending"')` })
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
    // 🔥 FIX: Changed to verifiedSkillsV2
    .set({ verifiedSkillsV2: sql`jsonb_set(COALESCE(${usersTable.verifiedSkillsV2}, '{}'::jsonb), '{${skill}}', '"verified"')` })
    .where(eq(usersTable.id, userId));
  res.json({ success: true });
});

export default router;