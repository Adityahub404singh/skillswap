import { useState, useEffect } from "react";
import { 
  Search, MoreVertical, Heart, MessageCircle, 
  Compass, CheckCircle2, Archive, Trash2, Sparkles,
  Clock, Star
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth";

// ─── helpers ─────────────────────────────────────────────────────────────────
const formatTime = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now  = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;

  if (diff < 60)        return "now";
  if (diff < 3600)      return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)     return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800)    return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

// ─── skeleton ────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="flex items-center gap-4 p-4 sm:p-5 border-b border-gray-50 last:border-0 animate-pulse">
    <div className="w-14 h-14 bg-slate-100 rounded-[16px] shrink-0" />
    <div className="flex-1 space-y-2.5">
      <div className="flex justify-between">
        <div className="h-4 bg-slate-100 rounded w-1/3" />
        <div className="h-3 bg-slate-50 rounded w-12" />
      </div>
      <div className="h-3 bg-slate-50 rounded w-2/3" />
    </div>
  </div>
);

// ─── main ────────────────────────────────────────────────────────────────────
export default function Matches() {
  const token = useAuthStore(s => s.token);

  const [searchQuery,    setSearchQuery]    = useState("");
  const [newMatches,     setNewMatches]     = useState<any[]>([]);
  const [conversations,  setConversations]  = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [showMenu,       setShowMenu]       = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [mRes, cRes] = await Promise.all([
          fetch("/api/discover/matches",      { headers }),
          fetch("/api/chat/conversations",    { headers }),
        ]);
        const mData = await mRes.json();
        const cData = await cRes.json();
        setNewMatches(Array.isArray(mData) ? mData : []);
        setConversations(Array.isArray(cData) ? cData : []);
      } catch (e) {
        console.error("Chats load error:", e);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchAll();
  }, [token]);

  const filtered = conversations.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // unread count
  const unreadCount = conversations.filter(c => c.unread > 0).length;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header & Search ───────────────────────────────────────────── */}
      <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-[#6C3BFF]" /> Chats
            </h1>
            {unreadCount > 0 && (
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {unreadCount} unread conversation{unreadCount > 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* 3-dot menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(v => !v)}
              className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-700"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-10 mt-1 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50"
                  >
                    <button className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#6C3BFF] flex items-center gap-2 transition-colors">
                      <CheckCircle2 className="w-4 h-4" /> Mark all read
                    </button>
                    <button className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-amber-500 flex items-center gap-2 transition-colors">
                      <Archive className="w-4 h-4" /> Archive chats
                    </button>
                    <div className="border-t border-gray-50 my-1" />
                    <button className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors">
                      <Trash2 className="w-4 h-4" /> Delete history
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Search */}
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full bg-slate-50 border border-slate-100 rounded-[16px] py-3 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#6C3BFF]/30 focus:ring-4 focus:ring-[#6C3BFF]/5 transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}
              className="absolute right-4 text-slate-400 hover:text-slate-600 text-xs font-bold">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── New Connections ───────────────────────────────────────────── */}
      <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100">
        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" /> New Connections
        </h2>

        {loading ? (
          <div className="flex gap-4 overflow-hidden animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="w-16 h-16 rounded-full bg-slate-100 shrink-0" />)}
          </div>
        ) : newMatches.length === 0 ? (
          <Link href="/explore">
            <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-[16px] border border-dashed border-slate-200 hover:border-[#6C3BFF]/40 hover:bg-indigo-50/50 transition-all cursor-pointer group">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm group-hover:bg-[#6C3BFF] transition-colors">
                <Compass className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              </div>
              <p className="text-sm font-bold text-slate-700">No new sparks yet</p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">Find a mentor to start chatting!</p>
            </div>
          </Link>
        ) : (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-2 px-2">
            {newMatches.map(m => (
              <Link key={m.id} href={`/chat/${m.id}`}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 w-[72px]">
                  <div className="relative w-16 h-16 rounded-full ring-2 ring-transparent hover:ring-[#6C3BFF]/30 p-0.5 transition-all">
                    <img
                      src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=6C3BFF&color=fff&bold=true`}
                      alt={m.name}
                      className="w-full h-full rounded-full object-cover shadow-sm"
                    />
                    <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 truncate w-full text-center">
                    {m.name?.split(" ")[0]}
                  </span>
                  {m.averageRating > 0 && (
                    <span className="text-[9px] text-amber-500 font-bold flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {m.averageRating}
                    </span>
                  )}
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Conversations ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> Recent Messages
            {conversations.length > 0 && (
              <span className="ml-auto text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                {conversations.length}
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <div>{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
              <MessageCircle className="w-7 h-7 text-slate-300" />
            </div>
            <h3 className="font-black text-slate-700 text-base mb-1">Your inbox is empty</h3>
            <p className="text-xs text-slate-400 font-medium mb-4">Book a session to start your first conversation.</p>
            <Link href="/explore">
              <button className="px-5 py-2.5 bg-[#6C3BFF] text-white text-xs font-bold rounded-full hover:bg-[#5b32d6] transition-colors flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" /> Find Mentors
              </button>
            </Link>
          </div>
        ) : filtered.length === 0 && searchQuery ? (
          <div className="p-8 text-center text-slate-400 text-sm font-medium">
            No chats found for "<span className="text-slate-600 font-bold">{searchQuery}</span>"
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-50">
            {filtered.map((c, idx) => (
              <Link key={c.id} href={`/chat/${c.id}`}>
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=6C3BFF&color=fff&bold=true`}
                      alt={c.name}
                      className="w-14 h-14 rounded-[16px] object-cover shadow-sm group-hover:shadow-md transition-shadow"
                    />
                    {/* Online dot */}
                    {c.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h3 className={`font-bold text-sm truncate pr-2 group-hover:text-[#6C3BFF] transition-colors ${c.unread > 0 ? "text-slate-900" : "text-slate-700"}`}>
                        {c.name}
                      </h3>
                      <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(c.created_at || c.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate flex-1 ${c.unread > 0 ? "text-slate-700 font-semibold" : "text-slate-400 font-medium"}`}>
                        {c.lastMessage || "Start a conversation..."}
                      </p>
                      {c.unread > 0 && (
                        <span className="shrink-0 w-5 h-5 bg-[#6C3BFF] text-white text-[9px] font-black rounded-full flex items-center justify-center">
                          {c.unread > 9 ? "9+" : c.unread}
                        </span>
                      )}
                    </div>
                    {/* Skills tags */}
                    {c.skillsTeach?.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {c.skillsTeach.slice(0, 2).map((s: string) => (
                          <span key={s} className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
