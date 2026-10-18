import { Link } from "wouter";
import { motion, useScroll, useTransform, useMotionValue, useSpring, useReducedMotion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, BookOpen, Users, Star, ShieldCheck, Zap, Sparkles, 
  Globe, Play, CheckCircle, Code2, Palette, Languages, Brain, Trophy, 
  MessageSquare, Flame, Target, Award, Wallet, Lock, ArrowLeftRight, 
  Activity, ChevronDown, Check, Github, Twitter, Linkedin, Instagram, Heart, Briefcase 
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

const FLOATING_USERS = [
  { name: "Priya", action: "Cracked TCS Ninja", img: "👩🏽‍💻", x: "6%", y: "22%", delay: 0 },
  { name: "Rahul", action: "Earned ₹50K Freelancing", img: "👨🏽‍🏫", x: "82%", y: "15%", delay: 2 },
  { name: "Aditi", action: "Fluent English Now", img: "👩🏽‍🎨", x: "10%", y: "65%", delay: 4 },
  { name: "Aman", action: "Completed FAANG DSA", img: "👨🏽‍🎓", x: "80%", y: "60%", delay: 1.5 },
];

const TESTIMONIALS = [
  { 
    name: "Arjun Kumar", role: "Tier-3 College ➡️ SDE @ Google", avatar: "👨🏽‍💻", 
    text: "I couldn't afford a ₹50,000 coding bootcamp. On SkillSwap, I taught basic Hindi to foreigners, earned credits, and used them to learn Advanced DSA from a Microsoft engineer. I just got placed at Google. This platform literally changed my family's life.", 
    rating: 5, streak: 124 
  },
  { 
    name: "Sneha Patel", role: "Homemaker ➡️ Freelance Writer", avatar: "👩🏽‍🏫", 
    text: "I had a 5-year career gap. I felt lost. SkillSwap gave me a community. I taught conversational Gujarati, learned Copywriting, and now I have 3 international clients paying in dollars. This isn't just an app, it's hope.", 
    rating: 5, streak: 62 
  },
  { 
    name: "Rahul Verma", role: "UI Designer ➡️ Full Stack Dev", avatar: "👨🏽‍🎨", 
    text: "The Escrow system is pure genius! On other freelancing platforms, people run away without paying. Here, my credits are locked safely before the session even begins. 100% scam-proof and secure.", 
    rating: 5, streak: 85 
  },
  { 
    name: "Pooja Sharma", role: "Hindi Medium ➡️ MNC Executive", avatar: "👩🏽‍💼", 
    text: "I always failed interviews because of my broken English. I joined a free group class here, practiced daily with real people without being judged, and completely lost my fear. Got my dream job last week!", 
    rating: 5, streak: 90 
  },
];

const FEATURES = [
  { 
    icon: Zap, emoji: "💸", title: "The Zero-Rupee Economy", tag: "Most Popular", 
    color: "from-violet-500/10 to-indigo-500/5", iconColor: "text-violet-600",
    desc: "Why pay thousands for courses? Teach your native language, Excel, or any basic skill to earn credits. Use those exact credits to learn coding, design, or marketing. 1 Credit = 1 Minute."
  },
  { 
    icon: Lock, emoji: "🛡️", title: "100% Scam-Proof Escrow", tag: "Highly Secure", 
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

const DEFAULT_TICKER = [
  "🔥 Aman earned 60 credits teaching Node.js", 
  "🤝 Priya (Delhi) just matched with Rahul (Pune)", 
  "✨ Sneha successfully verified her 'UI/UX Expert' badge",
  "💸 Arjun paid 45 credits to learn Advanced Excel",
  "🚀 Group Class 'Crack DSA' just went LIVE with 40 students!",
  "🏆 Nikhil hit a 30-day learning streak!",
  "🤝 Karan swapped Video Editing for SEO Consultation",
  "🔥 Aditi earned 120 credits hosting a Spanish Masterclass"
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
    a: "You are fully protected. If the mentor doesn't show up, or if the class was bad, you simply don't share the OTP. You can raise a 'Dispute' with one click, and our team will refund your 100% credits back to your wallet instantly."
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
  
  const [activeT, setActiveT] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Real Data States
  const [realStats, setRealStats] = useState({
    totalUsers: 10432,
    moneySaved: 50000,
    sessionsCompleted: 1200,
    matchRate: 98
  });
  const [liveTicker, setLiveTicker] = useState<string[]>(DEFAULT_TICKER);

  const reduceMotionPref = useReducedMotion();
  const isNative = Capacitor.isNativePlatform();
  const lightweightMode = isNative || !!reduceMotionPref;

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/public-stats`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setRealStats({
              totalUsers: json.data.totalUsers || 10432,
              moneySaved: json.data.moneySaved || 50000,
              sessionsCompleted: json.data.completedSessions || 1200,
              matchRate: json.data.matchSuccessRate || 98
            });
            if (json.data.liveExchanges && json.data.liveExchanges.length > 0) {
              setLiveTicker(json.data.liveExchanges);
            }
          }
        }
      } catch (err) {
        console.log("Using fallback data.");
      }
    };
    fetchRealData();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveT(i => (i + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(t);
  }, []);

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

        {/* Floating Success Stories */}
        <div className="hidden lg:block absolute inset-0 z-10 pointer-events-none">
          {FLOATING_USERS.map((user: any, i: number) => (
            <motion.div key={i} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: [0, 1, 1, 0], y: [20, 0, -10, -30] }}
              transition={{ duration: 7, repeat: Infinity, delay: user.delay, ease: "easeInOut" }}
              className="absolute flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/80 backdrop-blur-md border border-white/50 shadow-xl shadow-violet-100/50"
              style={{ left: user.x, top: user.y }}
            >
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-2xl shadow-inner border border-slate-100">
                {user.img}
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">{user.name}</p>
                <p className="text-[11px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full mt-0.5 inline-block border border-violet-100">{user.action}</p>
              </div>
            </motion.div>
          ))}
        </div>

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
                <span>Join <span className="text-violet-700 font-bold">{realStats.totalUsers.toLocaleString()}+</span> active learners sharing knowledge.</span>
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

              {/* Secondary Play Button */}
              <Link href="/explore">
                <Button variant="outline" className="w-full sm:w-auto h-16 px-8 rounded-full text-lg font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-transform hover:scale-105 active:scale-95 group">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 text-violet-600 mr-3 group-hover:bg-violet-200 transition-colors">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </span>
                  See How It Works
                </Button>
              </Link>

              {/* Tertiary Text Link */}
              <Link href="/explore">
                <span className="hidden lg:flex items-center text-sm font-bold text-violet-600 hover:text-violet-700 cursor-pointer ml-2 hover:underline underline-offset-4 transition-all">
                  Browse Mentors <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              </Link>
            </motion.div>

            {/* Trending Skills Hook */}
            <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { delay: 0.6 } } }} className="pt-6 border-t border-slate-200/60 max-w-4xl mx-auto">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Highly Demanded Skills Today</p>
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
      <section className="relative z-30 -mt-16 sm:-mt-24 px-4 sm:px-6 lg:px-8 mb-20">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-violet-950 via-indigo-950 to-violet-950 rounded-[2.5rem] p-6 sm:p-8 md:p-12 shadow-2xl relative overflow-hidden border border-violet-800/50">
            {/* Background Texture for Card */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />
            
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-violet-800/50">
              <div className="text-center px-2 py-4 md:py-0">
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-200 to-white mb-2 whitespace-nowrap tracking-tight">
                  <Counter target={realStats.totalUsers} suffix="+" />
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-violet-300 uppercase tracking-widest">Active Users</div>
              </div>
              <div className="text-center px-2 py-4 md:py-0">
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-200 to-white mb-2 whitespace-nowrap tracking-tight">
                  <Counter target={realStats.moneySaved} prefix="₹" suffix="+" />
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-violet-300 uppercase tracking-widest">Money Saved</div>
              </div>
              <div className="text-center px-2 py-4 md:py-0">
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-200 to-white mb-2 whitespace-nowrap tracking-tight">
                  <Counter target={realStats.sessionsCompleted} suffix="+" />
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-violet-300 uppercase tracking-widest">Classes Done</div>
              </div>
              <div className="text-center px-2 py-4 md:py-0">
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-200 to-white mb-2 whitespace-nowrap tracking-tight">
                  <Counter target={realStats.matchRate} suffix="%" />
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-violet-300 uppercase tracking-widest">Match Success</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================
          LIVE FOMO TICKER (Real Platform Activity)
          ========================================== */}
      <div className="w-full bg-slate-900 border-y border-slate-800 py-6 overflow-hidden flex relative z-20 shadow-lg">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-900 to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-900 to-transparent z-10" />
        
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-3 py-1.5 rounded-full border border-emerald-500/30 backdrop-blur-md">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Pulse
        </div>

        <motion.div 
          animate={{ x: ["0%", "-50%"] }} 
          transition={{ ease: "linear", duration: 40, repeat: Infinity }}
          className="flex flex-nowrap gap-8 whitespace-nowrap pl-40 pr-4"
        >
          {liveTicker.map((exchange: string, idx: number) => (
            <div key={idx} className="flex items-center gap-3 text-slate-300 font-bold text-base bg-slate-800/80 px-8 py-3.5 rounded-full border border-slate-700 shadow-sm backdrop-blur-md">
              <span className="text-xl leading-none">{exchange.split(' ')[0]}</span>
              {exchange.substring(exchange.indexOf(' ') + 1)}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ==========================================
          HOW IT WORKS (Trust & Economy)
          ========================================== */}
      <section className="py-24 relative z-10 bg-[#FAFAFA]">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-multiply" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm font-black mb-6 uppercase tracking-widest shadow-sm">
              <ShieldCheck className="w-5 h-5" /> 100% Trust & Scam-Proof System
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
      <section className="px-4 sm:px-6 lg:px-8 py-32 relative overflow-hidden bg-[#FAFAFA]">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-black mb-6 text-slate-900 tracking-tight">Life-Changing Stories</h2>
            <div className="flex justify-center gap-1 mb-4">{Array.from({length:5}).map((_,i)=><Star key={i} className="w-10 h-10 fill-amber-400 text-amber-400"/>)}</div>
            <p className="text-slate-600 font-bold text-xl">Rated 4.9/5 by 2,000+ Indians who stopped paying for expensive courses.</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {TESTIMONIALS.map((t: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="p-10 rounded-[2.5rem] bg-white border border-slate-200 shadow-xl relative hover:shadow-2xl transition-shadow">
                <div className="absolute top-8 right-10 text-8xl text-slate-200 font-serif leading-none opacity-40">"</div>
                <p className="text-xl font-bold text-slate-700 leading-relaxed mb-10 relative z-10 italic">"{t.text}"</p>
                <div className="flex items-center gap-5 mt-auto">
                  <div className={`w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl shadow-inner border-2 border-white`}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-black text-slate-900 text-xl">{t.name}</div>
                    <div className="text-sm font-bold text-violet-600 mt-1">{t.role}</div>
                  </div>
                  <div className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 shadow-sm text-sm font-bold text-slate-500">
                    <Flame className="w-5 h-5 text-orange-500" /> {t.streak} Days
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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
          <p className="text-2xl text-slate-300 font-medium mb-16 max-w-3xl mx-auto">Join 10,000+ ambitious Indians who are building their careers without spending a rupee. Your knowledge is enough.</p>
          
          <Link href="/register">
            <Button className="h-24 px-16 rounded-full bg-white hover:bg-slate-100 text-violet-700 font-black text-3xl shadow-[0_0_80px_rgba(124,58,237,0.6)] transition-all hover:scale-105 active:scale-95 border-0">
              Join for Free Today
              <ArrowRight className="ml-5 w-8 h-8" />
            </Button>
          </Link>
          <p className="mt-10 text-base font-bold text-slate-400 flex items-center justify-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" /> Secure platform. Takes exactly 30 seconds to sign up.
          </p>
        </motion.div>
      </section>
    </div>
  );
}