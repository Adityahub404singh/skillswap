import { useAuthStore } from "@/store/auth";
import { useGetMe, useGetMySessions } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { Link } from "wouter";
import { format } from "date-fns";
import { motion, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, Brain, HelpCircle, Coins, 
  Calendar, ChevronRight, Clock, Flame, 
  Star, Wallet, ArrowRight, BookOpen
} from "lucide-react";

export default function Dashboard() {
  const options = useApiOptions();
  const { token } = useAuthStore();
  const { data: user, isLoading: userLoading } = useGetMe({ ...options, query: { enabled: !!token, queryKey: [] } });
  const { data: sessions, isLoading: sessionsLoading } = useGetMySessions({ status: "accepted" }, options);

  // Animations
  const container: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  if (userLoading) {
    return (
      <div className="py-6 space-y-6">
        <Skeleton className="h-48 w-full rounded-[24px]" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-[20px]" />)}
        </div>
        <Skeleton className="h-24 w-full rounded-[20px]" />
      </div>
    );
  }

  if (!user) return null;

  // Data processing
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const firstName = user.name?.split(" ")[0] || "Learner";
  const streak = (user as any)?.currentStreak ?? 0;
  const trustLevel = user?.trustScore >= 90 ? "Expert" : user?.trustScore >= 70 ? "Advanced" : user?.trustScore >= 50 ? "Intermediate" : "Beginner";
  
  const upcomingSessions = sessions?.filter((s: any) => new Date(s.scheduledDate) > new Date()).slice(0, 3) || [];

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="space-y-6">
      
      {/* 1. HERO CARD (Clean Solid Gradient, No Glassmorphism) */}
      <motion.div variants={item} className="bg-gradient-to-br from-[#6C3BFF] to-[#8B5CF6] rounded-[24px] p-6 text-white shadow-md relative overflow-hidden">
        {/* Abstract background shape for premium feel */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10">
          <p className="text-white/80 text-sm font-medium flex items-center gap-1.5 mb-1">
            {greeting} 👋
          </p>
          <h1 className="text-3xl font-black capitalize leading-tight">
            {firstName}
          </h1>
          
          {/* Stats Bar */}
          <div className="flex flex-wrap gap-3 mt-6">
            <div className="bg-black/15 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold border border-white/10">
              <Wallet className="w-3.5 h-3.5 text-white/90" />
              {user.credits || 0} cr
            </div>
            <div className="bg-black/15 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold border border-white/10">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              Trust {user.trustScore || 0}
            </div>
            <div className="bg-black/15 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold border border-white/10">
              <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
              {streak} Day Streak
            </div>
          </div>

          {/* Minimal Progress Bar */}
          <div className="mt-5">
            <div className="flex justify-between text-[10px] font-bold text-white/70 mb-1.5">
              <span>Level Progress</span>
              <span>75%</span>
            </div>
            <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: "75%" }} 
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. QUICK ACTIONS (2x2 Grid) */}
      <motion.div variants={item} className="grid grid-cols-2 gap-4">
        <Link href="/explore">
          <motion.div whileTap={{ scale: 0.96 }} className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center text-center gap-2 cursor-pointer">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-[#6C3BFF]">
              <Search className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Find Mentor</span>
          </motion.div>
        </Link>

        <Link href="/quiz">
          <motion.div whileTap={{ scale: 0.96 }} className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center text-center gap-2 cursor-pointer">
            <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-[#F59E0B]">
              <Brain className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Start Quiz</span>
          </motion.div>
        </Link>

        <Link href="/flash-board">
          <motion.div whileTap={{ scale: 0.96 }} className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center text-center gap-2 cursor-pointer">
            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-[#8B5CF6]">
              <HelpCircle className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Ask Doubt</span>
          </motion.div>
        </Link>

        <Link href="/buy-credits">
          <motion.div whileTap={{ scale: 0.96 }} className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center text-center gap-2 cursor-pointer">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-[#22C55E]">
              <Coins className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Earn Credits</span>
          </motion.div>
        </Link>
      </motion.div>

      {/* 3. DAILY CHALLENGE (Compact Card, Not a Giant Banner) */}
      <motion.div variants={item}>
        <Link href="/quiz">
          <motion.div whileTap={{ scale: 0.98 }} className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 flex-shrink-0">
                <Flame className="w-5 h-5 fill-orange-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  Daily Skill Quiz <span className="bg-[#F59E0B] text-white text-[9px] px-1.5 py-0.5 rounded-sm">LIVE</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Answer 10 Qs. Earn 20 cr!</p>
              </div>
            </div>
            <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
              <ChevronRight className="w-4 h-4" />
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* 4. CONTINUE LEARNING */}
      <motion.div variants={item} className="pb-4">
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="font-bold text-slate-800">Continue Learning</h3>
          <Link href="/sessions" className="text-xs font-bold text-[#6C3BFF] hover:underline">View All</Link>
        </div>
        
        {upcomingSessions.length === 0 ? (
          <div className="bg-white p-6 rounded-[20px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center">
            <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-500 text-sm font-medium mb-3">No upcoming sessions</p>
            <Link href="/explore">
              <Button size="sm" className="bg-[#6C3BFF] text-white rounded-full h-8 px-4 text-xs font-bold">
                Book a Session
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map((session: any) => (
              <div key={session.id} className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-[#6C3BFF]">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm truncate max-w-[150px]">
                      {session.skill?.name || "Learning Session"}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                      <Clock className="w-3 h-3" /> {format(new Date(session.scheduledDate), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
                <Button size="sm" className="bg-[#6C3BFF] text-white rounded-full h-8 text-xs font-bold">
                  Join
                </Button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

    </motion.div>
  );
}