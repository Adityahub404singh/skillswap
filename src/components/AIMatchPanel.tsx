
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  getSkillRecommendations,
  type SkillLevel,
  type SkillMatchInput,
  type SkillMatchRecommendation,
  type SkillMatchResult,
} from "../services/aiMatching";

type Props = {
  accessToken: string;
  apiBase?: string;
  onChooseMentor?: (memberId: number) => void;
  onSignIn?: () => void;
  initialTeach?: string;
  initialLearn?: string;
  compact?: boolean;
};

const LEVELS: { value: SkillLevel; label: string; hint: string }[] = [
  { value: "beginner", label: "Beginner", hint: "I'm starting out" },
  { value: "intermediate", label: "Intermediate", hint: "I know the basics" },
  { value: "advanced", label: "Advanced", hint: "I want to go deeper" },
];

const QUICK_SKILLS = ["Java", "React", "Python", "English", "UI/UX", "DSA"];

function scoreTone(score: number) {
  if (score >= 80) return "from-emerald-500 to-teal-500";
  if (score >= 60) return "from-violet-600 to-indigo-500";
  return "from-amber-500 to-orange-500";
}

function MemberAvatar({
  name,
  avatar,
}: {
  name: string;
  avatar: string | null;
}) {
  const [failed, setFailed] = useState(false);

  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "S";

  if (!avatar || failed) {
    return (
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600 text-lg font-black text-white shadow-lg shadow-violet-200 ring-4 ring-violet-50">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={avatar}
      alt={`${name} profile`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-14 w-14 shrink-0 rounded-2xl border border-slate-100 object-cover ring-4 ring-slate-50"
    />
  );
}

function MatchCard({
  match,
  onChoose,
}: {
  match: SkillMatchRecommendation;
  onChoose?: (id: number) => void;
}) {
  const { user } = match;

  return (
    <article className="group relative overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/70">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-500 opacity-70" />

      <div className="flex items-start gap-3">
        <MemberAvatar name={user.name} avatar={user.avatar} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="truncate text-base font-black text-slate-950">
              {user.name}
            </h3>

            <span className="rounded-xl bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-800">
              {Math.round(match.matchScore)}% fit
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 text-amber-600">
              <span aria-hidden="true">★</span>
              <b>{user.averageRating.toFixed(1)}</b>
            </span>

            <span>·</span>
            <span>{user.sessionsCompleted} sessions</span>

            {user.location && (
              <>
                <span>·</span>
                <span className="truncate">{user.location}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          <span>Compatibility</span>
          <span>{Math.round(match.matchScore)} / 100</span>
        </div>

        <div
          className="h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label={`${Math.round(match.matchScore)} percent match`}
          aria-valuenow={Math.round(match.matchScore)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full bg-gradient-to-r ${scoreTone(
              match.matchScore
            )} transition-all duration-700`}
            style={{
              width: `${Math.max(
                0,
                Math.min(100, match.matchScore)
              )}%`,
            }}
          />
        </div>
      </div>

      {user.bio && (
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600">
          {user.bio}
        </p>
      )}

      <div className="mt-4 space-y-2">
        {user.skillsTeach.length > 0 && (
          <div className="flex flex-wrap items-start gap-1.5">
            <span className="mr-1 pt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
              Teaches
            </span>

            {user.skillsTeach.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {user.skillsLearn.length > 0 && (
          <div className="flex flex-wrap items-start gap-1.5">
            <span className="mr-1 pt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
              Wants
            </span>

            {user.skillsLearn.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-800"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {match.matchReasons.length > 0 && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Why this match
          </p>

          <ul className="space-y-1.5">
            {match.matchReasons.slice(0, 3).map((reason) => (
              <li
                key={reason}
                className="flex items-start gap-2 text-xs font-medium leading-5 text-slate-600"
              >
                <span className="mt-1 text-emerald-600">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {match.isTopRated && (
            <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">
              Top rated
            </span>
          )}

          {match.isExperienced && (
            <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-800">
              Experienced
            </span>
          )}

          {user.isPremium && (
            <span className="rounded-full bg-fuchsia-50 px-2 py-1 text-[10px] font-bold text-fuchsia-800">
              Premium
            </span>
          )}
        </div>

        {onChoose && (
          <button
            type="button"
            onClick={() => onChoose(user.id)}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-extrabold text-white transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-200"
          >
            View profile ↗
          </button>
        )}
      </div>
    </article>
  );
}

function LoadingCards() {
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-3xl border border-slate-200 p-5"
        >
          <div className="flex gap-3">
            <div className="h-14 w-14 rounded-2xl bg-slate-200" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-2/3 rounded bg-slate-200" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
          </div>
          <div className="mt-5 h-2 rounded bg-slate-100" />
          <div className="mt-5 h-16 rounded-xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export default function AIMatchPanel({
  accessToken,
  apiBase,
  onChooseMentor,
  onSignIn,
  initialTeach = "",
  initialLearn = "",
  compact = false,
}: Props) {
  const [teach, setTeach] = useState(initialTeach);
  const [learn, setLearn] = useState(initialLearn);
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<SkillLevel>("beginner");

  const [result, setResult] = useState<SkillMatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    setTeach(initialTeach);
  }, [initialTeach]);

  useEffect(() => {
    setLearn(initialLearn);
  }, [initialLearn]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!accessToken) {
      setError("Please sign in to get personalized recommendations.");
      onSignIn?.();
      return;
    }

    if (!teach.trim() && !learn.trim()) {
      setError(
        "Add at least one skill: something you can teach or want to learn."
      );
      return;
    }

    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    const input: SkillMatchInput = {
      teach: teach.trim() || undefined,
      learn: learn.trim() || undefined,
      goal: goal.trim() || undefined,
      level,
      limit: 12,
    };

    setLoading(true);
    setResult(null);

    try {
      const response = await getSkillRecommendations(
        input,
        accessToken,
        apiBase,
        controller.signal
      );

      setResult(response);
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") {
        return;
      }

      setError(
        cause instanceof Error
          ? cause.message
          : "Could not find matches. Please try again."
      );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  function reset() {
    abortRef.current?.abort();

    setTeach(initialTeach);
    setLearn(initialLearn);
    setGoal("");
    setLevel("beginner");

    setResult(null);
    setError("");
    setLoading(false);
  }

  const hasInput = Boolean(teach.trim() || learn.trim());

  return (
    <section
      className={`relative isolate w-full overflow-hidden rounded-[2rem] border border-violet-100/80 bg-gradient-to-br from-white via-white to-violet-50/70 shadow-[0_28px_90px_rgba(76,29,149,.13)] ${
        compact ? "p-4 sm:p-5" : "p-5 sm:p-8"
      }`}
    >
      <div className="pointer-events-none absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full bg-fuchsia-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 -z-10 h-72 w-72 rounded-full bg-indigo-100/70 blur-3xl" />

      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.17em] text-violet-800 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            SkillSwap intelligence
          </span>

          <h2 className="mt-4 text-[1.75rem] font-black leading-[1.08] tracking-tight text-slate-950 sm:text-4xl">
            Your next skill partner is{" "}
            <span className="bg-gradient-to-r from-violet-700 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">
              one match away.
            </span>
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Share what you can teach, what you want to learn, and your goal.
            We rank real SkillSwap members using skill compatibility and
            trusted platform signals.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-800">
              ✓ Real member profiles
            </span>
            <span className="rounded-full border border-violet-100 bg-white px-3 py-1.5 text-[10px] font-bold text-violet-800">
              ✦ AI-assisted relevance
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600">
              ↗ No booking without your choice
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start rounded-2xl border border-white bg-white/80 px-3 py-2 shadow-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-lg text-white">
            ✦
          </span>
          <span>
            <span className="block text-xs font-black text-slate-900">
              Hybrid matching
            </span>
            <span className="block text-[10px] text-slate-500">
              AI + platform signals
            </span>
          </span>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="mt-7 rounded-[1.65rem] border border-white bg-white p-4 shadow-[0_14px_45px_rgba(15,23,42,.07)] ring-1 ring-slate-200/80 sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-900">
              Build your match profile
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Add at least one skill to get started.
            </p>
          </div>

          <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-extrabold text-violet-700">
            Takes 20 seconds
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 flex items-center justify-between text-xs font-extrabold text-slate-800">
              I can teach
              <span className="font-medium text-slate-400">Optional</span>
            </span>

            <input
              value={teach}
              onChange={(event) => setTeach(event.target.value)}
              maxLength={60}
              placeholder="e.g. Java, English, Figma"
              autoComplete="off"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />

            <span className="mt-1.5 block text-[11px] text-slate-400">
              Leave blank to use your saved teaching skill.
            </span>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Java", "Python", "English", "UI/UX"].map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setTeach(skill)}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                >
                  + {skill}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="mb-2 flex items-center justify-between text-xs font-extrabold text-slate-800">
              I want to learn
              <span className="font-medium text-slate-400">Optional</span>
            </span>

            <input
              value={learn}
              onChange={(event) => setLearn(event.target.value)}
              maxLength={60}
              placeholder="e.g. React, UI/UX, guitar"
              autoComplete="off"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />

            <div className="mt-2 flex flex-wrap gap-1.5">
              {["React", "DSA", "Figma", "Public speaking"].map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setLearn(skill)}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                >
                  + {skill}
                </button>
              ))}
            </div>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 flex items-center justify-between text-xs font-extrabold text-slate-800">
              What are you trying to achieve?
              <span className="font-medium text-slate-400">Optional</span>
            </span>

            <input
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              maxLength={300}
              placeholder="e.g. Build and deploy a full-stack portfolio project"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />
          </label>

          <fieldset className="md:col-span-2">
            <legend className="mb-2 text-xs font-extrabold text-slate-800">
              Your current level
            </legend>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {LEVELS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setLevel(item.value)}
                  aria-pressed={level === item.value}
                  className={`rounded-xl border px-3 py-3 text-left transition focus:outline-none focus:ring-4 focus:ring-violet-100 ${
                    level === item.value
                      ? "border-violet-500 bg-gradient-to-br from-violet-50 to-indigo-50 text-violet-900 shadow-sm ring-1 ring-violet-200"
                      : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-xs font-black">
                    {item.label}
                  </span>
                  <span className="mt-1 hidden text-[10px] sm:block">
                    {item.hint}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col justify-end gap-2 sm:flex-row md:col-span-2">
            {(result || error || hasInput) && (
              <button
                type="button"
                onClick={reset}
                disabled={loading}
                className="h-12 rounded-xl border border-slate-200 px-5 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Reset
              </button>
            )}

            <button
              type="submit"
              disabled={loading || !hasInput}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 via-violet-700 to-indigo-600 px-6 text-sm font-black text-white shadow-[0_10px_24px_rgba(109,40,217,.25)] transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:min-w-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Finding your matches…
                </>
              ) : (
                <>Find my matches →</>
              )}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-800"
        >
          <span className="text-lg">!</span>
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="mt-7" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-950">
                Finding relevant people
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Comparing member skills and learning interests…
              </p>
            </div>
            <span className="text-xs font-bold text-violet-700">
              Please wait
            </span>
          </div>

          <LoadingCards />
        </div>
      )}

      {result && !loading && (
        <div className="mt-8 border-t border-slate-100 pt-7" aria-live="polite">
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-violet-100 bg-white/80 p-4 sm:flex-row sm:items-end">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[.18em] text-violet-700">
                Your shortlist
              </span>

              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                Recommended skill partners
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {result.totalCandidatesScanned.toLocaleString()} profiles
                scanned · {result.totalMatches.toLocaleString()} matches
              </p>
            </div>

            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-wide ${
                result.aiEnhanced
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-amber-50 text-amber-800"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  result.aiEnhanced ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {result.aiEnhanced
                ? "AI enhanced ranking"
                : "Smart ranking fallback"}
            </span>
          </div>

          {result.recommendations.length > 0 ? (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {result.recommendations.map((match) => (
                <MatchCard
                  key={match.user.id}
                  match={match}
                  onChoose={onChooseMentor}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-2xl text-violet-700">
                ⌕
              </span>

              <h4 className="mt-4 font-black text-slate-900">
                No close matches yet
              </h4>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Try a broader skill name or add the skill you can teach. New
                members can create more opportunities for exchange.
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {QUICK_SKILLS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => setLearn(skill)}
                    className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50"
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-[11px] leading-5 text-slate-500">
            {result.note} Match scores are recommendations, not guarantees.
            Review member profiles and session details before booking.
          </p>
        </div>
      )}
    </section>
  );
}
