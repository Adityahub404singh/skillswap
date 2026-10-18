import { Link } from "wouter";
import { motion, useScroll, useTransform, useMotionValue, useSpring, useReducedMotion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, BookOpen, Users, Star, ShieldCheck, Zap, Sparkles, 
  Globe, Play, CheckCircle, Code2, Palette, Languages, Brain, Trophy, 
  MessageSquare, Flame, Target, Award, Wallet, Lock, ArrowLeftRight, 
  Activity, ChevronDown, Check, Github, Twitter, Linkedin, Instagram, Heart, Briefcase,
  QrCode, BadgeCheck, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import { useRef, useEffect, useState } from "react";

// ==========================================
// 1. CUSTOM HOOKS & UTILS
// ==========================================

function useTypewriter(words: string[], speed = 75, pause = 1800) {
  const [display, setDisplay] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  
  useEffect(() => {
    const current = words[wordIdx];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setDisplay(current.slice(0, charIdx + 1));
        if (charIdx + 1 === current.length) setTimeout(() => setDeleting(true), pause);
        else setCharIdx(c => c + 1);
      } else {
        setDisplay(current.slice(0, charIdx - 1));
        if (charIdx - 1 === 0) { 
          setDeleting(false); 
          setWordIdx(i => (i + 1) % words.length); 
          setCharIdx(0); 
        }
        else setCharIdx(c => c - 1);
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);
  
  return display;
}

function Counter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { 
      if (e.isIntersecting && !started) setStarted(true); 
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [started]);
  
  useEffect(() => {
    if (!started) return;
    let s = 0; 
    const step = Math.max(target / 60, 1);
    const t = setInterval(() => { 
      s += step; 
      if (s >= target) { setCount(target); clearInterval(t); } 
      else setCount(Math.floor(s)); 
    }, 16);
    return () => clearInterval(t);
  }, [started, target]);
  
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

function MouseGlow() {
  const x = useMotionValue(0); 
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 80, damping: 20 }); 
  const sy = useSpring(y, { stiffness: 80, damping: 20 });
  
  useEffect(() => {
    const h = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener("mousemove", h, { passive: true }); 
    return () => window.removeEventListener("mousemove", h);
  }, [x, y]);
  
  return (
    <motion.div 
      className="fixed top-0 left-0 pointer-events-none z-0 w-[800px] h-[800px] rounded-full mix-blend-multiply hidden lg:block will-change-transform" 
      style={{ 
        x: sx, y: sy, translateX: "-50%", translateY: "-50%", 
        background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 60%)" 
      }} 
    />
  );
}

// ==========================================
// 2. DATA ARRAYS
// ==========================================

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  x: Math.random() * 100, 
  y: Math.random() * 100,
  size: Math.random() * 8 + 4,
  color: ["#8b5cf6", "#6366f1", "#0ea5e9", "#f59e0b", "#ec4899"][i % 5] + "66",
  dur: Math.random() * 10 + 8,
}));

const TRENDING_SUBJECTS = [
  { name: "MERN Stack Dev", icon: Code2, color: "text-blue-700 bg-blue-50 border-blue-200" },
  { name: "Fluent English", icon: Languages, color: "text-rose-700 bg-rose-50 border-rose-200" },
  { name: "UI/UX & Figma", icon: Palette, color: "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200" },
  { name: "DSA & Interviews", icon: Brain, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { name: "Freelancing", icon: Briefcase, color: "text-amber-700 bg-amber-50 border-amber-200" },
];

// Positions for the floating "live activity" chips (content comes from REAL platform activity only)
const FLOAT_SLOTS = [
  { x: "6%", y: "22%", delay: 0 },
  { x: "78%", y: "15%", delay: 2 },
  { x: "9%", y: "65%", delay: 4 },
  { x: "76%", y: "62%", delay: 1.5 },
];

type Review = { name: string; text: string; rating: number | null; skill?: string };
type CertSummary = {
  total: number;
  topSkills: { skill: string; count: number }[];
  recent: { certId: string; skill: string; role: string; level: string; dateStr: string }[];
};

const FEATURES = [
  { 
    icon: Zap, emoji: "💸", title: "The Zero-Rupee Economy", tag: "Most Popular", 
    color: "from-violet-500/10 to-indigo-500/5", iconColor: "text-violet-600",
    desc: "Why pay thousands for courses? Teach your native language, Excel, or any basic skill to earn credits. Use those exact credits to learn coding, design, or marketing. 1 Credit = 1 Minute."
  },
  { 
    icon: Lock, emoji: "🛡️", title: "Escrow-Protected Credits", tag: "Highly Secure", 
    color: "from-emerald-500/10 to-teal-500/5", iconColor: "text-emerald-600",
    desc: "When a student books your session, their credits are securely locked in our vault. You are guaranteed to get paid after the session is completed via our secure 6-digit OTP verification."
  },
  { 
    icon: Brain, emoji: "🤖", title: "AI Skill Matchmaking", tag: "AI-Powered", 
    color: "from-fuchsia-500/10 to-pink-500/5", iconColor: "text-fuchsia-600",
    desc: "Our smart algorithm connects you with the perfect partner instantly. You want to learn React and know English? We'll find someone who wants English and knows React. Match made in heaven."
  },
  { 
    icon: Award, emoji: "🏅", title: "Verified Expert Badges", tag: "Trust Builder", 
    color: "from-amber-500/10 to-orange-500/5", iconColor: "text-amber-600",
    desc: "No fake gurus here. Our community rates every session. Build your profile, earn verified badges, and prove your skills to the world. A strong SkillSwap profile is better than a resume."
  },
  { 
    icon: Flame, emoji: "🔥", title: "Addictive Learning Streaks", tag: "Gamified", 
    color: "from-red-500/10 to-rose-500/5", iconColor: "text-red-600",
    desc: "Consistency is everything. Maintain your daily learning or teaching streaks to unlock massive credit bonuses. We gamify your education so you never lose motivation."
  },
  { 
    icon: Users, emoji: "👨‍👩‍👧‍👦", title: "Host Masterclasses", tag: "Community", 
    color: "from-cyan-500/10 to-sky-500/5", iconColor: "text-cyan-600",
    desc: "Want to earn credits faster? Host a group class for up to 50 students. Teach for just one hour and earn enough credits to fund your personal learning for the entire month!"
  },
];

const FAQS = [
  {
    q: "Is SkillSwap really 100% free? Is there a hidden catch?",
    a: "Absolutely 100% free. There are no premium subscriptions, no hidden fees, and we don't even ask for your credit card. You pay with your time and knowledge by teaching others, and you learn using the credits you earn."
  },
  {
    q: "How do I get my first credits to start learning?",
    a: "Just by creating an account, you instantly get a welcome bonus of 200 credits! That's enough to book 3-4 hours of expert mentoring right away. Start learning instantly."
  },
  {
    q: "What if I am a beginner and think I have nothing to teach?",
    a: "Every single person has a skill. You speak a native language (Hindi, Tamil, Marathi)? Teach that! You know how to use Microsoft Word? Teach that! You are good at Fitness, Cooking, or Chess? Teach that! Start small, earn credits, and learn bigger skills."
  },
  {
    q: "How does the Escrow and OTP system protect me?",
    a: "When a student books you, their credits are deducted and held in our 'Escrow' vault. You conduct the class on our video platform. After class, the student gives you a 6-digit OTP. You enter it, and credits instantly hit your wallet. No scams, no fake promises."
  },
  {
    q: "What if the mentor doesn't show up for the class?",
    a: "You are fully protected. If the mentor doesn't show up, or if the class was bad, you simply don't share the OTP. You can raise a 'Dispute' with one click, and our team will review it and refund your credits to your wallet."
  }
];

// ==========================================
// 3. MAIN COMPONENT
// ==========================================

export default function Landing() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll();
  const headerY = useTransform(scrollYProgress, [0, 0.3], ["0%", "-10%"]);
  
  const typed = useTypewriter(["Full-Stack Dev 💻", "Fluent English 🗣️", "UI/UX Design 🎨", "DSA & Coding 🚀", "Freelancing 💰", "Data Science 📊"], 65, 1800);
  
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // ALL numbers below come from the backend. No made-up fallbacks.
  const [realStats, setRealStats] = useState<{
    totalUsers: number | null; moneySaved: number | null;
    sessionsCompleted: number | null; matchRate: number | null;
  }>({ totalUsers: null, moneySaved: null, sessionsCompleted: null, matchRate: null });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [liveTicker, setLiveTicker] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [certs, setCerts] = useState<CertSummary | null>(null);
  const [verifyId, setVerifyId] = useState("");

  const reduceMotionPref = useReducedMotion();
  const isNative = Capacitor.isNativePlatform();
  const lightweightMode = isNative || !!reduceMotionPref;

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || "";
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API}/api/public-stats`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && !cancelled) {
            const d = json.data;
            setRealStats({
              totalUsers: num(d.totalUsers),
              moneySaved: num(d.moneySaved),
              sessionsCompleted: num(d.completedSessions),
              matchRate: num(d.matchSuccessRate),
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
          }
        }
      } catch {
        /* stay empty — never show fake numbers */
      } finally {
        if (!cancelled) setStatsLoaded(true);
      }
    })();

    (async () => {
      try {
        const r = await fetch(`${API}/api/certificates/public/summary`);
        if (r.ok && !cancelled) setCerts(await r.json());
      } catch { /* section simply shows its empty state */ }
    })();

    return () => { cancelled = true; };
  }, []);

  const statItems = [
    { label: "Members", value: realStats.totalUsers, prefix: "", suffix: "" },
    { label: "Money Saved", value: realStats.moneySaved, prefix: "₹", suffix: "" },
    { label: "Classes Completed", value: realStats.sessionsCompleted, prefix: "", suffix: "" },
    { label: "Match Success", value: realStats.matchRate, prefix: "", suffix: "%" },
  ].filter((s) => (s.value ?? 0) > 0);

  const goVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const id = verifyId.trim().toUpperCase();
    if (id) window.location.href = `/verify.html?id=${encodeURIComponent(id)}`;
  };

  return (
    <div ref={ref} className="relative flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden bg-[#FAFAFA] font-sans selection:bg-violet-200 selection:text-violet-900">
      {!lightweightMode && <MouseGlow />}

      {/* ==========================================
          HERO SECTION (Vibrant, Welcoming & Attractive)
          ========================================== */}
      <section className="relative min-h-[calc(100vh-80px)] flex flex-col px-4 sm:px-6 lg:px-8 overflow-hidden pb-32 pt-16">
        
        {/* Animated Particles */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {(lightweightMode ? PARTICLES.slice(0, 10) : PARTICLES).map((p: any, i: number) =>
            lightweightMode ? (
              <div key={i} className="absolute rounded-full"
                style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: p.color, opacity: 0.5 }} />
            ) : (
              <motion.div key={i} className="absolute rounded-full"
                style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: p.color }}
                animate={{ y: [-20, 20, -20], x: [-15, 15, -15], opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }} />
            )
          )}
        </div>

        {/* 🎨 Attractive Glowing Mesh Background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none mix-blend-multiply opacity-90">
          <motion.div 
            animate={lightweightMode ? undefined : { scale: [1, 1.05, 1], rotate: [0, 5, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-violet-300/40 blur-[100px]" 
          />
          <motion.div 
            animate={lightweightMode ? undefined : { scale: [1, 1.1, 1], rotate: [0, -5, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-[20%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-fuchsia-300/40 blur-[100px]" 
          />
          <motion.div 
            animate={lightweightMode ? undefined : { scale: [1, 1.05, 1] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-[10%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-blue-200/40 blur-[120px]" 
          />
        </div>

        {/* Soft Grid Pattern */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.3]"
          style={{ backgroundImage: "linear-gradient(#cbd5e1 1px,transparent 1px),linear-gradient(90deg,#cbd5e1 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Floating chips — REAL recent platform activity only (hidden when there is none) */}
        {!lightweightMode && liveTicker.length > 0 && (
          <div className="hidden lg:block absolute inset-0 z-10 pointer-events-none">
            {liveTicker.slice(0, FLOAT_SLOTS.length).map((text, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: [0, 1, 1, 0], y: [20, 0, -10, -30] }}
                transition={{ duration: 7, repeat: Infinity, delay: FLOAT_SLOTS[i].delay, ease: "easeInOut" }}
                className="absolute flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/80 backdrop-blur-md border border-white/50 shadow-xl shadow-violet-100/50 max-w-[260px]"
                style={{ left: FLOAT_SLOTS[i].x, top: FLOAT_SLOTS[i].y }}
              >
                <span className="text-2xl leading-none">{text.split(" ")[0]}</span>
                <p className="text-[12px] font-bold text-slate-700 leading-snug">{text.substring(text.indexOf(" ") + 1)}</p>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div style={{ y: headerY }} className="relative z-20 flex-1 flex flex-col justify-center max-w-6xl mx-auto py-12 w-full mt-4">
          <motion.div initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }}
            className="text-center max-w-5xl mx-auto">

            {/* Trust Badge */}
            <motion.div variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300 } } }}>
              <motion.div whileHover={{ scale: 1.02 }}
                className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full border border-violet-200/50 bg-white/90 backdrop-blur-sm shadow-md shadow-violet-100 text-slate-600 font-medium text-sm mb-8 cursor-default">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span>
                  {realStats.totalUsers && realStats.totalUsers > 0 ? (
                    <>Join <span className="text-violet-700 font-bold">{realStats.totalUsers.toLocaleString()}</span> members sharing knowledge.</>
                  ) : (
                    <>Learn by teaching. <span className="text-violet-700 font-bold">No money needed.</span></>
                  )}
                </span>
              </motion.div>
            </motion.div>

            {/* Welcoming & Attractive Headline */}
            <motion.h1
              variants={{ hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 180, damping: 18 } } }}
              className="text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-tight mb-6 leading-[1.15] text-slate-900"
              style={{ fontFamily: "Outfit, sans-serif" }}>
              Learn any skill.<br className="hidden md:block" />
              <span className="text-slate-500 font-medium">Pay with your knowledge.</span> <br />
              <span className="relative mt-2 inline-block">
                Master 
                <motion.span className="mx-4 bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent inline-block min-w-[300px] text-left border-b-4 border-violet-200 pb-1"
                  animate={{ filter: ["hue-rotate(0deg)", "hue-rotate(15deg)", "hue-rotate(0deg)"] }}
                  transition={{ duration: 4, repeat: Infinity }}>
                  {typed}
                </motion.span>
              </span>
            </motion.h1>

            {/* Humble Value Proposition */}
            <motion.p variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}
              className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed px-2 font-medium">
              We believe education should be accessible. <b className="text-slate-900">Teach</b> what you know to earn credits. Use those credits to <b className="text-slate-900">Learn</b> from verified peers.
              <span className="block mt-4 text-violet-700 font-bold text-sm bg-violet-100/50 py-1.5 rounded-full border border-violet-200 w-fit mx-auto px-6">
                100% Free • No Credit Card Required
              </span>
            </motion.p>

            {/* 🔥 NEW: Attractive Multi-Button CTA Array */}
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10 relative">
              
              {/* Primary Glowing Button */}
              <Link href="/register">
                <div className="relative group w-full sm:w-auto">
                  <div className="absolute inset-0 bg-violet-500 rounded-full blur-xl opacity-40 group-hover:opacity-70 transition-opacity duration-300 animate-pulse" />
                  <Button className="w-full sm:w-auto h-16 px-8 rounded-full text-lg font-bold shadow-[0_8px_30px_rgb(124,58,237,0.25)] bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 transition-transform hover:scale-105 active:scale-95">
                    Start Free — Get 200 Credits 🎁
                  </Button>
                </div>
              </Link>

              {/* Secondary: smooth-scroll to the explainer */}
              <Button
                variant="outline"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                className="w-full sm:w-auto h-16 px-8 rounded-full text-lg font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-transform hover:scale-105 active:scale-95 group">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-600 mr-3 group-hover:bg-violet-200 transition-colors">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </span>
                See How It Works
              </Button>

              {/* Tertiary Text Link */}
              <Link href="/explore">
                <span className="hidden lg:flex items-center text-sm font-bold text-violet-600 hover:text-violet-700 cursor-pointer ml-2 hover:underline underline-offset-4 transition-all">
                  Browse Mentors <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              </Link>
            </motion.div>

            {/* Trending Skills Hook */}
            <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { delay: 0.6 } } }} className="pt-6 border-t border-slate-200/60 max-w-4xl mx-auto">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Skills you can learn or teach</p>
              <div className="flex flex-wrap justify-center gap-3">
                {TRENDING_SUBJECTS.map((sub: any, i: number) => (
                  <Link href="/explore" key={i}>
                    <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer shadow-sm transition-all hover:shadow-md bg-white ${sub.color}`}>
                      <sub.icon className="w-4 h-4" />
                      <span className="font-bold text-sm">{sub.name}</span>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </motion.div>

          </motion.div>
        </motion.div>
      </section>

      {/* ==========================================
          🔥 FIXED STATS SECTION (Floating Card to avoid clipping)
          ========================================== */}
      {(!statsLoaded || statItems.length > 0) && (
        <section className="relative z-30 -mt-16 sm:-mt-24 px-4 sm:px-6 lg:px-8 mb-20">
          <div className="max-w-5xl mx-auto">
            <div className="bg-gradient-to-r from-violet-950 via-indigo-950 to-violet-950 rounded-[2.5rem] p-6 sm:p-8 md:p-12 shadow-2xl relative overflow-hidden border border-violet-800/50">
              <div className="relative z-10 flex flex-wrap justify-around gap-8">
                {!statsLoaded
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="text-center min-w-[140px]">
                        <div className="h-12 w-28 mx-auto rounded-xl bg-violet-800/40 animate-pulse mb-3" />
                        <div className="h-3 w-20 mx-auto rounded bg-violet-800/30 animate-pulse" />
                      </div>
                    ))
                  : statItems.map((st) => (
                      <div key={st.label} className="text-center min-w-[140px]">
                        <div className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-200 to-white mb-2 whitespace-nowrap tracking-tight">
                          <Counter target={st.value as number} prefix={st.prefix} suffix={st.suffix} />
                        </div>
                        <div className="text-[10px] sm:text-xs font-bold text-violet-300 uppercase tracking-widest">{st.label}</div>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==========================================
          LIVE FOMO TICKER (Real Platform Activity)
          ========================================== */}
      {liveTicker.length > 0 && (
        <div className="w-full bg-slate-900 border-y border-slate-800 py-5 overflow-hidden flex relative z-20 shadow-lg">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-900 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-900 to-transparent z-10" />

          <div className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-3 py-1.5 rounded-full border border-emerald-500/30 backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
          </div>

          <motion.div
            animate={lightweightMode ? undefined : { x: ["0%", "-50%"] }}
            transition={{ ease: "linear", duration: Math.max(20, liveTicker.length * 8), repeat: Infinity }}
            className="flex flex-nowrap gap-6 whitespace-nowrap pl-32 sm:pl-40 pr-4"
          >
            {[...liveTicker, ...liveTicker].map((exchange, idx) => (
              <div key={idx} className="flex items-center gap-3 text-slate-300 font-bold text-sm sm:text-base bg-slate-800/80 px-6 py-3 rounded-full border border-slate-700 shadow-sm">
                <span className="text-xl leading-none">{exchange.split(" ")[0]}</span>
                {exchange.substring(exchange.indexOf(" ") + 1)}
              </div>
            ))}
          </motion.div>
        </div>
      )}

      {/* ==========================================
          HOW IT WORKS (Trust & Economy)
          ========================================== */}
      <section id="how-it-works" className="py-24 relative z-10 bg-[#FAFAFA] scroll-mt-4">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-multiply" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm font-black mb-6 uppercase tracking-widest shadow-sm">
              <ShieldCheck className="w-5 h-5" /> Escrow-Protected Sessions
            </span>
            <h2 className="text-4xl md:text-6xl font-black mb-6 text-slate-900 tracking-tight">How the Credit Economy Works</h2>
            <p className="text-xl md:text-2xl text-slate-600 font-medium max-w-3xl mx-auto">No money involved. Complete transparency. <b className="text-slate-900 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-200">1 Credit = 1 Minute of Learning.</b></p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            
            {/* Connecting Line Vector */}
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-1.5 bg-slate-200 -translate-y-1/2 rounded-full z-0 overflow-hidden">
              <motion.div 
                animate={{ x: ["-100%", "300%"] }} 
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-1/3 h-full bg-gradient-to-r from-transparent via-violet-500 to-transparent rounded-full" 
              />
            </div>

            {[
              { icon: Wallet, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", title: "1. Earn & Deposit", desc: "Sign up and get 200 credits free instantly. Want more? Host a session teaching what you know. Your wallet acts as your knowledge bank." },
              { icon: Lock, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", title: "2. Secure Escrow", desc: "Book any expert. Your credits are locked securely in our Escrow vault. The mentor doesn't get paid until the class is completely over." },
              { icon: ArrowLeftRight, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", title: "3. Learn & Release", desc: "After the video call, you give a 6-digit OTP to the mentor. Credits are transferred instantly. Safe, secure, and purely skill-based." }
            ].map((step: any, i: number) => (
              <motion.div key={i} 
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.2 }}
                className="relative z-10 p-10 rounded-[2.5rem] bg-white border border-slate-200 shadow-xl shadow-slate-200/50 text-center group hover:-translate-y-3 transition-transform duration-300">
                <div className={`w-28 h-28 mx-auto ${step.bg} ${step.border} border-2 rounded-[2rem] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-inner`}>
                  <step.icon className={`w-14 h-14 ${step.color}`} />
                </div>
                <h3 className="text-2xl font-black mb-4 text-slate-900">{step.title}</h3>
                <p className="text-lg text-slate-600 leading-relaxed font-medium">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          FEATURES GRID
          ========================================== */}
      <section className="px-4 sm:px-6 lg:px-8 py-32 relative overflow-hidden bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-violet-100 border border-violet-200 text-violet-700 text-sm font-black mb-6 uppercase tracking-widest">
              <Sparkles className="w-5 h-5" /> More than just video calls
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-slate-900 tracking-tight">The Ultimate Skill Network</h2>
            <p className="text-slate-600 text-xl max-w-3xl mx-auto font-medium">Everything you need to master new skills and build your career, built specifically for ambitious Indians who want to grow without limits.</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f: any, i: number) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="p-10 rounded-[2.5rem] bg-[#FAFAFA] border border-slate-200 shadow-sm transition-all duration-300 relative overflow-hidden group hover:border-violet-300 hover:shadow-2xl hover:shadow-violet-200/50">
                <motion.div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="flex flex-col items-start gap-6 relative z-10">
                  <div className="w-20 h-20 rounded-[1.5rem] bg-white border border-slate-100 flex items-center justify-center text-4xl shadow-sm group-hover:scale-110 transition-transform">
                    {f.emoji}
                  </div>
                  <div>
                    <h3 className="font-black text-2xl text-slate-900 mb-4">{f.title}</h3>
                    <p className="text-base text-slate-600 leading-relaxed font-medium">{f.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          TESTIMONIALS (Real emotional stories)
          ========================================== */}
      {/* ==========================================
          VERIFIABLE CERTIFICATES (real data from the certificates API)
          ========================================== */}
      <section id="certificates" className="px-4 sm:px-6 lg:px-8 py-28 relative overflow-hidden bg-[#FAFAFA] scroll-mt-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

          {/* Left: message + real numbers + verify box */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-black mb-6 uppercase tracking-widest">
              <BadgeCheck className="w-5 h-5" /> Verifiable Certificates
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-5">
              Prove your skills.<br />
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">Anyone can verify.</span>
            </h2>
            <p className="text-lg text-slate-600 font-medium mb-8 max-w-xl">
              Every SkillSwap certificate gets a unique ID, a server-signed hash and a QR code. Employers and friends can scan it and confirm it is real, on any phone.
            </p>

            <ul className="space-y-3 mb-8">
              {[
                { icon: QrCode, text: "Scan the QR or enter the ID to verify instantly" },
                { icon: ShieldCheck, text: "Signed by our server, so edited or fake certificates fail" },
                { icon: Award, text: "Separate tracks for learners and mentors" },
              ].map((p) => (
                <li key={p.text} className="flex items-center gap-3 text-slate-700 font-semibold">
                  <span className="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
                    <p.icon className="w-5 h-5" />
                  </span>
                  {p.text}
                </li>
              ))}
            </ul>

            {/* Real numbers (or an honest empty state) */}
            {certs && certs.total > 0 ? (
              <div className="mb-8 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-end gap-3 mb-3">
                  <span className="text-4xl font-black text-slate-900"><Counter target={certs.total} /></span>
                  <span className="text-sm font-bold text-slate-500 pb-1.5">certificates issued</span>
                </div>
                {certs.topSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {certs.topSkills.map((t) => (
                      <span key={t.skill} className="px-3 py-1 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-xs font-bold">
                        {t.skill} · {t.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="mb-8 text-sm font-bold text-slate-500 bg-white border border-dashed border-slate-300 rounded-2xl p-4">
                Be among the first members to earn a verified SkillSwap certificate.
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <a href="/certificate.html" className="flex-1">
                <Button className="w-full h-14 rounded-2xl text-base font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0">
                  Get Your Certificate <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </a>
            </div>

            <form onSubmit={goVerify} className="flex gap-2 max-w-md" aria-label="Verify a certificate">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  value={verifyId}
                  onChange={(e) => setVerifyId(e.target.value)}
                  placeholder="Verify an ID: SWAP-IND-XXXXXX"
                  className="w-full h-12 pl-10 pr-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>
              <Button type="submit" variant="outline" className="h-12 rounded-xl font-bold px-5">Verify</Button>
            </form>
          </motion.div>

          {/* Right: sample preview + real recent certificates */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }}>
            <div className="relative rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-300/40 overflow-hidden">
              <div className="absolute top-3 right-3 z-10 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/90 border border-slate-200 rounded-full px-3 py-1">Sample design</div>
              <div className="flex">
                <div className="w-14 sm:w-20 bg-gradient-to-b from-[#0E2A47] to-[#08203A] flex flex-col items-center py-6 gap-3">
                  <img src="/pwa-192x192.png" alt="" className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl" />
                  <div className="flex-1 w-1 rounded-full bg-gradient-to-b from-teal-400 to-amber-300/70" />
                </div>
                <div className="flex-1 p-6 sm:p-8 text-center">
                  <p className="text-[10px] font-black tracking-[0.3em] text-slate-500">SKILLSWAP INDIA</p>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2">CERTIFICATE</p>
                  <p className="text-[11px] font-bold tracking-[0.25em] text-amber-600 mt-1">OF SKILL PROFICIENCY</p>
                  <div className="h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent my-5" />
                  <p className="text-xs text-slate-500 font-medium">presented to</p>
                  <p className="text-xl font-black text-slate-900 mt-1">YOUR NAME</p>
                  <p className="text-xs text-slate-500 font-medium mt-4">for completing</p>
                  <p className="text-lg font-black text-[#0E2A47] mt-1">YOUR SKILL</p>
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <div className="w-14 h-14 rounded-xl bg-[#06182A] flex items-center justify-center"><QrCode className="w-8 h-8 text-white" /></div>
                    <div className="text-left">
                      <p className="text-[10px] font-black text-teal-600 uppercase tracking-wider">Scan to verify</p>
                      <p className="text-[11px] font-mono text-slate-500">SWAP-IND-XXXXXX</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {certs && certs.recent.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Recently issued</p>
                <div className="space-y-2">
                  {certs.recent.slice(0, 4).map((c) => (
                    <a key={c.certId} href={`/verify.html?id=${encodeURIComponent(c.certId)}`}
                       className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-violet-300 hover:shadow-md transition-all">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{c.skill}</p>
                        <p className="text-xs text-slate-500 font-medium">{c.level} · {c.role === "teacher" ? "Mentor" : "Learner"} · {c.dateStr}</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 flex-shrink-0">
                        <BadgeCheck className="w-4 h-4" /> Verify
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ==========================================
          REAL MEMBER REVIEWS (rendered only when real reviews exist)
          ========================================== */}
      {reviews.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 py-28 relative overflow-hidden bg-white border-y border-slate-100">
          <div className="max-w-6xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-900 tracking-tight">What members say</h2>
              <p className="text-slate-500 font-semibold">Recent reviews from real SkillSwap sessions.</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {reviews.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="p-8 rounded-[2rem] bg-[#FAFAFA] border border-slate-200 shadow-sm">
                  {r.rating !== null && (
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: 5 }).map((_, k) => (
                        <Star key={k} className={`w-5 h-5 ${k < Math.round(r.rating as number) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                      ))}
                    </div>
                  )}
                  <p className="text-lg font-semibold text-slate-700 leading-relaxed mb-6">“{r.text}”</p>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-violet-100 text-violet-700 font-black flex items-center justify-center">
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-black text-slate-900">{r.name}</div>
                      {r.skill && <div className="text-xs font-bold text-violet-600">{r.skill}</div>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==========================================
          FAQ SECTION (Addressing objections)
          ========================================== */}
      <section className="px-4 sm:px-6 lg:px-8 py-32 bg-white border-y border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">You got questions?</h2>
            <p className="text-xl text-slate-600 font-medium">We have answers. No hidden terms, no bs.</p>
          </div>
          <div className="space-y-6">
            {FAQS.map((faq: any, i: number) => (
              <div key={i} className="bg-[#FAFAFA] border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all">
                <button 
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-8 text-left outline-none"
                >
                  <span className="font-black text-xl text-slate-800 pr-8">{faq.q}</span>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${openFaq === i ? "bg-violet-100 text-violet-600" : "bg-slate-200 text-slate-500"}`}>
                    <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${openFaq === i ? "rotate-180" : ""}`} />
                  </div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-white"
                    >
                      <div className="p-8 pt-4 text-slate-600 font-medium text-lg leading-relaxed border-t border-slate-100">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          BOTTOM CTA (Massive & Emotional)
          ========================================== */}
      <section className="py-32 bg-slate-900 text-center relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-50" />
        
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-violet-600/30 blur-[120px] pointer-events-none rounded-full" />

        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="relative z-10 px-4 max-w-5xl mx-auto">
          <h2 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tight">Stop Paying.<br/>Start Swapping.</h2>
          <p className="text-2xl text-slate-300 font-medium mb-16 max-w-3xl mx-auto">{realStats.totalUsers && realStats.totalUsers > 0 ? `Join ${realStats.totalUsers.toLocaleString()} members who learn and teach without spending a rupee.` : "Learn and teach without spending a rupee."} Your knowledge is enough.</p>
          
          <Link href="/register">
            <Button className="h-24 px-16 rounded-full bg-white hover:bg-slate-100 text-violet-700 font-black text-3xl shadow-[0_0_80px_rgba(124,58,237,0.6)] transition-all hover:scale-105 active:scale-95 border-0">
              Join for Free Today
              <ArrowRight className="ml-5 w-8 h-8" />
            </Button>
          </Link>
          <p className="mt-10 text-base font-bold text-slate-400 flex items-center justify-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" /> Secure platform. Quick sign up.
          </p>
        </motion.div>
      </section>
    </div>
  );
}