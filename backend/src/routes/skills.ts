import { Router, type IRouter } from "express";
import { db, skillsTable, usersTable } from "@workspace/db";
import { eq, ilike, or, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { z } from "zod";

const router: IRouter = Router();

const CATEGORIES = [
  "Technology", "Design", "Business", "Language", "Music", "Sports", "Arts", "Science", "Other"
];

router.get("/categories", (_req, res) => {
  res.json(CATEGORIES);
});

router.get("/", async (req, res) => {
  try {
    const { search, category } = req.query;

    let skills = await db.select().from(skillsTable);

    if (search && typeof search === "string") {
      skills = skills.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (category && typeof category === "string") {
      skills = skills.filter(s => s.category === category);
    }

    const users = await db.select().from(usersTable);

    const result = skills.map(skill => {
      const mentorCount = users.filter(u =>
        Array.isArray(u.skillsTeach) && u.skillsTeach.map((s: string) => s.toLowerCase()).includes(skill.name.toLowerCase())
      ).length;
      return {
        id: skill.id,
        name: skill.name,
        category: skill.category,
        description: skill.description,
        createdBy: skill.createdBy,
        mentorCount,
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const createSkillSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = createSkillSchema.parse(req.body);

    const existing = await db.select().from(skillsTable).where(eq(skillsTable.name, body.name)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Conflict", message: "Skill already exists" });
      return;
    }

    const [skill] = await db.insert(skillsTable).values({
      name: body.name,
      category: body.category,
      description: body.description,
      createdBy: req.userId,
    }).returning();

    res.status(201).json({ ...skill, mentorCount: 0 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Bad Request", message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
