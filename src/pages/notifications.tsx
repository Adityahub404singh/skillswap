"use client";
import { useState } from "react";
import { Bell, CheckCheck, Zap, Calendar, Trophy, Flame, MessageSquare, Users, X } from "lucide-react";
import { Link } from "wouter";

const ICON_MAP: Record<string, React.ReactNode> = {
  match:   <Users size={14} className="text-violet-400" />,
  session: <Calendar size={14} className="text-blue-400" />,
  credit:  <Zap size={14} className="text-yellow-400" />,
  badge:   <Trophy size={14} className="text-amber-400" />,
  streak:  <Flame size={14} className="text-orange-400" />,
  message: <MessageSquare size={14} className="text-emerald-400" />,
  reminder:<Bell size={14} className="text-pink-400" />,
};

const BG_MAP: Record<string, string> = {
  match:   "bg-violet-500/10",
  session: "bg-blue-500/10",
  credit:  "bg-yellow-500/10",
  badge:   "bg-amber-500/10",
  streak:  "bg-orange-500/10",
  message: "bg-emerald-500/10",
  reminder:"bg-pink-500/10",
};

const MOCK_NOTIFS = [
  { id: 1, type: "match",    title: "🤝 New Match Found!", message: "Rahul Sharma (96% match) wants to exchange React for English. Don't miss it!", time: "2m ago",  unread: true,  actionUrl: "/matches" },
  { id: 2, type: "streak",   title: "🔥 7-Day Streak!", message: "You've been active for 7 days! +10 bonus credits added to your wallet.", time: "1h ago",  unread: true,  actionUrl: "/wallet" },
  { id: 3, type: "session",  title: "📅 Session Tomorrow", message: "Your React session with Rahul is tomorrow at 10 AM. Don't forget!", time: "3h ago",  unread: true,  actionUrl: "/sessions" },
  { id: 4, type: "credit",   title: "⚡ Credits Earned!", message: "You earned 10 credits for teaching TypeScript to Priya. Great job!", time: "5h ago",  unread: false, actionUrl: "/wallet" },
  { id: 5, type: "badge",    title: "🏆 New Badge Unlocked!", message: "You earned the 'Top Mentor' badge for completing 25+ sessions!", time: "1d ago",  unread: false, actionUrl: "/profile" },
  { id: 6, type: "reminder", title: "👋 Come back and learn!", message: "You haven't logged in for 2 days. Your match Priya is waiting to exchange UI/UX!", time: "2d ago",  unread: false, actionUrl: "/dashboard" },
  { id: 7, type: "match",    title: "⚡ Hot Match Alert!", message: "Vikram Singh (78% match) teaches Python. You teach React. Perfect exchange!", time: "2d ago",  unread: false, actionUrl: "/matches" },
  { id: 8, type: "reminder", title: "📚 Complete your profile", message: "Add 2 more teaching skills to get 3x more matches from our AI engine.", time: "3d ago",  unread: false, actionUrl: "/profile" },
];

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);
  const unread = notifs.filter(n => n.unread).length;

  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, unread: false })));
  }

  function dismiss(id: number) {
    setNotifs(prev => prev.filter(n => n.id !== id));
  }

  function markRead(id: number) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Bell size={22} className="text-violet-400" /> Notifications
            </h1>
            {unread > 0 && <p className="text-sm text-gray-400 mt-1">{unread} unread</p>}
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>

        {notifs.length === 0 ? (
          <div className="text-center py-20">
            <Bell size={32} className="mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500 text-sm">All caught up! No notifications.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map(notif => (
              <div
                key={notif.id}
                className={`group flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                  notif.unread
                    ? "bg-violet-500/5 border-violet-500/15 hover:border-violet-500/30"
                    : "bg-gray-900/40 border-white/5 hover:border-white/10"
                }`}
                onClick={() => markRead(notif.id)}
              >
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${BG_MAP[notif.type] ?? "bg-white/10"}`}>
                  {ICON_MAP[notif.type]}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium leading-tight ${notif.unread ? "text-white" : "text-gray-300"}`}>
                      {notif.title}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-gray-600">{notif.time}</span>
                      {notif.unread && <div className="w-2 h-2 bg-violet-400 rounded-full" />}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                  {notif.actionUrl && (
                    <Link href={notif.actionUrl}>
                      <span className="text-xs text-violet-400 hover:text-violet-300 mt-1.5 inline-block transition-colors">
                        View →
                      </span>
                    </Link>
                  )}
                </div>

                {/* Dismiss */}
                <button
                  onClick={e => { e.stopPropagation(); dismiss(notif.id); }}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-gray-400 transition-all shrink-0"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
