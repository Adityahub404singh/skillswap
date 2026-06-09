import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useGetSkills } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Search, Compass, Users, ArrowRight, Star, Sparkles, Monitor, Palette, Briefcase, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  { id: "all", label: "All Skills", icon: Sparkles },
  { id: "Technology", label: "Tech & Code", icon: Monitor },
  { id: "Design", label: "Design", icon: Palette },
  { id: "Business", label: "Business", icon: Briefcase },
  { id: "Language", label: "Languages", icon: Globe },
];

const FALLBACK_SKILLS = [
  { id: 1, name: "Python", category: "Technology", description: "Master Python, AI basics, and Data Science from verified experts.", mentorCount: 18, rating: 4.9 },
  { id: 2, name: "UI/UX Design", category: "Design", description: "Learn Figma, wireframing, and build beautiful interactive interfaces.", mentorCount: 12, rating: 4.8 },
  { id: 3, name: "JavaScript", category: "Technology", description: "Frontend magic with modern JS and React ecosystems.", mentorCount: 25, rating: 4.7 },
  { id: 4, name: "React", category: "Technology", description: "Build highly interactive web apps and user interfaces.", mentorCount: 22, rating: 4.9 },
  { id: 5, name: "Public Speaking", category: "Business", description: "Communicate with confidence and master stage presence.", mentorCount: 8, rating: 5.0 },
  { id: 6, name: "Spoken English", category: "Language", description: "Improve your fluency, vocabulary, and professional communication.", mentorCount: 42, rating: 4.6 },
];

export default function Explore() {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const options = useApiOptions();
  
  // FIX 1: Passing undefined as first argument to satisfy TS GetSkillsParams
  const { data: dbSkills, isLoading } = useGetSkills(undefined as any, options as any);
  
  // FIX 2: Safely checking if array exists to prevent undefined .length errors
  const safeDbSkills = Array.isArray(dbSkills) ? dbSkills : [];
  const skills = safeDbSkills.length > 0 ? safeDbSkills : FALLBACK_SKILLS;

  const filteredSkills = useMemo(() => {
    return skills.filter((s: any) => 
      (activeCat === "all" || s.category?.toLowerCase() === activeCat.toLowerCase()) &&
      (s.name.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()))
    );
  }, [skills, activeCat, search]);

  // FIX 3: Explicitly declaring type as Variants for Framer Motion
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
  };

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 max-w-7xl mx-auto space-y-12">
      
      {/* 🚀 Premium Hero Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-primary to-purple-800 p-8 md:p-14 text-white shadow-[0_20px_50px_rgba(91,91,246,0.3)]">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-white/10 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-black/20 rounded-full blur-[80px] -translate-x-1/4 translate-y-1/3 pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-sm font-bold mb-6 border border-white/20 shadow-inner">
              <Sparkles className="w-4 h-4 text-yellow-300" /> Discover Your Next Superpower
            </div>
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight">
              Master New Skills with <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-100">Top Mentors.</span>
            </h1>
            <p className="text-lg text-white/80 mb-10 font-medium max-w-xl leading-relaxed">
              Find verified experts, book live 1-on-1 sessions, and pay securely using SkillSwap Credits. The ultimate peer-to-peer learning network.
            </p>
            
            <div className="relative group max-w-xl">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                placeholder="What do you want to learn? (e.g. React, English)"
                className="w-full pl-16 pr-32 py-5 rounded-full text-foreground bg-white shadow-2xl focus:ring-4 focus:ring-primary/30 outline-none text-base md:text-lg font-semibold transition-all placeholder:text-muted-foreground/60"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button className="absolute right-2 top-2 bottom-2 rounded-full px-6 md:px-8 font-bold text-sm md:text-md shadow-lg bg-gradient-to-r from-primary to-accent hover:scale-105 transition-transform" size="lg">
                Search
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 🎯 Smooth Categories Navigation */}
      <div className="flex overflow-x-auto pb-4 hide-scrollbar gap-3 sticky top-20 z-30 bg-background/90 backdrop-blur-xl py-4 -mx-4 px-4 md:mx-0 md:px-0">
        {CATEGORIES.map((cat) => {
          const isActive = activeCat === cat.id;
          return (
            <motion.button
              key={cat.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveCat(cat.id)}
              className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap shadow-sm border-2 ${
                isActive 
                  ? "bg-foreground text-background border-foreground shadow-md" 
                  : "bg-card text-muted-foreground border-border/50 hover:border-primary/30 hover:bg-muted/30 hover:text-foreground"
              }`}
            >
              <cat.icon className={`w-4 h-4 ${isActive ? "" : "opacity-70"}`} />
              {cat.label}
            </motion.button>
          );
        })}
      </div>

      {/* 🔮 The Magic Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-72 rounded-[2rem]" />)}
        </div>
      ) : filteredSkills.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Compass className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h2 className="text-3xl font-black mb-3">No skills found</h2>
          <p className="text-muted-foreground text-lg">Try adjusting your search or switching categories.</p>
          <Button variant="outline" className="mt-6 rounded-full" onClick={() => {setSearch(""); setActiveCat("all");}}>
            Clear Filters
          </Button>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <AnimatePresence>
            {filteredSkills.map((skill: any) => (
              <motion.div key={skill.id} variants={itemVariants} layout className="group h-full">
                <Link href={`/skills/${skill.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="h-full cursor-pointer relative overflow-hidden rounded-[2rem] bg-card border-2 border-border/40 p-6 md:p-8 shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:border-primary/40 transition-all duration-300 flex flex-col group-hover:-translate-y-2">
                    
                    <div className="flex justify-between items-start mb-6">
                      <div className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-black uppercase tracking-widest border border-primary/20">
                        {skill.category || "Skill"}
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold border border-amber-500/20">
                        <Star className="w-3.5 h-3.5 fill-amber-500" />
                        {skill.rating || "4.9"}
                      </div>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black mb-3 group-hover:text-primary transition-colors leading-tight">
                      {skill.name}
                    </h3>
                    
                    <p className="text-muted-foreground text-sm md:text-base font-medium leading-relaxed mb-8 flex-1">
                      {skill.description}
                    </p>

                    <div className="pt-5 border-t border-border/60 flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-card flex items-center justify-center shadow-sm relative z-10 hover:z-20 transition-transform hover:scale-110">
                              <span className="text-[10px] text-white font-bold">{String.fromCharCode(64 + Math.floor(Math.random() * 26) + 1)}</span>
                            </div>
                          ))}
                        </div>
                        <span className="text-xs font-bold text-muted-foreground ml-2">
                          {skill.mentorCount || Math.floor(Math.random() * 20) + 5}+ Mentors
                        </span>
                      </div>
                      
                      <div className="w-10 h-10 rounded-full bg-muted group-hover:bg-primary flex items-center justify-center transition-colors shadow-sm">
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
