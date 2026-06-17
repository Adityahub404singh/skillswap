import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Zap, Calendar, Trophy, Flame, MessageSquare, Users, X, Settings, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";

const CFGS: Record<string, { color: string; bg: string; icon: any }> = {
  match:    { icon: Users,         color: "text-violet-500",  bg: "bg-violet-500/10" },
  session:  { icon: Calendar,      color: "text-blue-500",    bg: "bg-blue-500/10" },
  credit:   { icon: Zap,           color: "text-yellow-500",  bg: "bg-yellow-500/10" },
  badge:    { icon: Trophy,        color: "text-orange-500",  bg: "bg-orange-500/10" },
  streak:   { icon: Flame,         color: "text-red-500",     bg: "bg-red-500/10" },
  message:  { icon: MessageSquare, color: "text-green-500",   bg: "bg-green-500/10" },
  reminder: { icon: Bell,          color: "text-pink-500",    bg: "bg-pink-500/10" },
};

export default function Notifications() {
  const token = useAuthStore(s => s.token);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    fetch("/api/notifications", { headers })
      .then(r => r.json())
      .then(data => { setNotifs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "PATCH", headers });
    setNotifs(p => p.map(n => ({ ...n, isRead: true })));
  };

  const markRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH", headers });
    setNotifs(p => p.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const dismiss = (id: number) => setNotifs(p => p.filter(n => n.id !== id));

  const unread = notifs.filter(n => !n.isRead).length;

  return (
    <div className="py-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" /> Notifications
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {loading ? "Loading..." : unread > 0 ? `${unread} unread` : "All caught up!"}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5" onClick={markAllRead}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border">
          <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold">All caught up!</p>
          <p className="text-sm text-muted-foreground mt-1">No notifications yet.</p>
          <p className="text-xs text-muted-foreground mt-2">Book a session or teach someone to get notified!</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {notifs.map(notif => {
              const cfg = CFGS[notif.type] ?? CFGS.reminder;
              const Icon = cfg.icon;
              return (
                <motion.div key={notif.id} layout
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}
                  className={`group flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                    !notif.isRead ? "bg-primary/5 border-primary/20 hover:border-primary/40" : "bg-background border-border hover:border-primary/20"
                  }`}
                  onClick={() => markRead(notif.id)}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold leading-tight ${!notif.isRead ? "" : "text-muted-foreground"}`}>
                        {notif.title}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                        {!notif.isRead && <div className="w-2 h-2 bg-primary rounded-full" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>
                    {notif.actionUrl && (
                      <Link href={notif.actionUrl}>
                        <span className="text-xs text-primary hover:underline mt-1.5 inline-block font-medium">View ?</span>
                      </Link>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); dismiss(notif.id); }}
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
