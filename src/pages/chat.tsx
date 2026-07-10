import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { 
  ArrowLeft, Send, Phone, Video, 
  Smile, CheckCheck, Clock, Sparkles, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth";

// --- types -------------------------------------------------------------------
interface Message {
  id: number | string;
  sender_id?: number | string;
  senderId?: number | string;
  receiver_id?: number | string;
  content: string;
  created_at: string;
  pending?: boolean;
}

interface Partner {
  id: number;
  name: string;
  avatar?: string;
  image?: string;
  skillsTeach?: string[];
  trustScore?: number;
  averageRating?: number;
  isVerified?: boolean;
}

// 🔥 HELPER: JWT Token se direct ID nikalne ke liye
function getUserIdFromToken(token: string | null) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const decoded = JSON.parse(jsonPayload);
    return decoded.userId || decoded.id || decoded.sub; 
  } catch (e) {
    return null;
  }
}

// 🔥 THE MASTER TIMEZONE FIX (Localhost ke liye 5.5 hours automatically add karega)
function getSafeDate(dateStr: string) {
  if (!dateStr) return new Date();
  let d = new Date(dateStr);
  
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
     d = new Date(d.getTime() + (5.5 * 60 * 60 * 1000)); 
  }
  return d;
}

function formatTime(dateStr: string) {
  if (!dateStr) return "";
  return getSafeDate(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = getSafeDate(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = "";
  messages.forEach((msg) => {
    const date = formatDate(msg.created_at);
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ date, messages: [] });
    }
    groups[groups.length - 1].messages.push(msg);
  });
  return groups;
}

// --- main component ----------------------------------------------------------
export default function Chat() {
  const params        = useParams();
  const otherUserId   = params.id;
  
  const token         = useAuthStore(s => s.token);
  const user          = useAuthStore(s => s.user);
  
  const currentUserId = getUserIdFromToken(token) || user?.id || (user as any)?.userId || (user as any)?.data?.id || 1;

  const [messages,       setMessages]       = useState<Message[]>([]);
  const [inputText,      setInputText]      = useState("");
  const [partner,        setPartner]        = useState<Partner | null>(null);
  const [isOnline,       setIsOnline]       = useState(true);
  const [partnerTyping,  setPartnerTyping]  = useState(false);
  const [showInfo,       setShowInfo]       = useState(false);
  const [sending,        setSending]        = useState(false);

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  // -- fetch partner --------------------------------------------------------
  const fetchPartner = useCallback(async () => {
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/discover/profiles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const found = (Array.isArray(data) ? data : data.profiles ?? [])
        .find((p: any) => String(p.id) === String(otherUserId));
      if (found) setPartner(found);
      else {
        const r2   = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/users/${otherUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r2.ok) setPartner(await r2.json());
      }
    } catch (e) { console.error("partner fetch", e); }
  }, [otherUserId, token]);

  // -- fetch messages -------------------------------------------------------
  const fetchMessages = useCallback(async () => {
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/chat/${otherUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(prev => {
          const serverIds = new Set(data.map((m: Message) => m.id));
          // 🔥 Preserve pending messages that haven't been resolved yet
          const filtered  = prev.filter(m => m.pending && !serverIds.has(m.id));
          return [...data, ...filtered];
        });
      }
    } catch (e) {
      setIsOnline(false);
    }
  }, [otherUserId, token]);

  useEffect(() => {
    fetchPartner();
    fetchMessages();
    
    pollRef.current = setInterval(() => {
      if (document.visibilityState === "visible") fetchMessages();
    }, 10000);
    
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchPartner, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [inputText]);

  // -- send (🔥 FAST PERFORMANCE FIX) ----------------------------------------
  const sendMessage = async () => {
    const content = inputText.trim();
    if (!content || sending) return;
    setSending(true);

    const tempId  = `temp_${Date.now()}`;
    const tempMsg: Message = {
      id:         tempId,
      sender_id:  currentUserId,
      content,
      created_at: new Date().toISOString(),
      pending:    true,
    };
    
    setMessages(prev => [...prev, tempMsg]);
    setInputText("");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ receiverId: Number(otherUserId), content }),
      });
      const resData = await res.json();
      
      if (resData.success && resData.data) {
        // 🔥 DIRECT SWAP: temp message ki jagah backend wala asli message
        setMessages(prev => prev.map(m => m.id === tempId ? resData.data : m));
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        await fetchMessages();
      }
    } catch (e) {
      console.error("send failed", e);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
    setSending(false);
  };

  const grouped = groupByDate(messages);
  const avatarUrl = partner?.avatar || partner?.image
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(partner?.name || "User")}&background=6C3BFF&color=fff&bold=true`;

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="flex flex-col flex-1 bg-[#F1F5F9] sm:bg-white sm:border border-gray-100 rounded-[24px] shadow-sm overflow-hidden">
        
        {/* -- Header ---------------------------------------------------------- */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <Link href="/matches">
              <button className="p-2 -ml-2 hover:bg-slate-100 text-slate-500 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>

            <button onClick={() => setShowInfo(v => !v)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="relative">
                <img src={avatarUrl} alt={partner?.name || "User"}
                  className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-300"}`} />
              </div>
              <div className="text-left">
                <h2 className="font-bold text-[15px] text-slate-900 leading-tight flex items-center gap-1">
                  {partner?.name || "Loading..."}
                  {partner?.isVerified && <Shield className="w-3.5 h-3.5 text-[#6C3BFF] fill-indigo-100" />}
                </h2>
                <p className={`text-[11px] font-semibold tracking-wide uppercase ${isOnline ? "text-emerald-500" : "text-slate-400"}`}>
                  {partnerTyping ? "typing..." : isOnline ? "online" : "offline"}
                </p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-1 text-[#6C3BFF]">
            <button className="p-2 hover:bg-indigo-50 rounded-full transition-colors">
              <Phone className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-indigo-50 rounded-full transition-colors">
              <Video className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* -- Messages Area --------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#E5DDD5]/10 space-y-1.5 scrollbar-hide">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
              <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-[#6C3BFF]" />
              </div>
              <div>
                <p className="font-black text-slate-700">Start a conversation!</p>
              </div>
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.date}>
              <div className="flex items-center justify-center my-4">
                <span className="text-[11px] font-bold text-slate-500 bg-white/60 px-3 py-1 rounded-full shadow-sm">
                  {group.date}
                </span>
              </div>

              <div className="space-y-1">
                {group.messages.map((msg, idx) => {
                  const isMe = String(msg.sender_id) === String(currentUserId) || String((msg as any).senderId) === String(currentUserId);
                  
                  const prevMsg   = group.messages[idx - 1];
                  const nextMsg   = group.messages[idx + 1];
                  
                  const prevIsMe  = prevMsg ? (String(prevMsg.sender_id) === String(currentUserId) || String((prevMsg as any).senderId) === String(currentUserId)) : null;
                  const nextIsMe  = nextMsg ? (String(nextMsg.sender_id) === String(currentUserId) || String((nextMsg as any).senderId) === String(currentUserId)) : null;
                  
                  const isFirstInGroup = prevIsMe !== isMe;
                  const isLastInGroup = nextIsMe !== isMe;

                  return (
                    <motion.div key={msg.id}
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.1 }}
                      className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-1.5`}
                    >
                      {!isMe && (
                        <div className="w-6 h-6 flex-shrink-0">
                          {isLastInGroup && (
                            <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-gray-200 shadow-sm" />
                          )}
                        </div>
                      )}

                      <div className={`relative max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`px-3.5 py-2 shadow-sm text-[14.5px] leading-snug break-words whitespace-pre-wrap ${
                          isMe
                            ? "bg-[#6C3BFF] text-white"
                            : "bg-white text-slate-800 border border-gray-100"
                        } ${
                          isMe 
                            ? `rounded-l-2xl ${isFirstInGroup ? 'rounded-tr-2xl' : 'rounded-tr-md'} ${isLastInGroup ? 'rounded-br-sm' : 'rounded-br-md'}` 
                            : `rounded-r-2xl ${isFirstInGroup ? 'rounded-tl-2xl' : 'rounded-tl-md'} ${isLastInGroup ? 'rounded-bl-sm' : 'rounded-bl-md'}`
                        } ${msg.pending ? "opacity-70" : ""}`}>
                          {msg.content}
                          
                          <div className={`inline-flex items-center gap-1 mt-1 ml-3 float-right ${isMe ? "text-indigo-200" : "text-slate-400"}`}>
                            <span className="text-[10px] font-medium leading-none">
                              {formatTime(msg.created_at)}
                            </span>
                            {isMe && (
                              msg.pending 
                                ? <Clock className="w-3 h-3" /> 
                                : <CheckCheck className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* -- Input Area ------------------------------------------------------ */}
        <div className="px-3 py-3 bg-slate-50 border-t border-gray-200 shrink-0">
          <div className="flex items-end gap-2 bg-white rounded-[24px] px-3 py-1.5 border border-gray-300 shadow-sm focus-within:border-[#6C3BFF] transition-all">
            <button className="p-2 text-slate-400 hover:text-slate-600 shrink-0 mb-0.5">
              <Smile className="w-6 h-6" />
            </button>

            <textarea
              ref={textareaRef}
              placeholder="Type a message..."
              className="flex-1 bg-transparent min-h-[40px] max-h-[120px] py-2.5 px-1 outline-none text-slate-800 text-[15px] resize-none placeholder:text-slate-400 leading-tight"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              rows={1}
            />

            <AnimatePresence mode="wait">
              {inputText.trim() ? (
                <motion.button
                  key="send"
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                  onClick={sendMessage}
                  disabled={sending}
                  className="w-10 h-10 shrink-0 bg-[#6C3BFF] text-white rounded-full flex items-center justify-center hover:bg-[#5b32d6] mb-0.5 shadow-md"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </motion.button>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}