import { Link } from "wouter";
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, Users, Star, ShieldCheck, Zap, TrendingUp, Sparkles, Globe, Heart, Play, CheckCircle, Code2, Palette, Languages, Brain, Trophy, MessageSquare, Flame, Target, Award, Wallet, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useEffect, useState } from "react";

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
        if (charIdx - 1 === 0) { setDeleting(false); setWordIdx(i => (i + 1) % words.length); setCharIdx(0); }
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
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) setStarted(true); }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [started]);
  useEffect(() => {
    if (!started) return;
    let s = 0; const step = target / 60;
    const t = setInterval(() => { s += step; if (s >= target) { setCount(target); clearInterval(t); } else setCount(Math.floor(s)); }, 16);
    return () => clearInterval(t);
  }, [started, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function MouseGlow() {
  const x = useMotionValue(0); const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 80, damping: 20 }); const sy = useSpring(y, { stiffness: 80, damping: 20 });
  useEffect(() => {
    const h = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener("mousemove", h); return () => window.removeEventListener("mousemove", h);
  }, [x, y]);
  return <motion.div className="fixed top-0 left-0 pointer-events-none z-0 w-[600px] h-[600px] rounded-full" style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)" }} />;
}

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  x: Math.random() * 100, y: Math.random() * 100,
  size: Math.random() * 5 + 2,
  color: ["#6366f1","#8b5cf6","#06b6d4","#a78bfa","#38bdf8","#f59e0b"][i % 6] + "55",
  dur: Math.random() * 5 + 4,
}));

const TESTIMONIALS = [
  { name: "Priya Sharma", role: "Python Learner → ML Engineer at Infosys", avatar: "PS", text: "I learned Python in 6 weeks by teaching Excel! SkillSwap completely changed my career trajectory.", rating: 5, streak: 45 },
  { name: "Rahul Verma", role: "Web Dev → Freelancer ₹50K/month", avatar: "RV", text: "Got my first ₹50K freelance project after learning React here. The credit system is pure genius!", rating: 5, streak: 30 },
  { name: "Sneha Patel", role: "English Learner → Content Creator", avatar: "SP", text: "My English improved so much! Native speakers helped me and it was completely FREE. Unbelievable!", rating: 5, streak: 62 },
  { name: "Arjun Kumar", role: "DSA → Google SWE L4", avatar: "AK", text: "Cracked my Google interview after DSA sessions on SkillSwap. Best platform for Indian students!", rating: 5, streak: 90 },
];

const SKILLS = [
  { icon: Code2, label: "Python", color: "from-blue-500/20 to-blue-600/5 border-blue-500/25", users: "2.3K" },
  { icon: Globe, label: "English", color: "from-green-500/20 to-green-600/5 border-green-500/25", users: "1.8K" },
  { icon: Palette, label: "UI/UX Design", color: "from-pink-500/20 to-pink-600/5 border-pink-500/25", users: "980" },
  { icon: Brain, label: "DSA / CP", color: "from-purple-500/20 to-purple-600/5 border-purple-500/25", users: "1.1K" },
  { icon: Code2, label: "React / Next.js", color: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/25", users: "1.4K" },
  { icon: Languages, label: "Spanish", color: "from-orange-500/20 to-orange-600/5 border-orange-500/25", users: "450" },
  { icon: Trophy, label: "Photography", color: "from-yellow-500/20 to-yellow-600/5 border-yellow-500/25", users: "320" },
  { icon: MessageSquare, label: "Public Speaking", color: "from-red-500/20 to-red-600/5 border-red-500/25", users: "540" },
];

const FEATURES = [
  { icon: Zap, emoji: "⚡", title: "Credit Economy", desc: "Teach 1 hour = Earn 10 credits. Use credits to learn ANY skill. No money needed — perfect for students.", tag: "Most Popular", color: "from-indigo-500/15 to-indigo-600/5 border-indigo-500/20", iconColor: "text-indigo-500" },
  { icon: Brain, emoji: "🤖", title: "AI Skill Matching", desc: "Our AI matches you with the perfect learning partner. 'Aditya teaches React, Priya teaches English' — Instant match!", tag: "AI-Powered", color: "from-purple-500/15 to-purple-600/5 border-purple-500/20", iconColor: "text-purple-500" },
  { icon: Award, emoji: "🏆", title: "Verified Badges", desc: "Take skill tests and earn verified badges. Verified Python Dev, Verified Designer — build credibility fast.", tag: "Trust Builder", color: "from-yellow-500/15 to-yellow-600/5 border-yellow-500/20", iconColor: "text-yellow-500" },
  { icon: Flame, emoji: "🔥", title: "Learning Streaks", desc: "7-day streak, 30-day streak, 90-day legend! Gamified learning keeps you consistent and motivated daily.", tag: "Gamified", color: "from-orange-500/15 to-orange-600/5 border-orange-500/20", iconColor: "text-orange-500" },
  { icon: Target, emoji: "🎯", title: "Real Project Exchange", desc: "Not just learning — exchange real work! I'll design your logo, you build my portfolio. Real value.", tag: "Unique", color: "from-green-500/15 to-green-600/5 border-green-500/20", iconColor: "text-green-500" },
  { icon: Users, emoji: "📍", title: "Local Community", desc: "Connect with nearby learners. Greater Noida meetups, Jaipur groups — learn online AND offline together.", tag: "Community", color: "from-cyan-500/15 to-cyan-600/5 border-cyan-500/20", iconColor: "text-cyan-500" },
];

export default function Landing() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll();
  const headerY = useTransform(scrollYProgress, [0, 0.3], ["0%", "-10%"]);
  const typed = useTypewriter(["Python 🐍", "English 🌍", "React ⚛️", "DSA 🧠", "Design 🎨", "Spanish 🌎", "Photography 📸"], 70, 1600);
  const [activeT, setActiveT] = useState(0);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setActiveT(i => (i + 1) % TESTIMONIALS.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div ref={ref} className="relative flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden">
      <MouseGlow />

      {/* ══════════ HERO ══════════ */}
      <section className="relative min-h-[calc(100vh-80px)] flex flex-col px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Particles */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {PARTICLES.map((p, i) => (
            <motion.div key={i} className="absolute rounded-full"
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, background: p.color }}
              animate={{ y: [-20, 20, -20], x: [-10, 10, -10], opacity: [0.3, 0.9, 0.3] }}
              transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }} />
          ))}
        </div>

        {/* Blobs */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {[
            { cls: "absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/10 blur-3xl", dur: 8 },
            { cls: "absolute top-[15%] -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-400/15 to-blue-500/10 blur-3xl", dur: 11 },
            { cls: "absolute bottom-[-15%] left-[15%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-violet-400/15 to-fuchsia-400/10 blur-3xl", dur: 9 },
          ].map((b, i) => (
            <motion.div key={i} className={b.cls}
              animate={{ scale: [1, 1.15, 1], rotate: [0, i % 2 === 0 ? 10 : -10, 0] }}
              transition={{ duration: b.dur, repeat: Infinity, ease: "easeInOut", delay: i * 2 }} />
          ))}
        </div>

        {/* Grid */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.025]"
          style={{ backgroundImage: "linear-gradient(#6366f1 1px,transparent 1px),linear-gradient(90deg,#6366f1 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

        <motion.div style={{ y: headerY }} className="relative z-10 flex-1 flex flex-col justify-center max-w-6xl mx-auto py-16 lg:py-20 w-full">
          <motion.div initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }}
            className="text-center max-w-5xl mx-auto">

            {/* Live badge */}
            <motion.div variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300 } } }}>
              <motion.div whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-primary/25 bg-primary/8 text-primary font-semibold text-sm mb-8 backdrop-blur-md shadow-lg cursor-default">
                <motion.span className="w-2.5 h-2.5 rounded-full bg-green-400"
                  animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                <Star className="w-4 h-4 fill-primary" />
                10,000+ learners — Zero Money Needed
                <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.2, repeat: Infinity }} className="ml-1">→</motion.span>
              </motion.div>
            </motion.div>

            {/* Main heading */}
            <motion.h1
              variants={{ hidden: { opacity: 0, y: 60 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 180, damping: 18 } } }}
              className="text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-tight mb-5 leading-[1.05]"
              style={{ fontFamily: "Outfit, sans-serif" }}>
              <span className="text-foreground">Learn </span>
              <span className="relative inline-block min-w-[200px]">
                <motion.span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent"
                  animate={{ filter: ["hue-rotate(0deg)", "hue-rotate(30deg)", "hue-rotate(0deg)"] }}
                  transition={{ duration: 4, repeat: Infinity }}>
                  {typed}
                </motion.span>
                <motion.span className="text-primary ml-0.5" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.7, repeat: Infinity }}>|</motion.span>
              </span>
              <br />
              <span className="text-foreground">by </span>
              <motion.span className="text-primary"
                animate={{ textShadow: ["0 0 20px rgba(99,102,241,0)", "0 0 40px rgba(99,102,241,0.4)", "0 0 20px rgba(99,102,241,0)"] }}
                transition={{ duration: 2.5, repeat: Infinity }}>
                Teaching.
              </motion.span>
            </motion.h1>

            {/* Tagline */}
            <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 mb-5">
              <span className="text-base md:text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                "Exchange Skills, Not Money."
              </span>
            </motion.div>

            {/* Subtext */}
            <motion.p variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}
              className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The first peer-to-peer skill economy.{" "}
              <span className="text-foreground font-semibold">Teach what you know</span> → earn credits →{" "}
              <span className="text-foreground font-semibold">learn anything</span> from experts.{" "}
              <span className="text-primary font-bold">₹0 cost. Always.</span>
            </motion.p>

            {/* CTAs */}
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
              <Link href="/register">
                <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}>
                  <Button className="w-full sm:w-auto h-14 px-10 rounded-full text-base font-bold shadow-2xl shadow-primary/30 bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600 border-0 relative overflow-hidden group">
                    <motion.div className="absolute inset-0 bg-white/15 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
                    Start Free — Get 200 Credits 🎁
                    <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
                      <ArrowRight className="ml-2 w-5 h-5 text-white" />
                    </motion.span>
                  </Button>
                </motion.div>
              </Link>
              <Link href="/explore">
                <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" className="w-full sm:w-auto h-14 px-10 rounded-full text-base font-bold border-primary/30 hover:bg-primary/5 hover:border-primary/50 backdrop-blur-sm">
                    <Play className="mr-2 w-4 h-4 fill-primary text-primary" /> Browse Skills
                  </Button>
                </motion.div>
              </Link>
            </motion.div>

            {/* Animated counters */}
            <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.5 } } }}
              className="grid grid-cols-4 gap-4 max-w-lg mx-auto mb-16">
              {[
                { value: 10000, suffix: "+", label: "Learners" },
                { value: 500, suffix: "+", label: "Skills" },
                { value: 98, suffix: "%", label: "Satisfaction" },
                { label: "Cost", special: "₹0" },
              ].map((s, i) => (
                <motion.div key={s.label}
                  variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                  whileHover={{ scale: 1.12 }} className="text-center cursor-default">
                  <div className="text-2xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {s.special ? s.special : <Counter target={s.value!} suffix={s.suffix} />}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium mt-1">{s.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Skill pills */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
            className="flex flex-wrap justify-center gap-3 mb-10 px-4">
            {SKILLS.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + i * 0.07 }}
                whileHover={{ scale: 1.12, y: -5 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border bg-gradient-to-r ${s.color} text-sm font-medium backdrop-blur-sm cursor-default`}>
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
                <span className="text-xs text-muted-foreground ml-1">{s.users}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Hero feature cards */}
          <motion.div initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.7 } } }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Zap, color: "text-primary", bg: "from-primary/15 to-primary/5", badge: "⚡ Credit Economy", title: "Teach to Earn", desc: "Teach 1 hour → Earn 10 credits → Learn any skill. No money. Just skills.", popular: false },
              { icon: Brain, color: "text-purple-500", bg: "from-purple-400/15 to-purple-400/5", badge: "🤖 AI Matching", title: "Smart Pairing", desc: "AI finds your perfect learning partner instantly. Teach React, learn English — matched in seconds.", popular: true },
              { icon: Award, color: "text-yellow-500", bg: "from-yellow-400/15 to-yellow-400/5", badge: "🏆 Get Verified", title: "Build Credibility", desc: "Pass skill tests, earn verified badges, build your portfolio. Stand out to employers.", popular: false },
            ].map((f, i) => (
              <motion.div key={f.title}
                variants={{ hidden: { opacity: 0, y: 60 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                whileHover={{ y: -10, boxShadow: "0 30px 60px rgba(99,102,241,0.15)" }}
                className={`glass-card relative cursor-default transition-all duration-300 ${f.popular ? "border-primary/40 ring-1 ring-primary/20" : ""}`}>
                {f.popular && (
                  <motion.div animate={{ opacity: [0.8, 1, 0.8] }} transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-lg whitespace-nowrap">
                    ⭐ Most Popular
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: 1.15, rotate: 8 }}
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.bg} flex items-center justify-center mb-5`}>
                  <f.icon className={`w-7 h-7 ${f.color}`} />
                </motion.div>
                <div className="text-xs font-bold text-muted-foreground mb-2">{f.badge}</div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════ THE UNICORN FEATURE: HOW ESCROW WORKS (Apple Style) ══════════ */}
      <section className="py-24 relative z-10 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-600 text-sm font-semibold mb-4">
              <ShieldCheck className="w-4 h-4" /> 100% Safe & Secure
            </span>
            <h2 className="text-3xl md:text-5xl font-black mb-4">How SkillSwap Works</h2>
            <p className="text-xl text-muted-foreground">A transparent, credit-based escrow economy. 1 Credit = ₹1.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="p-8 rounded-3xl bg-background border border-border shadow-xl relative overflow-hidden group">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Wallet className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3">1. Earn Credits</h3>
              <p className="text-muted-foreground leading-relaxed">Sign up and instantly get <strong>200 Free Credits</strong>. Want more? Just teach your skills to someone else. 1 hour = 10 Credits.</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }} className="p-8 rounded-3xl bg-background border border-border shadow-xl relative overflow-hidden group">
              <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Lock className="w-8 h-8 text-purple-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3">2. Secure Escrow</h3>
              <p className="text-muted-foreground leading-relaxed">When you book a mentor, your credits are <strong>locked securely</strong>. They are only released when both parties complete the session via our OTP system.</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="p-8 rounded-3xl bg-background border border-border shadow-xl relative overflow-hidden group">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3">3. Learn or Withdraw</h3>
              <p className="text-muted-foreground leading-relaxed">Use your earned credits to learn new skills from others, OR <strong>withdraw them directly to your UPI</strong> bank account!</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════ 6 FEATURES GRID ══════════ */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 bg-background relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #6366f1 1px, transparent 0)", backgroundSize: "40px 40px" }} />
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              <Sparkles className="w-4 h-4" /> Everything You Need
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Why SkillSwap Wins</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">6 powerful features that make learning free, fun, and effective.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                onHoverStart={() => setHoveredFeature(i)}
                onHoverEnd={() => setHoveredFeature(null)}
                className={`card-premium cursor-default transition-all duration-300 relative overflow-hidden bg-gradient-to-br ${f.color} group`}>
                <motion.div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{f.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">{f.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-background/60 text-muted-foreground font-medium">{f.tag}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ TESTIMONIALS ══════════ */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 relative overflow-hidden bg-muted/20">
        <motion.div className="absolute -top-40 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none"
          animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 8, repeat: Infinity }} />
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-sm font-semibold mb-4">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> Real Stories
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-3">Loved by Learners</h2>
            <div className="flex justify-center gap-1 mb-1">{Array.from({length:5}).map((_,i)=><Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400"/>)}</div>
            <p className="text-muted-foreground">4.9/5 from 2,000+ reviews</p>
          </motion.div>
          <div className="relative" style={{ minHeight: 220 }}>
            <AnimatePresence mode="wait">
              <motion.div key={activeT}
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -60, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="card-premium p-8 text-center bg-background">
                <div className="flex justify-center gap-1 mb-4">
                  {Array.from({length:TESTIMONIALS[activeT].rating}).map((_,i)=><Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400"/>)}
                </div>
                <p className="text-lg font-medium mb-4 italic">"{TESTIMONIALS[activeT].text}"</p>
                <div className="flex items-center justify-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                    {TESTIMONIALS[activeT].avatar}
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">{TESTIMONIALS[activeT].name}</div>
                    <div className="text-xs text-muted-foreground">{TESTIMONIALS[activeT].role}</div>
                  </div>
                  <div className="ml-3 flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold">
                    <Flame className="w-3 h-3" /> {TESTIMONIALS[activeT].streak} day streak
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex justify-center gap-2 mt-5">
            {TESTIMONIALS.map((_,i)=>(
              <button key={i} onClick={()=>setActiveT(i)}
                className={`rounded-full transition-all duration-300 ${i===activeT?"w-6 h-2 bg-primary":"w-2 h-2 bg-muted-foreground/30"}`}/>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ BOTTOM CTA ══════════ */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 relative overflow-hidden bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto text-center bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700 rounded-3xl p-12 md:p-16 text-white relative overflow-hidden shadow-2xl shadow-primary/30">
          {["-top-20 -right-20","-bottom-20 -left-20"].map((pos,i)=>(
            <motion.div key={i} className={`absolute ${pos} w-80 h-80 rounded-full bg-white/10 blur-3xl`}
              animate={{scale:[1,1.3,1],opacity:[0.3,0.5,0.3]}} transition={{duration:4+i,repeat:Infinity,delay:i}}/>
          ))}
          <div className="relative z-10">
            <motion.div animate={{rotate:[0,15,-15,0],scale:[1,1.1,1]}} transition={{duration:3,repeat:Infinity}}>
              <Sparkles className="w-14 h-14 mx-auto mb-6 text-white/80"/>
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Start Your Journey Today</h2>
            <p className="text-white/80 text-lg mb-2 max-w-xl mx-auto">
              Join 10,000+ learners. Get <span className="font-bold text-white bg-white/20 px-2 py-0.5 rounded-lg">200 free credits</span> instantly!
            </p>
            <p className="text-white/60 text-base mb-8 font-semibold italic">"Teach One Skill. Learn Any Skill."</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-white/70 mb-8">
              {["No credit card","No hidden fees","Cancel anytime","Free forever"].map(t=>(
                <div key={t} className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-300"/>{t}</div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <motion.div whileHover={{scale:1.06}} whileTap={{scale:0.95}} className="inline-block">
                  <Button className="h-14 px-10 rounded-full text-base font-bold bg-white text-primary hover:bg-white/90 shadow-xl">
                    Get Started Free 🚀 <ArrowRight className="ml-2 w-5 h-5"/>
                  </Button>
                </motion.div>
              </Link>
              <Link href="/explore">
                <motion.div whileHover={{scale:1.06}} whileTap={{scale:0.95}} className="inline-block">
                  <Button variant="outline" className="h-14 px-10 rounded-full text-base font-bold border-white/30 text-white hover:bg-white/10">
                    Browse Skills
                  </Button>
                </motion.div>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
