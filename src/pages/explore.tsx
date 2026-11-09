import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetSkills } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { SponsorCard } from "@/components/SponsorCard";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  Search,
  Compass,
  ArrowRight,
  Star,
  Sparkles,
  Monitor,
  Palette,
  Briefcase,
  Globe,
  X,
  Users,
  BookOpen,
  RefreshCw,
  SlidersHorizontal,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdMob } from "@capacitor-community/admob";
import { Capacitor } from "@capacitor/core";

type Skill = {
  id?: string | number;
  name: string;
  category?: string | null;
  description?: string | null;
  mentorCount?: number | null;
  mentor_count?: number | null;
  rating?: number | string | null;
  [key: string]: unknown;
};

type Category = {
  id: string;
  label: string;
  icon: typeof Sparkles;
  aliases: string[];
};

const CATEGORIES: Category[] = [
  { id: "all", label: "All Skills", icon: Sparkles, aliases: [] },
  {
    id: "technology",
    label: "Tech & Code",
    icon: Monitor,
    aliases: ["technology", "tech", "programming", "development", "it"],
  },
  {
    id: "design",
    label: "Design",
    icon: Palette,
    aliases: ["design", "ui/ux", "ui ux", "graphic design"],
  },
  {
    id: "business",
    label: "Business",
    icon: Briefcase,
    aliases: ["business", "marketing", "entrepreneurship", "finance"],
  },
  {
    id: "language",
    label: "Languages",
    icon: Globe,
    aliases: ["language", "languages", "english", "communication"],
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 24 },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

function asObject(value: unknown): Record<string, any> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, any>)
    : {};
}

function getSkillList(response: unknown): Skill[] {
  const root = asObject(response);
  const candidates: unknown[] = [
    response,
    root.skills,
    root.data,
    root.data?.skills,
    root.result,
    root.result?.skills,
  ];

  const list = candidates.find(Array.isArray);
  if (!Array.isArray(list)) return [];

  return list
    .filter(
      (item): item is Record<string, any> =>
        item !== null &&
        typeof item === "object" &&
        typeof item.name === "string" &&
        item.name.trim().length > 0,
    )
    .map((item) => ({
      ...item,
      name: item.name.trim(),
      category:
        typeof item.category === "string" ? item.category.trim() : null,
      description:
        typeof item.description === "string" ? item.description.trim() : null,
      mentorCount:
        item.mentorCount ??
        item.mentor_count ??
        item.mentorsCount ??
        item.mentors_count ??
        null,
      rating: item.rating ?? item.averageRating ?? item.average_rating ?? null,
    }));
}

function getCategoryKey(category?: string | null): string {
  const value = (category ?? "").trim().toLowerCase();
  const matched = CATEGORIES.find(
    (item) => item.id !== "all" && item.aliases.includes(value),
  );
  return matched?.id ?? value;
}

function formatMentorCount(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return null;
  return `${count.toLocaleString()} ${count === 1 ? "mentor" : "mentors"}`;
}

function formatRating(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) return null;
  return rating.toFixed(1);
}

function SkillCard({
  skill,
  onClick,
}: {
  skill: Skill;
  onClick: () => void;
}) {
  const rating = formatRating(skill.rating);
  const mentorCount = formatMentorCount(skill.mentorCount);

  return (
    <motion.button
      type="button"
      variants={itemVariants}
      layout
      onClick={onClick}
      className="group flex h-full w-full flex-col rounded-3xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 active:scale-[0.99] sm:p-6"
      aria-label={`Explore ${skill.name}`}
    >
      <div className="mb-5 flex w-full items-center justify-between gap-3">
        <span className="max-w-[75%] truncate rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-violet-700">
          {skill.category || "Other"}
        </span>

        {rating && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {rating}
          </span>
        )}
      </div>

      <h3 className="mb-2 text-xl font-extrabold text-slate-900 transition-colors group-hover:text-violet-700">
        {skill.name}
      </h3>

      <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-slate-500">
        {skill.description || "Open this skill to view its details and mentors."}
      </p>

      <div className="mt-6 flex w-full items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-slate-500">
          <Users className="h-3.5 w-3.5 shrink-0" />
          {mentorCount || "View skill"}
        </span>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600 transition-all group-hover:bg-violet-600 group-hover:text-white">
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </motion.button>
  );
}

function SkillsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-52 rounded-3xl" />
      ))}
    </div>
  );
}

export default function Explore() {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const options = useApiOptions();
  const [, setLocation] = useLocation();

  const {
    data: skillsResponse,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useGetSkills(undefined as any, options as any);

  // Only API records are shown. No sample/fallback skills are injected.
  const skills = useMemo(
    () => getSkillList(skillsResponse),
    [skillsResponse],
  );

  const filteredSkills = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    return skills.filter((skill) => {
      const matchesCategory =
        activeCat === "all" || getCategoryKey(skill.category) === activeCat;

      const matchesSearch =
        query.length === 0 ||
        skill.name.toLocaleLowerCase().includes(query) ||
        (skill.description ?? "").toLocaleLowerCase().includes(query) ||
        (skill.category ?? "").toLocaleLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [skills, activeCat, search]);

  const handleSkillNavigation = async (skillName: string) => {
    const slug = skillName
      .toLocaleLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!slug) return;

    // Interstitial is attempted only in the native app; navigation must
    // continue even if the ad provider is unavailable or an ad fails.
    if (Capacitor.isNativePlatform()) {
      try {
        await AdMob.prepareInterstitial({
          adId: "ca-app-pub-3940256099942544/1033173712",
          isTesting: true,
        });
        await AdMob.showInterstitial();
      } catch (adError) {
        console.warn("Interstitial ad could not be displayed:", adError);
      }
    }

    setLocation(`/skills/${slug}`);
  };

  const clearFilters = () => {
    setSearch("");
    setActiveCat("all");
  };

  const errorMessage =
    error instanceof Error
      ? error.message
      : "We couldn't load skills right now. Please try again.";

  return (
    <main className="min-h-screen space-y-7 pb-8">
      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-800 via-violet-700 to-indigo-600 p-6 text-white shadow-lg shadow-violet-200/50 sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-indigo-300/20 blur-3xl" />

        <div className="relative z-10 max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">
              Discover your potential
            </span>
          </div>

          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            Learn Something
            <br />
            <span className="text-violet-200">Amazing Today.</span>
          </h1>

          <p className="mb-7 mt-3 max-w-md text-sm text-white/80 sm:text-base">
            Explore skills offered by the community, find mentors, and grow
            through real knowledge sharing.
          </p>

          <div className="flex items-center rounded-2xl bg-white p-1.5 shadow-xl shadow-black/10">
            <Search className="ml-3 h-5 w-5 shrink-0 text-slate-400" />
            <input
              type="search"
              placeholder="What do you want to learn?"
              aria-label="Search skills"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full min-w-0 bg-transparent px-3 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="mr-1 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Category filters */}
      <section aria-labelledby="explore-categories-heading">
        <div className="mb-3">
          <h2
            id="explore-categories-heading"
            className="text-lg font-extrabold text-slate-900"
          >
            Explore Categories
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Browse skills by your area of interest
          </p>
        </div>

        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const active = activeCat === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCat(category.id)}
                aria-pressed={active}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                  active
                    ? "border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-200"
                    : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {category.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Sponsor placement retained from the existing page */}
      <SponsorCard />

      {/* Skills */}
      <section aria-labelledby="popular-skills-heading">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-violet-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-600">
                Community catalogue
              </span>
            </div>
            <h2
              id="popular-skills-heading"
              className="text-xl font-black text-slate-900"
            >
              {activeCat === "all"
                ? "Explore Skills"
                : CATEGORIES.find((item) => item.id === activeCat)?.label ??
                  "Explore Skills"}
            </h2>
            <p className="mt-1 text-xs text-slate-500" aria-live="polite">
              {isLoading
                ? "Loading skills from the server..."
                : isError
                  ? "Skills are temporarily unavailable"
                  : `${filteredSkills.length} ${
                      filteredSkills.length === 1 ? "skill" : "skills"
                    } found`}
            </p>
          </div>

          {(search || activeCat !== "all") && (
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 text-xs font-bold text-violet-600 transition hover:text-violet-800"
            >
              Clear filters
            </button>
          )}
        </div>

        {isLoading ? (
          <SkillsSkeleton />
        ) : isError ? (
          <div
            role="alert"
            className="rounded-3xl border border-red-100 bg-white px-5 py-12 text-center shadow-sm"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <RefreshCw className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Unable to load skills
            </h3>
            <p className="mx-auto mb-5 mt-2 max-w-md text-sm text-slate-500">
              {errorMessage}
            </p>
            <Button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="rounded-full bg-violet-600 px-6 text-white hover:bg-violet-700"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              {isFetching ? "Retrying..." : "Try again"}
            </Button>
          </div>
        ) : skills.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-14 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50">
              <GraduationCap className="h-8 w-8 text-violet-500" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">
              No skills available yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              There are no skills in the catalogue yet. Please check back after
              mentors add their skills.
            </p>
          </div>
        ) : filteredSkills.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-200 bg-white px-5 py-14 text-center shadow-sm"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50">
              <Compass className="h-8 w-8 text-violet-400" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">
              No matching skills
            </h3>
            <p className="mb-5 mt-2 text-sm text-slate-500">
              Try another keyword or choose a different category.
            </p>
            <Button
              type="button"
              onClick={clearFilters}
              className="rounded-full bg-violet-600 px-6 text-white hover:bg-violet-700"
            >
              Clear filters
            </Button>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {filteredSkills.map((skill, index) => (
                <SkillCard
                  key={skill.id ?? `${skill.name}-${index}`}
                  skill={skill}
                  onClick={() => void handleSkillNavigation(skill.name)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* Mentor call-to-action */}
      <section className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-slate-900 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20">
            <BookOpen className="h-5 w-5 text-violet-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Ready to share your knowledge?
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Become a mentor and teach what you know.
            </p>
          </div>
        </div>

        <Link href="/profile">
          <span className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-violet-300 transition-colors hover:text-white">
            Get Started
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </section>
    </main>
  );
}
