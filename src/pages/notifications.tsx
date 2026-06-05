import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Zap, Calendar, Trophy, Flame, MessageSquare, Users, X, Settings } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const CFGS: Record<string, { color: string; bg: string; icon: any }> = {
  match:    { icon: Users,         color: "text-violet-500",  bg: "bg-violet-500/10" },
  session:  { icon: Calendar,      color: "text-blue-500",    bg: "bg-blue-500/10" },
  credit:   { icon: Zap,           color: "text-yellow-500",  bg: "bg-yellow-500/10" },
  badge:    { icon: Trophy,        color: "text-orange-500",  bg: "bg-orange-500/10" },
  streak:   { icon: Flame,         color: "text-red-500",     bg: "bg-red-500/10" },
  message:  { icon: MessageSquare, color: "text-green-500",   bg: "bg-green-500/10" },
  reminder: { icon: Bell,          color: "text-pink-500",    bg: "bg-pink-500/10" },
};

const INITIAL = [
  { id: 1, type: "badge",    title: "New Badge Unlocked!", message: "You earned Top Mentor badge for completing 25+ sessions!", time: "1h ago",  unread: true,  actionUrl: "/profile" },
  { id: 2, type: "session",  title: "Session Accepted",    message: "Priya Patel accepted your Python session for tomorrow at 5 PM.", time: "2h ago",  unread: true,  actionUrl: "/sessions" },
  { id: 3, type: "credit",   title: "Credits Earned!",     message: "You earned 80 credits for teaching React to Vikram Singh.", time: "3h ago",  unread: true,  actionUrl: "/wallet" },
  { id: 4, type: "match",    title: "Hot Match Alert!",    message: "Vikram (78% match) teaches Python. You teach React. Perfect exchange!", time: "5h ago",  unread: false, actionUrl: "/explore" },
  { id: 5, type: "streak",   title: "30-Day Streak! 🔥",   message: "You have been active for 30 days straight. Incredible!", time: "1d ago",  unread: false, actionUrl: "/leaderboard" },
  { id: 6, type: "reminder", title: "Come back and learn!",message: "You have not logged in for 2 days. Your match Priya is waiting!", time: "2d ago",  unread: false, actionUrl: "/dashboard" },
  { id: 7, type: "reminder", title: "Complete your profile",message: "Add 2 more teaching skills to get 3x more matches.", time: "3d ago",  unread: false, actionUrl: "/profile" },
];

export default function Notifications() {
  const [notifs, setNotifs] = useState(INITIAL);
  const unread = notifs.filter(n => n.unread).length;

  return (
    <div className="py-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Bell className="w-6 h-6 text-primary" /> Notifications</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{unread > 0 ? `${unread} unread` : "All caught up!"}</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5"
            onClick={() => setNotifs(p => p.map(n => ({...n, unread: false})))}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/15">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Bell className="w-4 h-4 text-primary" /></div>
          <div><p className="text-sm font-semibold">Stay notified</p><p className="text-xs text-muted-foreground">Get session reminders and match alerts</p></div>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5"><Settings className="w-3.5 h-3.5" /> Settings</Button>
      </div>

      {notifs.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border">
          <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold">All caught up!</p>
          <p className="text-sm text-muted-foreground mt-1">No notifications right now.</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {notifs.map(notif => {
              const cfg = CFGS[notif.type] ?? CFGS.reminder;
              const Icon = cfg.icon;
              return (
                <motion.div key={notif.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
                  className={`group flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${notif.unread ? "bg-primary/5 border-primary/20 hover:border-primary/40" : "bg-background border-border hover:border-primary/20"}`}
                  onClick={() => setNotifs(p => p.map(n => n.id === notif.id ? {...n, unread: false} : n))}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}><Icon className={`w-4 h-4 ${cfg.color}`} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold leading-tight ${notif.unread ? "" : "text-muted-foreground"}`}>{notif.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-muted-foreground">{notif.time}</span>
                        {notif.unread && <div className="w-2 h-2 bg-primary rounded-full" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>
                    <Link href={notif.actionUrl}><span className="text-xs text-primary hover:underline mt-1.5 inline-block font-medium">View →</span></Link>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setNotifs(p => p.filter(n => n.id !== notif.id)); }}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-all shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
