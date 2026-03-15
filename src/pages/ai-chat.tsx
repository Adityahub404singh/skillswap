import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, Sparkles, BookOpen, Map } from "lucide-react";
import { useAuthStore } from "@/store/auth";

interface Message { role: "user" | "ai"; text: string; }

export default function AIChat() {
  const token = useAuthStore((s) => s.token);
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hi! I'm SkillAI 🤖 Ask me anything about skills, learning paths, or mentors!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [learningPath, setLearningPath] = useState<any>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Sorry, something went wrong!" }]);
    }
    setLoading(false);
  };

  const getRecommendations = async () => {
    try {
      const res = await fetch("/api/ai/recommend", { headers });
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch {}
  };

  const getLearningPath = async (skill: string) => {
    try {
      const res = await fetch("/api/ai/learning-path", {
        method: "POST",
        headers,
        body: JSON.stringify({ skill }),
      });
      const data = await res.json();
      setLearningPath(data);
    } catch {}
  };

  return (
    <div className="py-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold">SkillAI</h1>
          <p className="text-muted-foreground">Your personal learning assistant</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={getRecommendations} className="card-premium flex items-center gap-3 hover:border-primary/50 transition-colors text-left">
          <Sparkles className="w-8 h-8 text-primary" />
          <div><p className="font-bold">Get Recommendations</p><p className="text-sm text-muted-foreground">AI suggests skills for you</p></div>
        </button>
        <button onClick={() => getLearningPath("React")} className="card-premium flex items-center gap-3 hover:border-primary/50 transition-colors text-left">
          <Map className="w-8 h-8 text-accent" />
          <div><p className="font-bold">React Learning Path</p><p className="text-sm text-muted-foreground">4-week roadmap</p></div>
        </button>
        <button onClick={() => getLearningPath("Python")} className="card-premium flex items-center gap-3 hover:border-primary/50 transition-colors text-left">
          <BookOpen className="w-8 h-8 text-green-500" />
          <div><p className="font-bold">Python Learning Path</p><p className="text-sm text-muted-foreground">4-week roadmap</p></div>
        </button>
      </div>

      {recommendations.length > 0 && (
        <div className="card-premium">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Recommended for You
          </h2>
          <div className="flex flex-wrap gap-2">
            {recommendations.map(r => (
              <button key={r} onClick={() => getLearningPath(r)}
                className="px-3 py-1.5 bg-primary/10 text-primary font-medium text-sm rounded-lg hover:bg-primary/20 transition-colors">
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {learningPath && (
        <div className="card-premium">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Map className="w-5 h-5 text-accent" /> {learningPath.skill} — {learningPath.totalWeeks} Week Plan
          </h2>
          <div className="space-y-3">
            {learningPath.path.map((step: any) => (
              <div key={step.week} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {step.week}
                </div>
                <div>
                  <p className="font-bold">{step.topic}</p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-premium flex flex-col h-96">
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "ai" ? "bg-primary/10" : "bg-accent/10"}`}>
                {msg.role === "ai" ? <Bot className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-accent" />}
              </div>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${msg.role === "ai" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted px-4 py-2 rounded-2xl text-sm text-muted-foreground">Thinking...</div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Ask SkillAI anything..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            className="rounded-full"
          />
          <Button onClick={sendMessage} size="icon" className="rounded-full flex-shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}