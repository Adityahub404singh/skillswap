import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Users, Star, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Image Elements */}
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-multiply">
        <img 
          src="/images/hero-bg.png"
          alt="Hero background" 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-5xl mx-auto py-20 lg:py-32">
        <motion.div 
          initial="hidden"
          animate="show"
          variants={container}
          className="text-center md:text-left md:max-w-3xl"
        >
          <motion.div variants={item} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm mb-8 backdrop-blur-md">
            <Star className="w-4 h-4 fill-primary" />
            <span>Join 10,000+ continuous learners</span>
          </motion.div>
          
          <motion.h1 variants={item} className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Exchange Skills, <br />
            <span className="text-gradient">Grow Together.</span>
          </motion.h1>
          
          <motion.p variants={item} className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
            The peer-to-peer learning economy. Teach what you know to earn credits, 
            and spend credits to learn from world-class experts. No money involved.
          </motion.p>
          
          <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 rounded-full text-base font-bold bg-gradient-premium shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all">
                Start Learning Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/explore">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-full text-base font-bold bg-background/50 backdrop-blur-sm border-border hover:bg-background/80 transition-all">
                Explore Skills
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Features grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, type: "spring" }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <div className="card-premium relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3">Teach to Earn</h3>
            <p className="text-muted-foreground">Share your expertise with others. Earn 10 credits for every 1-hour session you teach.</p>
          </div>
          
          <div className="card-premium relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
              <BookOpen className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-bold mb-3">Spend to Learn</h3>
            <p className="text-muted-foreground">Use your earned credits to book sessions with other experts and pick up new skills.</p>
          </div>
          
          <div className="card-premium relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-foreground/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-secondary-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-3">Trusted Community</h3>
            <p className="text-muted-foreground">Every session is rated. Build your trust score and become a verified expert on the platform.</p>
          </div>
        </motion.div>
      </div>

      {/* Footer Section */}
      <footer className="relative z-10 w-full mt-24 border-t border-border/50 bg-background/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2 group mb-4 inline-flex">
                <div className="w-8 h-8 rounded-lg bg-gradient-premium flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/25">
                  S
                </div>
                <span className="font-display font-bold text-xl tracking-tight text-foreground">
                  Skill<span className="text-primary">Swap</span>
                </span>
              </Link>
              <p className="text-muted-foreground max-w-sm">
                The peer-to-peer learning platform where you trade knowledge instead of money. 
                Teach to earn, learn to grow.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 text-foreground">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link href="/explore" className="text-muted-foreground hover:text-primary transition-colors">Explore Skills</Link></li>
                <li><Link href="/register" className="text-muted-foreground hover:text-primary transition-colors">Sign Up</Link></li>
                <li><Link href="/login" className="text-muted-foreground hover:text-primary transition-colors">Log In</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 text-foreground">Community</h4>
              <ul className="space-y-2">
                <li><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">Guidelines</span></li>
                <li><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">Help Center</span></li>
                <li><span className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">Contact Us</span></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 SkillSwap. Exchange skills, grow together.
            </p>
            <div className="flex gap-4">
              <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Terms</span>
              <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Privacy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
