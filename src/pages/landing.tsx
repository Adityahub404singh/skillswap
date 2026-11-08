// src/pages/landing.tsx
import { Link } from "wouter";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Users, Star, ShieldCheck, Zap, Play, Code2, Palette, Languages, Brain,
  Trophy, Flame, Award, Lock, Briefcase, ChevronDown, Check, Crown, Gift, Smartphone,
  Coins, GraduationCap, Sparkles, QrCode, BadgeCheck, Search, HelpCircle,
  Target, TrendingUp, RefreshCw, BookOpen, Globe2, HeartHandshake, Clock3,
  ArrowUpRight, Activity, BarChart3, CheckCircle2, Lightbulb, MessageCircle,
  ShieldAlert, Compass, CalendarClock, Menu, X, CircleHelp, Handshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import { useEffect, useRef, useState, type FormEvent, type ComponentType } from "react";

// ==========================================================================
// SkillSwap landing page.
// Every number, rating, review, mentor and activity line comes from the
// backend (/api/landing and /api/certificates/public/summary). If the backend
// has nothing for a block, that block is hidden. Nothing is invented here.
// ==========================================================================

type Review = { name: string; text: string; rating: number | null; skill?: string };
type Mentor = { name: string; skills: string[]; rating: number; sessions: number | null };
type CertSummary = {
  total: number;
  topSkills: { skill: string; count: number }[];
  recent: { certId: string; skill: string; role: string; level: string; dateStr: string }[];
};

const heading = { fontFamily: "Outfit, sans-serif" } as const;

// ---------------- hooks / small components ----------------

const TYPEWRITER_WORDS = ["DSA & Coding", "Fluent English", "UI/UX Design", "Full-Stack Development", "Freelancing", "Data Science"];

function useTypewriter(words: string[], speed = 75, pause = 1800) {
  const [display, setDisplay] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    const current = words[wordIdx] ?? "";
    const delay = holding ? pause : deleting ? speed / 2 : speed;

    const timeout = window.setTimeout(() => {
      if (holding) {
        setHolding(false);
        setDeleting(true);
        return;
      }

      if (!deleting) {
        const nextIndex = Math.min(charIdx + 1, current.length);
        setDisplay(current.slice(0, nextIndex));
        setCharIdx(nextIndex);

        if (nextIndex >= current.length) {
          setHolding(true);
        }
        return;
      }

      const nextIndex = Math.max(charIdx - 1, 0);
      setDisplay(current.slice(0, nextIndex));
      setCharIdx(nextIndex);

      if (nextIndex === 0) {
        setDeleting(false);
        setWordIdx((index) => (index + 1) % Math.max(words.length, 1));
      }
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [charIdx, deleting, holding, pause, speed, wordIdx, words]);

  return display;
}

function Counter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) setStarted(true); }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let s = 0;
    const step = Math.max(target / 60, 1);
    const t = setInterval(() => {
      s += step;
      if (s >= target) { setCount(target); clearInterval(t); } else setCount(Math.floor(s));
    }, 16);
    return () => clearInterval(t);
  }, [started, target]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

function Stars({ value, size = "w-4 h-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${size} ${i < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
      ))}
    </span>
  );
}

// Hero visual. It uses /public/hero-illustration.jpg when that file exists;
// otherwise this built-in composition is shown.
function HeroVisual({ still }: { still: boolean }) {
  const [imgOk, setImgOk] = useState(false);
  const float = (delay: number, distance = 12) =>
    still
      ? undefined
      : {
          y: [0, -distance, 0],
          rotateZ: [0, 1.2, 0],
          transition: { duration: 5.5, repeat: Infinity, ease: "easeInOut" as const, delay },
        };

  return (
    <div className="relative mx-auto w-full max-w-[620px] [perspective:1400px]">
      <div className="relative aspect-[1.08/1] sm:aspect-[1.12/1]">
        {/* Ambient 3D lighting and orbit rings */}
        <div className="absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-violet-300/80 via-fuchsia-200/55 to-cyan-200/70 blur-3xl" />
        <motion.div
          aria-hidden="true"
          animate={still ? undefined : { rotate: 360 }}
          transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
          className="absolute left-1/2 top-1/2 h-[86%] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/50"
          style={{ transform: "translate(-50%, -50%) rotateX(68deg) rotateZ(-18deg)" }}
        />
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[55%] h-[78%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-fuchsia-300/60"
          style={{ transform: "translate(-50%, -50%) rotateX(72deg) rotateZ(16deg)" }}
        />

        {/* Main floating illustration panel */}
        <motion.div
          className="absolute inset-[8%_5%_10%_5%] overflow-hidden rounded-[2rem] border border-white/80 bg-white/45 p-2 shadow-[0_35px_90px_rgba(91,55,170,.25)] backdrop-blur-sm sm:rounded-[2.6rem] sm:p-3"
          style={{ transformStyle: "preserve-3d", transform: "rotateY(-9deg) rotateX(5deg) rotateZ(-1.5deg)" }}
          animate={still ? undefined : { y: [0, -8, 0], rotateY: [-9, -6, -9], rotateX: [5, 7, 5] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute inset-2 rounded-[1.7rem] bg-gradient-to-br from-violet-100 via-white to-cyan-50 sm:rounded-[2.1rem]" />
          {!imgOk && (
            <div className="absolute inset-3 z-[1] flex items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-violet-600 via-indigo-500 to-fuchsia-400 sm:rounded-[2rem]">
              <div className="absolute inset-[12%] rounded-full border border-white/30 bg-white/10 shadow-[inset_0_0_60px_rgba(255,255,255,.25)]" />
              <div className="relative z-10 rounded-3xl border border-white/40 bg-white/90 px-7 py-6 text-center shadow-2xl">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 shadow-inner">
                  <GraduationCap className="h-8 w-8" />
                </div>
                <p className="text-xl font-black text-slate-900" style={heading}>SkillSwap</p>
                <p className="mt-1 text-xs font-bold text-violet-600">Learn · Teach · Grow</p>
              </div>
            </div>
          )}
          <img
            src="/hero-illustration.jpg"
            alt="SkillSwap learners sharing knowledge"
            onLoad={() => setImgOk(true)}
            onError={() => setImgOk(false)}
            className={`absolute inset-3 z-[2] h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] rounded-[1.5rem] object-contain drop-shadow-[0_24px_28px_rgba(59,31,105,.18)] transition-opacity duration-700 sm:rounded-[2rem] ${imgOk ? "opacity-100" : "opacity-0"}`}
          />
          <div className="pointer-events-none absolute inset-3 z-[3] rounded-[1.5rem] bg-gradient-to-br from-white/25 via-transparent to-violet-500/10 sm:rounded-[2rem]" />
          <div className="pointer-events-none absolute inset-0 z-[4] rounded-[2rem] ring-1 ring-inset ring-white/70 sm:rounded-[2.6rem]" />
        </motion.div>

        {/* 3D floating learning cards */}
        <motion.div
          animate={float(0.2, 10)}
          className="absolute left-0 top-[17%] z-20 flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 px-3 py-2.5 shadow-[0_18px_40px_rgba(76,48,130,.2)] backdrop-blur-xl sm:left-[-1%] sm:px-4 sm:py-3"
          style={{ transform: "translateZ(70px) rotateY(10deg) rotateZ(-5deg)" }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Learn something</span>
            <span className="block text-xs font-extrabold text-slate-800 sm:text-sm">New every day</span>
          </span>
        </motion.div>

        <motion.div
          animate={float(0.8, 13)}
          className="absolute right-[-1%] top-[12%] z-20 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white/95 px-3 py-2.5 shadow-[0_18px_40px_rgba(16,120,95,.18)] backdrop-blur-xl sm:right-[-2%] sm:px-4"
          style={{ transform: "translateZ(90px) rotateY(-12deg) rotateZ(4deg)" }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg">
            <Check className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-600">Skill exchange</span>
            <span className="block text-xs font-extrabold text-slate-800">Win · Win</span>
          </span>
        </motion.div>

        <motion.div
          animate={float(1.3, 9)}
          className="absolute bottom-[13%] left-[2%] z-20 flex items-center gap-2.5 rounded-2xl border border-amber-100 bg-white/95 px-3 py-2.5 shadow-[0_18px_40px_rgba(130,85,25,.18)] backdrop-blur-xl sm:bottom-[11%] sm:left-[-1%] sm:px-4"
          style={{ transform: "translateZ(80px) rotateY(12deg) rotateZ(4deg)" }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-lg">
            <Trophy className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-[10px] font-black uppercase tracking-wider text-amber-600">Keep growing</span>
            <span className="block text-xs font-extrabold text-slate-800">Earn your progress</span>
          </span>
        </motion.div>

        <motion.div
          animate={float(1.8, 11)}
          className="absolute bottom-[17%] right-[1%] z-20 flex h-12 w-12 items-center justify-center rounded-2xl border border-fuchsia-100 bg-white/95 text-fuchsia-600 shadow-[0_18px_40px_rgba(130,45,145,.2)] sm:bottom-[14%] sm:right-[-1%] sm:h-14 sm:w-14"
          style={{ transform: "translateZ(100px) rotateY(-14deg) rotateZ(-7deg)" }}
        >
          <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" />
        </motion.div>

        {/* Floating 3D credit token */}
        <motion.div
          animate={still ? undefined : { y: [0, -12, 0], rotateY: [0, 180, 360], rotateZ: [0, 5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[17%] bottom-[3%] z-30 flex h-14 w-14 items-center justify-center rounded-full border-[5px] border-amber-100 bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-500 text-xl font-black text-white shadow-[0_14px_30px_rgba(180,110,15,.35)] ring-4 ring-white/70 sm:right-[18%] sm:h-[4.5rem] sm:w-[4.5rem]"
          style={{ transformStyle: "preserve-3d" }}
        >
          S
        </motion.div>
      </div>
      <p className="sr-only">A three-dimensional illustration of the SkillSwap learning community.</p>
    </div>
  );
}

// ---------------- static content (no numbers, no claims about usage) ----------------

const SKILLS = [
  { name: "MERN Stack Dev", icon: Code2 },
  { name: "Fluent English", icon: Languages },
  { name: "UI/UX & Figma", icon: Palette },
  { name: "DSA & Interviews", icon: Brain },
  { name: "Freelancing", icon: Briefcase },
];

const STEPS = [
  { icon: Gift, tone: "bg-violet-100 text-violet-600", title: "Earn & Deposit", desc: "Get starter credits when you join. Earn more by teaching a session. Your wallet keeps track of every credit." },
  { icon: ShieldCheck, tone: "bg-indigo-100 text-indigo-600", title: "Secure Escrow", desc: "Book a mentor and your credits are held by SkillSwap. The mentor is paid only after the session is done." },
  { icon: Smartphone, tone: "bg-emerald-100 text-emerald-600", title: "Learn & Release", desc: "After the video call you share a 6-digit OTP with the mentor and the credits are released to their wallet." },
];

const FEATURES = [
  { icon: Coins, tone: "bg-violet-100 text-violet-600", title: "Credits, Not Cash", desc: "Teach what you know, spend credits on what you want to learn." },
  { icon: ShieldCheck, tone: "bg-emerald-100 text-emerald-600", title: "Escrow-Protected", desc: "Credits are held until the session is confirmed with an OTP." },
  { icon: Brain, tone: "bg-fuchsia-100 text-fuchsia-600", title: "Smart Skill Matching", desc: "We suggest members whose skills fit what you want to learn." },
  { icon: Trophy, tone: "bg-amber-100 text-amber-600", title: "Ratings & Badges", desc: "Every session can be rated, so profiles show real feedback." },
  { icon: Flame, tone: "bg-rose-100 text-rose-600", title: "Learning Streaks", desc: "Learn or teach on consecutive days to build a streak." },
  { icon: Users, tone: "bg-cyan-100 text-cyan-600", title: "Group Classes", desc: "Host one class for several learners and earn from a single session." },
];

const FAQS = [
  { q: "Is it free to join SkillSwap?", a: "Yes. Creating an account is free and no card is needed to sign up. You earn credits by teaching and spend them to learn. Optional wallet features, such as adding credits or withdrawing earnings, can involve payments, and the Wallet page always shows the current terms." },
  { q: "How do I get my first credits?", a: "New accounts get starter credits when they sign up. After that you earn more by teaching sessions or hosting group classes." },
  { q: "What if I think I have nothing to teach?", a: "Almost everyone has something: a language you speak, a tool you use every day, a sport, a hobby. Start small, earn credits, and use them for bigger skills." },
  { q: "How do escrow and the OTP protect me?", a: "When a session is booked, the learner's credits are held by SkillSwap. After the session the learner shares a 6-digit OTP with the mentor, and only then are the credits released." },
  { q: "What if the mentor doesn't show up?", a: "Don't share the OTP and raise a dispute from the session. Our team reviews it and refunds your credits if the session did not happen." },
];


// --------------------------------------------------------------------------
// Extended landing-page contracts.
// These types mirror the existing read-only /api/landing response and the
// /api/landing/match response. Optional fields remain optional so older
// deployments continue to render without fabricated values.
// --------------------------------------------------------------------------

type DailySessionPoint = {
  date: string;
  count: number;
};

type SkillCount = {
  skill: string;
  count: number;
};

type MatchMentor = {
  name: string;
  skills: string[];
  rating: number | null;
  sessions: number | null;
};

type SkillMatchResponse = {
  teach: string | null;
  learn: string | null;
  membersWantingYourSkill: number | null;
  membersTeachingYourGoal: number | null;
  perfectSwaps: number | null;
  mentors: MatchMentor[];
};

type ExtendedLandingStats = {
  totalUsers: number | null;
  activeUsers: number | null;
  sessionsCompleted: number | null;
  ratingAverage: number | null;
  ratingCount: number | null;
  newThisWeek?: number | null;
  hoursTaught?: number | null;
  groupClasses?: number | null;
  longestStreak?: number | null;
  sessionsPerDay?: DailySessionPoint[];
  topLearnedSkills?: SkillCount[];
  mostOffered?: SkillCount[];
  mostWanted?: SkillCount[];
  ratingBreakdown?: Record<string, number>;
  generatedAt?: string;
};

const DISCOVERY_CATEGORIES = [
  {
    name: "Technology",
    description: "Build practical digital skills",
    icon: Code2,
    examples: ["Java", "Python", "React", "Web development", "DSA"],
    tone: "from-violet-500 to-indigo-600",
  },
  {
    name: "Design",
    description: "Turn ideas into experiences",
    icon: Palette,
    examples: ["UI/UX", "Figma", "Graphic design", "Illustration"],
    tone: "from-fuchsia-500 to-pink-600",
  },
  {
    name: "Languages",
    description: "Communicate with confidence",
    icon: Languages,
    examples: ["English", "Hindi", "Spanish", "Public speaking"],
    tone: "from-cyan-500 to-blue-600",
  },
  {
    name: "Career",
    description: "Prepare for your next opportunity",
    icon: Briefcase,
    examples: ["Interview prep", "Resume", "Freelancing", "Leadership"],
    tone: "from-amber-500 to-orange-600",
  },
  {
    name: "Creative",
    description: "Explore what inspires you",
    icon: Sparkles,
    examples: ["Writing", "Music", "Photography", "Content creation"],
    tone: "from-rose-500 to-red-600",
  },
  {
    name: "Knowledge",
    description: "Learn and explain complex ideas",
    icon: Brain,
    examples: ["Mathematics", "Science", "Business", "Economics"],
    tone: "from-emerald-500 to-teal-600",
  },
];

const PLATFORM_PILLARS = [
  {
    icon: HeartHandshake,
    title: "A community built on exchange",
    description:
      "Every member can bring something valuable. SkillSwap makes it easier to find people whose knowledge complements yours.",
    points: ["Teach what you know", "Learn from real people", "Grow through collaboration"],
  },
  {
    icon: ShieldCheck,
    title: "A clearer session journey",
    description:
      "Use the platform's booking, credit-hold and completion-confirmation workflow. Always review the terms shown in your account.",
    points: ["Review booking details", "Follow the in-app confirmation flow", "Raise a dispute when something goes wrong"],
  },
  {
    icon: TrendingUp,
    title: "Progress you can build on",
    description:
      "Your learning journey can include sessions, feedback, streaks and certificates where those features are available to your account.",
    points: ["Keep learning consistently", "Share useful feedback", "Showcase completed achievements"],
  },
];

const LEARNING_JOURNEY = [
  {
    step: "01",
    label: "Create your profile",
    detail: "Introduce yourself and add the skills you can teach and want to learn.",
    icon: Users,
  },
  {
    step: "02",
    label: "Discover a match",
    detail: "Explore members and use skill matching to find relevant learning opportunities.",
    icon: Compass,
  },
  {
    step: "03",
    label: "Arrange a session",
    detail: "Review the session details and confirm the booking through your account.",
    icon: CalendarClock,
  },
  {
    step: "04",
    label: "Exchange knowledge",
    detail: "Attend the session, complete the confirmation process and share feedback.",
    icon: GraduationCap,
  },
];

function PremiumSectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  centered?: boolean;
}) {
  return (
    <div className={`max-w-3xl ${centered ? "mx-auto text-center" : ""}`}>
      <div
        className={`inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-700 ${
          centered ? "justify-center" : ""
        }`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {eyebrow}
      </div>
      <h2
        style={heading}
        className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]"
      >
        {title}
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
        {description}
      </p>
    </div>
  );
}

function InsightMetric({
  label,
  value,
  detail,
  icon: Icon,
  accent = "violet",
}: {
  label: string;
  value: number | null | undefined;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  accent?: "violet" | "emerald" | "amber" | "blue";
}) {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  const accents = {
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)}
          </p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${accents[accent]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function SkillDiscoverySection() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const visibleCategories = DISCOVERY_CATEGORIES.filter((category) => {
    const categoryMatches =
      selectedCategory === "All" || category.name === selectedCategory;
    const normalizedQuery = query.trim().toLowerCase();
    const queryMatches =
      !normalizedQuery ||
      category.name.toLowerCase().includes(normalizedQuery) ||
      category.description.toLowerCase().includes(normalizedQuery) ||
      category.examples.some((example) =>
        example.toLowerCase().includes(normalizedQuery)
      );

    return categoryMatches && queryMatches;
  });

  const openExplore = (skill?: string) => {
    const target = skill ? `/explore?skill=${encodeURIComponent(skill)}` : "/explore";
    window.location.href = target;
  };

  return (
    <section
      id="skill-discovery"
      className="relative scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8 lg:py-24"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-violet-50/40 to-white" />
      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <PremiumSectionHeading
            eyebrow="Explore possibilities"
            title="Find the skill that moves you forward."
            description="Explore learning areas, discover topics and open the member directory to see what is available in the community."
          />
          <div className="w-full max-w-md">
            <label htmlFor="skill-discovery-search" className="sr-only">
              Search skill categories
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="skill-discovery-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search skills or categories..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {["All", ...DISCOVERY_CATEGORIES.map((item) => item.name)].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSelectedCategory(item)}
              aria-pressed={selectedCategory === item}
              className={`rounded-full px-4 py-2 text-xs font-extrabold transition ${
                selectedCategory === item
                  ? "bg-violet-700 text-white shadow-md shadow-violet-700/20"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCategories.map((category, index) => {
            const Icon = category.icon;

            return (
              <motion.article
                key={category.name}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${category.tone} text-white shadow-lg`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <ArrowUpRight className="h-5 w-5 text-slate-300 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-violet-600" />
                  </div>

                  <h3 className="mt-5 text-xl font-black text-slate-950">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {category.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {category.examples.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => openExplore(example)}
                        className="rounded-full border border-violet-100 bg-violet-50/70 px-3 py-1.5 text-[11px] font-bold text-violet-700 transition hover:bg-violet-700 hover:text-white"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openExplore(category.name)}
                  className="flex w-full items-center justify-between border-t border-slate-100 px-6 py-4 text-left text-xs font-black text-violet-700 transition hover:bg-violet-50"
                >
                  Explore {category.name}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.article>
            );
          })}
        </div>

        {visibleCategories.length === 0 && (
          <div className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Search className="mx-auto h-7 w-7 text-slate-400" />
            <p className="mt-3 font-bold text-slate-800">No matching category</p>
            <p className="mt-1 text-sm text-slate-500">
              Try another search term or select All categories.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedCategory("All");
              }}
              className="mt-4 text-sm font-extrabold text-violet-700 hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-3xl bg-slate-950 p-6 text-white sm:flex-row sm:p-8">
          <div>
            <p className="text-lg font-black">Have a different skill in mind?</p>
            <p className="mt-1 text-sm text-slate-300">
              Open the full directory and explore the skills listed by members.
            </p>
          </div>
          <Link href="/explore">
            <Button className="h-12 rounded-full bg-white px-6 font-black text-slate-950 hover:bg-violet-100">
              Browse all skills <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function SkillMatchSection() {
  const [teach, setTeach] = useState("");
  const [learn, setLearn] = useState("");
  const [result, setResult] = useState<SkillMatchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const searchMatches = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const teachValue = teach.trim();
    const learnValue = learn.trim();

    if (teachValue.length < 2 && learnValue.length < 2) {
      setError("Enter at least one skill with two or more characters.");
      setResult(null);
      return;
    }

    setBusy(true);
    setError("");
    setResult(null);
    setSearched(true);

    try {
      const params = new URLSearchParams();

      if (teachValue.length >= 2) params.set("teach", teachValue);
      if (learnValue.length >= 2) params.set("learn", learnValue);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/landing/match?${params.toString()}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error(
          payload?.error || "Matching is temporarily unavailable. Please try again."
        );
      }

      setResult(payload.data as SkillMatchResponse);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong while finding matches."
      );
    } finally {
      setBusy(false);
    }
  };

  const clearMatch = () => {
    setTeach("");
    setLearn("");
    setResult(null);
    setError("");
    setSearched(false);
  };

  return (
    <section
      id="skill-match"
      className="relative scroll-mt-20 overflow-hidden bg-slate-950 px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-24"
    >
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-violet-600/25 blur-[110px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-indigo-500/20 blur-[110px]" />

      <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">
            <Target className="h-3.5 w-3.5" />
            Smart skill matching
          </div>

          <h2
            style={heading}
            className="mt-5 text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl"
          >
            Give knowledge.
            <span className="block text-violet-300">Get knowledge.</span>
          </h2>

          <p className="mt-5 max-w-lg text-base leading-8 text-slate-300">
            Tell SkillSwap what you can teach and what you want to learn. The
            matching service checks the real member skill lists and returns a
            matching snapshot.
          </p>

          <div className="mt-8 space-y-3">
            {[
              "See how many members want to learn your skill.",
              "Find how many members teach the skill you want.",
              "Discover possible two-way skill exchanges.",
            ].map((line) => (
              <div key={line} className="flex items-start gap-3 text-sm font-semibold text-slate-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                {line}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white p-5 text-slate-900 shadow-[0_35px_100px_rgba(0,0,0,.35)] sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-700">
                Match finder
              </p>
              <h3 className="mt-1 text-2xl font-black tracking-tight">
                Build your skill exchange
              </h3>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <RefreshCw className="h-6 w-6" />
            </span>
          </div>

          <form onSubmit={searchMatches} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-700">
                I can teach
              </span>
              <div className="relative">
                <GraduationCap className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-600" />
                <input
                  value={teach}
                  onChange={(event) => setTeach(event.target.value)}
                  maxLength={40}
                  placeholder="e.g. Java, English, Figma"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-700">
                I want to learn
              </span>
              <div className="relative">
                <BookOpen className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-600" />
                <input
                  value={learn}
                  onChange={(event) => setLearn(event.target.value)}
                  maxLength={40}
                  placeholder="e.g. React, UI/UX, guitar"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </label>

            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                disabled={busy}
                className="h-14 flex-1 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-600 font-black text-white shadow-lg shadow-violet-500/20 hover:from-violet-800 hover:to-indigo-700"
              >
                {busy ? "Finding matches..." : "Find my matches"}
                {busy ? (
                  <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="ml-2 h-4 w-4" />
                )}
              </Button>

              {(searched || teach || learn) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearMatch}
                  className="h-14 rounded-2xl border-slate-200 px-5 font-bold"
                >
                  Clear
                </Button>
              )}
            </div>
          </form>

          {result && (
            <div className="mt-7 border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-black text-slate-900">
                  Your matching snapshot
                </h4>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                  Live API result
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {result.membersWantingYourSkill !== null && (
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-2xl font-black text-emerald-700">
                      {result.membersWantingYourSkill.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[10px] font-bold leading-4 text-emerald-800">
                      Members wanting your skill
                    </p>
                  </div>
                )}

                {result.membersTeachingYourGoal !== null && (
                  <div className="rounded-2xl bg-violet-50 p-4">
                    <p className="text-2xl font-black text-violet-700">
                      {result.membersTeachingYourGoal.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[10px] font-bold leading-4 text-violet-800">
                      Members teaching your goal
                    </p>
                  </div>
                )}

                {result.perfectSwaps !== null && (
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-2xl font-black text-amber-700">
                      {result.perfectSwaps.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[10px] font-bold leading-4 text-amber-800">
                      Possible two-way swaps
                    </p>
                  </div>
                )}
              </div>

              {result.mentors.length > 0 && (
                <div className="mt-5">
                  <p className="mb-3 text-xs font-black text-slate-700">
                    Members teaching your goal
                  </p>
                  <div className="space-y-2">
                    {result.mentors.map((mentor, index) => (
                      <div
                        key={`${mentor.name}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-slate-800">
                            {mentor.name}
                          </p>
                          <p className="mt-1 truncate text-[10px] text-slate-500">
                            {mentor.skills.join(" · ")}
                          </p>
                        </div>
                        {mentor.rating !== null && (
                          <span className="shrink-0 text-xs font-black text-amber-600">
                            ★ {mentor.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.membersTeachingYourGoal === 0 &&
                result.membersWantingYourSkill === 0 && (
                  <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
                    No exact matches were found for these terms yet. Try a broader
                    skill name or explore the full member directory.
                  </p>
                )}

              <Link
                href="/explore"
                className="mt-5 inline-flex items-center gap-2 text-xs font-black text-violet-700 hover:underline"
              >
                Explore all members <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CommunityInsightsSection({
  stats,
}: {
  stats: ExtendedLandingStats;
}) {
  const daily = stats.sessionsPerDay ?? [];
  const maxDaily = Math.max(1, ...daily.map((point) => point.count));
  const offered = stats.mostOffered ?? [];
  const wanted = stats.mostWanted ?? [];
  const learned = stats.topLearnedSkills ?? [];
  const ratingBreakdown = stats.ratingBreakdown ?? {};
  const hasDaily = daily.some((point) => point.count > 0);
  const hasSkills = offered.length > 0 || wanted.length > 0 || learned.length > 0;
  const ratingTotal = Object.values(ratingBreakdown).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0
  );

  return (
    <section
      id="community-insights"
      className="scroll-mt-20 bg-[#f7f5fc] px-4 py-20 sm:px-6 lg:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <PremiumSectionHeading
          eyebrow="Community pulse"
          title="Understand how the community is growing."
          description="These insights are populated from the platform's existing public landing API. A metric is shown only when the API returns a meaningful value."
        />

        <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InsightMetric
            label="New this week"
            value={stats.newThisWeek}
            detail="New accounts created during the last seven days."
            icon={Users}
            accent="violet"
          />
          <InsightMetric
            label="Learning hours"
            value={stats.hoursTaught}
            detail="Hours calculated from completed session durations."
            icon={Clock3}
            accent="emerald"
          />
          <InsightMetric
            label="Group classes"
            value={stats.groupClasses}
            detail="Group sessions recorded as completed."
            icon={Handshake}
            accent="amber"
          />
          <InsightMetric
            label="Longest streak"
            value={stats.longestStreak}
            detail="Highest recorded member learning streak."
            icon={Flame}
            accent="blue"
          />
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-violet-700">
                  <Activity className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-[.18em]">
                    Activity trend
                  </span>
                </div>
                <h3 className="mt-2 text-xl font-black text-slate-950">
                  Sessions over the last 14 days
                </h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500">
                Completed sessions
              </span>
            </div>

            {hasDaily ? (
              <div className="mt-8">
                <div className="flex h-40 items-end gap-1.5 sm:gap-2">
                  {daily.map((point) => {
                    const height = Math.max(
                      point.count > 0 ? 7 : 2,
                      (point.count / maxDaily) * 100
                    );

                    return (
                      <div
                        key={point.date}
                        className="group relative flex h-full flex-1 flex-col justify-end"
                        title={`${point.date}: ${point.count} sessions`}
                      >
                        <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2 py-1 text-[10px] font-bold text-white group-hover:block">
                          {point.count} sessions
                        </div>
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-violet-700 to-fuchsia-400 transition-all duration-500 group-hover:from-indigo-700 group-hover:to-violet-400"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-between text-[9px] font-bold text-slate-400">
                  <span>{daily[0]?.date ?? ""}</span>
                  <span>{daily[daily.length - 1]?.date ?? ""}</span>
                </div>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <BarChart3 className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">
                  Activity chart will appear here
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  No completed-session activity was returned for this period.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center gap-2 text-amber-600">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-[10px] font-black uppercase tracking-[.18em]">
                Member feedback
              </span>
            </div>
            <h3 className="mt-2 text-xl font-black text-slate-950">
              Rating distribution
            </h3>

            {ratingTotal > 0 ? (
              <div className="mt-6 space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = ratingBreakdown[String(rating)] ?? 0;
                  const width = (count / ratingTotal) * 100;

                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="w-7 text-xs font-black text-slate-600">
                        {rating}★
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-[10px] font-bold text-slate-500">
                        {count}
                      </span>
                    </div>
                  );
                })}
                <p className="pt-2 text-[10px] text-slate-400">
                  Based on {ratingTotal.toLocaleString()} recorded ratings.
                </p>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <Star className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">
                  Ratings will appear as members share feedback
                </p>
              </div>
            )}
          </div>
        </div>

        {hasSkills && (
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {[
              { title: "Most offered", subtitle: "Skills members list to teach", items: offered, icon: GraduationCap, tone: "violet" },
              { title: "Most wanted", subtitle: "Skills members want to learn", items: wanted, icon: Target, tone: "emerald" },
              { title: "Most learned", subtitle: "Skills in completed sessions", items: learned, icon: BookOpen, tone: "amber" },
            ].map((group) => {
              const Icon = group.icon;

              return (
                <div
                  key={group.title}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        group.tone === "violet"
                          ? "bg-violet-100 text-violet-700"
                          : group.tone === "emerald"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-black text-slate-900">{group.title}</h3>
                      <p className="text-[10px] text-slate-500">{group.subtitle}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {group.items.slice(0, 5).map((item, index) => (
                      <div
                        key={item.skill}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-700">
                          <span className="text-[10px] font-black text-slate-300">
                            0{index + 1}
                          </span>
                          <span className="truncate">{item.skill}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function PlatformPrinciplesSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <PremiumSectionHeading
          eyebrow="Why SkillSwap"
          title="A platform designed around people, not just profiles."
          description="Skill exchange works best when discovery, expectations and follow-through are clear. These principles shape the experience."
          centered
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {PLATFORM_PILLARS.map((pillar, index) => {
            const Icon = pillar.icon;

            return (
              <motion.article
                key={pillar.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.45 }}
                className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/20">
                  <Icon className="h-7 w-7" />
                </span>
                <h3 className="mt-6 text-xl font-black text-slate-950">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  {pillar.description}
                </p>
                <div className="mt-6 space-y-3">
                  {pillar.points.map((point) => (
                    <div
                      key={point}
                      className="flex items-start gap-2 text-xs font-bold text-slate-700"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {point}
                    </div>
                  ))}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LearningJourneySection() {
  return (
    <section
      id="learning-journey"
      className="scroll-mt-20 bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-4 py-20 sm:px-6 lg:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <PremiumSectionHeading
          eyebrow="Your path forward"
          title="Four steps from curiosity to capability."
          description="A simple overview of how members can move from creating a profile to completing a learning exchange."
        />

        <div className="relative mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="absolute left-8 right-8 top-8 hidden h-px bg-gradient-to-r from-violet-200 via-indigo-200 to-emerald-200 lg:block" />
          {LEARNING_JOURNEY.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.article
                key={item.step}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.07 }}
                className="relative rounded-3xl border border-white bg-white p-6 shadow-[0_12px_40px_rgba(60,40,110,.07)]"
              >
                <div className="relative z-10 flex items-center justify-between">
                  <span className="text-xs font-black tracking-[.2em] text-violet-400">
                    STEP {item.step}
                  </span>
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
                    <Icon className="h-6 w-6" />
                  </span>
                </div>
                <h3 className="mt-7 text-lg font-black text-slate-950">
                  {item.label}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {item.detail}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TrustAndSafetySection() {
  const items = [
    {
      icon: Lock,
      number: "01",
      title: "Your account, your control",
      description:
        "Keep your sign-in details private. Use a strong password and never share one-time passwords with anyone.",
      tone: "from-violet-400/20 to-fuchsia-400/10",
    },
    {
      icon: CalendarClock,
      number: "02",
      title: "Clear session expectations",
      description:
        "Review the mentor, learner, schedule and session details in your account before you join.",
      tone: "from-cyan-400/20 to-blue-400/10",
    },
    {
      icon: HeartHandshake,
      number: "03",
      title: "Support when you need it",
      description:
        "If a learning exchange does not go as agreed, use the dispute and support options available in your account.",
      tone: "from-emerald-400/20 to-teal-400/10",
    },
    {
      icon: BadgeCheck,
      number: "04",
      title: "Check certificates independently",
      description:
        "Public certificate lookup checks a certificate record. It does not claim to verify a member’s identity.",
      tone: "from-amber-400/20 to-orange-400/10",
    },
  ];

  return (
    <section
      id="trust-safety"
      className="relative isolate scroll-mt-20 overflow-hidden bg-[#090718] px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full bg-violet-600/25 blur-[110px]" />
        <div className="absolute -right-32 bottom-0 h-[30rem] w-[30rem] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute inset-0 opacity-[.13] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:54px_54px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-[.82fr_1.18fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[.08] px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-violet-200 shadow-lg shadow-violet-950/20">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Built around safer learning
            </div>
            <h2
              style={heading}
              className="mt-7 max-w-xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.6rem]"
            >
              Good learning starts with
              <span className="mt-2 block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-emerald-200 bg-clip-text text-transparent">
                trust on both sides.
              </span>
            </h2>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-300">
              SkillSwap is about people sharing what they know. A few clear habits
              help every exchange feel more confident, respectful and transparent.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register">
                <Button className="h-13 rounded-full bg-white px-7 font-black text-slate-950 shadow-xl shadow-violet-950/30 transition hover:-translate-y-0.5 hover:bg-violet-100">
                  Join the community <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="h-13 rounded-full border-white/20 bg-white/[.04] px-6 font-bold text-white hover:bg-white/10 hover:text-white">
                  Sign in
                </Button>
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-xs font-semibold text-slate-400">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Clear session details</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Account safety tips</span>
            </div>
          </motion.div>

          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.number}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: index * 0.08, duration: 0.45 }}
                  whileHover={{ y: -5 }}
                  className="group relative min-h-[218px] overflow-hidden rounded-[1.65rem] border border-white/[.11] bg-white/[.055] p-6 shadow-[0_18px_60px_rgba(0,0,0,.18)] backdrop-blur-xl transition-colors hover:border-white/20 hover:bg-white/[.085]"
                >
                  <div className={`pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br ${item.tone} opacity-70 blur-2xl transition-opacity group-hover:opacity-100`} />
                  <div className="relative flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[.08] text-violet-100 shadow-inner">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] font-black tracking-[.22em] text-white/30">{item.number}</span>
                  </div>
                  <h3 className="relative mt-6 text-lg font-black tracking-tight text-white">{item.title}</h3>
                  <p className="relative mt-2 text-[13px] leading-6 text-slate-300">{item.description}</p>
                </motion.article>
              );
            })}
          </div>
        </div>

        <div className="mt-16 flex flex-col justify-between gap-5 rounded-3xl border border-white/10 bg-white/[.045] px-6 py-5 backdrop-blur sm:flex-row sm:items-center sm:px-8">
          <div>
            <p className="text-sm font-black text-white">Knowledge grows when it is shared.</p>
            <p className="mt-1 text-xs text-slate-400">Bring one skill. Leave with a new perspective.</p>
          </div>
          <a href="#top" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.15em] text-violet-200 transition hover:text-white">
            Back to top <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function MobileJoinBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(30,20,60,.08)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-black text-slate-900">Ready to exchange skills?</p>
          <p className="truncate text-[10px] text-slate-500">Create your free account to get started.</p>
        </div>
        <Link href="/register">
          <Button className="h-11 rounded-full bg-violet-700 px-5 text-xs font-black text-white hover:bg-violet-800">
            Join now <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}


// ==========================================================================
// PAGE
// ==========================================================================

export default function Landing() {
  const typed = useTypewriter(TYPEWRITER_WORDS, 65, 1800);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [stats, setStats] = useState<{
    totalUsers: number | null; activeUsers: number | null; sessionsCompleted: number | null;
    ratingAverage: number | null; ratingCount: number | null;
    newThisWeek: number | null; hoursTaught: number | null;
    groupClasses: number | null; longestStreak: number | null;
    sessionsPerDay: DailySessionPoint[]; topLearnedSkills: SkillCount[];
    mostOffered: SkillCount[]; mostWanted: SkillCount[];
    ratingBreakdown: Record<string, number>;
  }>({
    totalUsers: null, activeUsers: null, sessionsCompleted: null,
    ratingAverage: null, ratingCount: null, newThisWeek: null,
    hoursTaught: null, groupClasses: null, longestStreak: null,
    sessionsPerDay: [], topLearnedSkills: [], mostOffered: [],
    mostWanted: [], ratingBreakdown: {},
  });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [liveTicker, setLiveTicker] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [certs, setCerts] = useState<CertSummary | null>(null);
  const [verifyId, setVerifyId] = useState("");

  const reduceMotionPref = useReducedMotion();
  const still = Capacitor.isNativePlatform() || !!reduceMotionPref;

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || "";
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API}/api/landing`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && !cancelled) {
            const d = json.data;
            setStats({
              totalUsers: num(d.totalUsers), activeUsers: num(d.activeUsers),
              sessionsCompleted: num(d.completedSessions),
              ratingAverage: num(d.ratingAverage), ratingCount: num(d.ratingCount),
              newThisWeek: num(d.newThisWeek),
              hoursTaught: num(d.hoursTaught),
              groupClasses: num(d.groupClasses),
              longestStreak: num(d.longestStreak),
              sessionsPerDay: Array.isArray(d.sessionsPerDay) ? d.sessionsPerDay : [],
              topLearnedSkills: Array.isArray(d.topLearnedSkills) ? d.topLearnedSkills : [],
              mostOffered: Array.isArray(d.mostOffered) ? d.mostOffered : [],
              mostWanted: Array.isArray(d.mostWanted) ? d.mostWanted : [],
              ratingBreakdown: d.ratingBreakdown && typeof d.ratingBreakdown === "object" ? d.ratingBreakdown : {},
            });
            if (Array.isArray(d.liveExchanges)) {
              setLiveTicker(d.liveExchanges.filter((x: unknown) => typeof x === "string" && (x as string).trim()));
            }
            if (Array.isArray(d.recentReviews)) {
              setReviews(
                d.recentReviews
                  .map((r: any) => ({
                    name: String(r.name || "SkillSwap member"),
                    text: String(r.text || r.comment || "").trim(),
                    rating: num(r.rating),
                    skill: r.skill ? String(r.skill) : undefined,
                  }))
                  .filter((r: Review) => r.text.length > 0)
                  .slice(0, 4)
              );
            }
            if (Array.isArray(d.topMentors)) {
              setMentors(
                d.topMentors
                  .map((m: any) => ({
                    name: String(m.name || "SkillSwap mentor"),
                    skills: Array.isArray(m.skills) ? m.skills.map(String).slice(0, 3) : [],
                    rating: num(m.rating) as number,
                    sessions: num(m.sessions),
                  }))
                  .filter((m: Mentor) => typeof m.rating === "number" && Number.isFinite(m.rating) && m.rating > 0)
                  .slice(0, 4)
              );
            }
          }
        }
      } catch { /* leave blocks hidden */ }
      finally { if (!cancelled) setStatsLoaded(true); }
    })();

    (async () => {
      try {
        const r = await fetch(`${API}/api/certificates/public/summary`);
        if (r.ok && !cancelled) setCerts(await r.json());
      } catch { /* empty state */ }
    })();

    return () => { cancelled = true; };
  }, []);

  const hasRating = !!stats.ratingCount && stats.ratingCount > 0 && stats.ratingAverage !== null;

  type StatItem = { label: string; value: number | null; display?: string };
  const rawStats: (StatItem | null)[] = [
    { label: "Members", value: stats.totalUsers },
    { label: "Active this month", value: stats.activeUsers },
    { label: "Classes completed", value: stats.sessionsCompleted },
    hasRating
      ? { label: `Rating · ${stats.ratingCount!.toLocaleString()} ${stats.ratingCount === 1 ? "review" : "reviews"}`, value: stats.ratingAverage, display: stats.ratingAverage!.toFixed(1) }
      : null,
  ];
  const statItems = rawStats.filter((s): s is StatItem => !!s && (s.display !== undefined || (s.value ?? 0) > 0));

  const goVerify = (e: FormEvent) => {
    e.preventDefault();
    const id = verifyId.trim().toUpperCase();
    if (id) window.location.href = `/verify.html?id=${encodeURIComponent(id)}`;
  };
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 },
    viewport: { once: true }, transition: { delay, duration: 0.5 },
  });

  return (
    <div
      className="relative -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden bg-gradient-to-b from-[#F3ECFF] via-[#FAF8FF] to-white font-sans selection:bg-violet-200 selection:text-violet-900"
      id="top"
      data-page="skillswap-landing"
    >

      {/* ================= HERO ================= */}
      <section className="relative isolate px-4 sm:px-6 lg:px-8 pt-10 pb-14 lg:pt-14 lg:pb-20">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-violet-300/35 blur-[110px]" />
          <div className="absolute top-1/3 -right-24 h-[380px] w-[380px] rounded-full bg-emerald-200/40 blur-[110px]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/80 to-transparent" />
          <div className="absolute inset-0 opacity-[.18] [background-image:radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:25px_25px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        </div>

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_1.08fr] lg:gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 border border-violet-100 shadow-sm text-sm font-medium text-slate-600 mb-6">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              {stats.totalUsers && stats.totalUsers > 0
                ? <><b className="text-violet-700">{stats.totalUsers.toLocaleString()}</b> members sharing knowledge</>
                : <>Learn by teaching what you know</>}
            </div>

            <h1 style={heading} className="max-w-[12ch] text-4xl font-extrabold leading-[1.04] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[4.15rem]">
              Learn any skill.<br />
              Pay with your <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">knowledge.</span>
            </h1>

            <p style={heading} className="mt-5 flex items-center gap-2.5 text-2xl sm:text-3xl font-bold text-slate-900">
              <Crown className="w-7 h-7 text-violet-600 flex-shrink-0" />
              Master <span className="text-violet-600 min-w-[8ch] border-b-4 border-violet-200">{typed}</span>
            </p>

            <p className="mt-5 text-lg text-slate-600 max-w-xl leading-relaxed font-medium">
              <b className="text-slate-900">Teach</b> what you know to earn credits. Use those credits to <b className="text-slate-900">learn</b> from other members. Credits are protected by escrow on every session.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {[
                { icon: Zap, text: "Free to join" },
                { icon: ShieldCheck, text: "No card to sign up" },
                ...(stats.totalUsers && stats.totalUsers > 0 ? [{ icon: Users, text: `${stats.totalUsers.toLocaleString()} members` }] : []),
              ].map((c) => (
                <span key={c.text} className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 border border-violet-100 text-sm font-bold text-slate-700 shadow-sm">
                  <c.icon className="w-4 h-4 text-violet-600" /> {c.text}
                </span>
              ))}
              {hasRating && (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 border border-violet-100 text-sm font-bold text-slate-700 shadow-sm">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {stats.ratingAverage!.toFixed(1)} from {stats.ratingCount!.toLocaleString()} {stats.ratingCount === 1 ? "review" : "reviews"}
                </span>
              )}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
              <Link href="/register">
                <Button className="w-full sm:w-auto h-14 px-8 rounded-full text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 shadow-[0_10px_30px_rgba(124,58,237,0.3)] transition-transform hover:scale-[1.03] active:scale-95">
                  Start Free <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <button onClick={() => scrollTo("how-it-works")} className="inline-flex items-center justify-center gap-2 text-violet-700 font-bold hover:underline underline-offset-4">
                <span className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center"><Play className="w-4 h-4 fill-current ml-0.5" /></span>
                See How It Works
              </button>
            </div>
          </div>

          <HeroVisual still={still} />
        </div>

        {/* skills bar */}
        <motion.div {...fade(0.1)} className="relative max-w-6xl mx-auto mt-14 rounded-3xl bg-white/80 backdrop-blur border border-violet-100 shadow-lg shadow-violet-100/50 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 style={heading} className="flex items-center gap-2 font-bold text-slate-900 text-lg"><Sparkles className="w-5 h-5 text-violet-600" /> Skills you can learn or teach</h2>
            <Link href="/explore"><span className="text-sm font-bold text-violet-600 hover:underline cursor-pointer inline-flex items-center">Explore More <ArrowRight className="w-4 h-4 ml-1" /></span></Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {SKILLS.map((s) => (
              <Link href="/explore" key={s.name}>
                <div className="group/skill flex flex-col items-center gap-2 rounded-2xl border border-violet-100 bg-gradient-to-b from-white to-violet-50/60 p-4 text-center shadow-[0_5px_15px_rgba(91,55,170,.05)] transition-all duration-300 [transform:perspective(700px)_rotateX(0deg)] hover:-translate-y-2 hover:scale-[1.025] hover:border-violet-300 hover:shadow-[0_18px_32px_rgba(91,55,170,.16)] hover:[transform:perspective(700px)_rotateX(7deg)] cursor-pointer">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 shadow-[inset_0_1px_0_white,0_5px_12px_rgba(91,55,170,.12)] transition-transform duration-300 group-hover/skill:scale-110 group-hover/skill:-rotate-6"><s.icon className="w-5 h-5" /></span>
                  <span className="text-sm font-bold text-slate-700">{s.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ================= REAL STATS ================= */}
      {(!statsLoaded || statItems.length > 0) && (
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-5xl mx-auto rounded-[2rem] bg-gradient-to-r from-violet-950 via-indigo-950 to-violet-950 border border-violet-800/50 shadow-2xl p-6 sm:p-9">
            <div className="flex flex-wrap justify-around gap-8">
              {!statsLoaded
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="text-center min-w-[130px]">
                      <div className="h-11 w-24 mx-auto rounded-xl bg-violet-800/40 animate-pulse mb-3" />
                      <div className="h-3 w-20 mx-auto rounded bg-violet-800/30 animate-pulse" />
                    </div>
                  ))
                : statItems.map((st) => (
                    <div key={st.label} className="text-center min-w-[130px]">
                      <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-200 to-white mb-2 whitespace-nowrap">
                        {st.display ? (
                          <span className="inline-flex items-center gap-2">{st.display}<Star className="w-7 h-7 fill-amber-400 text-amber-400" /></span>
                        ) : (
                          <Counter target={st.value as number} />
                        )}
                      </div>
                      <div className="text-[10px] sm:text-xs font-bold text-violet-300 uppercase tracking-widest">{st.label}</div>
                    </div>
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= REAL ACTIVITY TICKER ================= */}
      {liveTicker.length > 0 && (
        <div className="w-full bg-slate-900 border-y border-slate-800 py-4 overflow-hidden flex relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-slate-900 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-900 to-transparent z-10" />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-3 py-1.5 rounded-full border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
          </div>
          <motion.div
            animate={still ? undefined : { x: ["0%", "-50%"] }}
            transition={{ ease: "linear", duration: Math.max(20, liveTicker.length * 8), repeat: Infinity }}
            className="flex flex-nowrap gap-5 whitespace-nowrap pl-28 pr-4"
          >
            {[...liveTicker, ...liveTicker].map((t, i) => (
              <div key={i} className="text-slate-300 font-semibold text-sm bg-slate-800/80 px-5 py-2.5 rounded-full border border-slate-700">{t}</div>
            ))}
          </motion.div>
        </div>
      )}

      {/* ================= SKILL DISCOVERY ================= */}
      <SkillDiscoverySection />

      {/* ================= REAL SKILL MATCHING ================= */}
      <SkillMatchSection />

      {/* ================= COMMUNITY ANALYTICS ================= */}
      <CommunityInsightsSection stats={stats} />

      {/* ================= PLATFORM PRINCIPLES ================= */}
      <PlatformPrinciplesSection />

      {/* ================= LEARNING JOURNEY ================= */}
      <LearningJourneySection />

      {/* ================= HOW THE CREDIT ECONOMY WORKS ================= */}
      <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 py-20 scroll-mt-4">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fade()} className="mb-10">
            <h2 style={heading} className="flex items-center gap-2.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              <Zap className="w-8 h-8 text-violet-600" /> How the Credit Economy Works
            </h2>
            <p className="mt-2 text-slate-600 font-medium text-lg">Teach to earn credits, spend them to learn. Escrow protects every session.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="contents">
                <motion.div {...fade(i * 0.1)} className="rounded-3xl bg-white border border-violet-100 shadow-lg shadow-violet-100/40 p-6 flex gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-7 h-7 rounded-full bg-violet-600 text-white text-sm font-black flex items-center justify-center">{i + 1}</span>
                      <h3 className="font-extrabold text-slate-900 text-lg" style={heading}>{s.title}</h3>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[15px]">{s.desc}</p>
                  </div>
                  <span className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${s.tone}`}><s.icon className="w-7 h-7" /></span>
                </motion.div>
                {i < STEPS.length - 1 && <ArrowRight className="hidden md:block self-center w-6 h-6 text-violet-400" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SKILL NETWORK + CERTIFICATE ================= */}
      <section id="certificates" className="px-4 sm:px-6 lg:px-8 py-16 scroll-mt-4">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fade()} className="mb-10">
            <p className="text-sm font-bold text-violet-600 mb-1">More than just video calls</p>
            <h2 style={heading} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">The Ultimate Skill Network</h2>
            <p className="mt-2 text-slate-600 font-medium text-lg max-w-2xl">Everything you need to learn new skills and prove them, in one place.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURES.map((f, i) => (
                <motion.div key={f.title} {...fade(i * 0.06)} className="rounded-2xl bg-white border border-violet-100 shadow-md shadow-violet-100/40 p-5 flex gap-4 hover:-translate-y-1 hover:shadow-lg transition-all">
                  <span className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${f.tone}`}><f.icon className="w-6 h-6" /></span>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* certificate preview + real data */}
            <motion.div {...fade(0.1)}>
              <div className="relative rounded-3xl bg-white border border-violet-100 shadow-2xl shadow-violet-200/50 overflow-hidden">
                <span className="absolute top-3 right-3 z-10 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/90 border border-slate-200 rounded-full px-3 py-1">Sample design</span>
                <div className="flex">
                  <div className="w-14 sm:w-16 bg-gradient-to-b from-[#0E2A47] to-[#08203A] flex flex-col items-center py-5 gap-3">
                    <img src="/pwa-192x192.png" alt="" className="w-9 h-9 rounded-xl" />
                    <div className="flex-1 w-1 rounded-full bg-gradient-to-b from-teal-400 to-amber-300/70" />
                  </div>
                  <div className="flex-1 p-6 text-center">
                    <p className="text-[10px] font-black tracking-[0.3em] text-slate-500">SKILLSWAP INDIA</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tight mt-1" style={heading}>CERTIFICATE</p>
                    <p className="text-[10px] font-bold tracking-[0.25em] text-amber-600">OF SKILL PROFICIENCY</p>
                    <div className="h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent my-4" />
                    <p className="text-[11px] text-slate-500">presented to</p>
                    <p className="text-lg font-black text-slate-900">YOUR NAME</p>
                    <p className="text-[11px] text-slate-500 mt-3">for completing</p>
                    <p className="text-base font-black text-[#0E2A47]">YOUR SKILL</p>
                    <div className="flex items-center justify-center gap-3 mt-5">
                      <span className="w-12 h-12 rounded-lg bg-[#06182A] flex items-center justify-center"><QrCode className="w-7 h-7 text-white" /></span>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-teal-600 uppercase tracking-wider">Scan to verify</p>
                        <p className="text-[11px] font-mono text-slate-500">SWAP-IND-XXXXXX</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-3">
                  <BadgeCheck className="w-6 h-6 flex-shrink-0" />
                  <div>
                    <p className="font-bold leading-tight">Verifiable Certificates</p>
                    <p className="text-xs text-violet-100">Prove your skills. Anyone can verify.</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-white border border-violet-100 shadow-sm p-5">
                {certs && certs.total > 0 ? (
                  <p className="text-slate-600 mb-4">
                    <span className="text-2xl font-black text-slate-900"><Counter target={certs.total} /></span> certificate{certs.total === 1 ? "" : "s"} issued
                    {certs.topSkills.length > 0 && <> &middot; most in <b className="text-slate-800">{certs.topSkills[0].skill}</b></>}
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-slate-500 mb-4">Be among the first members to earn a verified SkillSwap certificate.</p>
                )}

                {certs && certs.recent.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {certs.recent.slice(0, 3).map((c) => (
                      <a key={c.certId} href={`/verify.html?id=${encodeURIComponent(c.certId)}`}
                         className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/40 transition-colors">
                        <span className="min-w-0">
                          <span className="block font-bold text-slate-800 text-sm truncate">{c.skill}</span>
                          <span className="block text-xs text-slate-500">{c.level} &middot; {c.role === "teacher" ? "Mentor" : "Learner"} &middot; {c.dateStr}</span>
                        </span>
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 flex-shrink-0"><BadgeCheck className="w-4 h-4" /> Verify</span>
                      </a>
                    ))}
                  </div>
                )}

                <a href="/certificate.html" className="block mb-3">
                  <Button className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0">
                    Get Your Certificate <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </a>
                <form onSubmit={goVerify} className="flex gap-2" aria-label="Verify a certificate">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input value={verifyId} onChange={(e) => setVerifyId(e.target.value)} placeholder="Verify an ID: SWAP-IND-XXXXXX"
                      className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold uppercase placeholder:normal-case focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
                  </div>
                  <Button type="submit" variant="outline" className="h-11 rounded-xl font-bold">Verify</Button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= TOP MENTORS (real) ================= */}
      {mentors.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-6xl mx-auto">
            <motion.div {...fade()} className="mb-8">
              <h2 style={heading} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Top-rated mentors</h2>
              <p className="mt-2 text-slate-600 font-medium">Ranked by member ratings and completed sessions.</p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {mentors.map((m, i) => (
                <motion.div key={i} {...fade(i * 0.07)} className="rounded-3xl bg-white border border-violet-100 shadow-md shadow-violet-100/40 p-6 text-center hover:-translate-y-1 hover:shadow-xl transition-all">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-2xl font-black flex items-center justify-center mb-3 shadow-md">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-extrabold text-slate-900">{m.name}</p>
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-bold text-slate-600">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {m.rating.toFixed(1)}
                    {m.sessions !== null && m.sessions > 0 && <span className="text-slate-400 font-semibold">&middot; {m.sessions} {m.sessions === 1 ? "session" : "sessions"}</span>}
                  </p>
                  {m.skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                      {m.skills.map((sk) => <span key={sk} className="px-2.5 py-1 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-xs font-bold">{sk}</span>)}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= REVIEWS (real) ================= */}
      {reviews.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-6xl mx-auto">
            <motion.div {...fade()} className="flex flex-wrap items-end justify-between gap-3 mb-8">
              <h2 style={heading} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">What members say</h2>
              {hasRating && (
                <p className="flex items-center gap-2 text-slate-600 font-medium">
                  <Stars value={stats.ratingAverage!} />
                  <b className="text-slate-900">{stats.ratingAverage!.toFixed(1)}</b>
                  from {stats.ratingCount!.toLocaleString()} {stats.ratingCount === 1 ? "review" : "reviews"}
                </p>
              )}
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {reviews.map((r, i) => (
                <motion.figure key={i} {...fade(i * 0.07)} className="rounded-3xl bg-white border border-violet-100 shadow-md shadow-violet-100/40 p-6">
                  {r.rating !== null && <div className="mb-3"><Stars value={r.rating} size="w-5 h-5" /></div>}
                  <blockquote className="text-slate-700 leading-relaxed font-medium">&ldquo;{r.text}&rdquo;</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 font-black flex items-center justify-center">{r.name.charAt(0).toUpperCase()}</span>
                    <span className="text-sm">
                      <b className="text-slate-900">{r.name}</b>
                      {r.skill && <span className="text-violet-600 font-semibold"> &middot; {r.skill}</span>}
                    </span>
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= FAQ + CTA ================= */}
      <section id="faq" className="px-4 sm:px-6 lg:px-8 py-16 scroll-mt-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
          <motion.div {...fade()} className="rounded-3xl bg-white border border-violet-100 shadow-lg shadow-violet-100/40 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <span className="w-11 h-11 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center"><HelpCircle className="w-6 h-6" /></span>
              <div>
                <h2 style={heading} className="text-2xl font-extrabold text-slate-900 leading-tight">Questions</h2>
                <p className="text-sm text-slate-500 font-medium">Straight answers to the common ones.</p>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {FAQS.map((f, i) => (
                <div key={f.q}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}
                    className="w-full flex items-center justify-between gap-4 py-4 text-left outline-none focus-visible:ring-4 focus-visible:ring-violet-200 rounded-lg">
                    <span className="font-bold text-slate-800">{f.q}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <p className="pb-4 text-slate-600 leading-relaxed text-[15px]">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...fade(0.1)} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 p-8 sm:p-10 flex flex-col justify-center text-white shadow-2xl shadow-violet-300/50">
            <div className="pointer-events-none absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-emerald-300/30 blur-3xl" />
            <GraduationCap className="absolute right-6 bottom-6 w-28 h-28 text-white/10" />
            <h2 style={heading} className="relative text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Teach one skill.<br /><span className="text-emerald-300">Learn another.</span>
            </h2>
            <p className="relative mt-4 text-violet-100 text-lg font-medium max-w-md">
              {stats.totalUsers && stats.totalUsers > 0 ? `${stats.totalUsers.toLocaleString()} members are already swapping skills. ` : ""}Your knowledge is enough to start.
            </p>
            <div className="relative mt-7">
              <Link href="/register">
                <Button className="h-14 px-8 rounded-full bg-white hover:bg-violet-50 text-violet-700 font-black text-lg border-0 shadow-xl">
                  Create Free Account <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <p className="mt-4 flex items-center gap-2 text-sm text-violet-200 font-semibold"><Lock className="w-4 h-4 text-emerald-300" /> Secure sign up</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= TRUST AND SAFETY ================= */}
      <TrustAndSafetySection />

      {/* ================= MOBILE JOIN BAR ================= */}
      <MobileJoinBar />
    </div>
  );
}
