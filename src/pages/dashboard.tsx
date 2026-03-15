import { Link } from "wouter";
import { useGetMe, useGetMySessions } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { format } from "date-fns";
import { motion, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Wallet, Star, CheckCircle, Clock, BookOpen, Compass, ArrowRight, TrendingUp, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const options = useApiOptions();
  const { data: user, isLoading: userLoading } = useGetMe(options);
  const { data: sessions, isLoading: sessionsLoading } = useGetMySessions({ status: "accepted" }, options);

  const upcomingSessions = sessions?.filter(s => new Date(s.scheduledDate) > new Date()).slice(0, 3) || [];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } as any }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } as any }
  };

  if (userLoading) {
    return (
      <div className="py-8 space-y-8">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants} className="py-6 space-y-8">

      {/* Welcome Hero */}
      <motion.div
        variants={itemVariants}
        whileHover={{ scale: 1.01 }}
        className="bg-gradient-to-r from-primary to-accent rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden"
      >
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 7, repeat: Infinity, delay: 1 }}
          className="absolute bottom-0 right-32 w-48 h-48 bg-black/10 rounded-full blur-2xl -mb-16"
        />
        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              Welcome back, {user.name.split(' ')[0]}! 👋
            </h1>
            <p className="text-white/80 text-lg max-w-xl mb-8">
              You have <strong className="text-white">{user.credits} credits</strong> available. That's{" "}
              <strong className="text-white">{Math.floor(user.credits / 10)} hours</strong> of learning you can book right now.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-wrap gap-4">
            <Link href="/explore">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-full font-bold h-12 px-6">
                  <Zap className="w-4 h-4 mr-2" /> Find a Mentor
                </Button>
              </motion.div>
            </Link>
            <Link href="/wallet">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full font-bold h-12 px-6 backdrop-blur-sm">
                  View Wallet
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Wallet, color: "primary", label: "Balance", value: `${user.credits}`, unit: "cr" },
          { icon: Star, color: "accent", label: "Trust Score", value: `${user.trustScore}`, unit: "/ 100" },
          { icon: CheckCircle, color: "green-500", label: "Completed", value: `${user.sessionsCompleted}`, unit: "" },
          { icon: Star, color: "orange-500", label: "Rating", value: user.averageRating?.toFixed(1) || 'N/A', unit: "" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.05, y: -4 }}
            className="card-premium flex items-center gap-4 cursor-default"
          >
            <motion.div whileHover={{ rotate: 10 }} className={`w-12 h-12 rounded-full bg-${stat.color}/10 flex items-center justify-center flex-shrink-0`}>
              <stat.icon className={`w-6 h-6 text-${stat.color}`} />
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              <p className="text-2xl font-bold">
                {stat.value} <span className="text-sm text-muted-foreground font-normal">{stat.unit}</span>
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Upcoming Sessions */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" /> Upcoming Sessions
            </h2>
            <Link href="/sessions" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-4">
            {sessionsLoading ? (
              [...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
            ) : upcomingSessions.length > 0 ? (
              upcomingSessions.map((session, i) => {
                const isMentor = session.mentorId === user.id;
                const otherPerson = isMentor ? session.student : session.mentor;
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="card-premium flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-5"
                  >
                    <div className="flex gap-4 items-center">
                      <motion.div whileHover={{ scale: 1.1 }} className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0 border border-border">
                        {otherPerson.avatar ? (
                          <img src={otherPerson.avatar} alt={otherPerson.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-bold">
                            {otherPerson.name.charAt(0)}
                          </div>
                        )}
                      </motion.div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${isMentor ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                            {isMentor ? 'Teaching' : 'Learning'}
                          </span>
                          <span className="font-bold">{session.skill}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          with <span className="font-medium text-foreground">{otherPerson.name}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="text-sm font-medium text-right flex-1 sm:flex-none">
                        <p>{format(new Date(session.scheduledDate), 'MMM d, yyyy')}</p>
                        <p className="text-muted-foreground">{format(new Date(session.scheduledDate), 'h:mm a')}</p>
                      </div>
                      <Link href="/sessions">
                        <Button variant="outline" size="sm" className="rounded-full">Details</Button>
                      </Link>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-premium p-8 text-center bg-muted/30 border-dashed">
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                  <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                </motion.div>
                <p className="text-lg font-medium mb-1">No upcoming sessions</p>
                <p className="text-muted-foreground mb-4">Book a session to learn something new!</p>
                <Link href="/explore">
                  <Button size="sm" className="rounded-full">Explore Skills</Button>
                </Link>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* My Skills */}
        <motion.div variants={itemVariants} className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Compass className="w-6 h-6 text-accent" /> My Skills
          </h2>
          <motion.div whileHover={{ scale: 1.01 }} className="card-premium space-y-6">
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Teaching
              </h3>
              {user.skillsTeach.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.skillsTeach.map((skill, i) => (
                    <motion.span key={skill} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} whileHover={{ scale: 1.1 }}
                      className="px-3 py-1.5 bg-accent/10 border border-accent/20 text-accent-foreground font-medium text-sm rounded-lg cursor-default">
                      {skill}
                    </motion.span>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground italic">No skills listed to teach.</p>}
            </div>
            <div className="w-full h-px bg-border/50" />
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Learning
              </h3>
              {user.skillsLearn.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.skillsLearn.map((skill, i) => (
                    <motion.span key={skill} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} whileHover={{ scale: 1.1 }}
                      className="px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary-foreground font-medium text-sm rounded-lg cursor-default">
                      {skill}
                    </motion.span>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground italic">No skills listed to learn.</p>}
            </div>
            <motion.div whileHover={{ x: 4 }}>
              <Button variant="ghost" className="w-full justify-between mt-2 text-muted-foreground">
                Edit Profile <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
