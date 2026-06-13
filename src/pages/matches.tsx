import React, { useState } from "react";
import { Search, MoreVertical, Heart, MessageCircle } from "lucide-react";

// Dummy Data
const NEW_MATCHES = [
  { id: 1, name: "Emma", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200", online: true },
  { id: 2, name: "Rahul", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200", online: false },
  { id: 3, name: "Priya", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200", online: true },
];

const MESSAGES = [
  {
    id: 1,
    name: "Emma Thompson",
    lastMessage: "Hi! I saw you want to learn Spanish. When are you free for a session?",
    time: "2m ago",
    unread: 2,
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
  },
  {
    id: 2,
    name: "Rahul Sharma",
    lastMessage: "Thanks for the React tips! The useContext hook makes sense now.",
    time: "1h ago",
    unread: 0,
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200",
  }
];

export default function Matches() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 items-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-sm border-x border-slate-100 flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-blue-600">Messages</h1>
          <MoreVertical className="text-slate-500 w-6 h-6 cursor-pointer" />
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search matches or messages..." 
              className="w-full bg-slate-100 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* New Matches Section */}
        <div className="px-4 py-2">
          <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-1">
            <Heart className="w-4 h-4 text-red-500 fill-current" /> New Matches
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {NEW_MATCHES.map((match) => (
              <div key={match.id} className="flex flex-col items-center flex-shrink-0 cursor-pointer">
                <div className="relative w-16 h-16 rounded-full border-2 border-blue-500 p-0.5 mb-1">
                  <img src={match.image} alt={match.name} className="w-full h-full rounded-full object-cover" />
                  {match.online && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <span className="text-xs font-medium text-slate-700">{match.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 mt-2">
          <h2 className="text-sm font-semibold text-slate-500 px-4 mb-2 flex items-center gap-1">
            <MessageCircle className="w-4 h-4 text-blue-500" /> Recent Conversations
          </h2>
          
          <div className="flex flex-col">
            {MESSAGES.map((msg) => (
              <div key={msg.id} className="flex items-center gap-3 p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 transition-colors">
                <img src={msg.image} alt={msg.name} className="w-14 h-14 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold text-slate-900 truncate">{msg.name}</h3>
                    <span className="text-xs text-slate-400">{msg.time}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <p className={`text-sm truncate ${msg.unread > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                      {msg.lastMessage}
                    </p>
                    {msg.unread > 0 && (
                      <span className="w-5 h-5 bg-blue-600 text-white text-xs flex items-center justify-center rounded-full flex-shrink-0">
                        {msg.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
