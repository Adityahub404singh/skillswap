import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Zap, AlertTriangle, CheckCircle, Trophy, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/api-utils";

const QUESTIONS = [
  { q: "What does UX stand for in Design?", options: ["User Interface", "User Experience", "Universal eXperience", "Unified Execution"], ans: 1 },
  { q: "In Python, what is the output of type([])?", options: ["<class 'list'>", "<class 'array'>", "<class 'dict'>", "<class 'tuple'>"], ans: 0 },
  { q: "Which Hook is used for side effects in React?", options: ["useState", "useContext", "useEffect", "useReducer"], ans: 2 },
  { q: "What is the time complexity of Binary Search?", options: ["O(n)", "O(n log n)", "O(log n)", "O(1)"], ans: 2 },
  { q: "Choose the synonym for 'Abundant':", options: ["Scarce", "Plentiful", "Rare", "Empty"], ans: 1 },
  { q: "Which tool is primarily used for UI/UX wireframing?", options: ["VS Code", "Docker", "Figma", "MongoDB"], ans: 2 },
  { q: "In JavaScript, what is 'typeof null'?", options: ["object", "null", "undefined", "string"], ans: 0 },
  { q: "What does CSS stand for?", options: ["Computer Style Sheets", "Cascading Style Sheets", "Creative Style System", "Coded Style Sheets"], ans: 1 },
  { q: "Which company created Next.js?", options: ["Facebook", "Google", "Vercel", "Microsoft"], ans: 2 },
  { q: "What is a 'foreign key' in databases?", options: ["A key to encrypt data", "A field linking to another table", "A primary ID", "A cloud token"], ans: 1 },
];

export default function Quiz() {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [stats, setStats] = useState({ attempts: 0, maxAttempts: 10, earned: 0 });
  const [loading, setLoading] = useState(true);
  const [qIndex, setQIndex] = useState(0);

  useEffect(() => {
    fetchStats();
    // Randomize starting question
    setQIndex(Math.floor(Math.random() * (QUESTIONS.length - 1)));
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

    const isCorrect = selectedIndex === QUESTIONS[qIndex].ans;
    
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
        setQIndex((qIndex + 1) % QUESTIONS.length); // Next question
      } else {
        toast({ variant: "destructive", title: data.error });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error submitting answer" });
    }
  };

  if (loading) return <div className="min-h-[80vh] flex items-center justify-center"><Brain className="w-10 h-10 animate-bounce text-primary" /></div>;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm mb-4 border border-primary/20">
          <Flame className="w-4 h-4" /> Learn to Earn
        </div>
        <h1 className="text-4xl font-black mb-2">Daily Skill Quiz</h1>
        <p className="text-muted-foreground">Test your knowledge. Earn credits. Avoid penalties.</p>
      </div>

      {/* Progress Stats */}
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

      {/* Rules Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-8 flex items-center gap-3 text-sm text-amber-600 font-medium">
         <AlertTriangle className="w-5 h-5 flex-shrink-0" />
         Rules: Correct = +2 Credits. First wrong = Warning. Second wrong = -2 Credits (Penalty). Play smart!
      </div>

      {/* The Quiz Box */}
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
            <h2 className="text-2xl md:text-3xl font-bold mb-8 leading-tight">{QUESTIONS[qIndex].q}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {QUESTIONS[qIndex].options.map((opt, i) => (
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
