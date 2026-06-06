import { Link } from "wouter";
import { useGetMe, useGetMySessions } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { format } from "date-fns";
import { motion, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Wallet, Star, CheckCircle, Clock, BookOpen, Compass, ArrowRight, TrendingUp, Zap, User, Trophy, Target, Sparkles, Calendar, Flame, Award, Shield, Code2, Globe, Brain, Palette } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";

const BADGES = [
  { id: "first_session", icon: "🎯", label: "First Session", desc: "Completed your first session", color: "from-blue-500/20 to-blue-600/10 border-blue-500/30" },
  { id: "streak_7", icon: "🔥", label: "7-Day Streak", desc: "Learned 7 days in a row", color: "from-orange-500/20 to-orange-600/10 border-orange-500/30" },
  { id: "streak_30", icon: "⚡", label: "30-Day Legend", desc: "30 days of consistent learning", color: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30" },
  { id: "top_mentor", icon: "🏆", label: "Top Mentor", desc: "Rated 4.8+ as a teacher", color: "from-purple-500/20 to-purple-600/10 border-purple-500/30" },
  { id: "verified", icon: "✅", label: "Verified Expert", desc: "Passed skill verification test", color: "from-green-500/20 to-green-600/10 border-green-500/30" },
  { id: "community", icon: "👥", label: "Community Star", desc: "Helped 10+ learners", color: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30" },
];

function StreakWidget({ streak }: { streak: number }) {
  const days = ["M","T","W","T","F","S","S"];
  const today = new Date().getDay();
  return (
    <div className="card-premium">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold">Learning Streak</h3>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 font-bold text-sm">
          <Flame className="w-3.5 h-3.5" /> {streak} days
        </div>
      </div>
      <div className="flex gap-2 mb-3">
        {days.map((d, i) => {
          const active = i < (streak % 7);
          const isToday = i === (today === 0 ? 6 : today - 1);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                active ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" :
                isToday ? "bg-orange-500/20 text-orange-500 border border-orange-500/30" :
                "bg-muted text-muted-foreground"
              }`}>
                {active ? "🔥" : d}
              </div>
              <span className="text-[9px] text-muted-foreground">{d}</span>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-muted-foreground text-center">
        {streak >= 30 ? "🏅 30-Day Legend!" : streak >= 7 ? "⚡ On fire! Keep going!" : `${7 - (streak % 7)} days to next milestone`}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const options = useApiOptions();
  const { data: user, isLoading: userLoading } = useGetMe(options);
  const { data: sessions, isLoading: sessionsLoading } = useGetMySessions({ status: "accepted" }, options);
  const streak = (user as any).currentStreak ?? 0;
  const unlockedBadges: number[] = [
    ...(((user as any).sessionsCompleted ?? 0) > 0 ? [0] : []),
    ...(((user as any).currentStreak ?? 0) >= 7 ? [1] : []),
    ...(((user as any).currentStreak ?? 0) >= 30 ? [2] : []),
    ...(((user as any).averageRating ?? 0) >= 4.8 && ((user as any).sessionsCompleted ?? 0) >= 10 ? [3] : []),
    ...(((user as any).trustScore ?? 0) >= 80 ? [4] : []),
  ];

  const upcomingSessions = sessions?.filter(s => new Date(s.scheduledDate) > new Date()).slice(0, 3) || [];

  const container: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
  };

  if (userLoading) {
    return (
      <div className="py-8 space-y-6">
        <Skeleton className="h-52 w-full rounded-3xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!user) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user.name.split(" ")[0];
  const trustLevel = user.trustScore >= 90 ? "Expert" : user.trustScore >= 70 ? "Advanced" : user.trustScore >= 50 ? "Intermediate" : "Beginner";
  const trustColor = user.trustScore >= 90 ? "text-purple-500" : user.trustScore >= 70 ? "text-blue-500" : user.trustScore >= 50 ? "text-green-500" : "text-orange-500";

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="py-6 space-y-6">

      {/* Hero welcome */}
      <motion.div variants={item} className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700 p-6 md:p-8 text-white shadow-2xl shadow-primary/20">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-black/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <motion.span animate={{ rotate: [0, 20, -20, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }} className="text-2xl">👋</motion.span>
              <span className="text-white/70 text-sm font-medium">{greeting}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{firstName}!</h1>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
                <Wallet className="w-3.5 h-3.5" />
                <span className="font-bold">{user.credits} credits</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
                <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" />
                <span className="font-bold">Trust: {user.trustScore}</span>
                <span className={`text-xs font-semibold ${trustColor} bg-white/20 px-1.5 rounded-full`}>{trustLevel}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-orange-500/30 backdrop-blur-sm rounded-full px-3 py-1">
                <Flame className="w-3.5 h-3.5 text-orange-300" />
                <span className="font-bold">{streak} day streak</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/explore">
              <Button className="bg-white text-primary hover:bg-white/90 font-bold rounded-full shadow-lg">
                <Compass className="w-4 h-4 mr-2" /> Find Mentors
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full">
                <User className="w-4 h-4 mr-2" /> Profile
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Wallet, label: "Credits", value: user.credits, sub: "available", color: "text-primary", bg: "bg-primary/10" },
          { icon: Star, label: "Trust Score", value: user.trustScore, sub: trustLevel, color: "text-yellow-500", bg: "bg-yellow-500/10" },
          { icon: BookOpen, label: "Sessions", value: sessions?.length || 0, sub: "total", color: "text-blue-500", bg: "bg-blue-500/10" },
          { icon: Flame, label: "Streak", value: `${streak}d`, sub: "keep it up!", color: "text-orange-500", bg: "bg-orange-500/10" },
        ].map((s, i) => (
          <motion.div key={s.label} whileHover={{ scale: 1.04, y: -3 }}
            className="card-premium text-center cursor-default">
            <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center mx-auto mb-3`}>
              <s.icon className={`w-6 h-6 ${s.color}`} />
            </div>
            <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground font-medium mt-1">{s.label}</div>
            <div className="text-[10px] text-muted-foreground">{s.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Upcoming sessions */}
          <motion.div variants={item} className="card-premium">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" /> Upcoming Sessions
              </h2>
              <Link href="/sessions">
                <Button variant="ghost" size="sm" className="text-primary text-xs gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-10">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-4">No upcoming sessions yet</p>
                <Link href="/explore">
                  <Button size="sm" className="rounded-full">Find a Mentor</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((session: any) => (
                  <motion.div key={session.id} whileHover={{ x: 4 }}
                    className="flex items-center gap-4 p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{session.skill?.name || "Session"}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(session.scheduledDate), "MMM d, h:mm a")}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="rounded-full h-7 text-xs bg-green-500 hover:bg-green-600">
                        <TrendingUp className="w-3 h-3 mr-1" /> Join
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Badges */}
          <motion.div variants={item} className="card-premium">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" /> Your Badges
              </h2>
              <span className="text-xs text-muted-foreground">{unlockedBadges.length}/{BADGES.length} earned</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {BADGES.map((badge, i) => {
                const unlocked = unlockedBadges.includes(i);
                return (
                  <motion.div key={badge.id} whileHover={{ scale: 1.05 }}
                    className={`p-3 rounded-xl border text-center cursor-default transition-all ${
                      unlocked ? `bg-gradient-to-br ${badge.color}` : "bg-muted/30 border-border/30 opacity-40 grayscale"
                    }`}>
                    <div className="text-2xl mb-1">{badge.icon}</div>
                    <div className="text-xs font-bold leading-tight">{badge.label}</div>
                    {unlocked && <div className="text-[9px] text-muted-foreground mt-0.5">{badge.desc}</div>}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Portfolio */}
          <motion.div variants={item} className="card-premium">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-500" /> Your Portfolio
              </h2>
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="text-xs text-primary gap-1">
                  Edit <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="text-xs text-muted-foreground mb-1">Skills I Teach</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {((user as any).skillsOffered?.slice(0,3) || ["Add skills"]).map((s: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-medium">{s}</span>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="text-xs text-muted-foreground mb-1">Skills I Learn</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {((user as any).skillsWanted?.slice(0,3) || ["Add skills"]).map((s: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-medium">{s}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-medium">Rating: {user.trustScore >= 80 ? "4.9" : user.trustScore >= 60 ? "4.7" : "4.5"}/5</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Exchanges: {sessions?.length || 0}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <motion.div variants={item}><StreakWidget streak={streak} /></motion.div>

          {/* Quick actions */}
          <motion.div variants={item} className="card-premium">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Quick Actions
            </h3>
            <div className="space-y-2">
              {[
                { href: "/explore", icon: Compass, label: "Find a Mentor", color: "text-primary", bg: "bg-primary/10" },
                { href: "/sessions", icon: BookOpen, label: "My Sessions", color: "text-blue-500", bg: "bg-blue-500/10" },
                { href: "/wallet", icon: Wallet, label: "View Wallet", color: "text-green-500", bg: "bg-green-500/10" },
                { href: "/ai", icon: Sparkles, label: "Ask SkillAI", color: "text-purple-500", bg: "bg-purple-500/10" },
                { href: "/profile", icon: User, label: "Edit Profile", color: "text-orange-500", bg: "bg-orange-500/10" },
              ].map(a => (
                <Link key={a.href} href={a.href}>
                  <motion.div whileHover={{ x: 4 }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer group">
                    <div className={`w-8 h-8 rounded-lg ${a.bg} flex items-center justify-center`}>
                      <a.icon className={`w-4 h-4 ${a.color}`} />
                    </div>
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">{a.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Credit tips */}
          <motion.div variants={item} className="card-premium bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Earn More Credits
            </h3>
            <div className="space-y-2 text-sm">
              {[
                { action: "Teach a session", credits: "+10", done: (sessions?.length || 0) > 0 },
                { action: "Complete profile", credits: "+5", done: !!user.bio },
                { action: "Get 5-star rating", credits: "+15", done: user.trustScore > 80 },
                { action: "7-day streak", credits: "+20", done: streak >= 7 },
                { action: "Refer a friend", credits: "+25", done: false },
              ].map(t => (
                <div key={t.action} className={`flex items-center justify-between ${t.done ? "opacity-50 line-through" : ""}`}>
                  <div className="flex items-center gap-2">
                    {t.done ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Target className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className="text-muted-foreground">{t.action}</span>
                  </div>
                  <span className="font-bold text-primary text-xs">{t.credits}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

