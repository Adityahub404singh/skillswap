
import { useMemo, useState, type ReactNode } from "react";
import { useAuthStore } from "@/store/auth";
import { useGetMe, useGetMySessions } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { SponsorCard } from "@/components/SponsorCard";
import AIMatchPanel from "@/components/AIMatchPanel";
import { format, isValid } from "date-fns";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Brain, HelpCircle, Coins, Calendar, Clock, Flame, Wallet,
  BookOpen, Sparkles, Trophy, Users, BellDot, GraduationCap,
  TrendingUp, Gift, Zap, ArrowRight, Award, X, ChevronRight,
  ShieldCheck, CalendarDays, CirclePlay, Compass,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 250,
      damping: 22,
    },
  },
};

function getSessionTimestamp(value: unknown): number {
  if (!value) return Number.NaN;
  const date = new Date(value as string | number | Date);
  return isValid(date) ? date.getTime() : Number.NaN;
}

function getSessionDate(value: any) {
  const date = new Date(value);
  return isValid(date) ? format(date, "MMM d, yyyy · h:mm a") : "Date unavailable";
}

function StatCard({
  icon,
  label,
  value,
  description,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  description: string;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {label}
          </p>
          <h3 className="text-3xl font-black text-slate-900 mt-3">
            {value}
          </h3>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-3">{description}</p>
    </motion.div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  color,
  wide = false,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  color: string;
  wide?: boolean;
}) {
  const card = (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.97 }}
      className="h-full min-h-[132px] bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all flex flex-col items-center justify-center gap-3 text-center cursor-pointer group"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 ${color}`}>
        {icon}
      </div>
      <span className="font-bold text-slate-700 text-sm group-hover:text-violet-700 transition-colors">
        {title}
      </span>
    </motion.div>
  );

  const wrapperClass = wide ? "col-span-2 sm:col-span-1" : "";
  const isStaticHtmlPage = href.split("?")[0].endsWith(".html");

  // Use a normal anchor for standalone HTML pages such as certificates.
  if (isStaticHtmlPage) {
    return (
      <a href={href} className={wrapperClass}>
        {card}
      </a>
    );
  }

  return (
    <Link href={href} className={wrapperClass}>
      {card}
    </Link>
  );
}

export default function Dashboard() {
  const options = useApiOptions();
  const { token } = useAuthStore();
  const [, setLocation] = useLocation();

  const { data: userResponse, isLoading: userLoading } = useGetMe({
    ...options,
    query: {
      queryKey: ["getMe"],
      enabled: Boolean(token),
    },
  });

  const {
    data: allSessions,
    isLoading: sessionsLoading,
  } = useGetMySessions({}, options);

  const [activeRole, setActiveRole] = useState<"learner" | "mentor">("learner");
  const [aiMatchOpen, setAiMatchOpen] = useState(false);

  const loading = userLoading || sessionsLoading;

  const asObject = (value: any): any =>
    value && typeof value === "object" ? value : {};

  const userRoot = asObject(userResponse);
  const user = asObject(
    userRoot.user ?? userRoot.data?.user ?? userRoot.data ?? userRoot
  );

  const sessionRoot = asObject(allSessions);
  const sessions: any[] = Array.isArray(allSessions)
    ? allSessions
    : Array.isArray(sessionRoot.sessions)
      ? sessionRoot.sessions
      : Array.isArray(sessionRoot.data)
        ? sessionRoot.data
        : Array.isArray(sessionRoot.data?.sessions)
          ? sessionRoot.data.sessions
          : [];

  const myId = user?.id;
  const sameUser = (id: unknown) =>
    myId != null && id != null && String(id) === String(myId);

  const trustScore = Math.min(
    100,
    Math.max(0, Number(user?.trustScore ?? user?.trust_score ?? 0) || 0)
  );
  const streak = Number(user?.currentStreak ?? user?.streak) || 0;
  const credits = Number(user?.credits ?? user?.creditBalance) || 0;
  const firstName = user?.name?.trim()?.split(/\s+/)[0] || "Learner";

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good Morning"
      : hour < 18
        ? "Good Afternoon"
        : "Good Evening";

  const trustLevel =
    trustScore >= 90
      ? "Expert"
      : trustScore >= 70
        ? "Advanced"
        : trustScore >= 50
          ? "Intermediate"
          : "Beginner";

  // Learner sessions
  const learningSessions = useMemo(
    () =>
      sessions.filter(
        (s: any) =>
          sameUser(s.studentId) ||
          (Boolean(s.isGroup) && Boolean(s.isEnrolled) && !sameUser(s.mentorId))
      ),
    [sessions, myId]
  );

  // Teacher sessions
  const teachingSessions = useMemo(
    () => sessions.filter((s: any) => sameUser(s.mentorId)),
    [sessions, myId]
  );

  const upcomingLearning = useMemo(
    () =>
      learningSessions
        .filter(
          (s: any) =>
            ["accepted", "in_progress"].includes(String(s.status).toLowerCase()) &&
            getSessionTimestamp(s.scheduledDate) > Date.now()
        )
        .sort(
          (a: any, b: any) =>
            getSessionTimestamp(a.scheduledDate) -
            getSessionTimestamp(b.scheduledDate)
        )
        .slice(0, 3),
    [learningSessions]
  );

  const upcomingTeaching = useMemo(
    () =>
      teachingSessions
        .filter(
          (s: any) =>
            ["accepted", "in_progress"].includes(String(s.status).toLowerCase()) &&
            getSessionTimestamp(s.scheduledDate) > Date.now()
        )
        .sort(
          (a: any, b: any) =>
            getSessionTimestamp(a.scheduledDate) -
            getSessionTimestamp(b.scheduledDate)
        )
        .slice(0, 3),
    [teachingSessions]
  );

  const pendingRequests = teachingSessions.filter(
    (s: any) => !s.isGroup && String(s.status).toLowerCase() === "requested"
  );

  const activeGroupClasses = teachingSessions.filter(
    (s: any) =>
      s.isGroup &&
      ["accepted", "in_progress"].includes(String(s.status).toLowerCase())
  );

  const upcomingView =
    activeRole === "learner" ? upcomingLearning : upcomingTeaching;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Skeleton className="h-[280px] w-full rounded-[28px]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <motion.main
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto px-4 sm:px-6 space-y-7 pb-32"
    >

      {/* HERO */}
      <motion.section
        variants={itemVariants}
        className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#24104f] via-[#5128c4] to-[#7c3aed] p-6 md:p-10 text-white shadow-xl shadow-violet-900/15"
      >
        <div className="absolute -right-20 -top-32 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-32 w-80 h-80 rounded-full bg-fuchsia-400/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid lg:grid-cols-[1fr_340px] gap-8 items-center">

          <div>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-7">
              <p className="text-sm font-bold uppercase tracking-widest text-violet-200 flex items-center gap-2">
                {greeting}
                <Sparkles className="w-4 h-4 text-yellow-300" />
              </p>

              <div className="bg-black/20 border border-white/10 rounded-full p-1 flex">
                <button
                  onClick={() => setActiveRole("learner")}
                  className={`px-4 py-2 rounded-full text-xs font-black transition-all ${
                    activeRole === "learner"
                      ? "bg-white text-violet-700 shadow"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  Learner
                </button>

                <button
                  onClick={() => setActiveRole("mentor")}
                  className={`px-4 py-2 rounded-full text-xs font-black transition-all flex items-center gap-2 ${
                    activeRole === "mentor"
                      ? "bg-white text-violet-700 shadow"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  Teacher
                  {(pendingRequests.length > 0 ||
                    activeGroupClasses.length > 0) && (
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            <p className="text-sm text-violet-200 font-semibold mb-2">
              Welcome back,
            </p>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight capitalize">
              {firstName}
              <span className="text-yellow-300">.</span>
            </h1>

            <p className="text-violet-100/80 mt-4 max-w-lg text-sm md:text-base leading-relaxed">
              {activeRole === "learner"
                ? "Ready to discover something new? Find mentors, build skills and keep growing."
                : "Your teaching journey continues. Manage your classes and help learners grow."}
            </p>

            <div className="flex flex-wrap gap-3 mt-7">
              <div className="rounded-xl bg-black/20 border border-white/10 px-4 py-3 flex items-center gap-2.5">
                <Wallet className="w-4 h-4 text-emerald-300" />
                <span className="font-black">{credits}</span>
                <span className="text-xs text-white/60">Credits</span>
              </div>

              <div className="rounded-xl bg-black/20 border border-white/10 px-4 py-3 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-200" />
                <span className="font-black">{trustScore}</span>
                <span className="text-xs text-white/60">Trust</span>
              </div>

              <div className="rounded-xl bg-black/20 border border-white/10 px-4 py-3 flex items-center gap-2.5">
                <Flame className="w-4 h-4 text-orange-300" />
                <span className="font-black">{streak}</span>
                <span className="text-xs text-white/60">Day streak</span>
              </div>
            </div>
          </div>

          {/* Milestone */}
          <div className="rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 md:p-7">
            <div className="flex items-center justify-between mb-7">
              <div>
                <p className="text-xs font-bold text-violet-200 uppercase tracking-widest">
                  Your Progress
                </p>
                <h3 className="text-xl font-black mt-2">
                  {trustLevel} Level
                </h3>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-yellow-400/20 flex items-center justify-center">
                <Trophy className="w-7 h-7 text-yellow-300" />
              </div>
            </div>

            <div className="flex items-end justify-between mb-3">
              <span className="text-4xl font-black">{trustScore}%</span>
              <span className="text-xs text-violet-200">Trust score</span>
            </div>

            <div className="h-3 w-full bg-black/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${trustScore}%` }}
                transition={{ duration: 1.1 }}
                className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-orange-400"
              />
            </div>

            <Link href="/explore">
              <Button className="w-full mt-7 h-12 rounded-xl bg-white text-violet-800 hover:bg-violet-50 font-black">
                Explore Skills
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* STATS */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Your Overview
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your SkillSwap activity at a glance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={<Wallet className="w-5 h-5 text-emerald-600" />}
            label="Wallet Balance"
            value={credits}
            description="Available credits"
            color="bg-emerald-50"
          />

          <StatCard
            icon={<ShieldCheck className="w-5 h-5 text-blue-600" />}
            label="Trust Score"
            value={`${trustScore}/100`}
            description={`${trustLevel} level`}
            color="bg-blue-50"
          />

          <StatCard
            icon={<Flame className="w-5 h-5 text-orange-600" />}
            label="Current Streak"
            value={`${streak} days`}
            description="Keep learning consistently"
            color="bg-orange-50"
          />

          <StatCard
            icon={<CalendarDays className="w-5 h-5 text-violet-600" />}
            label="Upcoming"
            value={upcomingView.length}
            description="Next scheduled sessions"
            color="bg-violet-50"
          />
        </div>
      </motion.section>

      {/* TEACHER ALERTS */}
      <AnimatePresence>
        {activeRole === "mentor" &&
          (pendingRequests.length > 0 || activeGroupClasses.length > 0) && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid md:grid-cols-2 gap-4"
            >
              {pendingRequests.length > 0 && (
                <div className="flex items-center gap-4 rounded-2xl bg-amber-50 border border-amber-200 p-5">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <BellDot className="w-6 h-6 text-amber-600" />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-black text-amber-900">
                      Booking Requests
                    </h3>
                    <p className="text-xs text-amber-700 mt-1">
                      {pendingRequests.length} request(s) waiting for your response.
                    </p>
                  </div>

                  <Link href="/sessions?tab=teaching">
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-bold">
                      Review
                    </Button>
                  </Link>
                </div>
              )}

              {activeGroupClasses.length > 0 && (
                <div className="flex items-center gap-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-emerald-600" />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-black text-emerald-900">
                      Active Group Classes
                    </h3>
                    <p className="text-xs text-emerald-700 mt-1">
                      {activeGroupClasses.length} class(es) currently active.
                    </p>
                  </div>

                  <Link href="/sessions?tab=teaching">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                      Manage
                    </Button>
                  </Link>
                </div>
              )}
            </motion.section>
          )}
      </AnimatePresence>

      {/* AI MATCH */}
      {activeRole === "learner" && (
        <motion.section
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#17102f] via-[#35206d] to-[#6C3BFF] p-6 md:p-8 text-white shadow-xl"
        >
          <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-fuchsia-400/20 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-7">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                SkillSwap Intelligence
              </div>

              <h2 className="text-2xl md:text-3xl font-black mt-4">
                Find a mentor who matches your goals.
              </h2>

              <p className="text-sm leading-6 text-violet-100 mt-3">
                Discover SkillSwap members using your learning goals,
                skill compatibility and available profile information.
              </p>

              <div className="flex flex-wrap gap-2 mt-5 text-xs font-bold">
                <span className="bg-white/10 border border-white/10 rounded-full px-3 py-2">
                  Personalized matches
                </span>
                <span className="bg-white/10 border border-white/10 rounded-full px-3 py-2">
                  Real member profiles
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5 w-full lg:w-72">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-violet-700">
                <Brain className="w-6 h-6" />
              </div>

              <h3 className="font-black mt-4">
                Your next skill connection
              </h3>
              <p className="text-xs text-violet-100 mt-2 leading-5">
                Tell us what you want to learn and find relevant mentors.
              </p>

              <Button
                onClick={() => setAiMatchOpen(true)}
                className="w-full mt-5 h-12 rounded-xl bg-white text-violet-800 hover:bg-violet-50 font-black"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Find My AI Match
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </motion.section>
      )}

      {/* QUICK ACTIONS */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              {activeRole === "learner" ? "Quick Actions" : "Teacher Workspace"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Jump straight into what you need.
            </p>
          </div>
        </div>

        {activeRole === "learner" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <QuickAction
              href="/explore"
              icon={<Search className="w-6 h-6" />}
              title="Find Mentor"
              color="bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white"
            />

            <QuickAction
              href="/quiz"
              icon={<Brain className="w-6 h-6" />}
              title="Start Quiz"
              color="bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white"
            />

            <QuickAction
              href="/certificate.html"
              icon={<Award className="w-6 h-6" />}
              title="Get Certified"
              color="bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white"
            />

            <QuickAction
              href="/flash-board"
              icon={<HelpCircle className="w-6 h-6" />}
              title="Ask Doubt"
              color="bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
            />

            <QuickAction
              href="/buy-credits"
              icon={<Coins className="w-6 h-6" />}
              title="Buy Credits"
              color="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
              wide
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickAction
              href="/sessions?tab=teaching"
              icon={<Calendar className="w-6 h-6" />}
              title="Manage Classes"
              color="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white"
            />

            <QuickAction
              href="/sessions?tab=teaching&action=create"
              icon={<Users className="w-6 h-6" />}
              title="Create Group Class"
              color="bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white"
            />

            <QuickAction
              href="/flash-board"
              icon={<HelpCircle className="w-6 h-6" />}
              title="Answer Doubts"
              color="bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
            />

            <QuickAction
              href="/profile"
              icon={<GraduationCap className="w-6 h-6" />}
              title="Update Skills"
              color="bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white"
            />
          </div>
        )}
      </motion.section>

      {/* REFERRAL AND GROWTH */}
      <motion.section variants={itemVariants} className="grid md:grid-cols-2 gap-4">

        <Link href="/invite">
          <motion.div
            whileHover={{ y: -4 }}
            className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600 text-white shadow-lg cursor-pointer h-full"
          >
            <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-2xl" />

            <div className="relative z-10 flex justify-between items-center">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                <Gift className="w-6 h-6 text-yellow-200" />
              </div>
              <span className="text-[10px] font-black tracking-widest bg-white/15 rounded-full px-3 py-2">
                GIVE 50 · GET 50
              </span>
            </div>

            <div className="relative z-10 mt-5">
              <h3 className="text-xl font-black">
                Invite Friends, Earn Credits
              </h3>
              <p className="text-sm text-white/80 mt-2 leading-6">
                Share SkillSwap with friends and earn referral rewards
                when they complete the qualifying activity.
              </p>
              <p className="text-sm font-black text-yellow-200 mt-4 flex items-center gap-2">
                Invite Now <ArrowRight className="w-4 h-4" />
              </p>
            </div>
          </motion.div>
        </Link>

        <Link href={activeRole === "learner" ? "/explore" : "/sessions?tab=teaching&action=create"}>
          <motion.div
            whileHover={{ y: -4 }}
            className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg cursor-pointer h-full"
          >
            <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-2xl" />

            <div className="relative z-10 flex justify-between items-center">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                {activeRole === "learner" ? (
                  <Zap className="w-6 h-6 text-yellow-200" />
                ) : (
                  <TrendingUp className="w-6 h-6 text-yellow-200" />
                )}
              </div>
              <span className="text-[10px] font-black tracking-widest bg-white/15 rounded-full px-3 py-2">
                {streak > 0 ? `${streak} DAY STREAK` : "KEEP GROWING"}
              </span>
            </div>

            <div className="relative z-10 mt-5">
              <h3 className="text-xl font-black">
                {activeRole === "learner"
                  ? streak > 0
                    ? "Keep Your Streak Alive"
                    : "Discover Your Next Skill"
                  : "Grow as a Mentor"}
              </h3>

              <p className="text-sm text-white/80 mt-2 leading-6">
                {activeRole === "learner"
                  ? "Explore new skills and build consistent learning habits."
                  : "Create classes and connect with more learners."}
              </p>

              <p className="text-sm font-black text-yellow-100 mt-4 flex items-center gap-2">
                {activeRole === "learner" ? "Explore Skills" : "Create Class"}
                <ArrowRight className="w-4 h-4" />
              </p>
            </div>
          </motion.div>
        </Link>
      </motion.section>

      {/* UPCOMING SESSIONS */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">

        <motion.section variants={itemVariants} className="space-y-5 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                {activeRole === "learner"
                  ? "Upcoming Learning"
                  : "Your Teaching Schedule"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Your next scheduled sessions.
              </p>
            </div>

            <Link
              href={
                activeRole === "learner"
                  ? "/sessions?tab=learning"
                  : "/sessions?tab=teaching"
              }
              className="text-xs font-black text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-full px-4 py-2 whitespace-nowrap"
            >
              See All <ChevronRight className="inline w-3 h-3" />
            </Link>
          </div>

          <SponsorCard />

          {upcomingView.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 md:p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-5">
                {activeRole === "learner" ? (
                  <BookOpen className="w-8 h-8 text-violet-500" />
                ) : (
                  <Users className="w-8 h-8 text-violet-500" />
                )}
              </div>

              <h3 className="text-xl font-black text-slate-900">
                {activeRole === "learner"
                  ? "Your schedule is clear"
                  : "No upcoming classes"}
              </h3>

              <p className="text-sm text-slate-500 mt-2 mb-6">
                {activeRole === "learner"
                  ? "Find a mentor and schedule your next learning session."
                  : "Create a group class or update your skills to connect with learners."}
              </p>

              {activeRole === "learner" ? (
                <Link href="/explore">
                  <Button className="rounded-xl bg-violet-600 hover:bg-violet-700 font-bold px-6">
                    <Compass className="w-4 h-4 mr-2" />
                    Find a Mentor
                  </Button>
                </Link>
              ) : (
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/profile">
                    <Button variant="outline" className="rounded-xl font-bold">
                      Update Skills
                    </Button>
                  </Link>
                  <Link href="/sessions?tab=teaching&action=create">
                    <Button className="rounded-xl bg-violet-600 hover:bg-violet-700 font-bold">
                      Create Class
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingView.map((session: any) => (
                <motion.div
                  key={session.id}
                  whileHover={{ y: -2 }}
                  className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        activeRole === "learner"
                          ? "bg-violet-50 text-violet-600"
                          : "bg-emerald-50 text-emerald-600"
                      }`}>
                        {session.isGroup ? (
                          <Users className="w-6 h-6" />
                        ) : (
                          <Calendar className="w-6 h-6" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-900 truncate">
                            {session.skill?.name ||
                              session.skill ||
                              "Learning Session"}
                          </h3>

                          {session.isGroup && (
                            <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded-full">
                              GROUP
                            </span>
                          )}
                        </div>

                        <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                          <Clock className="w-3.5 h-3.5 text-violet-500" />
                          {getSessionDate(session.scheduledDate)}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={
                        activeRole === "learner"
                          ? "/sessions?tab=learning"
                          : "/sessions?tab=teaching"
                      }
                    >
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto rounded-xl border-violet-200 text-violet-700 hover:bg-violet-600 hover:text-white font-bold"
                      >
                        {activeRole === "learner"
                          ? "View Session"
                          : "Manage Class"}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* DAILY CHALLENGE */}
        <motion.aside variants={itemVariants} className="space-y-5">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Daily Challenge
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Keep your learning momentum going.
            </p>
          </div>

          <Link href="/quiz">
            <motion.div
              whileHover={{ y: -4 }}
              className="relative overflow-hidden min-h-[240px] rounded-3xl bg-gradient-to-br from-orange-400 via-orange-500 to-rose-600 p-7 text-white shadow-lg cursor-pointer flex flex-col justify-between"
            >
              <div className="absolute -right-10 -top-10 w-44 h-44 bg-white/15 rounded-full blur-3xl" />

              <div className="relative z-10 flex justify-between items-center">
                <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/20 flex items-center justify-center">
                  <Flame className="w-7 h-7 text-yellow-200" />
                </div>
                <span className="rounded-full bg-white/20 px-3 py-1.5 text-[10px] font-black tracking-widest">
                  LEARN DAILY
                </span>
              </div>

              <div className="relative z-10 mt-8">
                <h3 className="text-2xl font-black">
                  Test Your Knowledge
                </h3>
                <p className="text-sm text-white/85 mt-2 leading-6">
                  Challenge yourself with quizzes and strengthen your skills.
                </p>

                <div className="mt-5 flex items-center gap-2 font-black text-sm text-yellow-100">
                  Start Quiz
                  <CirclePlay className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          </Link>
        </motion.aside>
      </div>

      {/* AI MATCH MODAL */}
      <AnimatePresence>
        {aiMatchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 pt-6 backdrop-blur-md sm:p-6 sm:pt-10"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setAiMatchOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 25, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="relative my-auto w-full max-w-5xl"
              role="dialog"
              aria-modal="true"
              aria-label="AI mentor matching"
            >
              <button
                type="button"
                onClick={() => setAiMatchOpen(false)}
                aria-label="Close AI matching"
                className="absolute -right-1 -top-1 z-20 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-lg hover:text-violet-700 sm:-right-3 sm:-top-3"
              >
                <X className="w-5 h-5" />
              </button>

              {token ? (
                <AIMatchPanel
                  accessToken={token}
                  onChooseMentor={(memberId) => {
                    setAiMatchOpen(false);
                    setLocation(`/mentor/${memberId}`);
                  }}
                />
              ) : (
                <div className="rounded-3xl bg-white p-8 text-center shadow-2xl">
                  <h3 className="text-xl font-black text-slate-900">
                    Sign in to find your match
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">
                    Your personalized mentor recommendations require an active session.
                  </p>
                  <Link href="/login">
                    <Button className="mt-5 rounded-xl bg-violet-600 text-white font-bold">
                      Sign In
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.main>
  );
}
