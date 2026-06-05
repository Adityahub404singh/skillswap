import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, Minus, CheckCircle, Flame, Zap, Star, Crown } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const MENTOR_DATA = [
  { rank: 1, name: "Rahul Sharma", loc: "Delhi", pts: 1240, change: 2, streak: 15, sessions: 42, rating: 4.8, verified: true, isMe: false },
  { rank: 2, name: "Aditya Kumar", loc: "Ahmedabad", pts: 980, change: 0, streak: 30, sessions: 28, rating: 4.9, verified: true, isMe: true },
  { rank: 3, name: "Priya Patel", loc: "Bangalore", pts: 870, change: -1, streak: 7, sessions: 19, rating: 4.7, verified: true, isMe: false },
  { rank: 4, name: "Vikram Singh", loc: "Mumbai", pts: 760, change: 3, streak: 45, sessions: 55, rating: 4.9, verified: false, isMe: false },
  { rank: 5, name: "Arjun Mehta", loc: "Pune", pts: 620, change: -2, streak: 12, sessions: 22, rating: 4.5, verified: true, isMe: false },
  { rank: 6, name: "Sneha Reddy", loc: "Hyderabad", pts: 540, change: 1, streak: 3, sessions: 12, rating: 4.6, verified: false, isMe: false },
  { rank: 7, name: "Karan Shah", loc: "Surat", pts: 480, change: 4, streak: 8, sessions: 16, rating: 4.4, verified: false, isMe: false },
  { rank: 8, name: "Meera Nair", loc: "Kochi", pts: 390, change: -1, streak: 5, sessions: 10, rating: 4.7, verified: true, isMe: false },
];
const LEARNER_DATA = [
  { rank: 1, name: "Priya Patel", loc: "Bangalore", pts: 1100, change: 1, streak: 7, sessions: 30, rating: 4.7, verified: true, isMe: false },
  { rank: 2, name: "Sneha Reddy", loc: "Hyderabad", pts: 920, change: 2, streak: 3, sessions: 19, rating: 4.6, verified: false, isMe: false },
  { rank: 3, name: "Aditya Kumar", loc: "Ahmedabad", pts: 830, change: -1, streak: 30, sessions: 28, rating: 4.9, verified: true, isMe: true },
  { rank: 4, name: "Vikram Singh", loc: "Mumbai", pts: 710, change: 0, streak: 45, sessions: 20, rating: 4.9, verified: false, isMe: false },
  { rank: 5, name: "Rahul Sharma", loc: "Delhi", pts: 560, change: 4, streak: 15, sessions: 12, rating: 4.8, verified: true, isMe: false },
];
const STREAK_DATA = [...MENTOR_DATA].sort((a,b) => b.streak - a.streak).slice(0,8).map((u,i) => ({...u, rank: i+1}));

type Tab = "mentors" | "learners" | "streaks";
const MEDAL_COLORS = ["text-yellow-500","text-gray-400","text-orange-600"];
const MEDAL_BG = ["bg-yellow-500/10 border-yellow-500/30","bg-gray-500/10 border-gray-500/30","bg-orange-600/10 border-orange-600/30"];

export default function Leaderboard() {
  const [tab, setTab] = useState<Tab>("mentors");
  const [period, setPeriod] = useState<"week"|"month"|"alltime">("week");
  const data = tab === "mentors" ? MENTOR_DATA : tab === "learners" ? LEARNER_DATA : STREAK_DATA;
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

      <div className="flex justify-center">
        <div className="flex gap-1 bg-muted/50 border border-border rounded-xl p-1">
          {(["week","month","alltime"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${period === p ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 items-end">
        {[data[1], data[0], data[2]].map((user, i) => {
          if (!user) return <div key={i} />;
          const actualRank = [1,0,2][i];
          const icons = ["🥈","🥇","🥉"];
          return (
            <motion.div key={user.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className={`flex flex-col items-center p-4 rounded-2xl border ${MEDAL_BG[actualRank]} ${i === 1 ? "scale-105" : ""}`}>
              <div className="text-2xl mb-2">{icons[i]}</div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-black text-lg mb-2 relative">
                {user.name.charAt(0)}
                {user.verified && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background"><CheckCircle className="w-2.5 h-2.5 text-white" /></div>}
              </div>
              <p className={`text-xs font-bold text-center ${user.isMe ? "text-primary" : ""}`}>{user.isMe ? "You" : user.name.split(" ")[0]}</p>
              <p className="text-xs text-muted-foreground">{tab === "streaks" ? `${user.streak}d 🔥` : `${user.pts.toLocaleString()} pts`}</p>
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
          <motion.div key={entry.name} variants={item}
            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${entry.isMe ? "bg-primary/5 border-primary/20" : "bg-background border-border hover:border-primary/20"}`}>
            <div className={`w-8 text-center font-black text-sm shrink-0 ${i < 3 ? MEDAL_COLORS[i] : "text-muted-foreground"}`}>
              {i < 3 ? ["🥇","🥈","🥉"][i] : `#${entry.rank}`}
            </div>
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-bold shrink-0">
              {entry.name.charAt(0)}
              {entry.verified && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background"><CheckCircle className="w-2.5 h-2.5 text-white" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold truncate ${entry.isMe ? "text-primary" : ""}`}>{entry.isMe ? `You (${entry.name.split(" ")[0]})` : entry.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{entry.loc}</span><span>·</span>
                <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-orange-400 text-orange-400" /> {entry.rating}</span>
                <span>·</span><span className="text-orange-500">🔥 {entry.streak}d</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-black">{tab === "streaks" ? `${entry.streak}d` : `${entry.pts.toLocaleString()}`}</p>
              <div className={`flex items-center justify-end gap-0.5 text-xs ${entry.change > 0 ? "text-green-500" : entry.change < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                {entry.change > 0 ? <TrendingUp className="w-3 h-3" /> : entry.change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                {entry.change !== 0 ? Math.abs(entry.change) : "—"}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="p-4 bg-primary/5 border border-primary/15 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">Your position:</span>
          <span className="text-primary font-bold">#2 Mentors · #3 Learners</span>
        </div>
        <span className="text-xs text-muted-foreground font-medium">Top 5% 🏆</span>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-3">Teach more sessions to climb the leaderboard!</p>
        <Link href="/explore"><Button className="rounded-full px-8">Find Students to Teach</Button></Link>
      </div>
    </div>
  );
}
