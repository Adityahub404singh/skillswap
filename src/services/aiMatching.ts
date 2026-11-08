
/**
 * SkillSwap AI Matching API Client
 *
 * Endpoint:
 * POST /api/matching/recommendations
 *
 * Security:
 * Gemini API key must stay on the backend.
 * Never expose Gemini credentials in frontend code.
 */

export type SkillLevel =
  | "beginner"
  | "intermediate"
  | "advanced";

export type SkillMatchInput = {
  teach?: string;
  learn?: string;
  goal?: string;
  level?: SkillLevel;
  limit?: number;
};

export type SkillMatchRecommendation = {
  user: {
    id: number;
    name: string;
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

  matchScore: number;

  scoreBreakdown: {
    skillCompatibility: number;
    rating: number;
    experience: number;
    trust: number;
    aiSemanticFit: number | null;
  };

  matchedTeachSkill: string | null;
  reciprocalLearnSkill: string | null;

  matchReasons: string[];

  matchingMode:
    | "hybrid-ai"
    | "rule-based-fallback";

  isTopRated: boolean;
  isExperienced: boolean;
};

export type SkillMatchResult = {
  request: {
    teach: string | null;
    learn: string | null;
    goal: string | null;
    level: string | null;
  };

  totalCandidatesScanned: number;
  totalMatches: number;

  engine:
    | "hybrid-ai"
    | "rule-based-fallback";

  aiEnhanced: boolean;

  recommendations: SkillMatchRecommendation[];

  note: string;
};

type ApiEnvelope = {
  success?: boolean;
  data?: unknown;
  error?: string;
  message?: string;
};

const MATCH_ENDPOINT =
  "/api/matching/recommendations";

const MAX_TEXT = 300;
const MAX_SKILL_LENGTH = 60;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 20;

/**
 * Clean user input before sending to backend.
 */
function cleanText(
  value: unknown,
  maxLength: number
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value
    .trim()
    .replace(/\s+/g, " ");

  return cleaned
    ? cleaned.slice(0, maxLength)
    : undefined;
}

/**
 * Safely check an object.
 */
function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Safely normalize arrays.
 */
function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string"
    )
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

/**
 * Safely normalize numeric values.
 */
function toNumber(
  value: unknown,
  fallback = 0
): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

/**
 * Normalize a single mentor recommendation.
 */
function normalizeRecommendation(
  value: unknown
): SkillMatchRecommendation | null {
  if (
    !isRecord(value) ||
    !isRecord(value.user)
  ) {
    return null;
  }

  const user = value.user;

  const id = Number(user.id);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  const breakdown = isRecord(value.scoreBreakdown)
    ? value.scoreBreakdown
    : {};

  const matchingMode =
    value.matchingMode === "hybrid-ai"
      ? "hybrid-ai"
      : "rule-based-fallback";

  const aiSemanticFit =
    typeof breakdown.aiSemanticFit === "number" &&
    Number.isFinite(breakdown.aiSemanticFit)
      ? breakdown.aiSemanticFit
      : null;

  return {
    user: {
      id,

      name:
        typeof user.name === "string" &&
        user.name.trim()
          ? user.name.trim()
          : "SkillSwap member",

      bio:
        typeof user.bio === "string"
          ? user.bio
          : null,

      avatar:
        typeof user.avatar === "string"
          ? user.avatar
          : null,

      location:
        typeof user.location === "string"
          ? user.location
          : null,

      skillsTeach: toStringArray(
        user.skillsTeach
      ),

      skillsLearn: toStringArray(
        user.skillsLearn
      ),

      trustScore: toNumber(user.trustScore),

      sessionsCompleted: toNumber(
        user.sessionsCompleted
      ),

      averageRating: toNumber(
        user.averageRating
      ),

      pricePerHour: toNumber(
        user.pricePerHour
      ),

      currentStreak: toNumber(
        user.currentStreak
      ),

      isPremium: Boolean(user.isPremium),
    },

    matchScore: Math.max(
      0,
      Math.min(
        100,
        toNumber(value.matchScore)
      )
    ),

    scoreBreakdown: {
      skillCompatibility: toNumber(
        breakdown.skillCompatibility
      ),

      rating: toNumber(
        breakdown.rating
      ),

      experience: toNumber(
        breakdown.experience
      ),

      trust: toNumber(
        breakdown.trust
      ),

      aiSemanticFit,
    },

    matchedTeachSkill:
      typeof value.matchedTeachSkill === "string"
        ? value.matchedTeachSkill
        : null,

    reciprocalLearnSkill:
      typeof value.reciprocalLearnSkill === "string"
        ? value.reciprocalLearnSkill
        : null,

    matchReasons: toStringArray(
      value.matchReasons
    ).slice(0, 5),

    matchingMode,

    isTopRated: Boolean(value.isTopRated),

    isExperienced: Boolean(value.isExperienced),
  };
}

/**
 * Normalize complete API response.
 */
function normalizeResult(
  value: unknown
): SkillMatchResult {
  if (!isRecord(value)) {
    throw new Error(
      "The matching server returned an invalid response."
    );
  }

  const recommendations = Array.isArray(
    value.recommendations
  )
    ? value.recommendations
        .map(normalizeRecommendation)
        .filter(
          (
            item
          ): item is SkillMatchRecommendation =>
            item !== null
        )
    : [];

  const request = isRecord(value.request)
    ? value.request
    : {};

  return {
    request: {
      teach:
        typeof request.teach === "string"
          ? request.teach
          : null,

      learn:
        typeof request.learn === "string"
          ? request.learn
          : null,

      goal:
        typeof request.goal === "string"
          ? request.goal
          : null,

      level:
        typeof request.level === "string"
          ? request.level
          : null,
    },

    totalCandidatesScanned: toNumber(
      value.totalCandidatesScanned
    ),

    totalMatches: toNumber(
      value.totalMatches,
      recommendations.length
    ),

    engine:
      value.engine === "hybrid-ai"
        ? "hybrid-ai"
        : "rule-based-fallback",

    aiEnhanced: Boolean(value.aiEnhanced),

    recommendations,

    note:
      typeof value.note === "string"
        ? value.note
        : "Match scores are recommendations, not guarantees.",
  };
}

/**
 * Resolve API base URL.
 *
 * Example:
 * VITE_API_URL=http://localhost:3001
 */
function resolveApiBase(
  apiBase?: string
): string {
  const configured =
    apiBase ??
    import.meta.env.VITE_API_URL ??
    "";

  return configured
    .trim()
    .replace(/\/+$/, "");
}

/**
 * Main API function.
 */
export async function getSkillRecommendations(
  input: SkillMatchInput,
  accessToken: string,
  apiBase?: string,
  signal?: AbortSignal
): Promise<SkillMatchResult> {
  if (!accessToken?.trim()) {
    throw new Error(
      "Please sign in again to get personalized recommendations."
    );
  }

  const teach = cleanText(
    input.teach,
    MAX_SKILL_LENGTH
  );

  const learn = cleanText(
    input.learn,
    MAX_SKILL_LENGTH
  );

  const goal = cleanText(
    input.goal,
    MAX_TEXT
  );

  if (!teach && !learn) {
    throw new Error(
      "Enter at least one skill you can teach or want to learn."
    );
  }

  const level: SkillLevel =
    input.level === "intermediate" ||
    input.level === "advanced"
      ? input.level
      : "beginner";

  const requestedLimit = Number.isFinite(
    input.limit
  )
    ? Math.floor(input.limit as number)
    : DEFAULT_LIMIT;

  const limit = Math.max(
    1,
    Math.min(MAX_LIMIT, requestedLimit)
  );

  const url =
    `${resolveApiBase(apiBase)}` +
    MATCH_ENDPOINT;

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },

      body: JSON.stringify({
        ...(teach ? { teach } : {}),
        ...(learn ? { learn } : {}),
        ...(goal ? { goal } : {}),
        level,
        limit,
      }),

      signal,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new Error(
      "Unable to connect to SkillSwap server. Check whether the backend is running."
    );
  }

  let payload: ApiEnvelope | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope;
  } catch {
    // Server may return an empty or non-JSON response.
  }

  if (response.status === 401) {
    throw new Error(
      "Your session has expired. Please sign in again."
    );
  }

  if (response.status === 403) {
    throw new Error(
      "You do not have permission to use AI matching."
    );
  }

  if (response.status === 404) {
    throw new Error(
      "Matching API not found. Check backend route mounting."
    );
  }

  if (response.status === 429) {
    throw new Error(
      "Too many matching requests. Please wait a moment and try again."
    );
  }

  if (!response.ok) {
    throw new Error(
      (
        payload?.error ||
        payload?.message ||
        `Matching request failed (${response.status}).`
      ).slice(0, 240)
    );
  }

  if (
    !payload?.success ||
    !payload.data
  ) {
    throw new Error(
      payload?.error ||
      "The matching service did not return recommendations."
    );
  }

  return normalizeResult(payload.data);
}
