import React, { useState, useEffect } from "react";
import { 
  Search, MoreVertical, Heart, MessageCircle, 
  Compass, CheckCircle2, Archive, Trash2 
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

// Helper for professional date formatting
const formatTime = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Skeleton Loader Component for premium feel
const SkeletonCard = () => (
  <div className="flex items-center gap-4 p-4 sm:p-5 border-b border-gray-50 last:border-0 animate-pulse">
    <div className="w-14 h-14 bg-slate-100 rounded-[16px] shrink-0"></div>
    <div className="flex-1 space-y-2.5">
      <div className="flex justify-between">
        <div className="h-4 bg-slate-100 rounded w-1/3"></div>
        <div className="h-3 bg-slate-50 rounded w-12"></div>
      </div>
      <div className="h-3 bg-slate-50 rounded w-2/3"></div>
    </div>
  </div>
);

export default function Matches() {
  const [searchQuery, setSearchQuery] = useState("");
  const [newMatches, setNewMatches] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // 🔥 FIX: token nikalo aur Authorization header attach karo —
        // pehle yeh fetch calls bina token ke jaa rahi thi, isliye 401 aata tha
        const token = localStorage.getItem("skillswap_token");
        const authHeaders = { Authorization: `Bearer ${token}` };

        const [mRes, cRes] = await Promise.all([
          fetch("/api/discover/matches", { headers: authHeaders }),
          fetch("/api/chat/conversations", { headers: authHeaders })
        ]);
        const mData = await mRes.json();
        const cData = await cRes.json();
        
        setNewMatches(Array.isArray(mData) ? mData : []);
        setConversations(Array.isArray(cData) ? cData : []);
      } catch (e) {
        console.error("Chats Load Error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const filteredConversations = conversations.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
      
      {/* 🌟 Header & Search Card */}
      <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100">
        <div className="flex justify-between items-center mb-5">
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-[#6C3BFF]" /> Chats
          </h1>
          
          {/* 3-Dot Menu */}
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-700"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-10 mt-1 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50"
                  >
                    <button className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#6C3BFF] flex items-center gap-2 transition-colors">
                      <CheckCircle2 className="w-4 h-4" /> Mark all read
                    </button>
                    <button className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-amber-500 flex items-center gap-2 transition-colors">
                      <Archive className="w-4 h-4" /> Archive Chats
                    </button>
                    <div className="border-t border-gray-50 my-1"></div>
                    <button className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors">
                      <Trash2 className="w-4 h-4" /> Delete history
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search conversations..." 
            className="w-full bg-slate-50 border border-slate-100 rounded-[16px] py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#6C3BFF]/30 focus:ring-4 focus:ring-[#6C3BFF]/5 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 🌟 New Matches Section */}
      <div className="bg-white rounded-[24px] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100">
        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" /> New Connections
        </h2>
        
        {loading ? (
          <div className="flex gap-4 animate-pulse overflow-hidden">
            {[1, 2, 3, 4].map(i => <div key={i} className="w-16 h-16 rounded-full bg-slate-100 shrink-0"></div>)}
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
            {newMatches.map((m) => (
              <Link key={m.id} href={`/book/${m.id}`}>
                <div className="flex flex-col items-center gap-2 cursor-pointer group shrink-0 w-[72px]">
                  <div className="relative w-16 h-16 rounded-full ring-2 ring-transparent group-hover:ring-[#6C3BFF]/30 p-0.5 transition-all">
                    <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}&background=6C3BFF&color=fff`} className="w-full h-full rounded-full object-cover shadow-sm" />
                    <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 truncate w-full text-center group-hover:text-[#6C3BFF] transition-colors">
                    {m.name.split(' ')[0]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 🌟 Inbox Section */}
      <div className="bg-white rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-50 bg-white sticky top-0 z-10">
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> Recent Messages
          </h2>
        </div>
        
        {loading ? (
          <div>{[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}</div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
            <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-black text-slate-800 text-lg mb-1">Your inbox is empty</h3>
            <p className="text-xs font-medium text-slate-500">Book a session to start your first conversation.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredConversations.map((c) => (
              <Link key={c.id} href={`/chat/${c.id}`}>
                <div className="flex items-center gap-4 p-4 sm:p-5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 group">
                  <div className="relative shrink-0">
                    <img src={c.avatar || `https://ui-avatars.com/api/?name=${c.name}&background=6C3BFF&color=fff`} className="w-14 h-14 rounded-[16px] object-cover shadow-sm group-hover:shadow-md transition-shadow" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-sm text-slate-800 truncate pr-2 group-hover:text-[#6C3BFF] transition-colors">{c.name}</h3>
                      <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{formatTime(c.created_at)}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 truncate">{c.lastMessage}</p>
                  </div>
                </div>
              </Link>
            ))}
            
            {/* Show if search yields no results */}
            {filteredConversations.length === 0 && searchQuery && (
              <div className="p-8 text-center text-slate-500 text-sm font-medium">
                No chats found for "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
