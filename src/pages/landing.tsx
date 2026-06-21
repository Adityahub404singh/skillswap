import { Link } from "wouter";
import { motion, useScroll, useTransform, useMotionValue, useSpring, useReducedMotion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, BookOpen, Users, Star, ShieldCheck, Zap, Sparkles, 
  Globe, Play, CheckCircle, Code2, Palette, Languages, Brain, Trophy, 
  MessageSquare, Flame, Target, Award, Wallet, Lock, ArrowLeftRight, 
  Activity, ChevronDown, Check, Github, Twitter, Linkedin, Instagram, Heart 
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

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
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
    const step = target / 60;
    const t = setInterval(() => { 
      s += step; 
      if (s >= target) { setCount(target); clearInterval(t); } 
      else setCount(Math.floor(s)); 
    }, 16);
    return () => clearInterval(t);
  }, [started, target]);
  
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function MouseGlow() {
  const x = useMotionValue(0); 
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 80, damping: 20 }); 
  const sy = useSpring(y, { stiffness: 80, damping: 20 });
  
  useEffect(() => {
    const h = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener("mousemove", h); 
    return () => window.removeEventListener("mousemove", h);
  }, [x, y]);
  
  return (
    <motion.div 
      className="fixed top-0 left-0 pointer-events-none z-0 w-[800px] h-[800px] rounded-full mix-blend-multiply hidden lg:block" 
      style={{ 
        x: sx, y: sy, translateX: "-50%", translateY: "-50%", 
        background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 60%)" 
      }} 
    />
  );
}

// ==========================================
// 2. DATA ARRAYS (Content)
// ==========================================

const PARTICLES = Array.from({ length: 25 }, (_, i) => ({
  x: Math.random() * 100, 
  y: Math.random() * 100,
  size: Math.random() * 6 + 3,
  color: ["#8b5cf6", "#6366f1", "#0ea5e9", "#f59e0b", "#ec4899"][i % 5] + "44",
  dur: Math.random() * 8 + 5,
}));

const FLOATING_USERS = [
  { name: "Priya", action: "earned 50 cr", img: "👩🏽‍💻", x: "8%", y: "22%", delay: 0 },
  { name: "Rahul", action: "teaching React", img: "👨🏽‍🏫", x: "85%", y: "18%", delay: 2 },
  { name: "Aditi", action: "learning Design", img: "👩🏽‍🎨", x: "12%", y: "65%", delay: 4 },
  { name: "Aman", action: "completed DSA", img: "👨🏽‍🎓", x: "82%", y: "60%", delay: 1.5 },
];

const TESTIMONIALS = [
  { 
    name: "Priya Sharma", role: "Python Learner ➡️ ML Engineer", avatar: "PS", 
    text: "I learned Python in 6 weeks by teaching Excel! SkillSwap completely changed my career trajectory.", 
    rating: 5, streak: 45 
  },
  { 
    name: "Rahul Verma", role: "Web Dev ➡️ Freelancer 💰50K/mo", avatar: "RV", 
    text: "Got my first ₹50K freelance project after learning React here. The credit system is pure genius!", 
    rating: 5, streak: 30 
  },
  { 
    name: "Sneha Patel", role: "English Learner ➡️ Content Creator", avatar: "SP", 
    text: "My English improved so much! Native speakers helped me and it was completely FREE. Unbelievable!", 
    rating: 5, streak: 62 
  },
  { 
    name: "Arjun Kumar", role: "DSA ➡️ Google SWE L4", avatar: "AK", 
    text: "Cracked my Google interview after DSA sessions on SkillSwap. Best platform for Indian students!", 
    rating: 5, streak: 90 
  },
];

const FEATURES = [
  { 
    icon: Zap, emoji: "💰", title: "Credit Economy", tag: "Most Popular", 
    color: "from-violet-500/10 to-indigo-500/5", iconColor: "text-violet-600",
    desc: "Teach 1 hour = Earn 10 credits. Use credits to learn ANY skill. No money needed — perfect for students."
  },
  { 
    icon: Brain, emoji: "🤖", title: "AI Skill Matching", tag: "AI-Powered", 
    color: "from-fuchsia-500/10 to-pink-500/5", iconColor: "text-fuchsia-600",
    desc: "Our AI matches you with the perfect partner. 'Aditya teaches React, Priya teaches English' — Instant match!"
  },
  { 
    icon: Award, emoji: "🏅", title: "Verified Badges", tag: "Trust Builder", 
    color: "from-amber-500/10 to-orange-500/5", iconColor: "text-amber-600",
    desc: "Take skill tests and earn verified badges. Verified Python Dev, Verified Designer — build credibility fast."
  },
  { 
    icon: Flame, emoji: "🔥", title: "Learning Streaks", tag: "Gamified", 
    color: "from-red-500/10 to-rose-500/5", iconColor: "text-red-600",
    desc: "7-day streak, 30-day streak, 90-day legend! Gamified learning keeps you consistent and motivated daily."
  },
  { 
    icon: Target, emoji: "🤝", title: "Real Project Exchange", tag: "Unique", 
    color: "from-emerald-500/10 to-teal-500/5", iconColor: "text-emerald-600",
    desc: "Not just learning — exchange real work! I'll design your logo, you build my portfolio. Real value."
  },
  { 
    icon: Users, emoji: "🌍", title: "Local Community", tag: "Community", 
    color: "from-cyan-500/10 to-sky-500/5", iconColor: "text-cyan-600",
    desc: "Connect with nearby learners. Greater Noida meetups, Jaipur groups — learn online AND offline together."
  },
];

const LIVE_EXCHANGES = [
  "Python ⇄ UI Design", "English ⇄ React.js", "Video Editing ⇄ SEO", 
  "DSA ⇄ Spanish", "Digital Marketing ⇄ Backend", "Photography ⇄ Copywriting",
  "Excel ⇄ Public Speaking", "Figma ⇄ Next.js", "Illustrator ⇄ Data Science",
  "Python ⇄ UI Design", "English ⇄ React.js", "Video Editing ⇄ SEO"
];

const FAQS = [
  {
    q: "Is SkillSwap really 100% free?",
    a: "Yes! SkillSwap operates on a credit-based economy. You earn credits by teaching what you know, and spend those credits to learn what you don't. No credit card is required to join or learn."
  },
  {
    q: "How do I get my first credits?",
    a: "Just by creating an account, you instantly get a welcome bonus of 200 credits! That's enough to book 2-4 hours of expert mentoring right away."
  },
  {
    q: "What if I'm a beginner and have nothing to teach?",
    a: "Everyone has something to share! You can teach your native language (Hindi, Tamil, etc.), basic school subjects (Math, Science), or even hobbies like Chess or Photography. As you learn new skills, you can start teaching them too."
  },
  {
    q: "How does the Escrow system protect me?",
    a: "When you book a session, your credits are locked safely. They are only transferred to the teacher AFTER the session is successfully completed and both parties verify it using our OTP system. Scams are impossible."
  },
  {
    q: "Can I convert credits to real money?",
    a: "Yes! While our primary goal is skill exchange, highly rated mentors can withdraw their excess credits directly to their UPI or bank account once they cross a certain threshold."
  }
];

// ==========================================
// 3. MAIN COMPONENT
// ==========================================

export default function Landing() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll();
  const headerY = useTransform(scrollYProgress, [0, 0.3], ["0%", "-10%"]);
  const typed = useTypewriter(["Python 🐍", "English 🗣️", "React ⚛️", "DSA 💻", "Design 🎨", "Spanish 🇪🇸"], 70, 1600);
  
  const [activeT, setActiveT] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // 🔥 Smoothness guard — Android WebView (Capacitor) aur reduced-motion users
  // ke liye heavy blurred-blob + particle animations off kar dete hain. Web pe
  // (jab isNative false aur reduceMotion false ho) sab kuch EXACTLY pehle jaisa rahega.
  const reduceMotionPref = useReducedMotion();
  const isNative = Capacitor.isNativePlatform();
  const lightweightMode = isNative || !!reduceMotionPref;

  // Auto-rotate testimonials
  useEffect(() => {
    const t = setInterval(() => setActiveT(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div ref={ref} className="relative flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden bg-slate-50 font-sans">
      {!lightweightMode && <MouseGlow />}

      {/* ==========================================
          HERO SECTION (Light & Clean)
          ========================================== */}
      <section className="relative min-h-[calc(100vh-80px)] flex flex-col px-6 sm:px-6 lg:px-8 overflow-hidden pb-12 pt-10">
        
        {/* Light Particles — lighter on native/reduced-motion to keep Android WebView buttery smooth */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {(lightweightMode ? PARTICLES.slice(0, 10) : PARTICLES).map((p, i) =>
            lightweightMode ? (
              <div key={i} className="absolute rounded-full"
                style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: p.color, opacity: 0.5 }} />
            ) : (
              <motion.div key={i} className="absolute rounded-full"
                style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: p.color }}
                animate={{ y: [-20, 20, -20], x: [-10, 10, -10], opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }} />
            )
          )}
        </div>

        {/* Ambient Light Blobs (Matching App Colors) — static (no scale/rotate loop) in lightweight mode */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none mix-blend-multiply opacity-70">
          {[
            { cls: "absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-200 blur-[100px]", dur: 8 },
            { cls: "absolute top-[20%] -right-40 w-[500px] h-[500px] rounded-full bg-fuchsia-200 blur-[100px]", dur: 11 },
            { cls: "absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-100 blur-[100px]", dur: 9 },
          ].map((b, i) => (
            <motion.div key={i} className={b.cls}
              animate={lightweightMode ? undefined : { scale: [1, 1.1, 1], rotate: [0, i % 2 === 0 ? 5 : -5, 0] }}
              transition={lightweightMode ? undefined : { duration: b.dur, repeat: Infinity, ease: "easeInOut", delay: i * 2 }} />
          ))}
        </div>

        {/* Subtle Grid */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.4]"
          style={{ backgroundImage: "linear-gradient(#e2e8f0 1px,transparent 1px),linear-gradient(90deg,#e2e8f0 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Floating Live Users (Light Mode) */}
        <div className="hidden lg:block absolute inset-0 z-10 pointer-events-none">
          {FLOATING_USERS.map((user, i) => (
            <motion.div key={i} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: [0, 1, 1, 0], y: [20, 0, -10, -30] }}
              transition={{ duration: 6, repeat: Infinity, delay: user.delay, ease: "easeInOut" }}
              className="absolute flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200 shadow-xl"
              style={{ left: user.x, top: user.y }}
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl shadow-inner border border-slate-200/50">
                {user.img}
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-800">{user.name}</p>
                <p className="text-[11px] font-medium text-violet-600">{user.action}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div style={{ y: headerY }} className="relative z-20 flex-1 flex flex-col justify-center max-w-6xl mx-auto py-12 lg:py-20 w-full mt-8">
          <motion.div initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }}
            className="text-center max-w-5xl mx-auto">

            {/* Live badge */}
            <motion.div variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300 } } }}>
              <motion.div whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-violet-200 bg-white shadow-lg shadow-violet-100 text-violet-700 font-bold text-sm mb-8 cursor-default">
                <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span>10,000+ active learners</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 mx-1"/>
                <span>Zero Money Needed</span>
              </motion.div>
            </motion.div>

            {/* Main heading */}
            <motion.h1
              variants={{ hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 180, damping: 18 } } }}
              className="text-5xl md:text-7xl lg:text-[6rem] font-extrabold tracking-tight mb-6 leading-[1.1] text-slate-900"
              style={{ fontFamily: "Outfit, sans-serif" }}>
              <span>Learn </span>
              <span className="relative inline-block min-w-[220px]">
                <motion.span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent"
                  animate={{ filter: ["hue-rotate(0deg)", "hue-rotate(15deg)", "hue-rotate(0deg)"] }}
                  transition={{ duration: 4, repeat: Infinity }}>
                  {typed}
                </motion.span>
                <motion.span className="text-violet-600 ml-0.5 font-light" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }}>|</motion.span>
              </span>
              <br />
              <span>by </span>
              <span className="relative">
                Teaching.
                <motion.span className="absolute -bottom-2 left-0 w-full h-3 bg-violet-200/60 -z-10 rounded-full" 
                  animate={{ scaleX: [0.9, 1.05, 0.9] }} transition={{ duration: 3, repeat: Infinity }} />
              </span>
            </motion.h1>

            {/* Subtext */}
            <motion.p variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}
              className="text-base sm:text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed px-2 font-medium">
              The internet's first peer-to-peer skill economy.{" "}
              <span className="text-slate-900 font-bold">Teach what you know</span> ➡️ earn credits ➡️{" "}
              <span className="text-slate-900 font-bold">learn anything</span> from experts.{" "}
              <span className="text-violet-700 font-bold bg-violet-100 px-2 py-1 rounded-md ml-1">₹0 cost. Always.</span>
            </motion.p>

            {/* CTAs */}
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/register">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="w-full sm:w-auto h-14 px-10 rounded-full text-base font-bold shadow-xl shadow-violet-500/30 bg-violet-600 hover:bg-violet-700 text-white border-0 relative overflow-hidden group transition-all">
                    <motion.div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                    Start Free — Get 200 Credits 🎁
                    <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </motion.span>
                  </Button>
                </motion.div>
              </Link>
              <Link href="/explore">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" className="w-full sm:w-auto h-14 px-10 rounded-full text-base font-bold border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 bg-white shadow-sm transition-all">
                    <Play className="mr-2 w-4 h-4 fill-slate-700" /> See How it Works
                  </Button>
                </motion.div>
              </Link>
            </motion.div>

            {/* Stats (Light Mode) */}
            <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.5 } } }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4 max-w-3xl mx-auto border-t border-slate-200 pt-10">
              {[
                { value: 10000, suffix: "+", label: "Global Learners" },
                { value: 500, suffix: "+", label: "Skills Exchanged" },
                { value: 98, suffix: "%", label: "Match Success" },
                { label: "Platform Fee", special: "₹0" },
              ].map((s, i) => (
                <motion.div key={s.label} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="text-center">
                  <div className="text-3xl font-black text-slate-900 mb-1">
                    {s.special ? s.special : <Counter target={s.value!} suffix={s.suffix} />}
                  </div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">{s.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ==========================================
          INFINITE MARQUEE (Live Exchanges)
          ========================================== */}
      <div className="w-full bg-violet-600 border-y border-violet-700 py-4 overflow-hidden flex relative z-20 shadow-inner">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-violet-600 to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-violet-600 to-transparent z-10" />
        
        <motion.div 
          animate={{ x: ["0%", "-50%"] }} 
          transition={{ ease: "linear", duration: 30, repeat: Infinity }}
          className="flex flex-nowrap gap-6 whitespace-nowrap px-4"
        >
          {LIVE_EXCHANGES.map((exchange, idx) => (
            <div key={idx} className="flex items-center gap-3 text-white font-bold text-base bg-white/10 px-6 py-2 rounded-full border border-white/20 backdrop-blur-sm shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              {exchange}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ==========================================
          HOW ESCROW WORKS (Light Theme)
          ========================================== */}
      <section className="py-24 relative z-10 bg-white">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-multiply" />
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 text-sm font-bold mb-4 uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" /> 100% Trust System
            </span>
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-900">How the Credit Economy Works</h2>
            <p className="text-xl text-slate-600 font-medium">Zero money. Complete transparency. 1 Credit = 1 Minute of Learning.</p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-1 bg-slate-100 -translate-y-1/2 rounded-full z-0">
              <motion.div 
                animate={{ x: ["0%", "100%"] }} 
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                className="w-1/3 h-full bg-gradient-to-r from-transparent via-violet-500 to-transparent rounded-full" 
              />
            </div>

            {[
              { icon: Wallet, color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200", title: "1. Earn & Deposit", desc: "Get 200 credits free. Earn more by teaching. Your wallet is your bank." },
              { icon: Lock, color: "text-violet-600", bg: "bg-violet-100", border: "border-violet-200", title: "2. Secure Escrow", desc: "Book a session. Credits are locked securely until the session is completed." },
              { icon: ArrowLeftRight, color: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-200", title: "3. Learn & Release", desc: "Session done? OTP verified? Credits are instantly transferred to the teacher." }
            ].map((step, i) => (
              <motion.div key={i} 
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.2 }}
                className="relative z-10 p-8 rounded-[2rem] bg-white border border-slate-200 shadow-xl shadow-slate-200/50 text-center group hover:-translate-y-2 transition-transform duration-300">
                <div className={`w-24 h-24 mx-auto ${step.bg} ${step.border} border-2 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-inner`}>
                  <step.icon className={`w-12 h-12 ${step.color}`} />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed font-medium">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          FEATURES GRID
          ========================================== */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 relative overflow-hidden bg-slate-50">
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100 border border-violet-200 text-violet-700 text-sm font-bold mb-4 uppercase tracking-widest">
              <Sparkles className="w-4 h-4" /> Why Choose Us
            </span>
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-900">The Ultimate Skill Network</h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto font-medium">Everything you need to master new skills without spending a single rupee.</p>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f: any, i: number) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="p-8 rounded-3xl bg-white border border-slate-200 shadow-lg shadow-slate-200/40 transition-all duration-300 relative overflow-hidden group hover:border-violet-300 hover:shadow-xl hover:shadow-violet-200/50">
                <motion.div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="flex items-start gap-5 relative z-10">
                  <div className="text-4xl drop-shadow-md">{f.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg text-slate-900">{f.title}</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{f.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          TESTIMONIALS
          ========================================== */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 relative overflow-hidden bg-white border-y border-slate-200">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-bold mb-4">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" /> Real Stories
            </span>
            <h2 className="text-4xl md:text-5xl font-black mb-3 text-slate-900">Loved by Learners</h2>
            <div className="flex justify-center gap-1 mb-2">{Array.from({length:5}).map((_,i)=><Star key={i} className="w-6 h-6 fill-amber-400 text-amber-400"/>)}</div>
            <p className="text-slate-600 font-medium">4.9/5 from 2,000+ reviews</p>
          </motion.div>
          
          <div className="relative" style={{ minHeight: 220 }}>
            <AnimatePresence mode="wait">
              <motion.div key={activeT}
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -60, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="p-8 text-center bg-slate-50 border border-slate-200 rounded-[2rem] shadow-xl shadow-slate-200/50">
                <p className="text-xl font-bold mb-6 text-slate-800 leading-relaxed">"{TESTIMONIALS[activeT].text}"</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xl shadow-inner border-2 border-white">
                    {TESTIMONIALS[activeT].avatar}
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-slate-900">{TESTIMONIALS[activeT].name}</div>
                    <div className="text-sm font-medium text-slate-500">{TESTIMONIALS[activeT].role}</div>
                  </div>
                  <div className="ml-4 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-100 text-rose-600 text-sm font-bold border border-rose-200 shadow-sm">
                    <Flame className="w-4 h-4" /> {TESTIMONIALS[activeT].streak} day streak
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="flex justify-center gap-2 mt-8">
            {TESTIMONIALS.map((_,i)=>(
              <button key={i} onClick={()=>setActiveT(i)}
                className={`rounded-full transition-all duration-300 ${i===activeT ? "w-8 h-2.5 bg-violet-600" : "w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400"}`}/>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          FAQ SECTION (Added for completeness)
          ========================================== */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Got Questions?</h2>
            <p className="text-lg text-slate-600 font-medium">We've got answers. Everything you need to know about SkillSwap.</p>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                <button 
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-bold text-lg text-slate-900">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${openFaq === i ? "rotate-180 text-violet-600" : ""}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 pt-0 text-slate-600 font-medium leading-relaxed border-t border-slate-100 mt-2">
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
          BOTTOM CTA (Matches App Banner)
          ========================================== */}
      <section className="py-12 bg-violet-600 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Ready to SkillSwap?</h2>
        <p className="text-lg text-violet-200 font-medium mb-8">Join the skill revolution. Teach, learn, and grow together.</p>
        <Link href="/register">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-violet-600 font-bold text-lg shadow-xl shadow-violet-500/30 transition-all">
            Get Started for Free
            <ArrowRight className="w-5 h-5" />
          </motion.div>
        </Link>
      </section>
    </div>
  );
}