import { Router } from "express";
import { db } from "../db.js";
import { eq, sql } from "drizzle-orm"; 
import { usersTable } from "../schema/index.js"; 
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

// Mentor submits proof
router.post("/submit", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { skill, proofLink } = req.body;
    // 🔥 FIX: Use ARRAY[..]::text[] for Postgres jsonb_set path
    await db.update(usersTable)
      .set({ 
        verifiedSkillsV2: sql`jsonb_set(COALESCE(${usersTable.verifiedSkillsV2}, '{}'::jsonb), ARRAY[${skill}]::text[], '"pending"'::jsonb)` 
      })
      .where(eq(usersTable.id, req.userId!));
      
    res.json({ success: true, message: "Verification request submitted!" });
  } catch (err: any) {
    console.error("Verification Submit Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Admin approves
// 🔥 FIX: requireAuth aur requireAdmin dono hone chahiye taaki middleware chain sahi chale
router.post("/approve", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId, skill } = req.body;
    
    // 🔥 FIX: Use ARRAY[..]::text[] for Postgres jsonb_set path
    await db.update(usersTable)
      .set({ 
        verifiedSkillsV2: sql`jsonb_set(COALESCE(${usersTable.verifiedSkillsV2}, '{}'::jsonb), ARRAY[${skill}]::text[], '"verified"'::jsonb)` 
      })
      .where(eq(usersTable.id, userId));
      
    res.json({ success: true, message: "Skill verified successfully!" });
  } catch (err: any) {
    console.error("Verification Approve Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;