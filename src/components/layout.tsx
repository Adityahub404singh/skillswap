import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuthStore } from "@/store/auth";
import { useGetMe, useGetWallet } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { LogOut, Wallet, BookOpen, Compass, LayoutDashboard, User, Bot, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Layout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { token, logout } = useAuthStore();
  const apiOptions = useApiOptions();
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([{ role: "ai", text: "Hi! I'm SkillAI 🤖 Ask me anything!" }]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const { data: user } = useGetMe({ ...apiOptions, query: { enabled: !!token, queryKey: [] } });
  const { data: wallet } = useGetWallet({ ...apiOptions, query: { enabled: !!token, queryKey: [] } });

  const handleLogout = () => { logout(); setLocation("/"); };

  const sendAiMessage = async () => {
    if (!aiInput.trim()) return;
    const msg = aiInput.trim();
    setAiInput("");
    setAiMessages(prev => [...prev, { role: "user", text: msg }]);
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      setAiMessages(prev => [...prev, { role: "ai", text: data.reply }]);
    } catch {
      setAiMessages(prev => [...prev, { role: "ai", text: "Sorry, something went wrong!" }]);
    }
    setAiLoading(false);
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/sessions", label: "Sessions", icon: BookOpen },
    { href: "/ai", label: "SkillAI", icon: Bot },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.15]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/40 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] bg-accent/40 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] bg-secondary/60 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
      </div>

      <header className="sticky top-0 z-50 glass-effect">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-premium flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-all duration-300 group-hover:scale-105">S</div>
                <span className="font-display font-bold text-2xl tracking-tight text-foreground">Skill<span className="text-primary">Swap</span></span>
              </Link>
            </div>

            {token ? (
              <nav className="hidden md:flex space-x-8">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location === link.href;
                  return (
                    <Link key={link.href} href={link.href}
                      className={`flex items-center gap-2 px-1 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}>
                      <Icon className="w-4 h-4" />{link.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}

            <div className="flex items-center gap-4">
              {token && user ? (
                <>
                  <Link href="/wallet">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-secondary text-secondary-foreground hover:bg-secondary transition-colors cursor-pointer">
                      <Wallet className="w-4 h-4 text-primary" />
                      <span className="font-bold">{wallet?.balance ?? user.credits} cr</span>
                    </div>
                  </Link>
                  <div className="h-8 w-px bg-border hidden sm:block" />
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-sm font-bold leading-none">{user.name}</span>
                      <span className="text-xs text-muted-foreground">Score: {user.trustScore}</span>
                    </div>
                    <Link href={`/mentor/${user.id}`}>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 cursor-pointer overflow-hidden">
                        {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-primary" />}
                      </div>
                    </Link>
                    <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10" title="Log out">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <Link href="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
                  <Link href="/register"><Button className="rounded-full bg-foreground text-background hover:bg-foreground/90 shadow-md">Get Started</Button></Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 relative z-10 pb-24 md:pb-8">
        {children}
      </main>

      {/* Floating AI Assistant */}
      {token && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50">
          {aiOpen && (
            <div className="mb-3 w-80 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-accent p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-white" />
                  <span className="text-white font-bold text-sm">SkillAI Assistant</span>
                </div>
                <button onClick={() => setAiOpen(false)}><X className="w-4 h-4 text-white" /></button>
              </div>
              <div className="h-64 overflow-y-auto p-3 space-y-2">
                {aiMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs ${msg.role === "ai" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {aiLoading && <div className="bg-muted px-3 py-2 rounded-xl text-xs text-muted-foreground w-fit">Thinking...</div>}
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <Input placeholder="Ask anything..." value={aiInput} onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendAiMessage()} className="text-xs h-8 rounded-full" />
                <Button size="sm" onClick={sendAiMessage} className="rounded-full h-8 w-8 p-0 flex-shrink-0">
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
          <button onClick={() => setAiOpen(!aiOpen)}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
            <Bot className="w-6 h-6 text-white" />
          </button>
        </div>
      )}

      {token && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-effect border-t border-border/50 pb-safe">
          <nav className="flex items-center justify-around h-16 px-2">
            {[
              { href: "/dashboard", label: "Home", icon: LayoutDashboard },
              { href: "/explore", label: "Explore", icon: Compass },
              { href: "/sessions", label: "Sessions", icon: BookOpen },
              { href: "/wallet", label: "Wallet", icon: Wallet },
              { href: "/ai", label: "SkillAI", icon: Bot },
            ].map((link) => {
              const Icon = link.icon;
              const isActive = location === link.href;
              return (
                <Link key={link.href} href={link.href}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                  <span className="text-[10px] font-medium">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}