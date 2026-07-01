import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Star, CheckCircle, Shield, Zap, ArrowRight, User, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function SkillPage() {
  const [, params] = useRoute("/skills/:skill");
  const skillSlug = params?.skill || "skill";
  // Convert slug back to readable name (e.g., "graphic-design" -> "Graphic Design")
  const skillName = skillSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  // 1. MUST INITIALIZE AS EMPTY ARRAY
  const [mentors, setMentors] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL || ""}/api/users`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          
          const targetSkill = skillName.toLowerCase().trim();
          const targetSlug = skillSlug.toLowerCase().trim().replace(/-/g, ' ');

          const matched = data.filter(u => {
            let teachSkills: string[] = [];

            // 2. Safely parse skillsTeach (handles stringified JSON)
            if (Array.isArray(u.skillsTeach)) {
              teachSkills = u.skillsTeach;
            } else if (typeof u.skillsTeach === "string") {
              try {
                const parsed = JSON.parse(u.skillsTeach);
                teachSkills = Array.isArray(parsed) ? parsed : [u.skillsTeach];
              } catch {
                teachSkills = [u.skillsTeach];
              }
            }

            // 3. Exact Match Check (Case Insensitive)
            const exactMatch = teachSkills.some((s) => {
               if (typeof s !== "string") return false;
               const currentSkill = s.toLowerCase().trim();
               return currentSkill === targetSkill || currentSkill === targetSlug;
            });

            // Fallback Match (Bio/Headline)
            const bioStr = u.bio || "";
            const headlineStr = u.headline || "";
            const looseMatch = `${bioStr} ${headlineStr}`.toLowerCase().includes(targetSkill) ||
                               `${bioStr} ${headlineStr}`.toLowerCase().includes(targetSlug);

            return exactMatch || looseMatch;
          });

          setMentors(matched);
        } else {
          setMentors([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading mentors:", err);
        setMentors([]);
        setLoading(false);
      });
  }, [skillName, skillSlug]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 200, damping: 20 } }
  };

  return (
    <div className="min-h-screen pb-20">
      
      {/* Premium Hero Header */}
      <div className="bg-gradient-to-b from-indigo-950 via-primary/90 to-background pt-20 pb-32 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-white font-bold text-sm mb-6 border border-white/30">
              <Zap className="w-4 h-4 text-yellow-300" /> High Demand Skill
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">
              Master <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-200">{skillName}</span>
            </h1>
            <p className="text-xl text-white/80 font-medium max-w-2xl mx-auto mb-10">
              Connect with top industry experts. Learn {skillName} through live, personalized mentorship sessions.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="rounded-full bg-white text-primary hover:bg-gray-100 font-bold px-8 h-14 text-lg shadow-xl" onClick={() => document.getElementById('mentors')?.scrollIntoView({ behavior: 'smooth' })}>
                Find Mentors <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-20 relative z-20 space-y-16">
        
        {/* Why Learn Section */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Career Growth", desc: `Adding ${skillName} to your resume opens up premium opportunities globally.` },
            { title: "Practical Learning", desc: "Don't just watch videos. Build real-world projects with your mentor." },
            { title: "Credit Economy", desc: "Use your SkillSwap credits to learn for free by teaching what you know." }
          ].map((feature, i) => (
            <div key={i} className="bg-card border-2 border-border/40 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground font-medium">{feature.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Mentors Grid Section */}
        <div id="mentors" className="pt-10">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-black mb-2">Top {skillName} Mentors</h2>
              <p className="text-muted-foreground text-lg">Book a session with verified experts.</p>
            </div>
            {mentors.length > 0 && (
              <div className="hidden md:flex items-center gap-2 bg-muted px-4 py-2 rounded-full font-bold text-sm border border-border">
                <Shield className="w-4 h-4 text-green-500" /> {mentors.length} Mentors Found
              </div>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-[2rem]" />)}
            </div>
          ) : mentors.length === 0 ? (
            /* Empty state if no mentors found */
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card-premium p-12 text-center bg-card border-2 border-dashed border-border/80 rounded-[3rem] shadow-sm">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-3xl font-black mb-4">No Mentors for {skillName} Yet!</h3>
              <p className="text-muted-foreground font-medium text-lg max-w-lg mx-auto mb-8">
                This is a highly requested skill. Be the first one to teach <strong className="text-foreground">{skillName}</strong> on SkillSwap and capture all the incoming students!
              </p>
              <Link href="/profile">
                <Button className="rounded-full bg-gradient-to-r from-primary to-accent hover:scale-105 transition-transform text-white font-black px-10 h-14 shadow-lg text-lg">
                  Become a Mentor
                </Button>
              </Link>
            </motion.div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {mentors.map((mentor) => (
                  <motion.div key={mentor.id} variants={itemVariants} className="group">
                    <div className="card-premium bg-card border-2 border-border/40 rounded-[2rem] p-6 hover:border-primary/40 transition-all duration-300 hover:shadow-xl">
                      
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent p-0.5 shadow-md group-hover:scale-105 transition-transform shrink-0">
                          <div className="w-full h-full rounded-full bg-card border-2 border-white flex items-center justify-center overflow-hidden">
                            {mentor.avatar ? <img src={mentor.avatar} alt="avatar" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-primary" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-black text-xl truncate">{mentor.name}</h3>
                            {(mentor.isPremium || mentor.trustScore >= 50) && <span title="Verified Expert" className="shrink-0 flex items-center"><Shield className="w-4 h-4 text-blue-500 fill-blue-500" /></span>}
                          </div>
                          <p className="text-sm text-muted-foreground font-medium truncate">{mentor.headline || mentor.bio || "SkillSwap Expert"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-8">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 font-bold text-sm">
                          <Star className="w-4 h-4 fill-amber-500" /> {mentor.rating || (mentor.trustScore ? (mentor.trustScore / 20).toFixed(1) : "4.8")}
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground font-bold text-sm">
                          <BookOpen className="w-4 h-4" /> {mentor.sessionsCompleted || 0} Sessions
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-5 border-t border-border/60">
                        <div>
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Session Rate</p>
                          <p className="text-lg font-black text-primary">{mentor.pricePerHour || 20} cr <span className="text-sm text-muted-foreground font-medium">/ hr</span></p>
                        </div>
                        <Link href={`/book/${mentor.id}?skill=${encodeURIComponent(skillName)}`}>
                          <Button className="rounded-full bg-foreground text-background hover:bg-primary hover:text-white font-bold px-6 shadow-md transition-colors">
                            Book Now
                          </Button>
                        </Link>
                      </div>

                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
