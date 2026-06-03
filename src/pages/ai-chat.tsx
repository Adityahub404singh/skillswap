import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, Sparkles, BookOpen, Map, Zap, Brain, Code2, Globe, Flame, RotateCcw } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { motion, AnimatePresence } from "framer-motion";

interface Message { role: "user" | "ai"; text: string; time: string; }

const SUGGESTIONS = [
  { icon: Code2, text: "How to learn Python fast?", color: "text-blue-500" },
  { icon: Brain, text: "Best DSA resources for beginners", color: "text-purple-500" },
  { icon: Globe, text: "How to improve English speaking?", color: "text-green-500" },
  { icon: Zap, text: "How do credits work on SkillSwap?", color: "text-orange-500" },
  { icon: Flame, text: "How to earn more credits?", color: "text-red-500" },
  { icon: BookOpen, text: "Create a React learning roadmap", color: "text-cyan-500" },
];

export default function AIChat() {
  const token = useAuthStore((s) => s.token);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hi! I'm SkillAI 🤖 Your personal learning assistant!\n\nI can help you:\n• Find the right mentors\n• Create learning roadmaps\n• Understand the credit system\n• Suggest skills to learn\n\nWhat would you like to learn today?", time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput("");
    const time = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    setMessages(prev => [...prev, { role: "user", text: msg, time }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", text: data.reply || "Sorry, I could not process that. Try again!", time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Connection error! Please try again. 😅", time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) }]);
    }
    setLoading(false);
  };

  const clearChat = () => setMessages([{
    role: "ai", text: "Hi! I'm SkillAI 🤖 How can I help you today?",
    time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})
  }]);

  return (
    <div className="max-w-3xl mx-auto py-6 h-[calc(100vh-140px)] flex flex-col gap-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4 card-premium">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">SkillAI Assistant</h1>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <motion.span className="w-2 h-2 rounded-full bg-green-400 inline-block"
                animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              Online — Powered by AI
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground gap-1 text-xs">
          <RotateCcw className="w-3.5 h-3.5" /> Clear
        </Button>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1 scroll-smooth">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "ai" ? "bg-gradient-to-br from-primary to-accent" : "bg-muted border border-border"
              }`}>
                {msg.role === "ai" ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div className={`max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === "ai"
                    ? "bg-muted text-foreground rounded-tl-sm"
                    : "bg-gradient-to-br from-primary to-accent text-white rounded-tr-sm shadow-lg shadow-primary/20"
                }`}>
                  {msg.text}
                </div>
                <span className="text-[10px] text-muted-foreground px-1">{msg.time}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <div className="flex gap-1">
                {[0, 150, 300].map(d => (
                  <motion.span key={d} className="w-2 h-2 rounded-full bg-primary/60"
                    animate={{ y: [-4, 4, -4] }} transition={{ duration: 0.8, repeat: Infinity, delay: d/1000 }} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">SkillAI is thinking...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions (show only on empty) */}
      {messages.length <= 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {SUGGESTIONS.map((s, i) => (
            <motion.button key={i} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => sendMessage(s.text)}
              className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all text-left text-xs font-medium">
              <s.icon className={`w-4 h-4 flex-shrink-0 ${s.color}`} />
              {s.text}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Input */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex gap-2 p-3 card-premium">
        <Input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Ask SkillAI anything... (Press Enter to send)"
          className="flex-1 rounded-xl border-border/50 focus:border-primary/50"
          disabled={loading}
        />
        <Button onClick={() => sendMessage()} disabled={loading || !input.trim()}
          className="rounded-xl px-4 bg-gradient-to-r from-primary to-accent border-0 shadow-lg shadow-primary/20">
          <Send className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
}