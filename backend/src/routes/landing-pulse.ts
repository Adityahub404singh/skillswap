
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db.js";

/**
 * SkillSwap Skill Pulse
 * GET /api/landing/skill-pulse
 *
 * Public, read-only aggregate endpoint. It reports how many distinct member
 * profiles offer each skill and how many want to learn it. No names, IDs,
 * emails, avatars or other member-level data leave this route.
 *
 * This is an additive route: keep the existing landing.ts route unchanged.
 */
const router: IRouter = Router();
const TTL_MS = 3 * 60 * 1000;
let cached: { at: number; payload: { items: SkillPulseRow[]; generatedAt: string } } | null = null;

type SkillPulseRow = {
  skill: string;
  teachers: number;
  learners: number;
  gap: number;
};

const rowsOf = (result: any): any[] =>
  Array.isArray(result) ? result : Array.isArray(result?.rows) ? result.rows : [];

const asCount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

// Small per-IP limiter to protect this public aggregate endpoint.
const hits = new Map<string, number[]>();
function limit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const key = req.ip || "unknown";
  const recent = (hits.get(key) || []).filter((time) => now - time < 60_000);
  if (recent.length >= 30) {
    res.status(429).json({ success: false, error: "Too many requests. Try again shortly." });
    return;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 4000) {
    for (const [ip, times] of hits) {
      if (!times.some((time) => now - time < 60_000)) hits.delete(ip);
    }
  }
  next();
}

router.get("/skill-pulse", limit, async (_req, res) => {
  res.set("Cache-Control", "public, max-age=180, stale-while-revalidate=60");

  if (cached && Date.now() - cached.at < TTL_MS) {
    res.json({ success: true, data: cached.payload });
    return;
  }

  try {
    const result = await db.execute(sql`
      WITH offered AS (
        SELECT LOWER(TRIM(skill)) AS skill,
               COUNT(DISTINCT u.id)::int AS teachers
        FROM users u
        CROSS JOIN LATERAL unnest(u.skills_teach) AS t(skill)
        WHERE skill IS NOT NULL AND TRIM(skill) <> ''
        GROUP BY LOWER(TRIM(skill))
      ), wanted AS (
        SELECT LOWER(TRIM(skill)) AS skill,
               COUNT(DISTINCT u.id)::int AS learners
        FROM users u
        CROSS JOIN LATERAL unnest(u.skills_learn) AS l(skill)
        WHERE skill IS NOT NULL AND TRIM(skill) <> ''
        GROUP BY LOWER(TRIM(skill))
      )
      SELECT INITCAP(COALESCE(o.skill, w.skill)) AS skill,
             COALESCE(o.teachers, 0)::int AS teachers,
             COALESCE(w.learners, 0)::int AS learners
      FROM offered o
      FULL OUTER JOIN wanted w ON w.skill = o.skill
      ORDER BY COALESCE(w.learners, 0) DESC,
               COALESCE(o.teachers, 0) DESC,
               COALESCE(o.skill, w.skill) ASC
      LIMIT 12
    `);

    const items: SkillPulseRow[] = rowsOf(result)
      .map((row) => {
        const teachers = asCount(row.teachers);
        const learners = asCount(row.learners);
        return {
          skill: String(row.skill || "").trim(),
          teachers,
          learners,
          gap: learners - teachers,
        };
      })
      .filter((row) => row.skill.length > 0);

    const payload = { items, generatedAt: new Date().toISOString() };
    cached = { at: Date.now(), payload };
    res.json({ success: true, data: payload });
  } catch (error: any) {
    console.error("[landing-skill-pulse] query failed:", error?.message || error);
    // Graceful empty state: never fabricate a fallback market.
    res.status(200).json({ success: true, data: { items: [], generatedAt: null } });
  }
});

export default router;
