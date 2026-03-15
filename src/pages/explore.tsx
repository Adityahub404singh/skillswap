import { useState } from "react";
import { Link } from "wouter";
import { useGetSkills, useGetSkillCategories, useGetMatchedMentors } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { Search, Compass, Users, ArrowRight, Loader2, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Explore() {
  const options = useApiOptions();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const { data: categories } = useGetSkillCategories(options);
  
  const { data: skills, isLoading: skillsLoading } = useGetSkills(
    { search: search || undefined, category: selectedCategory || undefined },
    options
  );

  const { data: matchedMentors, isLoading: mentorsLoading } = useGetMatchedMentors(
    selectedSkill || "",
    { ...options, query: { enabled: !!selectedSkill } }
  );

  return (
    <div className="py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-extrabold mb-2">Explore Skills</h1>
          <p className="text-muted-foreground text-lg">Find the perfect mentor to level up your abilities.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search skills..." 
            className="pl-10 rounded-full h-12 bg-background border-2 border-border focus-visible:ring-primary/20"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide gap-2">
        <Button 
          variant={selectedCategory === "" ? "default" : "outline"}
          className={`rounded-full whitespace-nowrap ${selectedCategory === "" ? 'bg-foreground text-background shadow-md' : 'bg-background'}`}
          onClick={() => { setSelectedCategory(""); setSelectedSkill(null); }}
        >
          All Categories
        </Button>
        {categories?.map(cat => (
          <Button 
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            className={`rounded-full whitespace-nowrap ${selectedCategory === cat ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-background'}`}
            onClick={() => { setSelectedCategory(cat); setSelectedSkill(null); }}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Main Content Area */}
      {!selectedSkill ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {skillsLoading ? (
            [...Array(8)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)
          ) : skills?.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <Compass className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No skills found</h3>
              <p className="text-muted-foreground">Try a different search term or category.</p>
            </div>
          ) : (
            skills?.map((skill) => (
              <div 
                key={skill.id} 
                className="card-premium cursor-pointer group flex flex-col h-full"
                onClick={() => setSelectedSkill(skill.name)}
              >
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary px-2 py-1 bg-primary/10 rounded-md">
                      {skill.category}
                    </span>
                    <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {skill.mentorCount}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{skill.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{skill.description || "Learn this skill from experts."}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/50 flex justify-between items-center text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                  Find Mentors <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <div>
              <button 
                onClick={() => setSelectedSkill(null)}
                className="text-sm font-semibold text-muted-foreground hover:text-foreground mb-2 flex items-center transition-colors"
              >
                ← Back to skills
              </button>
              <h2 className="text-3xl font-extrabold">Mentors for <span className="text-primary">{selectedSkill}</span></h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {mentorsLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)
            ) : matchedMentors?.length === 0 ? (
              <div className="col-span-full py-20 text-center card-premium bg-muted/20">
                <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No mentors available yet</h3>
                <p className="text-muted-foreground">Be the first to teach this skill!</p>
              </div>
            ) : (
              matchedMentors?.map((match) => (
                <div key={match.user.id} className="card-premium flex flex-col h-full">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/20 flex-shrink-0 bg-muted">
                      {match.user.avatar ? (
                        <img src={match.user.avatar} alt={match.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground">
                          {match.user.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{match.user.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        <span className="flex items-center gap-1 text-orange-500 font-medium">
                          <Star className="w-4 h-4 fill-orange-500" />
                          {match.user.averageRating?.toFixed(1) || 'New'}
                        </span>
                        <span className="text-muted-foreground">
                          {match.user.sessionsCompleted} sessions
                        </span>
                      </div>
                      <div className="mt-2 text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-md inline-block">
                        Match Score: {Math.round(match.matchScore * 100)}%
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground flex-1 mb-6 line-clamp-3">
                    {match.user.bio || "No bio provided."}
                  </p>
                  
                  <div className="pt-4 border-t border-border/50 flex gap-3">
                    <Link href={`/mentor/${match.user.id}`} className="flex-1">
                      <Button variant="outline" className="w-full rounded-xl">Profile</Button>
                    </Link>
                    <Link href={`/book/${match.user.id}?skill=${encodeURIComponent(selectedSkill)}`} className="flex-1">
                      <Button className="w-full rounded-xl bg-primary hover:bg-primary/90">Book (10cr)</Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
