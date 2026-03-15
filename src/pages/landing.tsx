import { Link } from "wouter";
import { motion, Variants } from "framer-motion";
import { ArrowRight, BookOpen, Users, Star, ShieldCheck, Zap, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12 }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 280, damping: 22 }
    }
  };

  const stats = [
    { value: "10K+", label: "Learners" },
    { value: "500+", label: "Skills" },
    { value: "98%", label: "Satisfaction" },
    { value: "Free", label: "Always" },
  ];

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-hidden">

      {/* Animated background blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/10 blur-3xl float" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-400/15 to-blue-500/10 blur-3xl float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-violet-400/10 to-fuchsia-400/08 blur-3xl float" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Background Image with better opacity */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/hero-bg.png"
          alt=""
          className="w-full h-full object-cover opacity-20 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/80" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-6xl mx-auto py-16 lg:py-24 w-full">

        <motion.div
          initial="hidden"
          animate="show"
          variants={container}
          className="text-center max-w-4xl mx-auto"
        >

          {/* Badge */}
          <motion.div variants={item} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/25 bg-primary/8 text-primary font-semibold text-sm mb-8 backdrop-blur-md shadow-lg shadow-primary/10">
            <Star className="w-4 h-4 fill-primary" />
            <span>Join 10,000+ continuous learners worldwide</span>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </motion.div>

          {/* Hero heading */}
          <motion.h1
            variants={item}
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 leading-[1.05]"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Exchange Skills,{" "}
            <br />
            <span className="text-gradient-warm">Grow Together.</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            variants={item}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            The peer-to-peer learning economy. Teach what you know to{" "}
            <span className="text-foreground font-semibold">earn credits</span>, and spend credits to learn from{" "}
            <span className="text-foreground font-semibold">world-class experts</span>. No money involved.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/register">
              <Button className="w-full sm:w-auto h-14 px-10 rounded-full text-base font-bold bg-gradient-premium btn-glow hover:-translate-y-1 transition-all duration-200 shadow-xl">
                Start Learning Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/explore">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-14 px-10 rounded-full text-base font-bold backdrop-blur-sm border-primary/25 hover:bg-primary/8 hover:border-primary/40 transition-all duration-200"
              >
                Explore Skills
              </Button>
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div variants={item} className="grid grid-cols-4 gap-4 max-w-xl mx-auto mb-20">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-extrabold text-gradient">{s.value}</div>
                <div className="text-xs text-muted-foreground font-medium mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>

        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8, type: "spring" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >

          {/* Card 1 */}
          <div className="glass-card group hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 transition-all duration-300 cursor-default">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
              <Zap className="w-3 h-3" /> Earn Credits
            </div>
            <h3 className="text-xl font-bold mb-3">Teach to Earn</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Share your expertise with others. Earn <span className="text-foreground font-semibold">10 credits</span> for every 1-hour session you teach.
            </p>
          </div>

          {/* Card 2 - highlighted */}
          <div className="relative glass-card group border-primary/30 hover:shadow-2xl hover:shadow-primary/25 hover:-translate-y-2 transition-all duration-300 cursor-default">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-premium text-white text-xs font-bold shadow-lg">
              Most Popular
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-cyan-400/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="w-7 h-7 text-cyan-500" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-400/10 text-cyan-600 text-xs font-bold mb-3">
              <TrendingUp className="w-3 h-3" /> Grow Skills
            </div>
            <h3 className="text-xl font-bold mb-3">Spend to Learn</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Use your earned credits to book sessions with experts and <span className="text-foreground font-semibold">pick up new skills</span> fast.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-card group hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 transition-all duration-300 cursor-default">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400/20 to-violet-400/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
              <ShieldCheck className="w-7 h-7 text-violet-500" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-400/10 text-violet-600 text-xs font-bold mb-3">
              <Award className="w-3 h-3" /> Verified
            </div>
            <h3 className="text-xl font-bold mb-3">Trusted Community</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Every session is rated. Build your <span className="text-foreground font-semibold">trust score</span> and become a verified expert.
            </p>
          </div>

        </motion.div>

        {/* Bottom CTA strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-16 text-center"
        >
          <p className="text-muted-foreground text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign in →
            </Link>
          </p>
        </motion.div>

      </div>
    </div>
  );
}
