import Footer from "@/components/footer";
import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/store/auth";
import { useGetMe, useGetWallet } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useQuery } from "@tanstack/react-query";
import { 
  LogOut, Wallet, BookOpen, Compass, LayoutDashboard, User, 
  Bot, Send, X, Heart, Star, MessageSquare, Sparkles, Bell, 
  Zap, Trophy, Flame, Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"; 

// Capacitor Plugins for Native Feel
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { token, logout } = useAuthStore();
  const apiOptions = useApiOptions();
  
  // Check if current page is Landing or Dashboard
  const isLandingPage = location === "/" || location === "/dashboard";
  
  // UI States
  const [aiOpen, setAiOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 

  // AI States
  const [aiMessages, setAiMessages] = useState([{ role: "ai", text: "Hi! I'm SkillAI ✨ How can I help you learn today?" }]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPulse, setAiPulse] = useState(true);
  
  // Feedback States
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

  // Scroll AI chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  useEffect(() => {
    const t = setTimeout(() => setAiPulse(false), 3000);
    return () => clearTimeout(t);
  }, []);

  // Close sidebar automatically when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isSidebarOpen]);

  const handleLogout = () => { logout(); setLocation("/"); };

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

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/discover", label: "Discover", icon: Heart },
    { href: "/sessions", label: "Sessions", icon: BookOpen },
    { href: "/matches", label: "Chats", icon: MessageCircle },
    { href: "/quiz", label: "Earn", icon: Flame, isSpecial: true },
    { href: "/flash-board", label: "Doubts", icon: Zap },
    { href: "/leaderboard", label: "Rank", icon: Trophy },
    { href: "/ai", label: "SkillAI", icon: Bot }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-x-hidden">
      
      {/* Abstract Backgrounds */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.15]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/40 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] bg-accent/40 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] bg-secondary/60 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
      </div>

      <header className="sticky top-0 z-40 glass-effect border-b border-border/40 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            
            <div className="flex items-center gap-3">
              {token && (
                <button 
                  onClick={() => {
                    setIsSidebarOpen(true);
                    if (Capacitor.isNativePlatform()) Haptics.impact({ style: ImpactStyle.Light }).catch(()=>{});
                  }}
                  className="lg:hidden p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-full active:scale-95 transition-all"
                >
                  <Menu className="w-6 h-6" />
                </button>
              )}

              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 group-hover:scale-105 transition-transform duration-300 drop-shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className="w-full h-full">
                    <rect width="48" height="48" rx="12" fill="#5B5BF6"/>
                    <path d="M13 18 C13 13 18 11 22 11 C26 11 31 13 31 18 C31 23 26 25 22 25" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round"/>
                    <polyline points="27,14 31,18 27,22" stroke="#ffffff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M35 30 C35 35 30 37 26 37 C22 37 17 35 17 30 C17 25 22 23 26 23" stroke="#a5a5ff" strokeWidth="3.5" strokeLinecap="round"/>
                    <polyline points="21,34 17,30 21,26" stroke="#a5a5ff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="hidden sm:block font-display font-black text-xl sm:text-2xl tracking-tight text-slate-800">
                  Skill<span className="text-indigo-600">Swap</span>
                </span>
              </Link>
            </div>

            {token ? (
              <nav className="hidden lg:flex items-center space-x-1">
                {navLinks.map((link: any) => {
                  const Icon = link.icon;
                  const isActive = location === link.href;

                  if (link.isSpecial) {
                    return (
                      <Link key={link.href} href={link.href} className="mx-2">
                        <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all cursor-pointer font-bold text-sm">
                           <Flame className="w-4 h-4 fill-white" /> {link.label}
                        </div>
                      </Link>
                    );
                  }

                  return (
                    <Link key={link.href} href={link.href} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${isActive ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}

            <div className="flex items-center gap-2 sm:gap-4">
              {token && user ? (
                <>
                  <Link href="/wallet">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer shadow-sm">
                      <Wallet className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-sm sm:text-base">{wallet?.balance ?? user.credits} <span className="hidden sm:inline">cr</span></span>
                    </div>
                  </Link>
                  
                  <Link href="/notifications">
                    <div className="relative p-2 text-slate-500 hover:text-slate-800 transition-colors rounded-full hover:bg-slate-100 cursor-pointer">
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>

                  <div className="h-6 sm:h-8 w-px bg-slate-200 hidden sm:block" />
                  
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-sm font-bold text-slate-800 leading-none">{user.name}</span>
                      <span className="text-[11px] font-semibold text-slate-500 mt-1">Score: {user.trustScore}</span>
                    </div>
                    <Link href={`/profile`}>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-200 cursor-pointer overflow-hidden shadow-sm hover:scale-105 transition-transform">
                        {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-indigo-500" />}
                      </div>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">Sign in</Link>
                  <Link href="/register"><Button className="rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-md font-bold">Get Started</Button></Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isSidebarOpen && token && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] lg:hidden"
            />
            
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-[101] shadow-2xl flex flex-col lg:hidden overflow-hidden rounded-r-3xl"
            >
              {user && (
                <div className="p-6 bg-gradient-to-br from-indigo-50 to-white border-b border-indigo-50 flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-lg overflow-hidden mb-3">
                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-indigo-400" />}
                  </div>
                  <h3 className="font-black text-xl text-slate-800">{user.name}</h3>
                  <p className="text-xs font-bold text-indigo-500 bg-indigo-100 px-3 py-1 rounded-full mt-2">Trust Score: {user.trustScore}</p>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {navLinks.map((link: any) => {
                  const Icon = link.icon;
                  const isActive = location === link.href;

                  return (
                    <Link key={link.href} href={link.href}>
                      <div 
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold transition-all active:scale-95 ${
                          isActive 
                            ? (link.isSpecial ? "bg-orange-500 text-white shadow-md" : "bg-indigo-600 text-white shadow-md") 
                            : (link.isSpecial ? "text-orange-500 hover:bg-orange-50" : "text-slate-600 hover:bg-slate-50")
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${link.isSpecial && isActive ? "fill-white" : ""}`} />
                        {link.label}
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button 
                  onClick={() => {
                    handleLogout();
                    setIsSidebarOpen(false);
                  }} 
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-red-500 font-bold bg-white border border-red-100 shadow-sm active:scale-95 transition-all"
                >
                  <LogOut className="w-5 h-5" /> Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 relative z-10 pb-24 md:pb-12">
        {children}
      </main>

      <Footer />

      {/* 🔥 Floating AI & Feedback panels - SIRF LANDING YA DASHBOARD PE DIKHEGA */}
      {token && isLandingPage && (
        <div className="fixed bottom-24 lg:bottom-6 right-4 z-[90] flex flex-col items-end gap-3">
          {feedbackOpen && (
            <div className="w-72 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
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
                        <Star className={`w-8 h-8 transition-colors ${s <= feedbackRating ? 'fill-orange-500 text-orange-500' : 'text-slate-200'}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea placeholder="Tell us what you think..." value={feedbackText} onChange={e => setFeedbackText(e.target.value)} className="resize-none h-20 text-xs bg-slate-50 border-slate-200" />
                  <Button onClick={sendFeedback} className="w-full h-10 font-bold bg-slate-900 text-white rounded-xl">Submit Feedback</Button>
                </div>
              )}
            </div>
          )}

          {aiOpen && (
            <div className="w-[320px] bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-black text-sm leading-none">SkillAI</p>
                    <p className="text-white/80 font-medium text-[10px] mt-0.5">Your learning assistant</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setAiOpen(false); setFeedbackOpen(true); }} title="Feedback">
                    <Star className="w-4 h-4 text-white/80 hover:text-white" />
                  </button>
                  <button onClick={() => setAiOpen(false)}><X className="w-5 h-5 text-white" /></button>
                </div>
              </div>

              <div className="px-3 pt-3 pb-1 flex gap-2 flex-wrap bg-slate-50">
                {["Suggest Mentor", "How to Earn?", "App Guide"].map(s => (
                  <button key={s} onClick={() => setAiInput(s)}
                    className="px-3 py-1.5 bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold rounded-full hover:bg-indigo-200 transition-colors">
                    {s}
                  </button>
                ))}
              </div>

              <div className="h-64 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.role === "ai" && (
                      <div className="w-7 h-7 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center flex-shrink-0 mt-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                    )}
                    <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm ${msg.role === "ai" ? "bg-white text-slate-700 rounded-tl-sm border border-slate-100" : "bg-indigo-600 text-white rounded-tr-sm"}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center mt-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="bg-white border border-slate-100 shadow-sm px-4 py-2.5 rounded-2xl rounded-tl-sm text-slate-500 flex gap-1.5 items-center">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-3 border-t border-slate-100 bg-white flex gap-2">
                <Input placeholder="Ask SkillAI..." value={aiInput} onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendAiMessage()} className="text-sm h-10 rounded-full bg-slate-50 border-slate-200" />
                <Button onClick={sendAiMessage} className="rounded-full h-10 w-10 p-0 flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 shadow-md">
                  <Send className="w-4 h-4 ml-0.5" />
                </Button>
              </div>
            </div>
          )}

          {/* 🔥 Floating Action Buttons (HILTA DULTA ANIMATION) */}
          <motion.div 
            animate={{ y: [0, -12, 0] }} 
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
            className="flex gap-3"
          >
            <button onClick={() => { setFeedbackOpen(!feedbackOpen); setAiOpen(false); }}
              className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all duration-200">
              <MessageSquare className="w-5 h-5 text-slate-600" />
            </button>
            <div className="relative">
              {aiPulse && (
                <div className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-75" />
              )}
              <button onClick={() => { setAiOpen(!aiOpen); setFeedbackOpen(false); }}
                className="relative w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl hover:shadow-indigo-500/30 hover:scale-110 active:scale-95 transition-all duration-200 border-2 border-white">
                <Bot className="w-7 h-7 text-white drop-shadow-md" />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {token && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-200/50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-safe">
          <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />
          <nav className="flex items-center justify-between gap-1 h-[70px] px-2 overflow-x-auto hide-scrollbar w-full">
            {navLinks.slice(0, 5).map((link: any) => {
              const Icon = link.icon;
              const isActive = location === link.href;
              
              return (
                <Link key={link.href} href={link.href} className={`flex flex-col items-center justify-center w-full flex-shrink-0 h-full ${isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-900"}`}>
                  <div className={`relative flex items-center justify-center w-12 h-8 rounded-full mb-1 transition-all ${isActive ? 'bg-indigo-100' : ''}`}>
                    <Icon className={`w-5 h-5 ${isActive ? "text-indigo-600 stroke-[2.5]" : "stroke-2"}`} />
                  </div>
                  <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}