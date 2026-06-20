import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Send, Phone, Video, MoreVertical, Image as ImageIcon, Smile, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth";

export default function Chat() {
  const params = useParams();
  const otherUserId = params.id;
  
  // Auth Context
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const currentUserId = user?.id || 1;

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
    
    // Optimistic UI update (shows message instantly)
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
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 🌟 Premium Chat Container */}
      <div className="flex flex-col bg-white border border-gray-100 rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden h-[calc(100vh-140px)] relative">
        
        {/* 🌟 Clean Header */}
        <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/matches">
              <button className="p-2 -ml-2 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <img 
                  src={partner?.avatar || partner?.image || `https://ui-avatars.com/api/?name=${partner?.name || 'User'}&background=6C3BFF&color=fff`} 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div>
                <h2 className="font-black text-base text-slate-800 leading-tight">{partner?.name || "Match"}</h2>
                <p className="text-[10px] font-bold text-emerald-500 tracking-wide uppercase mt-0.5">Online</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[#6C3BFF]">
            <button className="p-2 hover:bg-indigo-50 rounded-full transition-colors"><Phone className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-indigo-50 rounded-full transition-colors"><Video className="w-5 h-5" /></button>
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"><MoreVertical className="w-5 h-5" /></button>
          </div>
        </div>

        {/* 🌟 Messages Area (Light Background) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 bg-[#F8FAFC] scrollbar-hide">
          
          {/* Date Separator */}
          <div className="flex justify-center my-4">
            <span className="bg-white border border-gray-100 text-slate-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
              Today
            </span>
          </div>

          <AnimatePresence initial={false}>
            {messages.map((msg: any) => {
              const isMe = msg.sender_id === currentUserId || msg.senderId === currentUserId; 
              
              return (
                <motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  layout
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div className={`relative max-w-[75%] px-4 py-3 flex flex-col shadow-sm ${
                    isMe 
                      ? "bg-[#6C3BFF] text-white rounded-[20px] rounded-tr-sm" 
                      : "bg-white border border-gray-100 text-slate-800 rounded-[20px] rounded-tl-sm"
                  }`}>
                    <span className="text-[14px] font-medium leading-relaxed break-words">{msg.content}</span>
                    
                    {/* Timestamp & Read Receipt */}
                    <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? "text-indigo-200" : "text-slate-400"}`}>
                      <span className="text-[9px] font-bold">{formatTime(msg.created_at)}</span>
                      {isMe && <CheckCheck className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} className="h-2" />
        </div>

        {/* 🌟 Clean Input Area */}
        <div className="p-3 md:p-4 bg-white border-t border-gray-100 shrink-0 z-20">
          <div className="flex items-end gap-2 bg-[#F8FAFC] rounded-[20px] p-1.5 border border-gray-200 focus-within:border-[#6C3BFF]/40 focus-within:bg-white transition-all shadow-inner">
            
            <button className="p-2.5 text-slate-400 hover:text-[#6C3BFF] transition-colors shrink-0">
              <Smile className="w-5 h-5" />
            </button>
            
            <textarea 
              placeholder="Type your message..." 
              className="flex-1 bg-transparent max-h-28 min-h-[40px] py-2.5 px-2 outline-none text-slate-700 text-sm font-medium resize-none placeholder:text-slate-400"
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
                className="w-10 h-10 shrink-0 bg-[#6C3BFF] text-white rounded-full flex items-center justify-center hover:bg-[#5b32d6] transition-colors mb-0.5 mr-0.5 shadow-sm"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </motion.button>
            ) : (
              <button className="p-2.5 text-slate-400 hover:text-[#6C3BFF] transition-colors shrink-0 mb-0.5 mr-0.5">
                <ImageIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}