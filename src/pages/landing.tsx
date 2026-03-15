import { Link } from "wouter";
import { motion, Variants, useScroll, useTransform } from "framer-motion";
import { ArrowRight, BookOpen, Users, Star, ShieldCheck, Zap, TrendingUp, Award, Sparkles, Globe, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";

export default function Landing() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 40 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 260, damping: 20 }
    }
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 60 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
  };

  const stats = [
    { value: "10K+", label: "Learners", icon: Users },
    { value: "500+", label: "Skills", icon: BookOpen },
    { value: "98%", label: "Satisfaction", icon: Heart },
    { value: "Free", label: "Always", icon: Sparkles },
  ];

  const features = [
    {
      icon: Users, color: "primary", bg: "from-primary/20 to-primary/5",
      badge: { icon: Zap, text: "Earn Credits", color: "primary" },
      title: "Teach to Earn",
      desc: "Share your expertise. Earn",
      highlight: "10 credits",
      rest: "for every 1-hour session you teach."
    },
    {
      icon: BookOpen, color: "cyan-500", bg: "from-cyan-400/20 to-cyan-400/5",
      badge: { icon: TrendingUp, text: "Grow Skills", color: "cyan-600" },
      title: "Spend to Learn",
      desc: "Use credits to book sessions with experts and",
      highlight: "pick up new skills",
      rest: "fast.",
      popular: true
    },
    {
      icon: ShieldCheck, color: "violet-500", bg: "from-violet-400/20 to-violet-400/5",
      badge: { icon: Award, text: "Verified", color: "violet-600" },
      title: "Trusted Community",
      desc: "Every session is rated. Build your",
      highlight: "trust score",
      rest: "and become a verified expert."
    }
  ];

  const howItWorks = [
    { step: "01", title: "Sign Up Free", desc: "Create your account and get 200 bonus credits instantly.", icon: Sparkles },
    { step: "02", title: "List Your Skills", desc: "Tell us what you can teach and what you want to learn.", icon: BookOpen },
    { step: "03", title: "Start Exchanging", desc: "Book sessions, teach others, and grow your credit balance.", icon: TrendingUp },
    { step: "04", title: "Withdraw Earnings", desc: "Convert your credits to real money via UPI. 1 cr = ₹1.", icon: Globe },
  ];

  return (
    <div ref={ref} className="relative flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden">

      {/* ── HERO SECTION ── */}
      <section className="relative min-h-[calc(100vh-80px)] flex flex-col px-4 sm:px-6 lg:px-8 overflow-hidden">

        {/* Animated background blobs */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/10 blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-400/15 to-blue-500/10 blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-violet-400/10 to-fuchsia-400/10 blur-3xl"
          />
        </div>

        {/* Background image */}
        <motion.div style={{ y }} className="absolute inset-0 z-0">
          <img src="/images/hero-bg.png" alt="" className="w-full h-full object-cover opacity-20 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/80" />
        </motion.div>

        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-6xl mx-auto py-16 lg:py-24 w-full">
          <motion.div initial="hidden" animate="show" variants={container} className="text-center max-w-4xl mx-auto">

            {/* Badge */}
            <motion.div variants={item}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/25 bg-primary/8 text-primary font-semibold text-sm mb-8 backdrop-blur-md shadow-lg shadow-primary/10 cursor-default"
              >
                <Star className="w-4 h-4 fill-primary" />
                <span>Join 10,000+ continuous learners worldwide</span>
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-green-400"
                />
              </motion.div>
            </motion.div>

            {/* Hero heading */}
            <motion.h1
              variants={item}
              className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 leading-[1.05]"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Exchange Skills,{" "}
              <br />
              <motion.span
                className="text-gradient-warm inline-block"
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 5, repeat: Infinity }}
              >
                Grow Together.
              </motion.span>
            </motion.h1>

            {/* Subtext */}
            <motion.p variants={item} className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The peer-to-peer learning economy. Teach what you know to{" "}
              <span className="text-foreground font-semibold">earn credits</span>, and spend credits to learn from{" "}
              <span className="text-foreground font-semibold">world-class experts</span>. No money involved.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/register">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="w-full sm:w-auto h-14 px-10 rounded-full text-base font-bold bg-gradient-premium btn-glow shadow-xl">
                    Start Learning Free
                    <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </motion.div>
                  </Button>
                </motion.div>
              </Link>
              <Link href="/explore">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" className="w-full sm:w-auto h-14 px-10 rounded-full text-base font-bold backdrop-blur-sm border-primary/25 hover:bg-primary/8 hover:border-primary/40">
                    Explore Skills
                  </Button>
                </motion.div>
              </Link>
            </motion.div>

            {/* Stats row */}
            <motion.div variants={item} className="grid grid-cols-4 gap-4 max-w-xl mx-auto mb-20">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  whileHover={{ scale: 1.1 }}
                  className="text-center cursor-default"
                >
                  <div className="text-2xl font-extrabold text-gradient">{s.value}</div>
                  <div className="text-xs text-muted-foreground font-medium mt-1">{s.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Feature cards */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.15, delayChildren: 0.6 } } }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                whileHover={{ y: -8, boxShadow: "0 25px 50px rgba(0,0,0,0.15)" }}
                className={`glass-card group cursor-default transition-all duration-300 ${f.popular ? 'border-primary/30' : ''}`}
              >
                {f.popular && (
                  <motion.div
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-premium text-white text-xs font-bold shadow-lg"
                  >
                    Most Popular
                  </motion.div>
                )}
                <motion.div
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.bg} flex items-center justify-center mb-5`}
                >
                  <f.icon className={`w-7 h-7 text-${f.color}`} />
                </motion.div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-${f.badge.color}/10 text-${f.badge.color} text-xs font-bold mb-3`}>
                  <f.badge.icon className="w-3 h-3" /> {f.badge.text}
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {f.desc} <span className="text-foreground font-semibold">{f.highlight}</span> {f.rest}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom CTA */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-16 text-center">
            <p className="text-muted-foreground text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Sign in →
              </Link>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS SECTION ── */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Get started in minutes. No credit card required.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                whileHover={{ scale: 1.03 }}
                className="card-premium text-center cursor-default"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-premium flex items-center justify-center mx-auto mb-4 shadow-lg"
                >
                  <step.icon className="w-8 h-8 text-white" />
                </motion.div>
                <div className="text-5xl font-extrabold text-primary/10 mb-2">{step.step}</div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA SECTION ── */}
      <section className="px-4 sm:px-6 lg:px-8 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center bg-gradient-premium rounded-3xl p-12 md:p-16 text-white relative overflow-hidden shadow-2xl"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 5, repeat: Infinity, delay: 1 }}
            className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-black/10 blur-3xl"
          />
          <div className="relative z-10">
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <Sparkles className="w-12 h-12 mx-auto mb-6 text-white/80" />
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Ready to Start?</h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of learners and teachers. Get 200 free credits on signup!
            </p>
            <Link href="/register">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block">
                <Button className="h-14 px-10 rounded-full text-base font-bold bg-white text-primary hover:bg-white/90 shadow-xl">
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
