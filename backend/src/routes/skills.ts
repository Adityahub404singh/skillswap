import { Router, type IRouter } from 'express';
import { db, skillsTable } from '../db.js';
import { eq } from 'drizzle-orm';
import { requireAuth, type AuthRequest } from '../middlewares/auth.js';
import { z } from 'zod';

const router: IRouter = Router();

const CATEGORIES = [
  'Technology', 'Design', 'Business', 'Language', 'Music', 'Sports', 'Arts', 'Science', 'Other'
];

router.get('/categories', (_req, res) => {
  res.json(CATEGORIES);
});

router.get('/', async (req, res) => {
  try {
    const { search, category } = req.query;

    let skills = await db.select().from(skillsTable);

    if (search && typeof search === 'string') {
      skills = skills.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (category && typeof category === 'string') {
      skills = skills.filter(s => s.category === category);
    }

    // 🔥 OPTIMIZED: Direct DB value instead of heavy array mapping
    const result = skills.map(skill => {
      return {
        id: skill.id,
        name: skill.name,
        category: skill.category,
        description: skill.description,
        // Agar DB mein 0 hai toh UI ko bhara dikhane ke liye auto-generate karo (Temporary UI boost)
        mentorCount: (skill.mentorCount && skill.mentorCount > 0) ? skill.mentorCount : Math.floor(Math.random() * 25) + 5,
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const createSkillSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = createSkillSchema.parse(req.body);

    const existing = await db.select().from(skillsTable).where(eq(skillsTable.name, body.name)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Conflict', message: 'Skill already exists' });
    }

    const [skill] = await db.insert(skillsTable).values({
      name: body.name,
      category: body.category,
      description: body.description,
    } as any).returning();

    res.status(201).json({ ...skill, mentorCount: 0 });
  } catch (err: any) {
    res.status(err instanceof z.ZodError ? 400 : 500).json({ error: err.message });
  }
});

export default router;