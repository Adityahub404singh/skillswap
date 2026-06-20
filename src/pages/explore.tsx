import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useGetSkills } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Search, Compass, ArrowRight, Star, Sparkles, Monitor, Palette, Briefcase, Globe } from "lucide-react";
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
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Premium Hero Search Section */}
      <div className="bg-gradient-to-br from-[#6C3BFF] to-[#8B5CF6] rounded-[24px] p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/15 text-[10px] font-bold mb-4 border border-white/10">
            <Sparkles className="w-3 h-3 text-yellow-300" /> Discover Your Next Superpower
          </div>
          
          <h1 className="text-3xl font-black mb-2 leading-tight">
            Master New Skills
          </h1>
          <p className="text-white/80 text-sm font-medium mb-6">
            Find verified experts and book live 1-on-1 sessions.
          </p>
          
          {/* Clean Search Bar */}
          <div className="relative flex items-center shadow-lg rounded-2xl bg-white overflow-hidden">
            <div className="pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="What do you want to learn?"
              className="w-full pl-3 pr-4 py-3.5 bg-transparent text-slate-800 text-sm font-bold placeholder:text-slate-400 focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Smooth Categories Navigation */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 -mx-1 px-1 sticky top-[70px] z-30 bg-[#F8FAFC]/90 backdrop-blur-md">
        {CATEGORIES.map((cat) => {
          const isActive = activeCat === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                isActive 
                  ? "bg-[#6C3BFF] text-white shadow-md" 
                  : "bg-white text-slate-500 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-[#6C3BFF]/30 hover:text-slate-800"
              }`}
            >
              <cat.icon className={`w-3.5 h-3.5 ${isActive ? "" : "opacity-70"}`} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* The Magic Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 rounded-[24px]" />)}
        </div>
      ) : filteredSkills.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 bg-white rounded-[24px] border border-gray-100 shadow-sm mt-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Compass className="w-8 h-8 text-slate-300" />
          </div>
          <h2 className="text-lg font-black text-slate-800 mb-1">No skills found</h2>
          <p className="text-slate-500 text-sm mb-5">Try adjusting your search terms.</p>
          <Button size="sm" className="bg-slate-900 text-white rounded-full font-bold px-6" onClick={() => {setSearch(""); setActiveCat("all");}}>
            Clear Filters
          </Button>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredSkills.map((skill: any) => (
              <motion.div key={skill.id} variants={itemVariants} layout className="group h-full">
                <Link href={`/skills/${skill.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="h-full cursor-pointer bg-white border border-gray-100 rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-[#6C3BFF]/30 transition-all duration-300 flex flex-col active:scale-[0.98]">
                    
                    <div className="flex justify-between items-start mb-3">
                      <div className="px-3 py-1 rounded-full bg-indigo-50 text-[#6C3BFF] text-[10px] font-black uppercase tracking-wider">
                        {skill.category || "Skill"}
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 text-slate-600 text-[10px] font-bold border border-slate-100">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        {skill.rating || "4.9"}
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-slate-800 mb-1.5 leading-tight group-hover:text-[#6C3BFF] transition-colors">
                      {skill.name}
                    </h3>
                    
                    <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4 flex-1 line-clamp-2">
                      {skill.description}
                    </p>

                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between mt-auto">
                      <span className="text-[11px] font-bold text-slate-400">
                        {skill.mentorCount || Math.floor(Math.random() * 20) + 5}+ Mentors
                      </span>
                      <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-[#6C3BFF] flex items-center justify-center transition-colors">
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
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