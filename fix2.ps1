# SkillSwap Fix Script v2
# Run: cd C:\Users\alc\skillswap   then   .\fix2.ps1

# ---- 1. LANDING PAGE ----
$landing = @'
import { Link } from "wouter";
import { motion, Variants, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { ArrowRight, BookOpen, Users, Star, ShieldCheck, Zap, TrendingUp, Award, Sparkles, Globe, Heart, Play, CheckCircle, Quote, ChevronRight, Code, Palette, Music, Brain, Camera, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useEffect, useState } from "react";

function useTypewriter(words: string[], speed = 80, pause = 1800) {
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
        if (charIdx - 1 === 0) { setDeleting(false); setWordIdx(w => (w + 1) % words.length); setCharIdx(0); }
        else setCharIdx(c => c - 1);
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);
  return display;
}

function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) {
        setStarted(true);
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration, started]);
  return { count, ref };
}

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] = [];
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < 80; i++) {
      particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, r: Math.random() * 2 + 0.5, alpha: Math.random() * 0.5 + 0.1 });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(91,91,246,${p.alpha})`; ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x; const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(91,91,246,${0.08 * (1 - dist / 100)})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

function MouseGlow() {
  const x = useMotionValue(0); const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 80, damping: 20 });
  const springY = useSpring(y, { stiffness: 80, damping: 20 });
  useEffect(() => {
    const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);
  return (
    <motion.div className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none z-0"
      style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%", background: "radial-gradient(circle, rgba(91,91,246,0.06) 0%, transparent 70%)" }} />
  );
}

function StatCard({ value, suffix, label, icon: Icon }: { value: number; suffix: string; label: string; icon: React.ElementType }) {
  const { count, ref } = useCounter(value);
  return (
    <motion.div ref={ref} whileHover={{ y: -4, scale: 1.03 }}
      className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm cursor-default">
      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="text-3xl font-black text-foreground tabular-nums">{count.toLocaleString()}{suffix}</div>
      <div className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wide">{label}</div>
    </motion.div>
  );
}

export default function Landing() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const typeText = useTypewriter(["Python", "Design", "Music", "DSA", "Web Dev", "AI / ML", "Chess", "Marketing"], 70, 1600);

  const container: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 240, damping: 22 } },
  };

  const features = [
    { icon: Zap, color: "#5B5BF6", bg: "from-indigo-500/20 to-indigo-500/5", badge: "Earn Credits", title: "Teach to Earn", desc: "Share your expertise. Earn credits for every session you teach.", points: ["Set your own price", "Flexible schedule", "Build reputation"] },
    { icon: BookOpen, color: "#06b6d4", bg: "from-cyan-500/20 to-cyan-500/5", badge: "Most Popular", title: "Learn Anything", desc: "Book 1-on-1 sessions with verified experts in any skill.", points: ["200 free credits on signup", "Real-time sessions", "Guaranteed quality"], popular: true },
    { icon: ShieldCheck, color: "#a855f7", bg: "from-purple-500/20 to-purple-500/5", badge: "Verified", title: "Trusted Platform", desc: "Every mentor is rated and reviewed by real learners.", points: ["Trust score system", "Session recordings", "Money-back protection"] },
  ];

  const skills = [
    { icon: Code, label: "Coding", color: "#5B5BF6" },
    { icon: Palette, label: "Design", color: "#ec4899" },
    { icon: Music, label: "Music", color: "#f59e0b" },
    { icon: Brain, label: "AI / ML", color: "#10b981" },
    { icon: Camera, label: "Photography", color: "#ef4444" },
    { icon: MessageCircle, label: "English", color: "#3b82f6" },
    { icon: Globe, label: "Languages", color: "#8b5cf6" },
    { icon: TrendingUp, label: "Marketing", color: "#f97316" },
  ];

  const testimonials = [
    { name: "Rahul Sharma", role: "Python to Web Dev", avatar: "RS", text: "Learned React in 2 weeks through SkillSwap. My mentor was incredible, better than any Udemy course I have taken.", rating: 5 },
    { name: "Priya Patel", role: "Design Mentor", avatar: "PP", text: "I teach Figma on SkillSwap and have earned 2000+ credits. Now I am learning DSA for free with those credits!", rating: 5 },
    { name: "Arjun Singh", role: "DSA Learner", avatar: "AS", text: "Got into a FAANG company after 3 months of DSA sessions on SkillSwap. The peer learning format actually works.", rating: 5 },
  ];

  const howItWorks = [
    { step: "01", icon: Sparkles, title: "Sign Up Free", desc: "Create your account and get 200 bonus credits instantly, no credit card needed." },
    { step: "02", icon: BookOpen, title: "List Your Skills", desc: "Tell us what you can teach and what you want to learn. Set your own price." },
    { step: "03", icon: Users, title: "Match & Connect", desc: "Our smart algorithm matches you with the best mentor or student for your needs." },
    { step: "04", icon: Award, title: "Grow & Earn", desc: "Complete sessions, earn credits, build your trust score, become a verified expert." },
  ];

  return (
    <div className="relative flex flex-col overflow-x-hidden">
      <MouseGlow />

      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 z-0"><ParticleField /></div>
        <div className="absolute inset-0 z-0 pointer-events-none">
          <motion.div animate={{ scale: [1, 1.15, 1], rotate: [0, 8, 0], x: [0, 30, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-indigo-500/15 to-purple-500/10 blur-3xl" />
          <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, -8, 0], x: [0, -20, 0] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-400/12 to-blue-500/8 blur-3xl" />
        </div>

        <motion.div style={{ y: heroY }} className="relative z-10 flex-1 flex flex-col justify-center max-w-6xl mx-auto pt-20 pb-10 lg:pt-24 lg:pb-16 w-full">
          <motion.div initial="hidden" animate="show" variants={container} className="text-center max-w-5xl mx-auto">

            <motion.div variants={item}>
              <motion.div whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-primary/20 bg-primary/10 text-primary font-semibold text-sm mb-8 backdrop-blur-md shadow-lg cursor-default">
                <motion.span animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                India's #1 peer-to-peer skill exchange platform
                <ChevronRight className="w-3.5 h-3.5" />
              </motion.div>
            </motion.div>

            <motion.h1 variants={item}
              className="text-5xl md:text-7xl lg:text-[5.5rem] font-black tracking-tight mb-4 leading-[1.2]"
              style={{ fontFamily: "Outfit, sans-serif" }}>
              {"Learn "}
              <span style={{ display: "inline-block", minWidth: "8ch", verticalAlign: "bottom" }}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-500 to-cyan-500">
                  {typeText || "\u00A0"}
                </span>
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ display: "inline-block", width: "3px", height: "0.8em", background: "currentColor", marginLeft: "2px", verticalAlign: "middle", borderRadius: "2px" }}
                  className="text-primary"
                />
              </span>
              <br />
              <span className="text-foreground">from real people.</span>
            </motion.h1>

            <motion.p variants={item} className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The world's first{" "}
              <span className="text-foreground font-semibold">peer-to-peer skill economy</span>.
              Teach what you know to earn credits. Spend credits to learn anything, from anyone.
            </motion.p>

            <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
              <Link href="/register">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Button className="w-full sm:w-auto h-14 px-10 rounded-full text-base font-bold bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 shadow-xl shadow-primary/25 border-0">
                    Start Learning Free
                    <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </motion.span>
                  </Button>
                </motion.div>
              </Link>
              <Link href="/explore">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Button variant="outline" className="w-full sm:w-auto h-14 px-10 rounded-full text-base font-bold border-border/60 hover:bg-primary/5 hover:border-primary/40 backdrop-blur-sm">
                    <Play className="mr-2 w-4 h-4 fill-current" />
                    See How It Works
                  </Button>
                </motion.div>
              </Link>
            </motion.div>

            <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground mb-16">
              {["200 free credits on signup", "No credit card", "Cancel anytime"].map((t, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />{t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-3 mb-14">
            {skills.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.07 }} whileHover={{ y: -4, scale: 1.08 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/60 border border-border/60 backdrop-blur-sm cursor-default shadow-sm">
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
                <span className="text-sm font-medium">{s.label}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15, delayChildren: 0.7 } } }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <motion.div key={f.title}
                variants={{ hidden: { opacity: 0, y: 50 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                whileHover={{ y: -8 }}
                className={`relative p-7 rounded-2xl bg-background/60 border backdrop-blur-md transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/10 cursor-default ${f.popular ? "border-primary/40" : "border-border/50"}`}>
                {f.popular && (
                  <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-violet-600 text-white text-[11px] font-bold shadow-lg">
                    Most Popular
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.bg} flex items-center justify-center mb-5`}>
                  <f.icon className="w-6 h-6" style={{ color: f.color }} />
                </div>
                <div className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold mb-3"
                  style={{ background: `${f.color}18`, color: f.color }}>{f.badge}</div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{f.desc}</p>
                <ul className="space-y-1.5">
                  {f.points.map(p => (
                    <li key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* STATS */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-muted/20 border-y border-border/40">
        <div className="max-w-5xl mx-auto">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-10">
            Trusted by learners across India
          </motion.p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard value={10000} suffix="+" label="Learners" icon={Users} />
            <StatCard value={500} suffix="+" label="Skills" icon={BookOpen} />
            <StatCard value={98} suffix="%" label="Satisfaction" icon={Heart} />
            <StatCard value={200} suffix=" cr" label="Free on Signup" icon={Sparkles} />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">Simple Process</div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">How SkillSwap Works</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">From signup to your first session in under 5 minutes.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            {howItWorks.map((step, i) => (
              <motion.div key={step.step} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.15 }} whileHover={{ y: -6 }}
                className="relative p-6 rounded-2xl bg-background border border-border/50 text-center cursor-default hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                <div className="absolute top-4 right-4 text-4xl font-black text-primary/8">{step.step}</div>
                <h3 className="text-base font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 bg-muted/20 border-y border-border/40">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">Testimonials</div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Real People, Real Results</h2>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
              <span className="ml-2 text-sm text-muted-foreground font-medium">4.9/5 from 500+ reviews</span>
            </div>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.15 }} whileHover={{ y: -5 }}
                className="p-7 rounded-2xl bg-background border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-default relative">
                <Quote className="w-8 h-8 text-primary/20 mb-4" />
                <p className="text-sm leading-relaxed text-muted-foreground mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white text-sm font-bold">{t.avatar}</div>
                  <div><p className="font-bold text-sm">{t.name}</p><p className="text-xs text-muted-foreground">{t.role}</p></div>
                  <div className="ml-auto flex gap-0.5">
                    {[...Array(t.rating)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-4 sm:px-6 lg:px-8 py-28">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto text-center relative overflow-hidden rounded-3xl p-14 md:p-20"
          style={{ background: "linear-gradient(135deg, #5B5BF6 0%, #7c3aed 50%, #06b6d4 100%)" }}>
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 4, repeat: Infinity }}
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 6, repeat: Infinity, delay: 1 }}
            className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-black/15 blur-3xl" />
          <div className="relative z-10">
            <motion.div animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity }}>
              <Sparkles className="w-14 h-14 mx-auto mb-6 text-white/80" />
            </motion.div>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-5 leading-tight">Your next skill is<br />one session away.</h2>
            <p className="text-white/75 text-lg mb-10 max-w-xl mx-auto">Join SkillSwap today. Get 200 free credits. No credit card required.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} className="inline-block">
                  <Button className="h-14 px-10 rounded-full text-base font-bold bg-white text-primary hover:bg-white/90 shadow-2xl">
                    Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </motion.div>
              </Link>
              <Link href="/explore">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} className="inline-block">
                  <Button variant="outline" className="h-14 px-10 rounded-full text-base font-bold border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
                    Browse Mentors
                  </Button>
                </motion.div>
              </Link>
            </div>
            <p className="text-white/50 text-sm mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-white font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
'@
[System.IO.File]::WriteAllText("$pwd\src\pages\landing.tsx", $landing, [System.Text.Encoding]::UTF8)
Write-Host "landing.tsx DONE" -ForegroundColor Green

# ---- 2. FOOTER ----
$footer = @'
import { Link } from "wouter";
import { useState } from "react";
import { Github, Twitter, Linkedin, Mail, MapPin, ArrowRight, Users, BookOpen, Star, Zap } from "lucide-react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const handleNewsletter = (e: React.FormEvent) => { e.preventDefault(); if (email) { setSubscribed(true); setEmail(""); } };
  const stats = [
    { icon: Users, value: "10,000+", label: "Active Learners" },
    { icon: BookOpen, value: "500+", label: "Skills Available" },
    { icon: Star, value: "4.9/5", label: "Average Rating" },
    { icon: Zap, value: "Free", label: "Always Free" },
  ];
  const socials = [
    { icon: Twitter, href: "https://x.com/Aaadityapsingh", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com/in/aditya-pratap-singh00", label: "LinkedIn" },
    { icon: Github, href: "https://github.com/Adityahub404singh", label: "GitHub" },
    { icon: Mail, href: "mailto:singhaditya4560@gmail.com", label: "Email" },
  ];
  return (
    <footer className="border-t border-border/50 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="border-b border-border/30 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-primary/25 flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3L4 7.5V12C4 16.1 7.4 19.9 12 21C16.6 19.9 20 16.1 20 12V7.5L12 3Z" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <span className="text-xl font-black text-foreground">Skill<span className="text-primary">Swap</span></span>
                <div className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">Learn. Teach. Grow.</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The world's first peer-to-peer skill exchange economy. Teach what you know, learn what you need, completely free.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Get learning tips weekly</p>
              {subscribed ? (
                <div className="flex items-center gap-2 text-sm text-green-500 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Subscribed! Check your inbox.
                </div>
              ) : (
                <form onSubmit={handleNewsletter} className="flex gap-2">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required
                    className="flex-1 h-9 px-3 text-sm rounded-lg border border-border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                  <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
            <div className="flex gap-2">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="w-9 h-9 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-200">
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Platform</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[{href:"/explore",label:"Explore Skills"},{href:"/sessions",label:"My Sessions"},{href:"/wallet",label:"Wallet & Credits"},{href:"/dashboard",label:"Dashboard"},{href:"/ai",label:"SkillAI Assistant"},{href:"/register",label:"Get Started Free"}].map(l => (
                <li key={l.href}><Link href={l.href} className="hover:text-primary transition-colors flex items-center gap-1.5 group">
                  <span className="w-1 h-1 rounded-full bg-primary/30 group-hover:bg-primary transition-colors" />{l.label}
                </Link></li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Learn Free</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {["Learn Python","Learn JavaScript","Web Development","Learn English","DSA & Algorithms","Graphic Design"].map(l => (
                <li key={l}><Link href="/explore" className="hover:text-primary transition-colors flex items-center gap-1.5 group">
                  <span className="w-1 h-1 rounded-full bg-primary/30 group-hover:bg-primary transition-colors" />{l}
                </Link></li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Company</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[{href:"/terms",label:"Terms of Service"},{href:"/privacy-policy",label:"Privacy Policy"}].map(l => (
                <li key={l.href}><Link href={l.href} className="hover:text-primary transition-colors flex items-center gap-1.5 group">
                  <span className="w-1 h-1 rounded-full bg-primary/30 group-hover:bg-primary transition-colors" />{l.label}
                </Link></li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Contact</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="mailto:singhaditya4560@gmail.com" className="hover:text-primary transition-colors flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" />singhaditya4560@gmail.com
              </a></li>
              <li className="flex items-start gap-2"><MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>Lucknow, India</span></li>
            </ul>
            <div className="space-y-2 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><span className="text-green-500">&#x1F512;</span> SSL Secured</div>
              <div className="flex items-center gap-2"><span>&#x2764;&#xFE0F;</span> Made with love in India</div>
              <div className="flex items-center gap-2"><span>&#x26A1;</span> 99.9% Uptime SLA</div>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border/40">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span>&#169; 2026 SkillSwap. All rights reserved.</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
              <span>Available Worldwide</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" /> All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
'@
[System.IO.File]::WriteAllText("$pwd\src\components\footer.tsx", $footer, [System.Text.Encoding]::UTF8)
Write-Host "footer.tsx DONE" -ForegroundColor Green

# ---- 3. LAYOUT ----
$layout = @'
import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/store/auth";
import { useGetMe, useGetWallet } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { LogOut, Wallet, BookOpen, Compass, LayoutDashboard, User, Bot, Send, X, Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Footer from "@/components/footer";

function SkillSwapLogo({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 group flex-shrink-0">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-600 flex items-center justify-center shadow-md shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 3L4 7.5V12C4 16.1 7.4 19.9 12 21C16.6 19.9 20 16.1 20 12V7.5L12 3Z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="text-lg font-black tracking-tight text-foreground">Skill<span className="text-primary">Swap</span></span>
    </Link>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { token, logout } = useAuthStore();
  const apiOptions = useApiOptions();
  const [aiOpen, setAiOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([{ role: "ai", text: "Hi! I'm SkillAI. How can I help you learn today?" }]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [aiPulse, setAiPulse] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: user } = useGetMe({ ...apiOptions, query: { enabled: !!token, queryKey: [] } });
  const { data: wallet } = useGetWallet({ ...apiOptions, query: { enabled: !!token, queryKey: [] } });
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages]);
  useEffect(() => { const t = setTimeout(() => setAiPulse(false), 3000); return () => clearTimeout(t); }, []);
  const handleLogout = () => { logout(); setLocation("/"); };
  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAiMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setAiInput(""); setAiLoading(true);
    try {
      const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ message: userMsg }) });
      const data = await res.json();
      setAiMessages(prev => [...prev, { role: "ai", text: data.reply || "I am here to help!" }]);
    } catch { setAiMessages(prev => [...prev, { role: "ai", text: "Something went wrong. Please try again." }]); }
    finally { setAiLoading(false); }
  };
  const isLanding = location === "/";
  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/sessions", label: "Sessions", icon: BookOpen },
    { href: "/ai", label: "SkillAI", icon: Bot },
  ];
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <SkillSwapLogo href={token ? "/dashboard" : "/"} />
          {token ? (
            <>
              <nav className="hidden md:flex items-center gap-1 ml-2">
                {navLinks.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location === href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}>
                    <Icon className="w-4 h-4" />{label}
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-2 ml-auto">
                {wallet && (
                  <Link href="/wallet" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors">
                    <Wallet className="w-3.5 h-3.5" />{wallet.balance ?? 0} cr
                  </Link>
                )}
                <Link href="/profile" className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-violet-600 flex items-center justify-center text-white text-xs font-bold hover:opacity-90 transition-opacity">
                  {user?.name?.charAt(0)?.toUpperCase() ?? <User className="w-4 h-4" />}
                </Link>
                <button onClick={handleLogout} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 ml-auto">
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
              <Link href="/register" className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20">
                Get Started Free
              </Link>
            </div>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      {isLanding && <Footer />}
      {token && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end gap-3">
          {feedbackOpen && (
            <div className="w-72 rounded-2xl border border-border bg-background/95 backdrop-blur shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <span className="text-sm font-semibold">Send Feedback</span>
                <button onClick={() => setFeedbackOpen(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              {feedbackSent ? (
                <div className="p-6 text-center"><div className="text-2xl mb-2">&#x1F64F;</div><p className="text-sm font-medium">Thank you for your feedback!</p></div>
              ) : (
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">How would you rate SkillSwap?</p>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(r => (
                        <button key={r} onClick={() => setFeedbackRating(r)} className="transition-transform hover:scale-110">
                          <Star className={`w-6 h-6 ${r <= feedbackRating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Tell us what you think..."
                    className="w-full h-20 text-xs px-3 py-2 rounded-lg border border-border bg-muted/30 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <button onClick={() => { if (feedbackText.trim()) { setFeedbackSent(true); setFeedbackText(""); } }}
                    className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Submit Feedback</button>
                </div>
              )}
            </div>
          )}
          {aiOpen && (
            <div className="w-80 rounded-2xl border border-border bg-background/95 backdrop-blur shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-violet-500/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
                  <div><span className="text-sm font-semibold">SkillAI</span><div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /><span className="text-[10px] text-muted-foreground">Online</span></div></div>
                </div>
                <button onClick={() => setAiOpen(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <div className="h-64 overflow-y-auto p-3 space-y-2 bg-muted/10">
                {aiMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted text-foreground rounded-bl-none"}`}>{m.text}</div>
                  </div>
                ))}
                {aiLoading && <div className="flex justify-start"><div className="bg-muted px-3 py-2 rounded-xl rounded-bl-none text-xs text-muted-foreground">Thinking...</div></div>}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 border-t border-border flex gap-2 bg-background">
                <Input placeholder="Ask SkillAI..." value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendAiMessage()} className="text-xs h-8 rounded-full" />
                <Button size="sm" onClick={sendAiMessage} disabled={aiLoading} className="rounded-full h-8 w-8 p-0 flex-shrink-0 bg-gradient-to-r from-primary to-violet-600"><Send className="w-3 h-3" /></Button>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setFeedbackOpen(!feedbackOpen); setAiOpen(false); }}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-200">
              <MessageSquare className="w-5 h-5 text-white" />
            </button>
            <div className="relative">
              {aiPulse && <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />}
              <button onClick={() => { setAiOpen(!aiOpen); setFeedbackOpen(false); }}
                className="relative w-12 h-12 rounded-full bg-gradient-to-r from-primary to-violet-600 flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-200">
                <Bot className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
      {token && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/50">
          <nav className="flex items-center justify-around h-16 px-2">
            {[...navLinks, { href: "/wallet", label: "Wallet", icon: Wallet }].map(({ href, label, icon: Icon }) => {
              const isActive = location === href;
              return (
                <Link key={href} href={href} className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="w-5 h-5" /><span className="text-[10px] font-medium">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
'@
[System.IO.File]::WriteAllText("$pwd\src\components\layout.tsx", $layout, [System.Text.Encoding]::UTF8)
Write-Host "layout.tsx DONE" -ForegroundColor Green

Write-Host ""
Write-Host "=== ALL DONE — Ctrl+Shift+R browser mein ===" -ForegroundColor Cyan
