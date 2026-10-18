// backend/src/routes/landing.ts
// Public, READ-ONLY numbers for the landing page. Every value is computed from your real tables:
//   users, sessions, ratings. Nothing is estimated or defaulted. Cached for 5 minutes.
// Privacy: only first name + last initial are ever exposed. No emails, no ids.

import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db.js";

const router: IRouter = Router();

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

let cache: { at: number; data: any } | null = null;
const TTL_MS = 5 * 60 * 1000;

router.get("/", async (_req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=300");
    if (cache && Date.now() - cache.at < TTL_MS) return res.json({ success: true, data: cache.data });

    const [users, active, done, rating, reviews, recent] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS n FROM users`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM users WHERE last_active_date >= CURRENT_DATE - 30`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM sessions WHERE status IN ('completed', 'pending_clearance')`),
      db.execute(sql`SELECT COUNT(*)::int AS n, AVG(rating)::float AS avg FROM ratings`),
      db.execute(sql`
        SELECT r.rating, r.review, u.name AS rater_name, s.skill
        FROM ratings r
        LEFT JOIN users u    ON u.id = r.rater_id
        LEFT JOIN sessions s ON s.id = r.session_id
        WHERE r.review IS NOT NULL AND length(trim(r.review)) >= 15
        ORDER BY r.created_at DESC
        LIMIT 4`),
      db.execute(sql`
        SELECT s.skill, ms.name AS mentor_name, st.name AS student_name
        FROM sessions s
        LEFT JOIN users ms ON ms.id = s.mentor_id
        LEFT JOIN users st ON st.id = s.student_id
        WHERE s.status = 'completed' AND s.completed_at IS NOT NULL
        ORDER BY s.completed_at DESC
        LIMIT 4`),
    ]);

    const r0 = rowsOf(rating)[0] || {};
    const ratingCount = toNum(r0.n) ?? 0;

    const data = {
      totalUsers: toNum(rowsOf(users)[0]?.n),
      activeUsers: toNum(rowsOf(active)[0]?.n),
      completedSessions: toNum(rowsOf(done)[0]?.n),
      ratingCount,
      ratingAverage: ratingCount > 0 && toNum(r0.avg) !== null ? Math.round(Number(r0.avg) * 10) / 10 : null,
      recentReviews: rowsOf(reviews).map((r) => ({
        name: shortName(r.rater_name),
        text: String(r.review).trim().slice(0, 300),
        rating: toNum(r.rating),
        skill: r.skill ? String(r.skill) : undefined,
      })),
      liveExchanges: rowsOf(recent)
        .filter((r) => r.skill)
        .map((r) => `${firstName(r.student_name)} learned ${r.skill} with ${firstName(r.mentor_name)}`),
    };

    cache = { at: Date.now(), data };
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("[landing] stats error:", err?.message);
    res.status(200).json({ success: false }); // landing page just hides the blocks
  }
});

export default router;