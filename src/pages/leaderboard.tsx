"use client";
import { useState } from "react";
import { Trophy, TrendingUp, TrendingDown, Minus, CheckCircle, Flame, Zap, Star } from "lucide-react";

const MENTOR_DATA = [
  { rank: 1,  name: "Rahul Sharma",  loc: "Delhi",      pts: 1240, change: 2,  streak: 15, sessions: 42, rating: 4.8, verified: true,  badge: "🥇" },
  { rank: 2,  name: "Aditya Kumar",  loc: "Ahmedabad",  pts: 980,  change: 0,  streak: 30, sessions: 28, rating: 4.9, verified: true,  badge: "🥈", isMe: true },
  { rank: 3,  name: "Priya Patel",   loc: "Bangalore",  pts: 870,  change: -1, streak: 7,  sessions: 19, rating: 4.7, verified: true,  badge: "🥉" },
  { rank: 4,  name: "Vikram Singh",  loc: "Mumbai",     pts: 760,  change: 3,  streak: 45, sessions: 55, rating: 4.9, verified: false, badge: "" },
  { rank: 5,  name: "Arjun Mehta",   loc: "Pune",       pts: 620,  change: -2, streak: 12, sessions: 22, rating: 4.5, verified: true,  badge: "" },
  { rank: 6,  name: "Sneha Reddy",   loc: "Hyderabad",  pts: 540,  change: 1,  streak: 3,  sessions: 12, rating: 4.6, verified: false, badge: "" },
  { rank: 7,  name: "Karan Shah",    loc: "Surat",      pts: 480,  change: 4,  streak: 8,  sessions: 16, rating: 4.4, verified: false, badge: "" },
  { rank: 8,  name: "Meera Nair",    loc: "Kochi",      pts: 390,  change: -1, streak: 5,  sessions: 10, rating: 4.7, verified: true,  badge: "" },
  { rank: 9,  name: "Ravi Kumar",    loc: "Chennai",    pts: 310,  change: 2,  streak: 2,  sessions: 8,  rating: 4.3, verified: false, badge: "" },
  { rank: 10, name: "Anjali Singh",  loc: "Jaipur",     pts: 250,  change: 0,  streak: 6,  sessions: 7,  rating: 4.5, verified: false, badge: "" },
];

const LEARNER_DATA = [
  { rank: 1,  name: "Rahul Sharma",  loc: "Delhi",      pts: 1100, change: 1,  streak: 15, sessions: 30, rating: 4.8, verified: true,  badge: "🥇" },
  { rank: 2,  name: "Priya Patel",   loc: "Bangalore",  pts: 920,  change: 2,  streak: 7,  sessions: 19, rating: 4.7, verified: true,  badge: "🥈" },
  { rank: 3,  name: "Aditya Kumar",  loc: "Ahmedabad",  pts: 830,  change: -1, streak: 30, sessions: 28, rating: 4.9, verified: true,  badge: "🥉", isMe: true },
  { rank: 4,  name: "Vikram Singh",  loc: "Mumbai",     pts: 710,  change: 0,  streak: 45, sessions: 20, rating: 4.9, verified: false, badge: "" },
  { rank: 5,  name: "Sneha Reddy",   loc: "Hyderabad",  pts: 560,  change: 4,  streak: 3,  sessions: 12, rating: 4.6, verified: false, badge: "" },
];

const STREAK_DATA = [...MENTOR_DATA].sort((a,b) => b.streak - a.streak).slice(0, 8).map((u, i) => ({...u, rank: i+1}));

type Tab = "mentors" | "learners" | "streaks";

export default function LeaderboardPage() {
  const [tab,    setTab]    = useState<Tab>("mentors");
  const [period, setPeriod] = useState<"week" | "month" | "alltime">("week");

  const data = tab === "mentors" ? MENTOR_DATA : tab === "learners" ? LEARNER_DATA : STREAK_DATA;

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "mentors",  label: "Top Mentors",  icon: "🏆" },
    { id: "learners", label: "Top Learners", icon: "📚" },
    { id: "streaks",  label: "Streaks",      icon: "🔥" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border border-yellow-500/30 flex items-center justify-center mx-auto mb-4">
            <Trophy size={26} className="text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Leaderboard</h1>
          <p className="text-gray-400 text-sm">Top mentors, learners & streaks on SkillSwap</p>
        </div>

        {/* Period filter */}
        <div className="flex justify-center mb-6">
          <div className="flex gap-1 bg-gray-900/60 border border-white/8 rounded-xl p-1">
            {(["week","month","alltime"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  period === p ? "bg-violet-500/20 text-violet-300" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
              </button>
            ))}
          </div>
        </div>

        {/* Top 3 Podium */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[data[1], data[0], data[2]].map((user, i) => {
            if (!user) return <div key={i} />;
            const podiumH = i === 1 ? "pt-0" : "pt-6";
            const sizes = i === 1 ? "w-14 h-14 text-xl" : "w-11 h-11 text-base";
            const colors = ["border-gray-400/40", "border-yellow-400/40", "border-amber-600/40"];
            const idx = i === 0 ? 1 : i === 1 ? 0 : 2;
            return (
              <div key={user.name} className={`flex flex-col items-center ${podiumH}`}>
                <div className={`relative ${sizes} rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-white border-2 ${colors[idx]} mb-2`}>
                  {user.name.charAt(0)}
                  {user.verified && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border border-gray-900">
                      <CheckCircle size={9} className="text-white" />
                    </div>
                  )}
                </div>
                <span className="text-lg">{["🥈","🥇","🥉"][idx]}</span>
                <p className={`font-semibold text-center truncate w-full text-center text-xs mt-0.5 ${user.isMe ? "text-violet-300" : "text-white"}`}>
                  {user.isMe ? "You" : user.name.split(" ")[0]}
                </p>
                <p className="text-xs text-gray-500">{tab === "streaks" ? `${user.streak}d 🔥` : `${user.pts.toLocaleString()} pts`}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900/60 border border-white/8 rounded-xl p-1 mb-6">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === t.id ? "bg-violet-500/20 text-violet-300" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Full Table */}
        <div className="bg-gray-900/60 border border-white/8 rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {data.map((entry, i) => (
              <div
                key={entry.name}
                className={`flex items-center gap-3 px-5 py-4 transition-all ${
                  entry.isMe ? "bg-violet-500/5 border-l-2 border-l-violet-500" : "hover:bg-white/2"
                }`}
              >
                {/* Rank */}
                <div className={`w-7 text-center text-sm font-bold shrink-0 ${
                  i < 3 ? ["text-yellow-400","text-gray-300","text-amber-600"][i] : "text-gray-600"
                }`}>
                  {entry.badge || `#${entry.rank}`}
                </div>

                {/* Avatar */}
                <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                  {entry.name.charAt(0)}
                  {entry.verified && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center">
                      <CheckCircle size={8} className="text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-sm font-semibold truncate ${entry.isMe ? "text-violet-300" : "text-white"}`}>
                      {entry.isMe ? "You (Aditya)" : entry.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span>{entry.loc}</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5"><Star size={9} className="text-yellow-400" /> {entry.rating}</span>
                    <span>·</span>
                    <span className="text-orange-400">🔥 {entry.streak}d</span>
                  </div>
                </div>

                {/* Points + Change */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-white">
                    {tab === "streaks" ? `${entry.streak}d` : `${entry.pts.toLocaleString()}`}
                  </p>
                  <div className={`flex items-center justify-end gap-0.5 text-xs mt-0.5 ${
                    entry.change > 0 ? "text-emerald-400" : entry.change < 0 ? "text-red-400" : "text-gray-600"
                  }`}>
                    {entry.change > 0 ? <TrendingUp size={11} /> : entry.change < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                    {entry.change !== 0 ? Math.abs(entry.change) : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Your position (if not in top 10) */}
        <div className="mt-4 p-4 bg-violet-500/5 border border-violet-500/15 rounded-xl">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-violet-400" />
              <span className="text-gray-400">Your position:</span>
              <span className="text-violet-300 font-semibold">#2 Mentors · #3 Learners</span>
            </div>
            <span className="text-xs text-gray-500">Top 5% 🏆</span>
          </div>
        </div>

      </div>
    </div>
  );
}
