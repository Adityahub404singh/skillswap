import { useCallback, useEffect, useMemo, useState } from "react";
import { useRoute, Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownUp,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Clock3,
  Filter,
  GraduationCap,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wallet,
  X,
  Zap,
  RefreshCw,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Mentor = {
  id: number | string;
  name?: string;
  avatar?: string | null;
  headline?: string | null;
  bio?: string | null;
  skillsTeach?: string[] | string | null;
  averageRating?: number | string | null;
  sessionsCompleted?: number | null;
  pricePerHour?: number | null;
  trustScore?: number | null;
  isPremium?: boolean;
  location?: string | null;
  isOnline?: boolean;
};

type SortMode = "recommended" | "rating" | "price-low" | "price-high" | "sessions";

const API_BASE = import.meta.env.VITE_API_URL || "";

function titleFromSlug(slug: string) {
  return decodeURIComponent(slug)
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Skill";
}

function normaliseSkills(value: Mentor["skillsTeach"]): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    // Older accounts may store a single skill as plain text.
  }
  return value.split(/[,|]/).map((item) => item.trim()).filter(Boolean);
}

function getRating(mentor: Mentor) {
  const rating = Number(mentor.averageRating ?? 0);
  return Number.isFinite(rating) ? rating : 0;
}

function getPrice(mentor: Mentor) {
  const price = Number(mentor.pricePerHour ?? 20);
  return Number.isFinite(price) && price > 0 ? price : 20;
}

function initials(name?: string) {
  return (name || "SkillSwap Mentor")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SS";
}

function MentorAvatar({ mentor }: { mentor: Mentor }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [mentor.avatar]);

  return (
    <div className="relative h-[76px] w-[76px] shrink-0 rounded-[24px] bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 p-[2px] shadow-lg shadow-violet-500/20">
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[22px] bg-violet-50 text-xl font-black text-violet-700">
        {mentor.avatar && !failed ? (
          <img
            src={mentor.avatar}
            alt={`${mentor.name || "Mentor"} profile`}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initials(mentor.name)}</span>
        )}
      </div>
      {mentor.isOnline && (
        <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-white bg-emerald-500" title="Online" />
      )}
    </div>
  );
}

function MentorCard({ mentor, skillName, index }: { mentor: Mentor; skillName: string; index: number }) {
  const rating = getRating(mentor);
  const taughtSkills = normaliseSkills(mentor.skillsTeach);
  const verified = Boolean(mentor.isPremium || Number(mentor.trustScore || 0) >= 50);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.035, 0.2) }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(30,20,70,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_20px_50px_rgba(91,45,190,0.13)] sm:p-6"
    >
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-violet-100/70 blur-3xl transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start gap-4">
        <MentorAvatar mentor={mentor} />
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="max-w-full truncate text-lg font-extrabold tracking-tight text-slate-900">
              {mentor.name || "SkillSwap Mentor"}
            </h3>
            {verified && (
              <span title="Trusted SkillSwap profile" className="inline-flex shrink-0 text-blue-600">
                <BadgeCheck className="h-[18px] w-[18px] fill-blue-50" />
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
            {mentor.headline || mentor.bio || `Ready to help you learn ${skillName}`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {mentor.isOnline && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
              </span>
            )}
            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                <ShieldCheck className="h-3 w-3" /> Trusted
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-700">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
          {rating > 0 ? rating.toFixed(1) : "New mentor"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
          <BookOpen className="h-3.5 w-3.5" />
          {mentor.sessionsCompleted || 0} sessions
        </span>
        {mentor.location && (
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{mentor.location}</span>
          </span>
        )}
      </div>

      {taughtSkills.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Also teaches</p>
          <div className="flex flex-wrap gap-1.5">
            {taughtSkills.slice(0, 3).map((skill) => (
              <span key={skill} className="rounded-full border border-violet-100 bg-violet-50/70 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                {skill}
              </span>
            ))}
            {taughtSkills.length > 3 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                +{taughtSkills.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-auto pt-6">
        <div className="mb-4 flex items-end justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Session rate</p>
            <p className="mt-1 text-2xl font-black tracking-tight text-violet-700">
              {getPrice(mentor)} <span className="text-sm font-bold text-slate-400">cr/hr</span>
            </p>
          </div>
          <span className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
            <Clock3 className="h-3.5 w-3.5" /> Flexible sessions
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Link href={`/book/${mentor.id}?skill=${encodeURIComponent(skillName)}`}>
            <Button className="h-11 w-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 font-bold text-white shadow-md shadow-violet-600/20 transition hover:from-violet-700 hover:to-indigo-700">
              Book session <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/mentor/${mentor.id}`}>
            <Button variant="outline" aria-label={`View ${mentor.name || "mentor"} profile`} className="h-11 rounded-full border-violet-200 px-4 font-bold text-violet-700 hover:bg-violet-50">
              Profile
            </Button>
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export default function SkillPage() {
  const [, params] = useRoute("/skills/:skill");
  const skillSlug = params?.skill || "skill";
  const skillName = useMemo(() => titleFromSlug(skillSlug), [skillSlug]);

  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("recommended");
  const [trustedOnly, setTrustedOnly] = useState(false);

  const loadMentors = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/users`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      });
      if (!response.ok) throw new Error(`Unable to load mentors (${response.status}).`);
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("Unexpected response received from the server.");

      const targetSkill = skillName.toLowerCase().trim();
      const targetSlug = skillSlug.toLowerCase().trim().replace(/-/g, " ");
      const matched = (data as Mentor[])
        .filter((mentor) =>
          normaliseSkills(mentor.skillsTeach).some((item) => {
            const current = item.toLowerCase().trim();
            return current === targetSkill || current === targetSlug;
          }),
        )
        .sort((a, b) => getRating(b) - getRating(a));

      setMentors(matched);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong while loading mentors.");
      setMentors([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [skillName, skillSlug]);

  useEffect(() => {
    const controller = new AbortController();
    loadMentors(controller.signal);
    return () => controller.abort();
  }, [loadMentors]);

  const filteredMentors = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = mentors.filter((mentor) => {
      const verified = Boolean(mentor.isPremium || Number(mentor.trustScore || 0) >= 50);
      if (trustedOnly && !verified) return false;
      if (!query) return true;
      const haystack = [
        mentor.name,
        mentor.headline,
        mentor.bio,
        mentor.location,
        ...normaliseSkills(mentor.skillsTeach),
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });

    return [...list].sort((a, b) => {
      switch (sort) {
        case "rating": return getRating(b) - getRating(a);
        case "price-low": return getPrice(a) - getPrice(b);
        case "price-high": return getPrice(b) - getPrice(a);
        case "sessions": return Number(b.sessionsCompleted || 0) - Number(a.sessionsCompleted || 0);
        default: return getRating(b) - getRating(a);
      }
    });
  }, [mentors, search, sort, trustedOnly]);

  const trustedCount = mentors.filter((mentor) => mentor.isPremium || Number(mentor.trustScore || 0) >= 50).length;

  return (
    <main className="min-h-screen overflow-hidden bg-[#f8f7ff] pb-20">
      <section className="relative isolate overflow-hidden bg-[#17102f] px-4 pb-28 pt-14 text-white sm:pb-36 sm:pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(124,58,237,0.55),transparent_34%),radial-gradient(circle_at_85%_5%,rgba(79,70,229,0.5),transparent_30%),linear-gradient(135deg,#17102f_0%,#342078_55%,#21134b_100%)]" />
        <div className="pointer-events-none absolute -right-24 top-20 -z-10 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 -z-10 h-96 w-96 rounded-full bg-indigo-400/20 blur-[100px]" />

        <div className="mx-auto max-w-7xl">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="mx-auto max-w-4xl text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.15em] text-violet-100 shadow-lg backdrop-blur-md sm:text-sm">
              <Sparkles className="h-4 w-4 text-amber-300" /> Learn together. Grow together.
            </div>
            <h1 className="text-balance text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl md:text-7xl">
              Learn <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">{skillName}</span>
              <br className="hidden sm:block" /> from people who know it.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-violet-100/80 sm:text-xl sm:leading-8">
              Find a mentor, book a one-to-one session, and turn the skills you already have into credits to learn something new.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-13 rounded-full bg-white px-8 text-base font-extrabold text-violet-800 shadow-xl shadow-black/20 hover:bg-violet-50"
                onClick={() => document.getElementById("mentors")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                Explore mentors <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-violet-100 backdrop-blur">
                <Wallet className="h-4 w-4 text-emerald-300" /> Learn with SkillSwap credits
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.55 }}
            className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3"
          >
            {[
              { icon: Users, value: `${mentors.length}`, label: "Mentors for this skill" },
              { icon: ShieldCheck, value: `${trustedCount}`, label: "Trusted profiles" },
              { icon: Video, value: "1-to-1", label: "Personal sessions" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] p-4 text-left backdrop-blur-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-violet-200">
                  <item.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xl font-black">{item.value}</span>
                  <span className="block text-xs font-semibold text-violet-100/65">{item.label}</span>
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-12 max-w-7xl px-4 sm:-mt-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: GraduationCap, title: "Learn by doing", text: "Get practical guidance and ask questions in a focused session." },
            { icon: Zap, title: "Exchange your skills", text: "Teach what you know and earn credits to learn from others." },
            { icon: CheckCircle2, title: "Build real progress", text: "Keep learning through consistent sessions and feedback." },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 * index }}
              className="rounded-[26px] border border-violet-100 bg-white p-6 shadow-[0_12px_35px_rgba(42,25,90,0.08)] sm:p-7"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700">
                <feature.icon className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{feature.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="mentors" className="mx-auto max-w-7xl scroll-mt-8 px-4 pb-16 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700">
              <Sparkles className="h-4 w-4" /> Your learning starts here
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Top {skillName} mentors
            </h2>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Compare profiles and find the right person to learn from.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-100 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm">
            <Users className="h-4 w-4 text-violet-600" />
            {loading ? "Finding mentors…" : `${filteredMentors.length} of ${mentors.length} mentors`}
          </div>
        </div>

        <div className="mb-7 rounded-[24px] border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search mentor, skill or location…"
                aria-label="Search mentors"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-slate-500">
                <ArrowDownUp className="h-4 w-4 shrink-0" />
                <span className="sr-only">Sort mentors</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="h-full min-w-[155px] bg-transparent pr-2 text-sm font-bold text-slate-700 outline-none">
                  <option value="recommended">Recommended</option>
                  <option value="rating">Highest rated</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="sessions">Most sessions</option>
                </select>
              </label>
              <button
                onClick={() => setTrustedOnly((value) => !value)}
                aria-pressed={trustedOnly}
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold transition ${trustedOnly ? "border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-600/20" : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50"}`}
              >
                <Filter className="h-4 w-4" /> Trusted only
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-[28px] border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-[76px] w-[76px] rounded-[24px]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
                <Skeleton className="mt-7 h-10 w-full rounded-xl" />
                <Skeleton className="mt-6 h-12 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-red-100 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <RefreshCw className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">We couldn't load mentors</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{error}</p>
            <Button onClick={() => loadMentors()} className="mt-6 rounded-full bg-violet-600 px-6 font-bold text-white hover:bg-violet-700">
              Try again <RefreshCw className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : filteredMentors.length === 0 ? (
          <AnimatePresence mode="wait">
            <motion.div key="empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-[30px] border border-dashed border-violet-200 bg-white px-6 py-14 text-center shadow-sm sm:py-16">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700">
                {search || trustedOnly ? <Search className="h-9 w-9" /> : <Sparkles className="h-9 w-9" />}
              </div>
              <h3 className="text-2xl font-black text-slate-900">
                {search || trustedOnly ? "No matching mentors" : `Be the first ${skillName} mentor`}
              </h3>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500 sm:text-base">
                {search || trustedOnly
                  ? "Try another search term or clear the trusted-only filter to see more profiles."
                  : `There are no mentor profiles teaching ${skillName} yet. Add this skill to your profile and help the community learn.`}
              </p>
              {(search || trustedOnly) ? (
                <Button variant="outline" onClick={() => { setSearch(""); setTrustedOnly(false); }} className="mt-6 rounded-full border-violet-200 px-6 font-bold text-violet-700 hover:bg-violet-50">
                  Clear filters
                </Button>
              ) : (
                <Link href="/profile">
                  <Button className="mt-6 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-7 font-bold text-white shadow-lg shadow-violet-600/20 hover:from-violet-700 hover:to-indigo-700">
                    Become a mentor <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div layout className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
              {filteredMentors.map((mentor, index) => (
                <MentorCard key={mentor.id} mentor={mentor} skillName={skillName} index={index} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        <div className="mt-14 overflow-hidden rounded-[30px] bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 p-7 text-white shadow-xl shadow-violet-900/15 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-violet-100">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" /> SkillSwap community
              </div>
              <h3 className="text-2xl font-black tracking-tight sm:text-3xl">Know a skill? Share it with the world.</h3>
              <p className="mt-2 text-sm leading-6 text-violet-100/80 sm:text-base">
                Become a mentor, help someone make progress, and earn credits for your time.
              </p>
            </div>
            <Link href="/profile">
              <Button className="h-12 shrink-0 rounded-full bg-white px-7 font-extrabold text-violet-800 shadow-lg hover:bg-violet-50">
                Teach on SkillSwap <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
