import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { 
  ArrowLeft, Send, Phone, Video, MoreVertical, 
  Smile, CheckCheck, Check, Sparkles, BookOpen,
  Star, Shield, Clock, Wifi, WifiOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth";

// ─── types ───────────────────────────────────────────────────────────────────
interface Message {
  id: number | string;
  sender_id?: number;
  senderId?: number;
  receiver_id?: number;
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

// ─── helpers ─────────────────────────────────────────────────────────────────
function formatTime(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
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

// ─── main component ──────────────────────────────────────────────────────────
export default function Chat() {
  const params        = useParams();
  const otherUserId   = params.id;
  const token         = useAuthStore(s => s.token);
  const user          = useAuthStore(s => s.user);
  const currentUserId = user?.id || 1;

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

  // ── fetch partner ────────────────────────────────────────────────────────
  const fetchPartner = useCallback(async () => {
    try {
      const res  = await fetch("/api/discover/profiles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const found = (Array.isArray(data) ? data : data.profiles ?? [])
        .find((p: any) => p.id === Number(otherUserId));
      if (found) setPartner(found);
      else {
        // fallback — fetch single user
        const r2   = await fetch(`/api/users/${otherUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r2.ok) setPartner(await r2.json());
      }
    } catch (e) { console.error("partner fetch", e); }
  }, [otherUserId, token]);

  // ── fetch messages ───────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    try {
      const res  = await fetch(`/api/chat/${otherUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(prev => {
          // remove optimistic duplicates
          const serverIds = new Set(data.map((m: Message) => m.id));
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
    
    // 🔥 10X EXPERT FIX: Polling ONLY runs if the browser tab is currently visible
    pollRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchMessages();
      }
    }, 10000);
    
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchPartner, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  // ── auto-grow textarea ───────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [inputText]);

  // ── send ─────────────────────────────────────────────────────────────────
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
      await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ receiverId: Number(otherUserId), content }),
      });
      await fetchMessages();
    } catch (e) {
      console.error("send failed", e);
    }
    setSending(false);
  };

  const grouped = groupByDate(messages);
  const avatarUrl = partner?.avatar || partner?.image
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(partner?.name || "User")}&background=6C3BFF&color=fff&bold=true`;

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-80px)] flex flex-col">

      {/* ── Container ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 bg-white border border-gray-100 rounded-[24px] shadow-sm overflow-hidden">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/matches">
              <button className="p-2 -ml-1 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>

            <button onClick={() => setShowInfo(v => !v)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="relative">
                <img src={avatarUrl} alt={partner?.name || "User"}
                  className="w-10 h-10 rounded-full object-cover border-2 border-indigo-100 shadow-sm" />
                <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-300"}`} />
              </div>
              <div className="text-left">
                <h2 className="font-black text-sm text-slate-800 leading-tight flex items-center gap-1">
                  {partner?.name || "Loading..."}
                  {partner?.isVerified && <Shield className="w-3 h-3 text-indigo-500 fill-indigo-100" />}
                </h2>
                <p className={`text-[10px] font-bold tracking-wide uppercase ${isOnline ? "text-emerald-500" : "text-slate-400"}`}>
                  {partnerTyping ? "typing..." : isOnline ? "online" : "offline"}
                </p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-1 text-[#6C3BFF]">
            <button className="p-2 hover:bg-indigo-50 rounded-full transition-colors" title="Voice call">
              <Phone className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-indigo-50 rounded-full transition-colors" title="Video call">
              <Video className="w-5 h-5" />
            </button>
            <button onClick={() => setShowInfo(v => !v)}
              className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Partner Info Panel (slide-down) ───────────────────────────────── */}
        <AnimatePresence>
          {showInfo && partner && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="bg-indigo-50/60 border-b border-indigo-100 overflow-hidden"
            >
              <div className="px-4 py-3 flex flex-wrap gap-3 items-center">
                {partner.averageRating ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {partner.averageRating}/5
                  </span>
                ) : null}
                {partner.trustScore ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                    <Shield className="w-3 h-3" /> Trust {partner.trustScore}
                  </span>
                ) : null}
                {(partner.skillsTeach ?? []).slice(0, 4).map((s: string) => (
                  <span key={s} className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                    <BookOpen className="w-3 h-3 text-indigo-400" /> {s}
                  </span>
                ))}
                <Link href={`/mentor/${partner.id}`}>
                  <span className="text-xs font-bold text-[#6C3BFF] underline underline-offset-2 cursor-pointer">
                    View profile →
                  </span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Offline Banner ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
              className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-bold text-red-600">No connection — messages will sync when back online</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Messages Area ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#F8FAFC] space-y-1 scrollbar-hide">

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
              <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-[#6C3BFF]" />
              </div>
              <div>
                <p className="font-black text-slate-700">Start a conversation!</p>
                <p className="text-sm text-slate-400 mt-1">Say hi to {partner?.name || "your match"} 👋</p>
              </div>
            </div>
          )}

          {/* Grouped messages */}
          {grouped.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                  {group.date}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="space-y-1">
                {group.messages.map((msg, idx) => {
                  const isMe      = msg.sender_id === currentUserId || (msg as any).senderId === currentUserId;
                  const prevMsg   = group.messages[idx - 1];
                  const prevIsMe  = prevMsg && (prevMsg.sender_id === currentUserId || (prevMsg as any).senderId === currentUserId);
                  const showAvatar = !isMe && prevIsMe !== false;
                  const isLast    = idx === group.messages.length - 1;

                  return (
                    <motion.div key={msg.id}
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.15 }}
                      className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2`}
                    >
                      {/* Avatar for other person */}
                      {!isMe && (
                        <div className="w-7 h-7 flex-shrink-0">
                          {showAvatar && (
                            <img src={avatarUrl} alt=""
                              className="w-7 h-7 rounded-full object-cover border border-indigo-100" />
                          )}
                        </div>
                      )}

                      {/* Bubble */}
                      <div className={`relative max-w-[72%] group ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                        <div className={`px-4 py-2.5 shadow-sm ${
                          isMe
                            ? "bg-[#6C3BFF] text-white rounded-[18px] rounded-tr-sm"
                            : "bg-white border border-gray-100 text-slate-800 rounded-[18px] rounded-tl-sm"
                        } ${msg.pending ? "opacity-70" : ""}`}>
                          <p className="text-[14px] font-medium leading-relaxed break-words whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>

                        {/* Time + status */}
                        {isLast && (
                          <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
                            <span className="text-[9px] font-semibold text-slate-400">
                              {formatTime(msg.created_at)}
                            </span>
                            {isMe && (
                              msg.pending
                                ? <Clock className="w-3 h-3 text-slate-300" />
                                : <CheckCheck className="w-3 h-3 text-indigo-400" />
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          <AnimatePresence>
            {partnerTyping && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-end gap-2 justify-start">
                <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-indigo-100" />
                <div className="bg-white border border-gray-100 rounded-[18px] rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                        className="w-1.5 h-1.5 rounded-full bg-slate-400"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} className="h-2" />
        </div>

        {/* ── Input Area ────────────────────────────────────────────────────── */}
        <div className="px-3 py-3 bg-white border-t border-gray-100 shrink-0">
          <div className={`flex items-end gap-2 bg-[#F8FAFC] rounded-[20px] px-3 py-2 border transition-all ${
            inputText ? "border-[#6C3BFF]/40 bg-white shadow-sm" : "border-gray-200"
          }`}>

            <button className="p-1.5 text-slate-400 hover:text-[#6C3BFF] transition-colors shrink-0 mb-0.5">
              <Smile className="w-5 h-5" />
            </button>

            <textarea
              ref={textareaRef}
              placeholder={`Message ${partner?.name || ""}...`}
              className="flex-1 bg-transparent min-h-[38px] max-h-[120px] py-2 px-1 outline-none text-slate-700 text-sm font-medium resize-none placeholder:text-slate-400 leading-relaxed"
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
                  initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
                  onClick={sendMessage}
                  disabled={sending}
                  className="w-9 h-9 shrink-0 bg-[#6C3BFF] text-white rounded-full flex items-center justify-center hover:bg-[#5b32d6] transition-colors mb-0.5 shadow-sm disabled:opacity-60"
                >
                  {sending
                    ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                        className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
                    : <Send className="w-3.5 h-3.5 ml-0.5" />
                  }
                </motion.button>
              ) : (
                <motion.div key="idle"
                  initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
                  className="w-9 h-9 shrink-0 flex items-center justify-center mb-0.5">
                  <Wifi className="w-4 h-4 text-slate-300" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="text-[10px] text-slate-300 text-center mt-1.5 font-medium">
            Enter to send • Shift+Enter for new line
          </p>
        </div>

      </div>
    </div>
  );
}
