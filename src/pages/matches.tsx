import React, { useState, useEffect } from "react";
import { 
  Search, MoreVertical, Heart, MessageCircle, Sparkles, 
  UserPlus, Compass, CheckCircle2, Archive, Trash2 
} from "lucide-react";
import { Link } from "wouter";

// Helper for professional date formatting
const formatTime = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Skeleton Loader Component for professional feel
const SkeletonCard = () => (
  <div className="flex items-center gap-4 px-6 py-4 animate-pulse">
    <div className="w-14 h-14 bg-slate-100 rounded-2xl"></div>
    <div className="flex-1 space-y-3">
      <div className="h-4 bg-slate-100 rounded w-1/3"></div>
      <div className="h-3 bg-slate-100 rounded w-2/3"></div>
    </div>
  </div>
);

export default function Matches() {
  const [searchQuery, setSearchQuery] = useState("");
  const [newMatches, setNewMatches] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false); // Menu State

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [mRes, cRes] = await Promise.all([
          fetch("http://localhost:5000/api/discover/matches"),
          fetch("http://localhost:5000/api/chat/conversations")
        ]);
        const mData = await mRes.json();
        const cData = await cRes.json();
        
        setNewMatches(Array.isArray(mData) ? mData : []);
        setConversations(Array.isArray(cData) ? cData : []);
      } catch (e) {
        console.error("Dashboard Load Error:", e);
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
    <div className="flex flex-col min-h-screen bg-slate-50 items-center font-sans">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl border-x border-slate-100 flex flex-col">
        
        {/* Professional Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-50">
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Messages
          </h1>
          
          {/* 3-Dot Menu */}
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <MoreVertical className="text-slate-400 w-6 h-6" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                <div className="absolute right-0 top-12 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in duration-200">
                  <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> Mark all read
                  </button>
                  <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                    <Archive className="w-4 h-4 text-amber-500" /> Archive Chats
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors">
                    <Trash2 className="w-4 h-4" /> Delete history
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4">
          <div className="relative group">
            <Search className="absolute left-4 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full bg-slate-100/50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* New Matches Section (The Hint Design) */}
        <div className="px-6 pb-6 border-b border-slate-50">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500 fill-current" /> New Connections
          </h2>
          
          {loading ? (
             <div className="flex gap-4 animate-pulse"><div className="w-16 h-16 rounded-full bg-slate-100"></div></div>
          ) : newMatches.length === 0 ? (
            <Link href="/discover">
              <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                   <Compass className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                </div>
                <p className="text-sm font-semibold text-slate-600">No new sparks yet</p>
                <p className="text-[11px] text-slate-400">Keep swiping to find your mentor!</p>
              </div>
            </Link>
          ) : (
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {newMatches.map((m) => (
                <Link key={m.id} href={`/book/${m.id}`}>
                  <div className="flex flex-col items-center gap-2 cursor-pointer group">
                    <div className="relative w-16 h-16 rounded-full ring-2 ring-blue-100 ring-offset-2 p-0.5 transition-transform group-hover:scale-105">
                      <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-full h-full rounded-full object-cover" />
                      <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></span>
                    </div>
                    <span className="text-xs font-bold text-slate-700">{m.name.split(' ')[0]}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Inbox Section */}
        <div className="flex-1 mt-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-6 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Inbox
          </h2>
          
          {loading ? (
             [1, 2, 3].map((i) => <SkeletonCard key={i} />)
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-10 p-6 text-center">
              <MessageCircle className="w-12 h-12 text-slate-200 mb-4" />
              <h3 className="font-bold text-slate-700">No messages yet</h3>
              <p className="text-sm text-slate-400">Start learning by booking a session with a match!</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredConversations.map((c) => (
                <Link key={c.id} href={`/chat/${c.id}`}>
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-blue-50/50 cursor-pointer transition-all border-b border-slate-50 last:border-0">
                    <img src={c.avatar || `https://ui-avatars.com/api/?name=${c.name}`} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-bold text-slate-800">{c.name}</h3>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{formatTime(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-500 truncate">{c.lastMessage}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}