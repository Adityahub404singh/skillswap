import Footer from "@/components/footer";
import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/store/auth";
import { useGetMe, useGetWallet } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useQuery } from "@tanstack/react-query";
import { 
  Wallet, BookOpen, Compass, LayoutDashboard, User, 
  Bot, Send, X, Star, MessageSquare, Sparkles, Bell, 
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion"; 

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { token } = useAuthStore();
  const apiOptions = useApiOptions();
  
  const isLandingPage = location === "/" || location === "/dashboard";
  
  const [aiOpen, setAiOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  
  const [aiMessages, setAiMessages] = useState([{ role: "ai", text: "Hi! I'm SkillAI ✨ How can I help you learn today?" }]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPulse, setAiPulse] = useState(true);
  
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: user } = useGetMe({ ...apiOptions, query: { enabled: !!token, queryKey: [] } });
  const { data: wallet } = useGetWallet({ ...apiOptions, query: { enabled: !!token, queryKey: [] } });

  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 15000,
  });
  
  const unreadCount = notifications?.filter((n: any) => !n.isRead)?.length || 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  useEffect(() => {
    const t = setTimeout(() => setAiPulse(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const sendAiMessage = async () => {
    if (!aiInput.trim()) return;
    const msg = aiInput.trim();
    setAiInput("");
    
    const currentHistory = [...aiMessages, { role: "user", text: msg }];
    setAiMessages(currentHistory);
    setAiLoading(true);
    
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg, history: currentHistory }),
      });
      const data = await res.json();
      setAiMessages(prev => [...prev, { role: "ai", text: data.reply }]);
    } catch {
      setAiMessages(prev => [...prev, { role: "ai", text: "Oops, network glitch! Try again." }]);
    }
    setAiLoading(false);
  };

  const sendFeedback = async () => { 
    if (!feedbackText.trim()) return; 
    try { 
      await fetch('/api/platform/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ rating: feedbackRating, text: feedbackText }) }); 
      setFeedbackSent(true); 
      setTimeout(() => { setFeedbackOpen(false); setFeedbackSent(false); setFeedbackText(''); setFeedbackRating(5); }, 2000); 
    } catch (err) { console.error(err); } 
  };

  // 🔥 FIX: Added 'icon:' before BookOpen
 const navLinks = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/discover", label: "Discover", icon: Sparkles }, // 🚀 YE NAYI LINE ADD HUI HAI
    { href: "/explore", label: "Search", icon: Compass }, // Iska naam thoda chhota kar diya
    { href: "/sessions", label: "Sessions", icon: BookOpen },
    { href: "/matches", label: "Chats", icon: MessageCircle },
    { href: "/profile", label: "Profile", icon: User }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] relative overflow-x-hidden">
      
      {/* 🚀 RESPONSIVE HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 relative">
            
            {/* Logo area */}
            <Link href="/" className="flex items-center gap-2 z-10">
              <div className="w-8 h-8 rounded-lg bg-[#6C3BFF] flex items-center justify-center">
                <span className="text-white font-black text-sm">S</span>
              </div>
              <span className="font-black text-xl text-slate-800">
                Skill<span className="text-[#6C3BFF]">Swap</span>
              </span>
            </Link>

            {/* 🚀 LAPTOP/DESKTOP NAVIGATION (Center aligned, hidden on mobile) */}
            {token && (
              <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location === link.href;
                  return (
                    <Link key={link.href} href={link.href} className={`flex items-center gap-1.5 text-sm font-bold transition-all ${isActive ? "text-[#6C3BFF] border-b-2 border-[#6C3BFF] pb-1 translate-y-[2px]" : "text-slate-500 hover:text-slate-800 pb-1 translate-y-[2px]"}`}>
                      {Icon && <Icon className="w-4 h-4" />}
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Right side actions */}
            <div className="flex items-center gap-3 z-10">
              {token && user ? (
                <>
                  <Link href="/wallet">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-sm">
                      <Wallet className="w-4 h-4" />
                      <span>{wallet?.balance ?? user.credits}</span>
                    </div>
                  </Link>
                  
                  <Link href="/notifications">
                    <div className="relative p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100">
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>
                  </Link>

                  {/* Profile icon visible only on Desktop (Mobile has it in bottom nav) */}
                  <Link href="/profile" className="hidden md:block">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 overflow-hidden border border-indigo-200">
                      {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <User className="w-4 h-4 m-auto mt-2 text-indigo-500" />}
                    </div>
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <Link href="/login" className="text-sm font-bold text-slate-600">Sign in</Link>
                  <Link href="/register"><Button className="rounded-full bg-[#6C3BFF] text-white h-8 text-xs font-bold px-4 hover:bg-[#5b32d6]">Start</Button></Link>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 relative z-10 pb-24 md:pb-8">
        {children}
      </main>

      {/* Floating AI & Feedback panels */}
      {token && isLandingPage && (
        <div className="fixed bottom-24 md:bottom-8 right-4 z-[90] flex flex-col items-end gap-3">
          {/* Feedback Modal */}
          {feedbackOpen && (
            <div className="w-72 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
              <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-white" />
                  <span className="text-white font-bold text-sm">Feedback</span>
                </div>
                <button onClick={() => setFeedbackOpen(false)}><X className="w-4 h-4 text-white" /></button>
              </div>
              {feedbackSent ? (
                <div className="p-6 text-center">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="font-bold text-green-600">Thanks for your feedback!</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  <p className="text-sm font-bold text-slate-700 text-center">How's your experience?</p>
                  <div className="flex gap-1 justify-center">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setFeedbackRating(s)}>
                        <Star className={`w-8 h-8 ${s <= feedbackRating ? 'fill-orange-500 text-orange-500' : 'text-slate-200'}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea placeholder="Tell us what you think..." value={feedbackText} onChange={e => setFeedbackText(e.target.value)} className="resize-none h-20 text-xs" />
                  <Button onClick={sendFeedback} className="w-full bg-slate-900 text-white rounded-xl">Submit Feedback</Button>
                </div>
              )}
            </div>
          )}

          {/* AI Modal */}
          {aiOpen && (
            <div className="w-[320px] bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-white" />
                  <div>
                    <p className="text-white font-black text-sm leading-none">SkillAI</p>
                    <p className="text-white/80 font-medium text-[10px] mt-0.5">Your assistant</p>
                  </div>
                </div>
                <button onClick={() => setAiOpen(false)}><X className="w-5 h-5 text-white" /></button>
              </div>

              <div className="h-64 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.role === "ai" && <Sparkles className="w-4 h-4 text-indigo-600 mt-1" />}
                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-[13px] shadow-sm ${msg.role === "ai" ? "bg-white text-slate-700" : "bg-[#6C3BFF] text-white"}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {aiLoading && <div className="text-xs text-slate-400">AI is thinking...</div>}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-3 border-t border-slate-100 bg-white flex gap-2">
                <Input placeholder="Ask SkillAI..." value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendAiMessage()} className="text-sm rounded-full" />
                <Button onClick={sendAiMessage} className="rounded-full w-10 p-0 bg-[#6C3BFF] hover:bg-[#5b32d6]"><Send className="w-4 h-4 ml-0.5" /></Button>
              </div>
            </div>
          )}

          {/* Floating Action Buttons */}
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3.5 }} className="flex gap-3">
            <button onClick={() => { setFeedbackOpen(!feedbackOpen); setAiOpen(false); }} className="w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center border border-slate-100">
              <MessageSquare className="w-5 h-5 text-slate-600" />
            </button>
            <div className="relative">
              {aiPulse && <div className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-75" />}
              <button onClick={() => { setAiOpen(!aiOpen); setFeedbackOpen(false); }} className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#6C3BFF] to-[#8B5CF6] shadow-xl flex items-center justify-center border-2 border-white">
                <Bot className="w-7 h-7 text-white" />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 🚀 MOBILE BOTTOM NAVIGATION (Hidden on laptop/desktop) */}
      {token && (
        <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.03)] z-50 pb-safe">
          <nav className="flex justify-around items-center h-[65px] px-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location === link.href;
              
              return (
                <Link key={link.href} href={link.href} className="flex flex-col items-center justify-center w-full h-full relative">
                  {isActive && <div className="absolute top-0 w-8 h-1 bg-[#6C3BFF] rounded-b-full"></div>}
                  {Icon && <Icon className={`w-6 h-6 mb-1 transition-colors ${isActive ? "text-[#6C3BFF]" : "text-gray-400"}`} />}
                  <span className={`text-[10px] ${isActive ? "text-[#6C3BFF] font-bold" : "text-gray-400 font-medium"}`}>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
      
      {/* 🚀 RESPONSIVE FOOTER LOGIC */}
      {!token ? (
        // Bina login ke sab jagah dikhega
        <Footer />
      ) : (
        // Login ke baad sirf Laptop/Desktop par dikhega, Mobile par bottom nav ke karan hide rahega
        <div className="hidden md:block mt-auto border-t border-gray-100 bg-white">
          <Footer />
        </div>
      )}
    </div>
  );
}