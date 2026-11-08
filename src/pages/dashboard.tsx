import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useGetMe, useGetMySessions } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { SponsorCard } from "@/components/SponsorCard";
import { Link, useLocation } from "wouter";
import AIMatchPanel from "@/components/AIMatchPanel";
import { format } from "date-fns";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, Brain, HelpCircle, Coins, 
  Calendar, Clock, Flame, 
  Star, Wallet, BookOpen, Sparkles, Trophy, Play, Target,
  Users, BellDot, GraduationCap, TrendingUp, Gift, Zap, ArrowRight, Award, X
} from "lucide-react";

export default function Dashboard() {
  const options = useApiOptions();
  const { token } = useAuthStore();
  const { data: user, isLoading: userLoading } = useGetMe({ ...options, query: { enabled: !!token, queryKey: [] } });
  
  const { data: allSessions, isLoading: sessionsLoading } = useGetMySessions({}, options);

  const [activeRole, setActiveRole] = useState<"learner" | "mentor">("learner");
  const [aiMatchOpen, setAiMatchOpen] = useState(false);
  const [, setLocation] = useLocation();

  const container: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 250, damping: 20 } },
  };

  if (userLoading || sessionsLoading) {
    return (
      <div className="py-6 space-y-6 max-w-6xl mx-auto px-4 sm:px-6">
        <Skeleton className="h-[280px] w-full rounded-[32px]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-[24px]" />)}
        </div>
      </div>
    );
  }

  if (!user) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const firstName = user.name?.split(" ")[0] || "Learner";
  const streak = (user as any)?.currentStreak ?? 0;
  const trustLevel = user?.trustScore >= 90 ? "Expert" : user?.trustScore >= 70 ? "Advanced" : user?.trustScore >= 50 ? "Intermediate" : "Beginner";
  const levelProgress = Math.min(Math.max(user.trustScore || 0, 0), 100);

  // ==========================================
  // EXACT FILTERING: SEPARATING LEARNER VS TEACHER
  // ==========================================
  const myId = user.id;
  
  // 1. LEARNER DATA
  const learningSessions = (allSessions || []).filter((s: any) => s.studentId === myId || (s.isGroup && s.isEnrolled && s.mentorId !== myId));
  const upcomingLearning = learningSessions.filter((s: any) => ["accepted", "in_progress"].includes(s.status) && new Date(s.scheduledDate) > new Date()).slice(0, 3);
  
  // 2. TEACHER DATA (Only teaching sessions)
  const teachingSessions = (allSessions || []).filter((s: any) => s.mentorId === myId);
  const pending1on1Requests = teachingSessions.filter((s: any) => !s.isGroup && s.status === "requested");
  const activeGroupClasses = teachingSessions.filter((s: any) => s.isGroup && ["accepted", "in_progress"].includes(s.status));
  const upcomingTeaching = teachingSessions.filter((s: any) => ["accepted", "in_progress"].includes(s.status) && new Date(s.scheduledDate) > new Date()).slice(0, 3);

  // Active view
  const upcomingView = activeRole === "learner" ? upcomingLearning : upcomingTeaching;

  return (
    <motion.div
      initial="hidden" animate="show" variants={container}
      className="space-y-6 sm:space-y-8 max-w-6xl mx-auto px-4 sm:px-6"
      style={{ paddingBottom: "max(7.5rem, env(safe-area-inset-bottom))" }}
    >
      
      {/* 1. HERO CARD */}
     
      <motion.div variants={item} className="relative rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 md:p-10 text-white shadow-[0_12px_40px_rgba(108,59,255,0.25)] overflow-hidden bg-gradient-to-br from-[#6C3BFF] to-[#5128C4] flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px] pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-fuchsia-500/20 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="relative z-10 flex-1 w-full lg:max-w-xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/80 text-sm font-semibold flex items-center gap-2 uppercase tracking-widest">
              {greeting} <Sparkles className="w-4 h-4 text-yellow-300" />
            </p>
            
            <div className="bg-black/20 p-1 rounded-full flex border border-white/10 shadow-inner">
              <button 
                onClick={() => setActiveRole("learner")}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${activeRole === "learner" ? "bg-white text-[#6C3BFF] shadow-sm" : "text-white/70 hover:text-white"}`}
              >
                Learner
              </button>
              <button 
                onClick={() => setActiveRole("mentor")}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 ${activeRole === "mentor" ? "bg-white text-[#6C3BFF] shadow-sm" : "text-white/70 hover:text-white"}`}
              >
                Teacher
                {(pending1on1Requests.length > 0 || activeGroupClasses.length > 0) && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                )}
              </button>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-[54px] leading-none font-black capitalize tracking-tight mb-8 drop-shadow-md">
            {firstName}
          </h1>
          
          <div className="flex flex-wrap gap-3">
            <div className="bg-black/20 backdrop-blur-md px-5 py-2.5 rounded-2xl flex items-center gap-2.5 text-sm font-bold border border-white/10 shadow-inner">
              <Wallet className="w-4 h-4 text-emerald-400" />
              {user.credits || 0} <span className="text-white/60 font-medium">cr</span>
            </div>
            <div className="bg-black/20 backdrop-blur-md px-5 py-2.5 rounded-2xl flex items-center gap-2.5 text-sm font-bold border border-white/10 shadow-inner">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              {user.trustScore || 0} <span className="text-white/60 font-medium">Trust</span>
            </div>
            <div className="bg-black/20 backdrop-blur-md px-5 py-2.5 rounded-2xl flex items-center gap-2.5 text-sm font-bold border border-white/10 shadow-inner">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
              {streak} <span className="text-white/60 font-medium">Streak</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full lg:w-[360px] shrink-0">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-7 rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
            <h3 className="text-white/90 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mb-6">
              <Target className="w-4 h-4 text-yellow-300" /> Next Milestone
            </h3>
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-[42px] leading-none font-black">{levelProgress}%</p>
                <p className="text-sm text-white/70 font-medium mt-1">Level: {trustLevel}</p>
              </div>
              <Trophy className="w-14 h-14 text-yellow-400 opacity-90 drop-shadow-[0_4px_12px_rgba(250,204,21,0.4)]" />
            </div>
            <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden shadow-inner mb-6 p-[2px]">
              <motion.div initial={{ width: 0 }} animate={{ width: `${levelProgress}%` }} transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                className="h-full bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full shadow-sm" />
            </div>
            <Link href="/explore">
              <Button className="w-full bg-white text-[#6C3BFF] hover:bg-slate-50 font-black rounded-[16px] h-12 shadow-xl hover:shadow-2xl transition-all active:scale-95 text-[15px]">
                Browse Skills
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ==========================================
          🔴 TEACHER ACTION CENTER (ALERTS)
          ========================================== */}
      <AnimatePresence>
        {activeRole === "mentor" && (pending1on1Requests.length > 0 || activeGroupClasses.length > 0) && (
          <motion.div initial={{ opacity: 0, height: 0, marginBottom: 0 }} animate={{ opacity: 1, height: "auto", marginBottom: 32 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} className="overflow-hidden">
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-[24px] flex flex-col md:flex-row gap-4 shadow-sm">
              
              {pending1on1Requests.length > 0 && (
                <div className="flex-1 flex items-center gap-4 bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 flex-shrink-0 animate-bounce">
                    <BellDot className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-amber-800 text-[15px]">New Booking Requests!</h4>
                    <p className="text-amber-700 text-[13px] font-medium">You have <strong className="text-amber-900">{pending1on1Requests.length} pending</strong> 1-on-1 session request(s).</p>
                  </div>
                  <Link href="/sessions?tab=teaching" className="ml-auto">
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-md">Review</Button>
                  </Link>
                </div>
              )}

              {activeGroupClasses.length > 0 && (
                <div className="flex-1 flex items-center gap-4 bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-emerald-800 text-[15px]">Group Classes Active</h4>
                    <p className="text-emerald-700 text-[13px] font-medium">You have <strong className="text-emerald-900">{activeGroupClasses.length} active</strong> group classes right now.</p>
                  </div>
                  <Link href="/sessions?tab=teaching" className="ml-auto">
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-md">Manage</Button>
                  </Link>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI MENTOR MATCHING — learner-first discovery entry point */}
      {activeRole === "learner" && (
        <motion.section
          variants={item}
          className="relative isolate overflow-hidden rounded-[28px] border border-violet-200/80 bg-gradient-to-br from-[#17102f] via-[#35206d] to-[#6C3BFF] p-5 text-white shadow-[0_18px_55px_rgba(83,45,170,0.22)] sm:p-7"
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-indigo-300/20 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                SkillSwap Intelligence
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.9)]" />
                Hybrid AI
              </div>
              <h2 className="max-w-xl text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                Meet the mentor who fits your next big goal.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-violet-100/90 sm:text-[15px]">
                Match your learning goals with real SkillSwap members using skill compatibility,
                experience, trust signals and AI-assisted relevance.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-white/90">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Personalized matches</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Real member profiles</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Explainable match reasons</span>
              </div>
            </div>
            <div className="relative z-10 flex w-full shrink-0 flex-col gap-3 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur-xl sm:p-5 lg:w-[270px]">
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-violet-700 shadow-lg">
                  <Brain className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-300/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-200">Ready to match</span>
              </div>
              <div>
                <p className="text-sm font-black">Your next skill connection</p>
                <p className="mt-1 text-xs leading-5 text-violet-100/80">Tell us what you can teach, what you want to learn, or the goal you want to reach.</p>
              </div>
              <Button
                type="button"
                onClick={() => setAiMatchOpen(true)}
                className="h-12 w-full rounded-xl bg-white font-black text-violet-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-50 hover:shadow-xl"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Find my AI match
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.section>
      )}


      {/* 2. DYNAMIC QUICK ACTIONS */}
      <motion.div variants={item}>
        <div className="flex justify-between items-center mb-5 px-2">
          <h3 className="font-black text-slate-800 text-xl tracking-tight">
            {activeRole === "learner" ? "Quick Explore" : "Teacher Dashboard"}
          </h3>
        </div>
        
        {activeRole === "learner" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            
            {/* 1. Find Mentor */}
            <Link href="/explore">
              <motion.div whileHover={{ y: -4 }} className="bg-white p-5 sm:p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-3 cursor-pointer group h-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#6C3BFF]/10 rounded-2xl flex items-center justify-center text-[#6C3BFF] group-hover:bg-[#6C3BFF] group-hover:text-white transition-colors shadow-inner">
                  <Search className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="font-bold text-slate-700 text-xs sm:text-sm">Find Mentor</span>
              </motion.div>
            </Link>

            {/* 2. Start Quiz */}
            <Link href="/quiz">
              <motion.div whileHover={{ y: -4 }} className="bg-white p-5 sm:p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-3 cursor-pointer group h-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors shadow-inner">
                  <Brain className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="font-bold text-slate-700 text-xs sm:text-sm">Start Quiz</span>
              </motion.div>
            </Link>

            {/* 3. Get Certified (CLEAN & SEPARATE ROUTE) */}
           <a href={`/certificate.html?email=${encodeURIComponent(user.email)}`} rel="external" className="block h-full">
  <motion.div whileHover={{ y: -4 }} className="bg-white p-5 sm:p-6 rounded-[24px] border border-purple-100 shadow-sm flex flex-col items-center justify-center text-center gap-3 cursor-pointer group h-full">
    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-inner">
      <Award className="w-6 h-6 sm:w-7 sm:h-7" />
    </div>
    <span className="font-bold text-purple-700 text-xs sm:text-sm">Get Certified</span>
  </motion.div>
</a>

            {/* 4. Ask Doubt */}
            <Link href="/flash-board">
              <motion.div whileHover={{ y: -4 }} className="bg-white p-5 sm:p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-3 cursor-pointer group h-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-inner">
                  <HelpCircle className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="font-bold text-slate-700 text-xs sm:text-sm">Ask Doubt</span>
              </motion.div>
            </Link>

            {/* 5. Buy Credits */}
            <Link href="/buy-credits" className="col-span-2 sm:col-span-1">
              <motion.div whileHover={{ y: -4 }} className="bg-white p-5 sm:p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-3 cursor-pointer group h-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 group-hover:bg-green-500 group-hover:text-white transition-colors shadow-inner">
                  <Coins className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="font-bold text-slate-700 text-xs sm:text-sm">Buy Credits</span>
              </motion.div>
            </Link>

          </div>
        )}

        {activeRole === "mentor" && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Link href="/sessions?tab=teaching">
              <motion.div whileHover={{ y: -4 }} className="bg-white p-5 sm:p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-3 cursor-pointer group h-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-inner">
                  <Calendar className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="font-bold text-slate-700 text-xs sm:text-sm">Manage Classes</span>
              </motion.div>
            </Link>

            <Link href="/sessions?tab=teaching&action=create">
              <motion.div whileHover={{ y: -4 }} className="bg-white p-5 sm:p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-3 cursor-pointer group h-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-inner">
                  <Users className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="font-bold text-slate-700 text-xs sm:text-sm">Create Group Class</span>
              </motion.div>
            </Link>

            <Link href="/flash-board">
              <motion.div whileHover={{ y: -4 }} className="bg-white p-5 sm:p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-3 cursor-pointer group h-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-inner">
                  <HelpCircle className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="font-bold text-slate-700 text-xs sm:text-sm">Answer Doubts</span>
              </motion.div>
            </Link>

            <Link href="/profile">
              <motion.div whileHover={{ y: -4 }} className="bg-white p-5 sm:p-6 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center gap-3 cursor-pointer group h-full">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors shadow-inner">
                  <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <span className="font-bold text-slate-700 text-xs sm:text-sm">Update Skills</span>
              </motion.div>
            </Link>
          </div>
        )}
      </motion.div>

      {/* ==========================================
          💰 EARN & GROW — INCENTIVE / "LALACH" BANNER
          ========================================== */}
      <motion.div variants={item} className="grid md:grid-cols-2 gap-4">
        {activeRole === "learner" ? (
          <>
            <Link href="/invite">
              <motion.div whileHover={{ y: -4, scale: 1.01 }} className="relative overflow-hidden rounded-[24px] p-6 bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600 text-white shadow-[0_10px_30px_rgba(168,85,247,0.35)] cursor-pointer h-full flex flex-col justify-between min-h-[150px]">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10 flex items-start justify-between">
                  <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                    <Gift className="w-5 h-5 text-yellow-200" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full">Give 50, Get 50</span>
                </div>
                <div className="relative z-10 mt-4">
                  <h4 className="font-black text-lg mb-1">Invite friends, earn credits</h4>
                  <p className="text-white/85 text-[13px] font-medium leading-snug">Your friends get <strong className="text-yellow-200">50 free credits</strong>, you get <strong className="text-yellow-200">50 more</strong> when they finish their first session.</p>
                  <div className="flex items-center gap-1.5 mt-3 text-[13px] font-bold text-yellow-200">
                    Invite now <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.div>
            </Link>

            <Link href="/explore">
              <motion.div whileHover={{ y: -4, scale: 1.01 }} className="relative overflow-hidden rounded-[24px] p-6 bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-[0_10px_30px_rgba(16,185,129,0.35)] cursor-pointer h-full flex flex-col justify-between min-h-[150px]">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10 flex items-start justify-between">
                  <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                    <Zap className="w-5 h-5 text-yellow-200" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full">{streak > 0 ? `${streak}-Day Streak` : "Start Today"}</span>
                </div>
                <div className="relative z-10 mt-4">
                  <h4 className="font-black text-lg mb-1">{streak > 0 ? "Keep your streak alive!" : "Book your first session"}</h4>
                  <p className="text-white/85 text-[13px] font-medium leading-snug">
                    {streak > 0
                      ? <>Learn something today to protect your <strong className="text-yellow-200">{streak}-day streak</strong> and climb the leaderboard.</>
                      : <>New learners who book within 24hrs get bumped to the <strong className="text-yellow-200">top of mentor lists</strong>.</>}
                  </p>
                  <div className="flex items-center gap-1.5 mt-3 text-[13px] font-bold text-yellow-200">
                    Find a mentor <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.div>
            </Link>
          </>
        ) : (
          <>
            <Link href="/invite">
              <motion.div whileHover={{ y: -4, scale: 1.01 }} className="relative overflow-hidden rounded-[24px] p-6 bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600 text-white shadow-[0_10px_30px_rgba(168,85,247,0.35)] cursor-pointer h-full flex flex-col justify-between min-h-[150px]">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10 flex items-start justify-between">
                  <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                    <Gift className="w-5 h-5 text-yellow-200" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full">Give 50, Get 50</span>
                </div>
                <div className="relative z-10 mt-4">
                  <h4 className="font-black text-lg mb-1">Refer mentors, earn credits</h4>
                  <p className="text-white/85 text-[13px] font-medium leading-snug">Know a great teacher? Invite them — you both get <strong className="text-yellow-200">50 credits</strong> once they run their first class.</p>
                  <div className="flex items-center gap-1.5 mt-3 text-[13px] font-bold text-yellow-200">
                    Invite now <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.div>
            </Link>

            <Link href="/sessions?tab=teaching&action=create">
              <motion.div whileHover={{ y: -4, scale: 1.01 }} className="relative overflow-hidden rounded-[24px] p-6 bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-[0_10px_30px_rgba(251,146,60,0.35)] cursor-pointer h-full flex flex-col justify-between min-h-[150px]">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10 flex items-start justify-between">
                  <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                    <TrendingUp className="w-5 h-5 text-yellow-100" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full">Earn 10x Faster</span>
                </div>
                <div className="relative z-10 mt-4">
                  <h4 className="font-black text-lg mb-1">Teach 10 students at once</h4>
                  <p className="text-white/85 text-[13px] font-medium leading-snug">One Group Class = <strong className="text-yellow-100">100+ credits</strong> in a single hour instead of one student at a time.</p>
                  <div className="flex items-center gap-1.5 mt-3 text-[13px] font-bold text-yellow-100">
                    Create Group Class <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.div>
            </Link>
          </>
        )}
      </motion.div>

      {/* 3. SESSIONS GRID */}
      <div className="grid lg:grid-cols-3 gap-8">
        <motion.div variants={item} className="lg:col-span-2 space-y-5">
          <div className="flex justify-between items-center mb-1 px-2">
            <h3 className="font-black text-slate-800 text-xl tracking-tight">
              {activeRole === "learner" ? "Upcoming Learning" : "Your Teaching Schedule"}
            </h3>
            <Link href={activeRole === "learner" ? "/sessions?tab=learning" : "/sessions?tab=teaching"} className="text-sm font-bold text-[#6C3BFF] hover:text-indigo-800 transition-colors bg-[#6C3BFF]/10 px-4 py-2 rounded-full">See All</Link>
          </div>
          <SponsorCard />
          {upcomingView.length === 0 ? (
            
            <div className="bg-white p-8 md:p-12 rounded-[28px] border border-dashed border-slate-300 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
              
              {activeRole === "learner" ? (
                <>
                  <div className="w-20 h-20 bg-slate-50 rounded-[20px] flex items-center justify-center mb-4 border border-slate-100">
                    <BookOpen className="w-10 h-10 text-slate-300" />
                  </div>
                  <h4 className="text-slate-800 text-xl font-black mb-2">Schedule is clear</h4>
                  <p className="text-slate-500 text-[15px] font-medium mb-6">Time to learn something new today!</p>
                  <Link href="/explore">
                    <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 px-8 font-bold shadow-md">Find a Mentor</Button>
                  </Link>
                </>
              ) : (
                <>
                  <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-50 rounded-full blur-3xl opacity-50"></div>
                  
                  <div className="w-20 h-20 bg-indigo-50 rounded-[20px] flex items-center justify-center mb-5 border border-indigo-100 relative z-10">
                    <Users className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h4 className="text-slate-800 text-xl font-black mb-2 relative z-10">No bookings for your skills yet</h4>
                  <p className="text-slate-500 text-[15px] font-medium mb-7 max-w-md relative z-10 leading-relaxed">
                    Update your profile with more skills to attract students, or <strong className="text-emerald-600">Create a Group Class</strong> right now to teach multiple learners and <strong className="text-emerald-600">earn 100+ credits</strong> at once! 🚀
                  </p>
                  <div className="flex gap-3 relative z-10">
                    <Link href="/profile">
                      <Button variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl h-12 px-6 font-bold shadow-sm">
                        Update Skills
                      </Button>
                    </Link>
                    <Link href="/sessions?tab=teaching&action=create">
                      <Button className="bg-[#6C3BFF] hover:bg-[#582dd0] text-white rounded-xl h-12 px-6 font-bold shadow-md">
                        Create Group Class
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>

          ) : (
            <div className="space-y-4">
              {upcomingView.map((session: any) => (
                <motion.div whileHover={{ scale: 1.01 }} key={session.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-5 sm:items-center justify-between group hover:shadow-md hover:border-[#6C3BFF]/30">
                  <div className="flex gap-4 items-center">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors shadow-inner ${activeRole === "learner" ? "bg-[#6C3BFF]/10 text-[#6C3BFF] border-[#6C3BFF]/10 group-hover:bg-[#6C3BFF] group-hover:text-white" : "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white"}`}>
                      {session.isGroup ? <Users className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-slate-800 text-lg truncate max-w-[200px] md:max-w-[300px]">
                          {session.skill?.name || session.skill || "Learning Session"}
                        </p>
                        {session.isGroup && (
                          <span className="px-2 py-0.5 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full uppercase tracking-wider">GROUP</span>
                        )}
                      </div>
                      <p className="text-[13px] text-slate-500 flex items-center gap-1.5 font-medium bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md inline-flex">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" /> {format(new Date(session.scheduledDate), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                  <Link href={activeRole === "learner" ? "/sessions?tab=learning" : "/sessions?tab=teaching"}>
                    <Button className="w-full sm:w-auto bg-[#6C3BFF]/10 text-[#6C3BFF] hover:bg-[#6C3BFF] hover:text-white rounded-xl h-11 px-8 text-sm font-black transition-colors shadow-sm">
                      {activeRole === "learner" ? "Go to Class" : "Manage Class"}
                    </Button>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* DAILY REWARD WIDGET */}
        <motion.div variants={item} className="space-y-5">
          <h3 className="font-black text-slate-800 text-xl tracking-tight mb-1 px-2">Daily Reward</h3>
          <Link href="/quiz">
            <motion.div whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }} className="bg-gradient-to-br from-orange-400 to-rose-500 p-8 rounded-[28px] shadow-[0_12px_30px_rgba(249,115,22,0.3)] flex flex-col justify-between cursor-pointer text-white relative overflow-hidden min-h-[220px]">
              <div className="absolute right-0 top-0 w-40 h-40 bg-white/20 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
              <div className="relative z-10 flex justify-between items-start">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                  <Flame className="w-6 h-6 text-yellow-200 fill-yellow-200" />
                </div>
                <span className="bg-white text-orange-600 text-[11px] px-3 py-1 rounded-full font-black uppercase tracking-wider shadow-sm animate-pulse">Live</span>
              </div>
              <div className="relative z-10 mt-6">
                <h3 className="font-black text-2xl mb-1 drop-shadow-sm">Daily Challenge</h3>
                <p className="text-[15px] text-white/90 font-medium leading-tight">Answer 10 Qs & Win <strong className="text-yellow-200">20 Credits!</strong></p>
              </div>
            </motion.div>
          </Link>
        </motion.div>
      </div>


      <AnimatePresence>
        {aiMatchOpen && (
          <motion.div
            key="dashboard-ai-match"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-slate-950/65 p-3 pt-5 backdrop-blur-md sm:p-6 sm:pt-10"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setAiMatchOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
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
                className="absolute -right-1 -top-1 z-20 grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-lg transition hover:rotate-90 hover:text-violet-700 sm:-right-3 sm:-top-3"
              >
                <X className="h-5 w-5" />
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
                  <h3 className="text-xl font-black text-slate-900">Sign in to find your match</h3>
                  <p className="mt-2 text-sm text-slate-500">Your personalized mentor recommendations need an active session.</p>
                  <Link href="/login">
                    <Button className="mt-5 rounded-xl bg-violet-600 px-6 font-bold text-white hover:bg-violet-700">Sign in</Button>
                  </Link>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}