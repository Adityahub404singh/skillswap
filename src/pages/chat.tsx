import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Send, Phone, Video, MoreVertical, Image as ImageIcon, Smile, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth";

export default function Chat() {
  const params = useParams();
  const otherUserId = params.id;
  
  // Real Auth Context
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const currentUserId = user?.id || 1; // Fallback to 1 if user object isn't fully loaded

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [partner, setPartner] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/${otherUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Helper to get partner details (You can replace this if you have a specific /api/users/:id endpoint)
  const fetchPartnerDetails = async () => {
    try {
      const res = await fetch("/api/discover/profiles", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const found = data.find((p: any) => p.id === Number(otherUserId));
      if (found) setPartner(found);
    } catch (error) {
      console.error("Error fetching partner details:", error);
    }
  };

  useEffect(() => {
    fetchPartnerDetails();
    fetchMessages();
    
    // Polling every 3 seconds for new messages
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [otherUserId]);

  useEffect(() => {
    // Smooth auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    // Optimistic UI update (shows message instantly before backend confirms)
    const tempMsg = {
      id: Date.now(),
      sender_id: currentUserId,
      receiver_id: Number(otherUserId),
      content: inputText.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    setInputText("");

    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ receiverId: Number(otherUserId), content: tempMsg.content }),
      });
      fetchMessages(); // Sync with backend
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Format Time for messages
  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#F8FAFC] border-x border-slate-200 shadow-2xl font-sans relative overflow-hidden">
      
      {/* 🌟 Background Pattern (Subtle Doodles/Texture) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

      {/* 🌟 Glassmorphic Header */}
      <div className="p-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/matches">
            <button className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
          </Link>
          
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <img 
                src={partner?.avatar || partner?.image || `https://ui-avatars.com/api/?name=${partner?.name || 'User'}`} 
                alt="Avatar" 
                className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
            <div>
              <h2 className="font-black text-lg text-slate-800 leading-tight">{partner?.name || "Match"}</h2>
              <p className="text-xs font-bold text-green-500 tracking-wide">Online</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-indigo-600">
          <button className="p-2 hover:bg-indigo-50 rounded-full transition-colors"><Phone className="w-5 h-5" /></button>
          <button className="p-2 hover:bg-indigo-50 rounded-full transition-colors"><Video className="w-5 h-5" /></button>
          <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><MoreVertical className="w-5 h-5" /></button>
        </div>
      </div>

      {/* 🌟 Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 scrollbar-hide">
        
        {/* Date Separator Placeholder */}
        <div className="flex justify-center my-4">
          <span className="bg-slate-200/50 text-slate-500 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-sm">
            Today
          </span>
        </div>

        <AnimatePresence initial={false}>
          {messages.map((msg: any) => {
            const isMe = msg.sender_id === currentUserId || msg.senderId === currentUserId; // Handling both naming conventions just in case
            
            return (
              <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                layout
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div className={`relative max-w-[75%] px-4 py-2.5 flex flex-col shadow-sm ${
                  isMe 
                    ? "bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-2xl rounded-tr-sm" 
                    : "bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-sm"
                }`}>
                  <span className="text-[15px] leading-relaxed break-words">{msg.content}</span>
                  
                  {/* Timestamp & Read Receipt */}
                  <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? "text-indigo-100" : "text-slate-400"}`}>
                    <span className="text-[10px] font-medium">{formatTime(msg.created_at)}</span>
                    {isMe && <CheckCheck className="w-3 h-3" />}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* 🌟 Premium Input Area */}
      <div className="p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
        <div className="flex items-end gap-2 bg-slate-100/80 rounded-[2rem] p-1.5 border border-slate-200/60 focus-within:border-indigo-300 focus-within:bg-white transition-all shadow-inner">
          
          <button className="p-3 text-slate-400 hover:text-indigo-500 transition-colors shrink-0">
            <Smile className="w-6 h-6" />
          </button>
          
          <textarea 
            placeholder="Message..." 
            className="flex-1 bg-transparent max-h-32 min-h-[44px] py-3 px-2 outline-none text-slate-700 resize-none placeholder:text-slate-400"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            rows={1}
          />
          
          {inputText.trim() ? (
            <motion.button 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={sendMessage} 
              className="w-11 h-11 shrink-0 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-full flex items-center justify-center hover:shadow-lg hover:shadow-indigo-500/30 transition-all mb-0.5 mr-0.5"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </motion.button>
          ) : (
            <button className="p-3 text-slate-400 hover:text-indigo-500 transition-colors shrink-0 mb-0.5 mr-0.5">
              <ImageIcon className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
