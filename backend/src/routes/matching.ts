import { Router } from "express";
import { db } from "../db.js";
import { usersTable } from "../schema/users.js";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/:skill", async (req, res) => {
  try {
    const skill = req.params.skill;
    const mentors = await db
      .select()
      .from(usersTable)
      .where(sql`skills_teach::text ILIKE '%' || ${skill} || '%'`);
    
    res.json(mentors.map(m => ({ user: m })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
