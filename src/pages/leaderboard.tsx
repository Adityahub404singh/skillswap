import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { motion } from "framer-motion";
import { Trophy, Flame, Star, Shield, Crown, Zap, Medal } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Leaderboard() {
  const token = useAuthStore(s => s.token);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gamification/leaderboard", {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(d => { setLeaders(d); setLoading(false); });
  }, []);

  const getRankIcon = (i: number) => {
    if (i === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (i === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (i === 2) return <Medal className="w-5 h-5 text-orange-400" />;
    return <span className="text-sm font-bold text-muted-foreground">#{i+1}</span>;
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h1 className="text-3xl font-extrabold">Leaderboard</h1>
        </div>
        <p className="text-muted-foreground">Top mentors and learners on SkillSwap</p>
      </motion.div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Trust Score", icon: Shield, color: "text-blue-500" },
          { label: "Streak", icon: Flame, color: "text-orange-500" },
          { label: "Sessions", icon: Zap, color: "text-green-500" },
        ].map(s => (
          <div key={s.label} className="card-premium text-center py-4">
            <s.icon className={"w-6 h-6 mx-auto mb-1 " + s.color} />
            <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
        </div>
      ) : leaders.length === 0 ? (
        <div className="card-premium text-center py-16">
          <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-bold text-lg mb-2">No leaders yet!</p>
          <p className="text-muted-foreground mb-4">Complete sessions to appear here.</p>
          <Link href="/explore"><Button>Find a Mentor</Button></Link>
        </div>
      ) : (
        <motion.div className="space-y-3" initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}>
          {leaders.map((user, i) => (
            <motion.div key={user.id}
              variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}
              whileHover={{ scale: 1.02 }}
              className={"card-premium flex items-center gap-4 " + (i < 3 ? "border-primary/20 bg-primary/2" : "")}>
              <div className="w-10 flex items-center justify-center flex-shrink-0">
                {getRankIcon(i)}
              </div>
              <Link href={"/mentor/" + user.id}>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold overflow-hidden flex-shrink-0 cursor-pointer">
                  {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name?.charAt(0)}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={"/mentor/" + user.id}>
                    <p className="font-bold hover:text-primary cursor-pointer">{user.name}</p>
                  </Link>
                  {user.badges?.includes("verified-expert") && <Shield className="w-4 h-4 text-blue-500" />}
                  {user.badges?.includes("7-day-streak") && <Flame className="w-4 h-4 text-orange-500" />}
                </div>
                <div className="flex gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" /> {user.averageRating?.toFixed(1) || "New"}
                  </span>
                  <span className="text-xs text-muted-foreground">{user.sessionsCompleted} sessions</span>
                  {user.currentStreak > 0 && (
                    <span className="text-xs text-orange-500 flex items-center gap-1">
                      <Flame className="w-3 h-3" /> {user.currentStreak} day streak
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-extrabold text-primary">{user.trustScore}</p>
                <p className="text-xs text-muted-foreground">trust score</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}