import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Zap, AlertTriangle, CheckCircle, Trophy, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/api-utils";

// 🦄 PREMIUM QUESTION POOL (Tech, Startups, AI, Coding, Design)
const ALL_QUESTIONS = [
  { q: "What does 'Unicorn' mean in the startup world?", options: ["A myth", "A company valued at $1B+", "A profitable company", "A tech monopoly"], ans: 1 },
  { q: "Which AI model is the brain behind ChatGPT?", options: ["Gemini", "Claude", "Transformer (GPT)", "Llama"], ans: 2 },
  { q: "What is the 10,000-hour rule?", options: ["Time to master a skill", "Time to sleep yearly", "Average work hours in 5 years", "A coding limit"], ans: 0 },
  { q: "Which company originally created React.js?", options: ["Google", "Facebook (Meta)", "Microsoft", "Twitter"], ans: 1 },
  { q: "Who is known as the creator of Bitcoin?", options: ["Elon Musk", "Vitalik Buterin", "Satoshi Nakamoto", "Mark Zuckerberg"], ans: 2 },
  { q: "In UI/UX, what does 'Wireframe' mean?", options: ["A physical wire", "A 3D model", "A basic layout blueprint", "Final colored design"], ans: 2 },
  { q: "What does API stand for?", options: ["Application Programming Interface", "Apple Product Integration", "Advanced Program Instructions", "Automated Process Intelligence"], ans: 0 },
  { q: "Which of these is NOT a programming language?", options: ["Python", "HTML", "Java", "C++"], ans: 1 },
  { q: "What does 'Open Source' software mean?", options: ["It's free to use and modify", "The source code is hidden", "It runs only on Windows", "It is illegal to use"], ans: 0 },
  { q: "What is the main purpose of Figma?", options: ["Video Editing", "Database Management", "UI/UX Design", "Writing Code"], ans: 2 },
  { q: "What is a 'Bug' in software development?", options: ["An insect", "A feature", "An error or flaw", "A type of virus"], ans: 2 },
  { q: "Which cloud platform is owned by Amazon?", options: ["AWS", "Azure", "Google Cloud", "DigitalOcean"], ans: 0 },
  { q: "What is 'Escrow' in transactions?", options: ["A tax fee", "Holding funds securely until conditions are met", "A type of crypto", "A bank loan"], ans: 1 },
  { q: "What does SEO stand for?", options: ["Search Engine Optimization", "System Error Output", "Secure External Operation", "Site Engagement Organizer"], ans: 0 },
  { q: "In Python, what is the output of 'type([])'?", options: ["<class 'list'>", "<class 'array'>", "<class 'dict'>", "<class 'tuple'>"], ans: 0 },
  { q: "Which tool is used for Version Control?", options: ["Photoshop", "Git", "Excel", "Nginx"], ans: 1 },
  { q: "What is the standard port for HTTPS?", options: ["80", "21", "443", "8080"], ans: 2 },
  { q: "What does 'B2B' stand for?", options: ["Business to Buyer", "Brand to Brand", "Business to Business", "Back to Basics"], ans: 2 },
  { q: "Which of these is a NoSQL database?", options: ["MySQL", "PostgreSQL", "MongoDB", "Oracle"], ans: 2 },
  { q: "What is the primary function of CSS?", options: ["Database", "Logic", "Styling websites", "Server hosting"], ans: 2 }
];

export default function Quiz() {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [stats, setStats] = useState({ attempts: 0, maxAttempts: 10, earned: 0 });
  const [loading, setLoading] = useState(true);
  const [qIndex, setQIndex] = useState(0);
  const [dailyQuestions, setDailyQuestions] = useState<typeof ALL_QUESTIONS>([]);

  useEffect(() => {
    // 🔀 Randomly pick 10 questions for today
    const shuffled = [...ALL_QUESTIONS].sort(() => 0.5 - Math.random());
    setDailyQuestions(shuffled.slice(0, 10));
    fetchStats();
  }, []);

  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/quiz/stats`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setStats(data);
      setLoading(false);
    } catch (e) { setLoading(false); }
  };

  const handleAnswer = async (selectedIndex: number) => {
    if (stats.attempts >= stats.maxAttempts) {
      toast({ title: "Daily Limit Reached", description: "Come back tomorrow for more!" });
      return;
    }

    const isCorrect = selectedIndex === dailyQuestions[qIndex].ans;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/quiz/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isCorrect })
      });
      const data = await res.json();

      if (res.ok) {
        if (data.status === "reward") toast({ title: data.message, className: "bg-green-500 text-white border-none" });
        if (data.status === "warning") toast({ title: data.message, className: "bg-amber-500 text-white border-none" });
        if (data.status === "penalty") toast({ title: data.message, className: "bg-red-500 text-white border-none" });
        
        await fetchStats();
        if (qIndex < dailyQuestions.length - 1) {
          setQIndex(qIndex + 1);
        }
      } else {
        toast({ variant: "destructive", title: data.error });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error submitting answer" });
    }
  };

  if (loading || dailyQuestions.length === 0) return <div className="min-h-[80vh] flex items-center justify-center"><Brain className="w-10 h-10 animate-bounce text-primary" /></div>;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm mb-4 border border-primary/20">
          <Flame className="w-4 h-4" /> Learn to Earn
        </div>
        <h1 className="text-4xl font-black mb-2">Daily Skill Quiz</h1>
        <p className="text-muted-foreground">Test your knowledge. Earn credits. Avoid penalties.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card-premium flex items-center justify-between p-5 bg-background">
           <div>
             <div className="text-sm text-muted-foreground font-bold mb-1 uppercase tracking-wider">Attempts Today</div>
             <div className="text-2xl font-black">{stats.attempts} <span className="text-muted-foreground text-lg">/ {stats.maxAttempts}</span></div>
           </div>
           <Brain className="w-8 h-8 text-primary opacity-50" />
        </div>
        <div className="card-premium flex items-center justify-between p-5 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
           <div>
             <div className="text-sm text-green-600 font-bold mb-1 uppercase tracking-wider">Credits Earned</div>
             <div className="text-2xl font-black text-green-600">+{stats.earned} cr</div>
           </div>
           <Zap className="w-8 h-8 text-green-500" />
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-8 flex items-center gap-3 text-sm text-amber-600 font-medium">
         <AlertTriangle className="w-5 h-5 flex-shrink-0" />
         Rules: Correct = +2 Credits. First wrong = Warning. Second wrong = -2 Credits (Penalty). Play smart!
      </div>

      {stats.attempts >= stats.maxAttempts ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card-premium p-12 text-center bg-background">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2">You're Done for Today!</h2>
          <p className="text-muted-foreground mb-6">You've reached your 10 question limit. Check your wallet to see your total earnings.</p>
          <Button onClick={() => window.location.href = "/wallet"} className="rounded-full px-8">Go to Wallet</Button>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={qIndex} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="card-premium p-8 md:p-10 bg-background shadow-xl">
            <div className="text-xs font-bold text-primary mb-4 uppercase tracking-widest flex items-center gap-2">
               <CheckCircle className="w-4 h-4" /> Question {stats.attempts + 1} of 10
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-8 leading-tight">{dailyQuestions[qIndex].q}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dailyQuestions[qIndex].options.map((opt, i) => (
                <motion.div key={opt} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="outline" onClick={() => handleAnswer(i)} className="w-full h-16 text-left justify-start px-6 text-base font-medium rounded-2xl border-2 hover:border-primary hover:bg-primary/5 whitespace-normal h-auto py-4">
                    {opt}
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
