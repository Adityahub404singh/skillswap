import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Zap, AlertTriangle, CheckCircle, Trophy, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/api-utils";

// 🔥 EXPANDED PREMIUM QUESTION POOL — "har tarah ka question" across many
// categories, so no two days feel the same. Shape is UNCHANGED
// ({ q, options[4], ans, category }) — `category` is a purely cosmetic extra
// field for the badge; existing consumers (dailyQuestions[qIndex].q/options/ans)
// are untouched, so the scoring/attempt/warning/penalty logic cannot break.
const ALL_QUESTIONS = [
  // ── Tech & Startups ──────────────────────────────────────────────
  { category: "Tech", q: "What does 'Unicorn' mean in the startup world?", options: ["A myth", "A company valued at $1B+", "A profitable company", "A tech monopoly"], ans: 1 },
  { category: "Tech", q: "Which AI model is the brain behind ChatGPT?", options: ["Gemini", "Claude", "Transformer (GPT)", "Llama"], ans: 2 },
  { category: "Tech", q: "Which company originally created React.js?", options: ["Google", "Facebook (Meta)", "Microsoft", "Twitter"], ans: 1 },
  { category: "Tech", q: "Who is known as the creator of Bitcoin?", options: ["Elon Musk", "Vitalik Buterin", "Satoshi Nakamoto", "Mark Zuckerberg"], ans: 2 },
  { category: "Tech", q: "In UI/UX, what does 'Wireframe' mean?", options: ["A physical wire", "A 3D model", "A basic layout blueprint", "Final colored design"], ans: 2 },
  { category: "Tech", q: "What does API stand for?", options: ["Application Programming Interface", "Apple Product Integration", "Advanced Program Instructions", "Automated Process Intelligence"], ans: 0 },
  { category: "Tech", q: "Which of these is NOT a programming language?", options: ["Python", "HTML", "Java", "C++"], ans: 1 },
  { category: "Tech", q: "What does 'Open Source' software mean?", options: ["It's free to use and modify", "The source code is hidden", "It runs only on Windows", "It is illegal to use"], ans: 0 },
  { category: "Tech", q: "What is the main purpose of Figma?", options: ["Video Editing", "Database Management", "UI/UX Design", "Writing Code"], ans: 2 },
  { category: "Tech", q: "What is a 'Bug' in software development?", options: ["An insect", "A feature", "An error or flaw", "A type of virus"], ans: 2 },
  { category: "Tech", q: "Which cloud platform is owned by Amazon?", options: ["AWS", "Azure", "Google Cloud", "DigitalOcean"], ans: 0 },
  { category: "Tech", q: "What is 'Escrow' in transactions?", options: ["A tax fee", "Holding funds securely until conditions are met", "A type of crypto", "A bank loan"], ans: 1 },
  { category: "Tech", q: "What does SEO stand for?", options: ["Search Engine Optimization", "System Error Output", "Secure External Operation", "Site Engagement Organizer"], ans: 0 },
  { category: "Tech", q: "In Python, what is the output of 'type([])'?", options: ["<class 'list'>", "<class 'array'>", "<class 'dict'>", "<class 'tuple'>"], ans: 0 },
  { category: "Tech", q: "Which tool is used for Version Control?", options: ["Photoshop", "Git", "Excel", "Nginx"], ans: 1 },
  { category: "Tech", q: "What is the standard port for HTTPS?", options: ["80", "21", "443", "8080"], ans: 2 },
  { category: "Tech", q: "What does 'B2B' stand for?", options: ["Business to Buyer", "Brand to Brand", "Business to Business", "Back to Basics"], ans: 2 },
  { category: "Tech", q: "Which of these is a NoSQL database?", options: ["MySQL", "PostgreSQL", "MongoDB", "Oracle"], ans: 2 },
  { category: "Tech", q: "What is the primary function of CSS?", options: ["Database", "Logic", "Styling websites", "Server hosting"], ans: 2 },
  { category: "Tech", q: "What does 'CPU' stand for?", options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Utility"], ans: 0 },
  { category: "Tech", q: "Which company makes the iPhone?", options: ["Samsung", "Apple", "Google", "Sony"], ans: 1 },
  { category: "Tech", q: "What is 'phishing' in cybersecurity?", options: ["A fishing hobby", "Tricking someone into revealing sensitive info", "A type of firewall", "A coding language"], ans: 1 },

  // ── General Knowledge ────────────────────────────────────────────
  { category: "GK", q: "What is the 10,000-hour rule?", options: ["Time to master a skill", "Time to sleep yearly", "Average work hours in 5 years", "A coding limit"], ans: 0 },
  { category: "GK", q: "Who wrote the Indian National Anthem?", options: ["Mahatma Gandhi", "Rabindranath Tagore", "Bankim Chandra", "Sarojini Naidu"], ans: 1 },
  { category: "GK", q: "What is the currency of Japan?", options: ["Won", "Yuan", "Yen", "Ringgit"], ans: 2 },
  { category: "GK", q: "Which is the largest planet in our solar system?", options: ["Earth", "Saturn", "Jupiter", "Neptune"], ans: 2 },
  { category: "GK", q: "How many continents are there on Earth?", options: ["5", "6", "7", "8"], ans: 2 },
  { category: "GK", q: "What is the tallest mountain in the world?", options: ["K2", "Kangchenjunga", "Mount Everest", "Makalu"], ans: 2 },
  { category: "GK", q: "Which is the smallest country in the world?", options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], ans: 1 },
  { category: "GK", q: "Who painted the Mona Lisa?", options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"], ans: 2 },
  { category: "GK", q: "What is the national animal of India?", options: ["Lion", "Elephant", "Tiger", "Peacock"], ans: 2 },
  { category: "GK", q: "Which language has the most native speakers worldwide?", options: ["English", "Hindi", "Spanish", "Mandarin Chinese"], ans: 3 },

  // ── Science ───────────────────────────────────────────────────────
  { category: "Science", q: "What gas do plants absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], ans: 2 },
  { category: "Science", q: "What is the chemical symbol for Gold?", options: ["Go", "Gd", "Au", "Ag"], ans: 2 },
  { category: "Science", q: "How many bones are there in the adult human body?", options: ["186", "206", "226", "246"], ans: 1 },
  { category: "Science", q: "What is the speed of light approximately?", options: ["3,00,000 km/s", "1,50,000 km/s", "5,00,000 km/s", "1,00,000 km/s"], ans: 0 },
  { category: "Science", q: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Mercury"], ans: 1 },
  { category: "Science", q: "What part of the cell contains genetic material?", options: ["Mitochondria", "Nucleus", "Cytoplasm", "Ribosome"], ans: 1 },
  { category: "Science", q: "What force keeps us grounded on Earth?", options: ["Magnetism", "Friction", "Gravity", "Tension"], ans: 2 },
  { category: "Science", q: "Which vitamin is produced when skin is exposed to sunlight?", options: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K"], ans: 2 },

  // ── Finance & Money ───────────────────────────────────────────────
  { category: "Finance", q: "What does 'ROI' stand for?", options: ["Rate of Interest", "Return on Investment", "Risk of Insurance", "Rate of Inflation"], ans: 1 },
  { category: "Finance", q: "What is 'compound interest'?", options: ["Interest only on the principal", "Interest on interest + principal", "A one-time bonus", "A type of loan"], ans: 1 },
  { category: "Finance", q: "What does 'IPO' stand for?", options: ["Internal Profit Order", "Initial Public Offering", "Investment Portfolio Option", "Interest Payout Order"], ans: 1 },
  { category: "Finance", q: "What is a 'budget' primarily used for?", options: ["Increasing debt", "Planning income vs expenses", "Avoiding taxes", "Getting loans"], ans: 1 },
  { category: "Finance", q: "What is an 'emergency fund' meant for?", options: ["Buying luxury items", "Unexpected expenses", "Paying regular bills", "Investing in stocks only"], ans: 1 },
  { category: "Finance", q: "What does 'GDP' measure?", options: ["A country's population", "A country's total economic output", "Government debt only", "Stock market value"], ans: 1 },

  // ── Logic & Puzzles ───────────────────────────────────────────────
  { category: "Logic", q: "If a train leaves at 3 PM and takes 2.5 hours, when does it arrive?", options: ["5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM"], ans: 1 },
  { category: "Logic", q: "Complete the sequence: 2, 4, 8, 16, ?", options: ["24", "30", "32", "20"], ans: 2 },
  { category: "Logic", q: "Which number does NOT belong: 3, 7, 11, 14, 19?", options: ["3", "7", "14", "19"], ans: 2 },
  { category: "Logic", q: "If all Roses are Flowers, and some Flowers fade quickly, can we conclude all Roses fade quickly?", options: ["Yes, always", "No, not necessarily", "Only in summer", "Cannot be determined"], ans: 1 },
  { category: "Logic", q: "A clock shows 3:15. What is the angle between hour and minute hands (approx)?", options: ["0°", "7.5°", "15°", "30°"], ans: 1 },

  // ── History ───────────────────────────────────────────────────────
  { category: "History", q: "In which year did India gain independence?", options: ["1945", "1947", "1950", "1952"], ans: 1 },
  { category: "History", q: "Who was the first President of the United States?", options: ["Abraham Lincoln", "Thomas Jefferson", "George Washington", "John Adams"], ans: 2 },
  { category: "History", q: "The Great Wall was built primarily in which country?", options: ["Japan", "China", "Mongolia", "India"], ans: 1 },
  { category: "History", q: "Which ancient civilization built the pyramids of Giza?", options: ["Romans", "Greeks", "Egyptians", "Persians"], ans: 2 },
  { category: "History", q: "World War II ended in which year?", options: ["1943", "1945", "1947", "1950"], ans: 1 },

  // ── Pop Culture & Sports ──────────────────────────────────────────
  { category: "Pop Culture", q: "Which sport is known as 'The Gentleman's Game'?", options: ["Football", "Cricket", "Tennis", "Golf"], ans: 1 },
  { category: "Pop Culture", q: "How many players are there in a football (soccer) team on the field?", options: ["9", "10", "11", "12"], ans: 2 },
  { category: "Pop Culture", q: "Which streaming platform produced 'Stranger Things'?", options: ["Amazon Prime", "Disney+", "Netflix", "Hulu"], ans: 2 },
  { category: "Pop Culture", q: "The Olympics are held every how many years?", options: ["2", "3", "4", "5"], ans: 2 },

  // ── Health & Wellness ─────────────────────────────────────────────
  { category: "Health", q: "How many hours of sleep are generally recommended for adults?", options: ["4-5 hours", "6-7 hours", "7-9 hours", "10-12 hours"], ans: 2 },
  { category: "Health", q: "Which organ pumps blood throughout the human body?", options: ["Liver", "Heart", "Lungs", "Kidney"], ans: 1 },
  { category: "Health", q: "What is considered a good daily water intake for adults (approx)?", options: ["0.5 liters", "1 liter", "2-3 liters", "5+ liters"], ans: 2 },

  // ── Geography ─────────────────────────────────────────────────────
  { category: "Geography", q: "Which is the longest river in the world?", options: ["Amazon", "Nile", "Ganges", "Yangtze"], ans: 1 },
  { category: "Geography", q: "Which desert is the largest hot desert in the world?", options: ["Thar", "Gobi", "Sahara", "Kalahari"], ans: 2 },
  { category: "Geography", q: "Which country has the most time zones?", options: ["USA", "Russia", "China", "France"], ans: 3 },
  { category: "Geography", q: "Mount Kilimanjaro is located in which continent?", options: ["Asia", "Africa", "South America", "Europe"], ans: 1 },
];

export default function Quiz() {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [stats, setStats] = useState({ attempts: 0, maxAttempts: 10, earned: 0 });
  const [loading, setLoading] = useState(true);
  const [qIndex, setQIndex] = useState(0);
  const [dailyQuestions, setDailyQuestions] = useState<typeof ALL_QUESTIONS>([]);

  useEffect(() => {
    // 🎲 Randomly pick 10 questions for today (unchanged logic — just a bigger pool to pick from)
    const shuffled = [...ALL_QUESTIONS].sort(() => 0.5 - Math.random());
    setDailyQuestions(shuffled.slice(0, 10));
    fetchStats();
  }, []);

  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/quiz/stats`, { headers: { Authorization: `Bearer ${token}` } });
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/quiz/submit`, {
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
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Question {stats.attempts + 1} of 10
              </div>
              {/* 🔥 NEW: cosmetic category badge — purely visual, doesn't affect scoring logic */}
              {(dailyQuestions[qIndex] as any).category && (
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {(dailyQuestions[qIndex] as any).category}
                </span>
              )}
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
