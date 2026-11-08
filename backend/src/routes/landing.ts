// backend/src/routes/landing.ts
//
// Public, READ-ONLY data for the landing page. Every value is computed from your real tables
// (users, sessions, ratings). Nothing is estimated, defaulted or invented.
//
//   GET /api/landing            -> platform numbers, 14-day activity, skill supply & demand,
//                                  rating breakdown, top mentors, recent reviews, recent activity
//   GET /api/landing/match      -> "find your swap": ?teach=python&learn=guitar
//                                  how many members want what you teach, who teaches what you want,
//                                  and how many perfect two-way swaps exist
//
// Privacy: only aggregates, first names and "first name + last initial" are ever exposed.
// No emails, no ids, no avatars. Every query is a SELECT. Responses are cached.
//
// Mount in src/index.ts:
//   import landingRouter from "./routes/landing.js";
//   app.use("/api/landing", landingRouter);

import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db.js";

const router: IRouter = Router();

// ---------------------------------------------------------------- helpers

const DONE = sql.raw("('completed', 'pending_clearance')"); // sessions that really happened

const rowsOf = (r: any): any[] => (Array.isArray(r) ? r : (r && r.rows) || []);
const toNum = (v: unknown): number | null => {
  const n = Number(v);
  return v !== null && v !== undefined && Number.isFinite(n) ? n : null;
};
const firstName = (n: unknown): string => String(n || "").trim().split(/\s+/)[0]?.slice(0, 20) || "A member";
const shortName = (n: unknown): string => {
  const p = String(n || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "SkillSwap member";
  const last = p.length > 1 ? ` ${p[p.length - 1][0].toUpperCase()}.` : "";
  return `${p[0].slice(0, 20)}${last}`;
};
const cleanTerm = (v: unknown): string =>
  String(v ?? "").replace(/[\u0000-\u001F\u007F<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
const likeOf = (term: string): string => "%" + term.replace(/[\\%_]/g, (m) => "\\" + m) + "%";

/** Run one query. A failing query (e.g. a column you renamed) only empties its own block. */
async function run(label: string, q: Promise<any>): Promise<any[]> {
  try {
    return rowsOf(await q);
  } catch (err: any) {
    console.error(`[landing] ${label} failed:`, err?.message);
    return [];
  }
}

function limiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) {
      res.status(429).json({ success: false, error: "Too many requests" });
      return;
    }
    arr.push(now);
    hits.set(key, arr);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    next();
  };
}

// ---------------------------------------------------------------- GET /api/landing

let cache: { at: number; data: any } | null = null;
const TTL_MS = 5 * 60 * 1000;

router.get("/", async (_req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=300");
    if (cache && Date.now() - cache.at < TTL_MS) return void res.json({ success: true, data: cache.data });

    const [
      users, active, newWeek, done, hours, groups, streak, rating, breakdown,
      perDay, learned, offered, wanted, reviews, recent, mentors,
    ] = await Promise.all([
      run("users", db.execute(sql`SELECT COUNT(*)::int AS n FROM users`)),
      run("active", db.execute(sql`SELECT COUNT(*)::int AS n FROM users WHERE last_active_date >= CURRENT_DATE - 30`)),
      run("newWeek", db.execute(sql`SELECT COUNT(*)::int AS n FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`)),
      run("done", db.execute(sql`SELECT COUNT(*)::int AS n FROM sessions WHERE status IN ${DONE}`)),
      run("hours", db.execute(sql`
        SELECT COALESCE(SUM(COALESCE(NULLIF(active_minutes, 0), NULLIF(actual_duration, 0), duration)), 0) / 60.0 AS h
        FROM sessions WHERE status IN ${DONE}`)),
      run("groups", db.execute(sql`SELECT COUNT(*)::int AS n FROM sessions WHERE is_group = 1 AND status IN ${DONE}`)),
      run("streak", db.execute(sql`SELECT COALESCE(MAX(longest_streak), 0)::int AS n FROM users`)),
      run("rating", db.execute(sql`SELECT COUNT(*)::int AS n, AVG(rating)::float AS avg FROM ratings`)),
      run("breakdown", db.execute(sql`SELECT rating, COUNT(*)::int AS n FROM ratings GROUP BY rating`)),
      run("perDay", db.execute(sql`
        SELECT to_char(d, 'YYYY-MM-DD') AS day, COALESCE(c.n, 0)::int AS n
        FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, interval '1 day') AS d
        LEFT JOIN (
          SELECT completed_at::date AS day, COUNT(*) AS n
          FROM sessions
          WHERE status IN ${DONE} AND completed_at >= CURRENT_DATE - 13
          GROUP BY 1
        ) c ON c.day = d::date
        ORDER BY d`)),
      run("learned", db.execute(sql`
        SELECT MIN(skill) AS skill, COUNT(*)::int AS n
        FROM sessions WHERE status IN ${DONE} AND skill IS NOT NULL AND trim(skill) <> ''
        GROUP BY LOWER(trim(skill)) ORDER BY n DESC, MIN(skill) LIMIT 6`)),
      run("offered", db.execute(sql`
        SELECT INITCAP(s) AS skill, COUNT(*)::int AS n
        FROM (SELECT LOWER(TRIM(unnest(skills_teach))) AS s FROM users) t
        WHERE s <> '' GROUP BY s ORDER BY n DESC, s LIMIT 6`)),
      run("wanted", db.execute(sql`
        SELECT INITCAP(s) AS skill, COUNT(*)::int AS n
        FROM (SELECT LOWER(TRIM(unnest(skills_learn))) AS s FROM users) t
        WHERE s <> '' GROUP BY s ORDER BY n DESC, s LIMIT 6`)),
      run("reviews", db.execute(sql`
        SELECT r.rating, r.review, u.name AS rater_name, s.skill
        FROM ratings r
        LEFT JOIN users u    ON u.id = r.rater_id
        LEFT JOIN sessions s ON s.id = r.session_id
        WHERE r.review IS NOT NULL AND length(trim(r.review)) >= 15
        ORDER BY r.created_at DESC
        LIMIT 4`)),
      run("recent", db.execute(sql`
        SELECT s.skill, ms.name AS mentor_name, st.name AS student_name
        FROM sessions s
        LEFT JOIN users ms ON ms.id = s.mentor_id
        LEFT JOIN users st ON st.id = s.student_id
        WHERE s.status = 'completed' AND s.completed_at IS NOT NULL
        ORDER BY s.completed_at DESC
        LIMIT 4`)),
      run("mentors", db.execute(sql`
        SELECT name, skills_teach, average_rating, sessions_completed
        FROM users
        WHERE average_rating > 0 AND sessions_completed > 0
        ORDER BY average_rating DESC, sessions_completed DESC
        LIMIT 4`)),
    ]);

    const r0 = rating[0] || {};
    const ratingCount = toNum(r0.n) ?? 0;

    const dist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    for (const b of breakdown) {
      const k = String(Math.round(Number(b.rating)));
      if (k in dist) dist[k] += toNum(b.n) ?? 0;
    }

    const pairs = (rows: any[]) =>
      rows.filter((r) => r.skill).map((r) => ({ skill: String(r.skill), count: toNum(r.n) ?? 0 }));

    const data = {
      totalUsers: toNum(users[0]?.n),
      activeUsers: toNum(active[0]?.n),
      newThisWeek: toNum(newWeek[0]?.n),
      completedSessions: toNum(done[0]?.n),
      hoursTaught: hours[0] ? Math.round(Number(hours[0].h) * 10) / 10 : null,
      groupClasses: toNum(groups[0]?.n),
      longestStreak: toNum(streak[0]?.n),
      ratingCount,
      ratingAverage: ratingCount > 0 && toNum(r0.avg) !== null ? Math.round(Number(r0.avg) * 10) / 10 : null,
      ratingBreakdown: dist,
      sessionsPerDay: perDay.map((r) => ({ date: String(r.day), count: toNum(r.n) ?? 0 })),
      topLearnedSkills: pairs(learned),
      mostOffered: pairs(offered),
      mostWanted: pairs(wanted),
      topMentors: mentors
        .map((m) => ({
          name: shortName(m.name),
          skills: Array.isArray(m.skills_teach) ? m.skills_teach.filter(Boolean).slice(0, 3).map(String) : [],
          rating: toNum(m.average_rating),
          sessions: toNum(m.sessions_completed),
        }))
        .filter((m) => m.rating !== null),
      recentReviews: reviews.map((r) => ({
        name: shortName(r.rater_name),
        text: String(r.review).trim().slice(0, 300),
        rating: toNum(r.rating),
        skill: r.skill ? String(r.skill) : undefined,
      })),
      liveExchanges: recent
        .filter((r) => r.skill)
        .map((r) => `${firstName(r.student_name)} learned ${r.skill} with ${firstName(r.mentor_name)}`),
      generatedAt: new Date().toISOString(),
    };

    cache = { at: Date.now(), data };
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("[landing] stats error:", err?.message);
    res.status(200).json({ success: false }); // the page just hides its data blocks
  }
});

// ---------------------------------------------------------------- GET /api/landing/match

const matchCache = new Map<string, { at: number; data: any }>();
const MATCH_TTL_MS = 60 * 1000;

router.get("/match", limiter(40, 60 * 1000), async (req, res) => {
  try {
    const teach = cleanTerm(req.query.teach);
    const learn = cleanTerm(req.query.learn);
    const hasTeach = teach.length >= 2;
    const hasLearn = learn.length >= 2;
    if (!hasTeach && !hasLearn) return void res.status(400).json({ success: false, error: "Enter at least 2 characters" });

    const key = `${hasTeach ? teach.toLowerCase() : ""}|${hasLearn ? learn.toLowerCase() : ""}`;
    const hit = matchCache.get(key);
    if (hit && Date.now() - hit.at < MATCH_TTL_MS) return void res.json({ success: true, data: hit.data });

    const teachLike = likeOf(teach);
    const learnLike = likeOf(learn);

    // members whose "learn" list contains what the visitor can teach
    const wantTeach = hasTeach
      ? run("wantTeach", db.execute(sql`
          SELECT COUNT(*)::int AS n FROM users
          WHERE EXISTS (SELECT 1 FROM unnest(skills_learn) AS l(s) WHERE s ILIKE ${teachLike} ESCAPE '\\')`))
      : Promise.resolve([] as any[]);

    // members who teach what the visitor wants to learn
    const teachersCount = hasLearn
      ? run("teachersCount", db.execute(sql`
          SELECT COUNT(*)::int AS n FROM users
          WHERE EXISTS (SELECT 1 FROM unnest(skills_teach) AS t(s) WHERE s ILIKE ${learnLike} ESCAPE '\\')`))
      : Promise.resolve([] as any[]);

    const teachers = hasLearn
      ? run("teachers", db.execute(sql`
          SELECT name, skills_teach, average_rating, sessions_completed FROM users
          WHERE EXISTS (SELECT 1 FROM unnest(skills_teach) AS t(s) WHERE s ILIKE ${learnLike} ESCAPE '\\')
          ORDER BY average_rating DESC, sessions_completed DESC
          LIMIT 4`))
      : Promise.resolve([] as any[]);

    // perfect two-way swaps: they teach what I want AND want what I teach
    const mutual = hasTeach && hasLearn
      ? run("mutual", db.execute(sql`
          SELECT COUNT(*)::int AS n FROM users
          WHERE EXISTS (SELECT 1 FROM unnest(skills_teach) AS t(s) WHERE s ILIKE ${learnLike} ESCAPE '\\')
            AND EXISTS (SELECT 1 FROM unnest(skills_learn) AS l(s) WHERE s ILIKE ${teachLike} ESCAPE '\\')`))
      : Promise.resolve([] as any[]);

    const [wt, tc, tl, mu] = await Promise.all([wantTeach, teachersCount, teachers, mutual]);

    const data = {
      teach: hasTeach ? teach : null,
      learn: hasLearn ? learn : null,
      membersWantingYourSkill: hasTeach ? toNum(wt[0]?.n) ?? 0 : null,
      membersTeachingYourGoal: hasLearn ? toNum(tc[0]?.n) ?? 0 : null,
      perfectSwaps: hasTeach && hasLearn ? toNum(mu[0]?.n) ?? 0 : null,
      mentors: tl
        .map((m) => ({
          name: shortName(m.name),
          skills: Array.isArray(m.skills_teach) ? m.skills_teach.filter(Boolean).slice(0, 3).map(String) : [],
          rating: toNum(m.average_rating),
          sessions: toNum(m.sessions_completed),
        })),
    };

    if (matchCache.size > 300) matchCache.clear();
    matchCache.set(key, { at: Date.now(), data });
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("[landing] match error:", err?.message);
    res.status(200).json({ success: false });
  }
});

export default router;
