import { Link } from "wouter";
import { motion, Variants, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { ArrowRight, BookOpen, Users, Star, ShieldCheck, Zap, TrendingUp, Award, Sparkles, Globe, Heart, Play, CheckCircle, Quote, ChevronRight, Code, Palette, Music, Brain, Camera, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useEffect, useState } from "react";

// â”€â”€ Typewriter hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        if (charIdx + 1 === current.length) {
          setTimeout(() => setDeleting(true), pause);
        } else {
          setCharIdx(c => c + 1);
        }
      } else {
        setDisplay(current.slice(0, charIdx - 1));
        if (charIdx - 1 === 0) {
          setDeleting(false);
          setWordIdx(w => (w + 1) % words.length);
          setCharIdx(0);
        } else {
          setCharIdx(c => c - 1);
        }
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);

  return display;
}

// â”€â”€ Animated counter hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Particle canvas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(91,91,246,${p.alpha})`;
        ctx.fill();
      });

      // Draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(91,91,246,${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// â”€â”€ Mouse glow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MouseGlow() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 80, damping: 20 });
  const springY = useSpring(y, { stiffness: 80, damping: 20 });

  useEffect(() => {
    const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);

  return (
    <motion.div
      className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none z-0"
      style={{
        x: springX,
        y: springY,
        translateX: "-50%",
        translateY: "-50%",
        background: "radial-gradient(circle, rgba(91,91,246,0.06) 0%, transparent 70%)",
      }}
    />
  );
}

// â”€â”€ Stat card with counter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatCard({ value, suffix, label, icon: Icon }: { value: number; suffix: string; label: string; icon: React.ElementType }) {
  const { count, ref } = useCounter(value);
  return (
    <motion.div
      ref={ref}
      whileHover={{ y: -4, scale: 1.03 }}
      className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm cursor-default"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="text-3xl font-black text-foreground tabular-nums">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wide">{label}</div>
    </motion.div>
  );
}

// â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    {
      icon: Zap, color: "#5B5BF6", bg: "from-indigo-500/20 to-indigo-500/5",
      badge: "Earn Credits", title: "Teach to Earn",
      desc: "Share your expertise. Earn credits for every session you teach.",
      points: ["Set your own price", "Flexible schedule", "Build reputation"],
    },
    {
      icon: BookOpen, color: "#06b6d4", bg: "from-cyan-500/20 to-cyan-500/5",
      badge: "Most Popular", title: "Learn Anything",
      desc: "Book 1-on-1 sessions with verified experts in any skill.",
      points: ["200 free credits on signup", "Real-time sessions", "Guaranteed quality"],
      popular: true,
    },
    {
      icon: ShieldCheck, color: "#a855f7", bg: "from-purple-500/20 to-purple-500/5",
      badge: "Verified", title: "Trusted Platform",
      desc: "Every mentor is rated and reviewed by real learners.",
      points: ["Trust score system", "Session recordings", "Money-back protection"],
    },
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
    {
      name: "Rahul Sharma", role: "Python â†’ Web Dev", avatar: "RS",
      text: "Learned React in 2 weeks through SkillSwap. My mentor was incredible â€” better than any Udemy course I've taken.",
      rating: 5,
    },
    {
      name: "Priya Patel", role: "Design Mentor", avatar: "PP",
      text: "I teach Figma on SkillSwap and have earned 2000+ credits. Now I'm learning DSA for free with those credits!",
      rating: 5,
    },
    {
      name: "Arjun Singh", role: "DSA Learner", avatar: "AS",
      text: "Got into a FAANG company after 3 months of DSA sessions on SkillSwap. The peer learning format actually works.",
      rating: 5,
    },
  ];

  const howItWorks = [
    { step: "01", icon: Sparkles, title: "Sign Up Free", desc: "Create your account and get 200 bonus credits instantly â€” no credit card needed." },
    { step: "02", icon: BookOpen, title: "List Your Skills", desc: "Tell us what you can teach and what you want to learn. Set your own price." },
    { step: "03", icon: Users, title: "Match & Connect", desc: "Our smart algorithm matches you with the best mentor or student for your needs." },
    { step: "04", icon: Award, title: "Grow & Earn", desc: "Complete sessions, earn credits, build your trust score, become a verified expert." },
  ];

  return (
    <div className="relative flex flex-col overflow-hidden">
      <MouseGlow />

      {/* â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section ref={heroRef} className="relative min-h-[calc(100vh-80px)] flex flex-col px-4 sm:px-6 lg:px-8 overflow-hidden">

        {/* Particle background */}
        <div className="absolute inset-0 z-0">
          <ParticleField />
        </div>

        {/* Animated blobs */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.15, 1], rotate: [0, 8, 0], x: [0, 30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-indigo-500/15 to-purple-500/10 blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, -8, 0], x: [0, -20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-400/12 to-blue-500/8 blur-3xl"
          />
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-6xl mx-auto pt-8 pb-10 lg:pt-12 lg:pb-16 w-full">
          <motion.div initial="hidden" animate="show" variants={container} className="text-center max-w-5xl mx-auto">

            {/* Live badge */}
            <motion.div variants={item}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-primary/20 bg-primary/10 text-primary font-semibold text-sm mb-8 backdrop-blur-md shadow-lg cursor-default"
              >
                <motion.span
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-green-400 inline-block"
                />
                India's #1 peer-to-peer skill exchange platform
                <ChevronRight className="w-3.5 h-3.5" />
              </motion.div>
            </motion.div>

            {/* Heading with typewriter */}
            <motion.h1
              variants={item}
              className="text-5xl md:text-7xl lg:text-[5.5rem] font-black tracking-tight mb-4 leading-[1.02]"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Learn{" "}
              <span className="relative inline-block">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-500 to-cyan-500 animate-gradient-x">
                  {typeText}
                </span>
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block w-[3px] h-[0.85em] bg-primary ml-1 align-middle rounded-full"
                />
              </span>
              <br />
              <span className="text-foreground">from real people.</span>
            </motion.h1>

            {/* Subtext */}
            <motion.p variants={item} className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The world's first{" "}
              <span className="text-foreground font-semibold">peer-to-peer skill economy</span>.
              Teach what you know to earn credits.
              Spend credits to learn anything â€” from anyone.
            </motion.p>

            {/* CTAs */}
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

            {/* Trust row */}
            <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground mb-16">
              {["200 free credits on signup", "No credit card", "Cancel anytime"].map((t, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  {t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Floating skill chips */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-3 mb-14"
          >
            {skills.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.07 }}
                whileHover={{ y: -4, scale: 1.08 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/60 border border-border/60 backdrop-blur-sm cursor-default shadow-sm"
              >
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
                <span className="text-sm font-medium">{s.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Feature cards */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15, delayChildren: 0.7 } } }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={{ hidden: { opacity: 0, y: 50 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                whileHover={{ y: -8 }}
                className={`relative p-7 rounded-2xl bg-background/60 border backdrop-blur-md transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/10 cursor-default ${f.popular ? 'border-primary/40' : 'border-border/50'}`}
              >
                {f.popular && (
                  <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-violet-600 text-white text-[11px] font-bold shadow-lg">
                    â­ Most Popular
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.bg} flex items-center justify-center mb-5`}>
                  <f.icon className="w-6 h-6" style={{ color: f.color }} />
                </div>
                <div className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold mb-3"
                  style={{ background: `${f.color}18`, color: f.color }}>
                  {f.badge}
                </div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{f.desc}</p>
                <ul className="space-y-1.5">
                  {f.points.map(p => (
                    <li key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* â”€â”€ STATS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-muted/20 border-y border-border/40">
        <div className="max-w-5xl mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-10"
          >
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

      {/* â”€â”€ HOW IT WORKS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">Simple Process</div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">How SkillSwap Works</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">From signup to your first session in under 5 minutes.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            {howItWorks.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -6 }}
                className="relative p-6 rounded-2xl bg-background border border-border/50 text-center cursor-default hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
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

      {/* â”€â”€ TESTIMONIALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 bg-muted/20 border-y border-border/40">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-4">Testimonials</div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Real People, Real Results</h2>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
              <span className="ml-2 text-sm text-muted-foreground font-medium">4.9/5 from 500+ reviews</span>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -5 }}
                className="p-7 rounded-2xl bg-background border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-default relative"
              >
                <Quote className="w-8 h-8 text-primary/20 mb-4" />
                <p className="text-sm leading-relaxed text-muted-foreground mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {[...Array(t.rating)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ FINAL CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="px-4 sm:px-6 lg:px-8 py-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto text-center relative overflow-hidden rounded-3xl p-14 md:p-20"
          style={{ background: "linear-gradient(135deg, #5B5BF6 0%, #7c3aed 50%, #06b6d4 100%)" }}
        >
          {/* Decorative circles */}
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 4, repeat: Infinity }}
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 6, repeat: Infinity, delay: 1 }}
            className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-black/15 blur-3xl" />

          <div className="relative z-10">
            <motion.div animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity }}>
              <Sparkles className="w-14 h-14 mx-auto mb-6 text-white/80" />
            </motion.div>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-5 leading-tight">
              Your next skill is<br />one session away.
            </h2>
            <p className="text-white/75 text-lg mb-10 max-w-xl mx-auto">
              Join SkillSwap today. Get 200 free credits. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} className="inline-block">
                  <Button className="h-14 px-10 rounded-full text-base font-bold bg-white text-primary hover:bg-white/90 shadow-2xl">
                    Get Started Free
                    <ArrowRight className="ml-2 w-5 h-5" />
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
              <Link href="/login" className="text-white font-semibold hover:underline">Sign in â†’</Link>
            </p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

