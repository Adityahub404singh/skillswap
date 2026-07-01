import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, Minus, CheckCircle, Flame, Zap, Star, Crown, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";

type Tab = "mentors" | "learners" | "streaks";
const MEDAL_COLORS = ["text-yellow-500","text-gray-400","text-orange-600"];
const MEDAL_BG = ["bg-yellow-500/10 border-yellow-500/30","bg-gray-500/10 border-gray-500/30","bg-orange-600/10 border-orange-600/30"];

export default function Leaderboard() {
  const [tab, setTab] = useState<Tab>("mentors");
  const [period, setPeriod] = useState<"week"|"month"|"alltime">("week");
  const token = useAuthStore(s => s.token);
  const myUser = useAuthStore(s => s.user);

  // Fetch LIVE data from backend
  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ["/api/gamification/leaderboard"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/gamification/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!token
  });

  // Transform backend data to match UI
  const formattedData = rawData.map((u: any, index: number) => ({
    rank: index + 1,
    name: u.name,
    loc: u.location || "Global",
    pts: u.trustScore,
    change: 0, // Requires historical tracking in DB, 0 for now
    streak: u.currentStreak,
    sessions: u.sessionsCompleted,
    rating: u.averageRating ? u.averageRating.toFixed(1) : "5.0",
    verified: u.trustScore > 50,
    isMe: myUser?.id === u.id,
    avatar: u.avatar || null
  }));

  const data = tab === "mentors" 
    ? [...formattedData].sort((a,b) => b.pts - a.pts) 
    : tab === "learners" 
      ? [...formattedData].sort((a,b) => b.sessions - a.sessions) 
      : [...formattedData].sort((a,b) => b.streak - a.streak);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } };

  return (
    <div className="py-6 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8 text-yellow-500" />
        </div>
        <h1 className="text-3xl font-black mb-1">Leaderboard</h1>
        <p className="text-muted-foreground text-sm">Top mentors, learners and streaks on SkillSwap</p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 items-end">
            {[data[1], data[0], data[2]].map((user, i) => {
              if (!user) return <div key={i} />;
              const actualRank = [1,0,2][i];
              const icons = ["🥈","🥇","🥉"];
              return (
                <motion.div key={user.name + i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className={`flex flex-col items-center p-4 rounded-2xl border ${MEDAL_BG[actualRank]} ${i === 1 ? "scale-105" : ""}`}>
                  <div className="text-2xl mb-2">{icons[i]}</div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-black text-lg mb-2 relative">
                    {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover"/> : user.name.charAt(0)}
                    {user.verified && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background"><CheckCircle className="w-2.5 h-2.5 text-white" /></div>}
                  </div>
                  <p className={`text-xs font-bold text-center ${user.isMe ? "text-primary" : ""}`}>{user.isMe ? "You" : user.name.split(" ")[0]}</p>
                  <p className="text-xs text-muted-foreground">{tab === "streaks" ? `${user.streak}d 🔥` : `${user.pts} pts`}</p>
                </motion.div>
              );
            })}
          </div>

          <div className="flex gap-1 bg-muted/40 border border-border rounded-2xl p-1">
            {[{id:"mentors" as Tab, label:"Top Mentors", icon: Trophy},{id:"learners" as Tab, label:"Top Learners", icon: Crown},{id:"streaks" as Tab, label:"Streaks", icon: Flame}].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all ${tab === t.id ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>

          <motion.div initial="hidden" animate="show" variants={container} className="space-y-2">
            {data.map((entry, i) => (
              <motion.div key={entry.name + i} variants={item}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${entry.isMe ? "bg-primary/5 border-primary/20" : "bg-background border-border hover:border-primary/20"}`}>
                <div className={`w-8 text-center font-black text-sm shrink-0 ${i < 3 ? MEDAL_COLORS[i] : "text-muted-foreground"}`}>
                  {i < 3 ? ["🥇","🥈","🥉"][i] : `#${i + 1}`}
                </div>
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-bold shrink-0">
                  {entry.avatar ? <img src={entry.avatar} className="w-full h-full rounded-full object-cover"/> : entry.name.charAt(0)}
                  {entry.verified && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background"><CheckCircle className="w-2.5 h-2.5 text-white" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${entry.isMe ? "text-primary" : ""}`}>{entry.isMe ? `You (${entry.name.split(" ")[0]})` : entry.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-orange-400 text-orange-400" /> {entry.rating}</span>
                    <span>·</span><span className="text-orange-500">🔥 {entry.streak}d</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black">{tab === "streaks" ? `${entry.streak}d` : `${entry.pts}`}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}




