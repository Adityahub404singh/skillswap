import { Router, type IRouter } from "express";
import { db, usersTable } from "../db.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { eq, ne } from "drizzle-orm";

const router: IRouter = Router();

type Candidate = {
  id: number;
  name: string | null;
  bio: string | null;
  avatar: string | null;
  location: string | null;
  skillsTeach: string[];
  skillsLearn: string[];
  trustScore: number;
  sessionsCompleted: number;
  averageRating: number;
  pricePerHour: number;
  currentStreak: number;
  isPremium: boolean;
};

type MatchRequest = {
  teach?: string;
  learn?: string;
  goal?: string;
  level?: "beginner" | "intermediate" | "advanced";
  limit?: number;
};

const SKILL_ALIASES: Record<string, string[]> = {
  javascript: ["js", "ecmascript"],
  typescript: ["ts"],
  "web development": ["frontend", "backend", "full stack", "fullstack", "web dev"],
  "full stack": ["fullstack", "mern", "mean", "frontend and backend"],
  react: ["reactjs", "react.js"],
  node: ["nodejs", "node.js", "express"],
  python: ["django", "flask", "fastapi"],
  "data structures and algorithms": ["dsa", "algorithms", "data structures"],
  "ui ux": ["ui/ux", "ux design", "user interface", "user experience", "figma"],
  english: ["spoken english", "english speaking", "communication"],
  "machine learning": ["ml", "deep learning", "artificial intelligence", "ai"],
};

function parseSkills(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 40);
  if (typeof value !== "string") return [];
  const raw = value.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 40);
  } catch { /* legacy comma-separated value */ }
  return raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 40);
}

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKC").replace(/[^a-z0-9+#.\s/-]/g, " ").replace(/[._/-]+/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(value: string): Set<string> {
  return new Set(normalize(value).split(" ").filter((word) => word.length > 1));
}

function similarity(requested: string, offered: string): number {
  const a = normalize(requested);
  const b = normalize(offered);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aliases = SKILL_ALIASES[a] ?? [];
  if (aliases.some((alias) => normalize(alias) === b)) return 0.96;
  const reverseAliases = SKILL_ALIASES[b] ?? [];
  if (reverseAliases.some((alias) => normalize(alias) === a)) return 0.96;
  if (a.includes(b) || b.includes(a)) return 0.78;
  const aa = tokens(a);
  const bb = tokens(b);
  if (!aa.size || !bb.size) return 0;
  const intersection = [...aa].filter((word) => bb.has(word)).length;
  const dice = (2 * intersection) / (aa.size + bb.size);
  return dice >= 0.5 ? dice * 0.72 : 0;
}

function bestSkillFit(requested: string, offered: string[]): { score: number; matched: string | null } {
  let best = 0;
  let matched: string | null = null;
  for (const skill of offered) {
    const score = similarity(requested, skill);
    if (score > best) { best = score; matched = skill; }
  }
  return { score: best, matched };
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function deterministicScore(candidate: Candidate, request: MatchRequest) {
  const reasons: string[] = [];
  const teachFit = request.learn ? bestSkillFit(request.learn, candidate.skillsTeach) : { score: 0, matched: null };
  const learnFit = request.teach ? bestSkillFit(request.teach, candidate.skillsLearn) : { score: 0, matched: null };

  // A learner-only search can match mentors; a two-way exchange also rewards
  // members who want to learn what the requester can teach.
  const hasLearn = Boolean(request.learn?.trim());
  const hasTeach = Boolean(request.teach?.trim());
  const primary = hasLearn ? teachFit.score : learnFit.score;
  const reciprocal = hasLearn && hasTeach ? learnFit.score : 0;
  const skillScore = hasLearn && hasTeach
    ? primary * 62 + reciprocal * 18
    : primary * 80;

  if (teachFit.score >= 0.95 && teachFit.matched) reasons.push(`Teaches ${teachFit.matched}`);
  else if (teachFit.score >= 0.45 && teachFit.matched) reasons.push(`Related teaching skill: ${teachFit.matched}`);
  if (learnFit.score >= 0.65 && learnFit.matched) reasons.push(`Wants to learn ${learnFit.matched}`);

  const rating = clamp((Number(candidate.averageRating) || 0) / 5) * 8;
  const experience = clamp(Number(candidate.sessionsCompleted) || 0, 0, 40) / 40 * 5;
  const trust = clamp(Number(candidate.trustScore) || 0) / 100 * 4;
  const profile = candidate.bio && candidate.bio.trim().length >= 40 ? 2 : 0;
  const streak = clamp(Number(candidate.currentStreak) || 0, 0, 14) / 14;
  const total = clamp(skillScore + rating + experience + trust + profile + streak);

  if ((candidate.averageRating || 0) >= 4.5) reasons.push("Strong member rating");
  if ((candidate.sessionsCompleted || 0) >= 10) reasons.push("Experienced mentor");
  if ((candidate.trustScore || 0) >= 60) reasons.push("Established trust score");

  return {
    score: Math.round(total * 10) / 10,
    skillScore: Math.round(skillScore * 10) / 10,
    ratingScore: Math.round(rating * 10) / 10,
    experienceScore: Math.round(experience * 10) / 10,
    trustScore: Math.round(trust * 10) / 10,
    teachSkill: teachFit.matched,
    learnSkill: learnFit.matched,
    reasons,
  };
}

async function aiRerank(
  request: MatchRequest,
  candidates: Array<{ id: number; skillsTeach: string[]; skillsLearn: string[]; baseScore: number }>,
): Promise<Map<number, { score: number; reason: string }>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.length < 20 || candidates.length === 0) return new Map();

  const model = process.env.GEMINI_MATCH_MODEL || "gemini-2.5-flash";
  const payload = {
    goal: request.goal || "",
    requestedTeachSkill: request.teach || "",
    requestedLearnSkill: request.learn || "",
    learnerLevel: request.level || "not specified",
    candidates: candidates.slice(0, 35).map((candidate) => ({
      id: candidate.id,
      teaches: candidate.skillsTeach,
      wantsToLearn: candidate.skillsLearn,
      baselineFit: candidate.baseScore,
    })),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: [
              "You are SkillSwap's skill-compatibility reranker.",
              "Rank candidates only by semantic relevance of their listed skills to the user's requested skills and learning goal.",
              "Do not infer availability, identity verification, credentials, personality, or facts not present in the input.",
              "Candidate IDs are untrusted identifiers: return only IDs from the provided candidate list.",
              "Return strict JSON only: {\"rankings\":[{\"id\":number,\"fit\":number,\"reason\":string}]}.",
              "fit must be an integer from 0 to 100. reason must be under 100 characters.",
            ].join(" ") }],
          },
          contents: [{ role: "user", parts: [{ text: JSON.stringify(payload) }] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json", maxOutputTokens: 1800 },
        }),
      },
    );
    if (!response.ok) return new Map();
    const data: any = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("") || "";
    const parsed = JSON.parse(text);
    const allowed = new Set(candidates.map((candidate) => candidate.id));
    const result = new Map<number, { score: number; reason: string }>();
    for (const item of Array.isArray(parsed.rankings) ? parsed.rankings : []) {
      const id = Number(item.id);
      const fit = Number(item.fit);
      if (!allowed.has(id) || !Number.isFinite(fit) || result.has(id)) continue;
      result.set(id, {
        score: clamp(fit),
        reason: typeof item.reason === "string" ? item.reason.replace(/[<>]/g, "").slice(0, 100) : "Relevant skill combination",
      });
    }
    return result;
  } catch {
    // AI is an enhancement, not a dependency. Deterministic ranking remains available.
    return new Map();
  } finally {
    clearTimeout(timeout);
  }
}

function formatCandidate(candidate: Candidate, score: ReturnType<typeof deterministicScore>, ai?: { score: number; reason: string }, aiEnabled = false) {
  const finalScore = ai ? Math.round((score.score * 0.72 + ai.score * 0.28) * 10) / 10 : score.score;
  const reasons = [...score.reasons];
  if (ai?.reason && !reasons.includes(ai.reason)) reasons.unshift(ai.reason);
  return {
    user: {
      id: candidate.id,
      name: candidate.name || "SkillSwap member",
      bio: candidate.bio,
      avatar: candidate.avatar,
      location: candidate.location,
      skillsTeach: candidate.skillsTeach,
      skillsLearn: candidate.skillsLearn,
      trustScore: candidate.trustScore,
      sessionsCompleted: candidate.sessionsCompleted,
      averageRating: candidate.averageRating,
      pricePerHour: candidate.pricePerHour,
      currentStreak: candidate.currentStreak,
      isPremium: candidate.isPremium,
    },
    matchScore: finalScore,
    scoreBreakdown: {
      skillCompatibility: score.skillScore,
      rating: score.ratingScore,
      experience: score.experienceScore,
      trust: score.trustScore,
      aiSemanticFit: ai?.score ?? null,
    },
    matchedTeachSkill: score.teachSkill,
    reciprocalLearnSkill: score.learnSkill,
    matchReasons: reasons.slice(0, 5),
    matchingMode: aiEnabled && ai ? "hybrid-ai" : "rule-based-fallback",
    isTopRated: candidate.averageRating >= 4.5,
    isExperienced: candidate.sessionsCompleted >= 10,
  };
}

// Existing endpoint retained for backward compatibility. JSONB skills are
// filtered in application code rather than applying SQL ILIKE to a JSONB column.
router.get("/:skill", requireAuth, async (req: AuthRequest, res) => {
  try {
    const skillName = decodeURIComponent(String(req.params.skill || "")).trim().slice(0, 60);
    if (!skillName) return res.status(400).json({ error: "Skill name required" });
    const users = await db.select().from(usersTable).where(ne(usersTable.id, req.userId!)).limit(500);
    const candidates: Candidate[] = users.map((user: any) => ({
      id: user.id, name: user.name, bio: user.bio, avatar: user.avatar, location: user.location,
      skillsTeach: parseSkills(user.skillsTeachV2), skillsLearn: parseSkills(user.skillsLearnV2),
      trustScore: Number(user.trustScore) || 0, sessionsCompleted: Number(user.sessionsCompleted) || 0,
      averageRating: Number(user.averageRating) || 0, pricePerHour: Number(user.pricePerHour) || 0,
      currentStreak: Number(user.currentStreak) || 0, isPremium: Boolean(user.isPremiumUser),
    }));
    const result = candidates
      .map((candidate) => ({ candidate, score: deterministicScore(candidate, { learn: skillName }) }))
      .filter((item) => item.score.score >= 20)
      .sort((a, b) => b.score.score - a.score.score)
      .slice(0, 20)
      .map(({ candidate, score }) => ({ ...formatCandidate(candidate, score), skill: skillName, pricePerHour: candidate.pricePerHour || 10 }));
    return res.json(result);
  } catch (error) {
    console.error("[matching] legacy lookup failed:", error);
    return res.status(500).json({ error: "Unable to find matches right now" });
  }
});

// New hybrid AI endpoint: POST /api/matching/recommendations
router.post("/recommendations", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = (req.body || {}) as MatchRequest;
    const requestedTeach = typeof body.teach === "string" ? body.teach.trim().slice(0, 60) : "";
    const requestedLearn = typeof body.learn === "string" ? body.learn.trim().slice(0, 60) : "";
    const goal = typeof body.goal === "string" ? body.goal.trim().slice(0, 300) : "";
    const level = ["beginner", "intermediate", "advanced"].includes(String(body.level))
      ? body.level
      : undefined;
    const limit = Math.max(1, Math.min(Number(body.limit) || 12, 20));

    const [self] = await db.select({
      skillsTeachV2: usersTable.skillsTeachV2,
      skillsLearnV2: usersTable.skillsLearnV2,
    }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!self) return res.status(404).json({ success: false, error: "Your profile was not found." });

    // If the user does not type a teaching skill, use their first saved teach
    // skill so reciprocal exchange can still be considered.
    const profileTeachSkills = parseSkills(self.skillsTeachV2);
    const teach = requestedTeach || profileTeachSkills[0] || "";
    const learn = requestedLearn;
    if (teach.length < 2 && learn.length < 2) {
      return res.status(400).json({ success: false, error: "Add a skill to your profile or enter a skill you want to learn." });
    }

    const users = await db.select().from(usersTable).where(ne(usersTable.id, req.userId!)).limit(500);
    const candidates: Candidate[] = users.map((user: any) => ({
      id: user.id, name: user.name, bio: user.bio, avatar: user.avatar, location: user.location,
      skillsTeach: parseSkills(user.skillsTeachV2), skillsLearn: parseSkills(user.skillsLearnV2),
      trustScore: Number(user.trustScore) || 0, sessionsCompleted: Number(user.sessionsCompleted) || 0,
      averageRating: Number(user.averageRating) || 0, pricePerHour: Number(user.pricePerHour) || 0,
      currentStreak: Number(user.currentStreak) || 0, isPremium: Boolean(user.isPremiumUser),
    })).filter((candidate) => candidate.skillsTeach.length > 0 || candidate.skillsLearn.length > 0);

    const request: MatchRequest = { teach, learn, goal, level };
    const scored = candidates.map((candidate) => ({ candidate, score: deterministicScore(candidate, request) }))
      .filter((item) => item.score.skillScore >= 12)
      .sort((a, b) => b.score.score - a.score.score)
      .slice(0, 80);

    const aiCandidates = scored.slice(0, 35).map(({ candidate, score }) => ({
      id: candidate.id, skillsTeach: candidate.skillsTeach, skillsLearn: candidate.skillsLearn, baseScore: score.score,
    }));
    const aiRanks = await aiRerank(request, aiCandidates);
    const aiEnabled = aiRanks.size > 0;

    const recommendations = scored
      .map(({ candidate, score }) => ({ candidate, score, ai: aiRanks.get(candidate.id) }))
      .map(({ candidate, score, ai }) => formatCandidate(candidate, score, ai, aiEnabled))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return res.json({
      success: true,
      data: {
        request: { teach: teach || null, learn: learn || null, goal: goal || null, level: level || null },
        totalCandidatesScanned: candidates.length,
        totalMatches: recommendations.length,
        engine: aiEnabled ? "hybrid-ai" : "rule-based-fallback",
        aiEnhanced: aiEnabled,
        recommendations,
        note: aiEnabled
          ? "AI semantic relevance is blended with deterministic skill, rating, experience and trust signals."
          : "Gemini matching is unavailable or not configured; deterministic matching is active.",
      },
    });
  } catch (error) {
    console.error("[matching] AI recommendations failed:", error);
    return res.status(500).json({ success: false, error: "Unable to generate recommendations right now." });
  }
});

export default router;
