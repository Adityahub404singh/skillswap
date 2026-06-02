import { Link } from "wouter";
import { useGetMe, useGetMySessions } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { format } from "date-fns";
import { motion, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Wallet, Star, CheckCircle, Clock, BookOpen, Compass, ArrowRight, TrendingUp, Zap, User, Trophy, Target, Sparkles, Calendar, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const options = useApiOptions();
  const { data: user, isLoading: userLoading } = useGetMe(options);
  const { data: sessions, isLoading: sessionsLoading } = useGetMySessions({ status: "accepted" }, options);

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user.name.split(" ")[0];

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="py-6 space-y-6">

      {/* ── Hero welcome banner ── */}
      <motion.div
        variants={item}
        className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-white shadow-2xl"
        style={{ background: "linear-gradient(135deg, #5B5BF6 0%, #7c3aed 50%, #06b6d4 100%)" }}
      >
        {/* Decorative blobs */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 7, repeat: Infinity, delay: 1 }}
          className="absolute bottom-0 right-40 w-48 h-48 bg-black/10 rounded-full blur-2xl -mb-16 pointer-events-none"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-white/70 text-sm font-medium mb-1"
            >
              {greeting} 👋
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-4xl font-black mb-3"
            >
              Welcome back, {firstName}!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/80 text-base max-w-md"
            >
              You have{" "}
              <span className="text-white font-bold text-lg">{user.credits} credits</span> — that's{" "}
              <span className="text-white font-bold">{Math.floor(user.credits / 10)} hours</span> of learning available.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-3"
          >
            <Link href="/explore">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-full font-bold h-11 px-6 shadow-lg">
                  <Zap className="w-4 h-4 mr-2" /> Find a Mentor
                </Button>
              </motion.div>
            </Link>
            <Link href="/wallet">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full font-bold h-11 px-6 backdrop-blur-sm">
                  <Wallet className="w-4 h-4 mr-2" /> Wallet
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Onboarding (only if no sessions) ── */}
      {user.sessionsCompleted === 0 && (
        <motion.div
          variants={item}
          className="border border-primary/20 bg-primary/5 rounded-2xl p-6"
        >
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Get started in 3 steps
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { n: "1", title: "Add your skills", desc: "Go to Profile → add what you can teach and want to learn", href: "/profile" },
              { n: "2", title: "Find a mentor", desc: "Go to Explore → click any skill → book a session", href: "/explore" },
              { n: "3", title: "Join the session", desc: "Sessions → wait for mentor to accept → click Join Meeting", href: "/sessions" },
            ].map(step => (
              <Link key={step.n} href={step.href}>
                <motion.div
                  whileHover={{ y: -2, borderColor: "rgba(91,91,246,0.4)" }}
                  className="flex gap-3 items-start p-4 rounded-xl border border-border bg-background cursor-pointer transition-colors hover:bg-primary/5"
                >
                  <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {step.n}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{step.title}</p>
                    <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Stats row ── */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Wallet, label: "Balance", value: user.credits, unit: "cr", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
          { icon: Trophy, label: "Trust Score", value: user.trustScore, unit: "/ 100", color: "text-violet-500", bg: "bg-violet-500/10", border: "border-violet-500/20" },
          { icon: CheckCircle, label: "Sessions Done", value: user.sessionsCompleted, unit: "", color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" },
          { icon: Star, label: "Avg Rating", value: user.averageRating?.toFixed(1) || "—", unit: "/ 5", color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className={`p-5 rounded-2xl bg-background border ${stat.border} flex items-center gap-4 cursor-default hover:shadow-md transition-all duration-200`}
          >
            <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
              <p className="text-xl font-black">
                {stat.value}
                <span className="text-xs text-muted-foreground font-normal ml-1">{stat.unit}</span>
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upcoming sessions */}
        <motion.div variants={item} className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Upcoming Sessions
            </h2>
            <Link href="/sessions" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {sessionsLoading ? (
            [...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : upcomingSessions.length > 0 ? (
            <div className="space-y-3">
              {upcomingSessions.map((session, i) => {
                const isMentor = session.mentorId === user.id;
                const other = isMentor ? session.student : session.mentor;
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ x: 4 }}
                    className="p-5 rounded-2xl bg-background border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center"
                  >
                    <div className="flex gap-3 items-center">
                      <div className="w-11 h-11 rounded-full bg-muted overflow-hidden border border-border flex-shrink-0">
                        {other?.avatar
                          ? <img src={other.avatar} alt={other.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground">{other?.name?.charAt(0)}</div>
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${isMentor ? "bg-violet-500/10 text-violet-600" : "bg-primary/10 text-primary"}`}>
                            {isMentor ? "Teaching" : "Learning"}
                          </span>
                          <span className="font-bold text-sm">{session.skill}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          with <span className="font-medium text-foreground">{other?.name}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="text-sm text-right flex-1 sm:flex-none">
                        <p className="font-semibold">{format(new Date(session.scheduledDate), "MMM d, yyyy")}</p>
                        <p className="text-muted-foreground text-xs">{format(new Date(session.scheduledDate), "h:mm a")}</p>
                      </div>
                      <Link href="/sessions">
                        <Button variant="outline" size="sm" className="rounded-full text-xs">Details</Button>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-10 rounded-2xl border border-dashed border-border bg-muted/20 text-center"
            >
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              </motion.div>
              <p className="font-semibold mb-1">No upcoming sessions</p>
              <p className="text-muted-foreground text-sm mb-4">Book a session to start learning!</p>
              <Link href="/explore">
                <Button size="sm" className="rounded-full">Explore Skills</Button>
              </Link>
            </motion.div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { href: "/explore", icon: Compass, label: "Find Mentors", color: "text-primary", bg: "bg-primary/5 hover:bg-primary/10 border-primary/20" },
              { href: "/ai", icon: Sparkles, label: "Ask SkillAI", color: "text-violet-500", bg: "bg-violet-500/5 hover:bg-violet-500/10 border-violet-500/20" },
            ].map(a => (
              <Link key={a.href} href={a.href}>
                <motion.div
                  whileHover={{ y: -2 }}
                  className={`flex items-center gap-3 p-4 rounded-2xl border ${a.bg} cursor-pointer transition-all duration-200`}
                >
                  <a.icon className={`w-5 h-5 ${a.color}`} />
                  <span className="font-semibold text-sm">{a.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Skills sidebar */}
        <motion.div variants={item} className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-violet-500" />
            My Skills
          </h2>

          <div className="p-5 rounded-2xl bg-background border border-border space-y-5">
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" /> Teaching
              </h3>
              {user.skillsTeach?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.skillsTeach.map((skill: string, i: number) => (
                    <motion.span
                      key={skill}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.08 }}
                      className="px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-600 font-medium text-xs rounded-lg cursor-default"
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              ) : (
                <Link href="/profile">
                  <p className="text-xs text-muted-foreground italic hover:text-primary cursor-pointer transition-colors">
                    + Add skills you can teach
                  </p>
                </Link>
              )}
            </div>

            <div className="h-px bg-border" />

            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <BookOpen className="w-3 h-3" /> Learning
              </h3>
              {user.skillsLearn?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.skillsLearn.map((skill: string, i: number) => (
                    <motion.span
                      key={skill}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.08 }}
                      className="px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary font-medium text-xs rounded-lg cursor-default"
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              ) : (
                <Link href="/profile">
                  <p className="text-xs text-muted-foreground italic hover:text-primary cursor-pointer transition-colors">
                    + Add skills you want to learn
                  </p>
                </Link>
              )}
            </div>

            <div className="h-px bg-border" />

            {/* Trust score progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Trust Score</h3>
                <span className="text-sm font-black text-primary">{user.trustScore}<span className="text-xs text-muted-foreground font-normal">/100</span></span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${user.trustScore}%` }}
                  transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {user.trustScore < 30 ? "Complete sessions to build trust" : user.trustScore < 70 ? "Growing nicely! Keep going" : "Excellent standing 🎉"}
              </p>
            </div>

            <Link href="/profile">
              <motion.div whileHover={{ x: 4 }}>
                <Button variant="ghost" className="w-full justify-between text-muted-foreground text-sm h-9">
                  <span className="flex items-center gap-2"><User className="w-4 h-4" /> Edit Profile</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
