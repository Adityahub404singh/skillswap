import { useState } from "react";
import { Link } from "wouter";
import { useGetSkills, useGetSkillCategories, useGetMatchedMentors } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Compass, Users, ArrowRight, Star, ShieldCheck, Award, ChevronLeft, BookOpen, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const SKILL_ICONS: Record<string, string> = {
  Technology: "💻", Design: "🎨", Business: "📈", Language: "🌍",
  Music: "🎵", Sports: "⚽", Arts: "🖼️", Science: "🔬",
};

export default function Explore() {
  const options = useApiOptions();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const { data: categories } = useGetSkillCategories(options);
  const { data: skills, isLoading: skillsLoading } = useGetSkills(
    { search: search || undefined, category: selectedCategory || undefined }, options
  );
  const { data: matchedMentors, isLoading: mentorsLoading } = useGetMatchedMentors(
    selectedSkill || "", { ...options, enabled: !!selectedSkill } as any
  );

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="py-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-1">Explore Skills</h1>
          <p className="text-muted-foreground">Find the perfect mentor to level up your abilities.</p>
        </div>
        <div className="relative w-full sm:w-72 flex-shrink-0">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Search skills..."
            className="pl-10 rounded-full h-11 border-2 border-border focus:border-primary/50"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
        <Button variant={selectedCategory === "" ? "default" : "outline"}
          className={"rounded-full whitespace-nowrap text-sm h-9 " + (selectedCategory === "" ? "bg-foreground text-background" : "")}
          onClick={() => { setSelectedCategory(""); setSelectedSkill(null); }}>
          All
        </Button>
        {categories?.map(cat => (
          <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"}
            className={"rounded-full whitespace-nowrap text-sm h-9 " + (selectedCategory === cat ? "bg-primary text-white" : "")}
            onClick={() => { setSelectedCategory(cat); setSelectedSkill(null); }}>
            {SKILL_ICONS[cat] || "📚"} {cat}
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {!selectedSkill ? (
          <motion.div key="skills" initial="hidden" animate="show" exit={{ opacity: 0 }} variants={container}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {skillsLoading ? (
              [...Array(8)].map((_, i) => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)
            ) : skills?.filter(s => s.mentorCount > 0).length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <Compass className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No skills found</h3>
                <p className="text-muted-foreground">Try a different search or category.</p>
              </div>
            ) : (
              skills?.filter(s => s.mentorCount > 0).map(skill => (
                <motion.div key={skill.id} variants={item} whileHover={{ y: -4, scale: 1.02 }}
                  className="card-premium cursor-pointer group flex flex-col h-full"
                  onClick={() => setSelectedSkill(skill.name)}>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary px-2 py-1 bg-primary/10 rounded-lg">
                        {SKILL_ICONS[skill.category] || "📚"} {skill.category}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        <Users className="w-3 h-3" /> {skill.mentorCount}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">{skill.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{skill.description || "Learn this skill from experts."}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/50 flex justify-between items-center text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-all">
                    Find Mentors <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div key="mentors" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <button onClick={() => setSelectedSkill(null)}
                  className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground mb-2 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back to Skills
                </button>
                <h2 className="text-2xl font-bold">Mentors for <span className="text-primary">{selectedSkill}</span></h2>
                <p className="text-muted-foreground text-sm">{matchedMentors?.length || 0} mentors available</p>
              </div>
            </div>

            {mentorsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
              </div>
            ) : !matchedMentors?.length ? (
              <div className="py-20 text-center card-premium">
                <BookOpen className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No mentors yet</h3>
                <p className="text-muted-foreground mb-4">Be the first mentor for {selectedSkill}!</p>
                <Link href="/profile"><Button>Become a Mentor</Button></Link>
              </div>
            ) : (
              <motion.div initial="hidden" animate="show" variants={container}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchedMentors.map((match: any) => (
                  <motion.div key={match.user.id} variants={item} whileHover={{ y: -4 }}
                    className="card-premium flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0 overflow-hidden border-2 border-primary/10">
                        {match.user.avatar ? <img src={match.user.avatar} alt={match.user.name} className="w-full h-full object-cover" /> : match.user.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base truncate">{match.user.name}</h3>
                          {match.isVerified && <ShieldCheck className="w-4 h-4 text-accent flex-shrink-0" />}
                          {match.isTopRated && <Award className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                            <span className="text-sm font-semibold">{match.user.averageRating?.toFixed(1) || "New"}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{match.user.sessionsCompleted} sessions</span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Zap className="w-3 h-3" /> Score: {match.matchScore}
                          </div>
                        </div>
                      </div>
                    </div>

                    {match.user.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{match.user.bio}</p>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {match.user.skillsTeach?.slice(0, 3).map((s: string) => (
                        <span key={s} className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded-full border border-accent/20">{s}</span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div>
                        <p className="text-xs text-muted-foreground">Price per session</p>
                        <p className="text-lg font-extrabold text-primary">{match.pricePerHour} <span className="text-sm font-normal text-muted-foreground">credits</span></p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/mentor/${match.user.id}`}>
                          <Button variant="outline" size="sm" className="rounded-xl text-xs">Profile</Button>
                        </Link>
                        <Link href={`/book/${match.user.id}?skill=${encodeURIComponent(selectedSkill || "")}`}>
                          <Button size="sm" className="rounded-xl text-xs bg-gradient-to-r from-primary to-accent text-white">Book</Button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}