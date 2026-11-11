import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Zap, AlertTriangle, CheckCircle, Trophy, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/api-utils";

type QuizQuestion = {
  id: string;
  category: string;
  q: string;
  options: string[];
};

type QuizStats = {
  attempts: number;
  maxAttempts: number;
  earned: number;
};

const INITIAL_STATS: QuizStats = {
  attempts: 0,
  maxAttempts: 10,
  earned: 0,
};

// API_BASE_URL must be the backend origin, e.g. https://api.example.com
const QUIZ_API = `${API_BASE_URL.replace(/\/+$/, "")}/api/quiz`;

export default function Quiz() {
  const { token } = useAuthStore();
  const { toast } = useToast();

  const [stats, setStats] = useState<QuizStats>(INITIAL_STATS);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  const loadQuiz = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setQuestions([]);
      return;
    }

    setLoading(true);

    try {
      const [statsResponse, questionsResponse] = await Promise.all([
        fetch(`${QUIZ_API}/stats`, { headers: authHeaders() }),
        fetch(`${QUIZ_API}/questions`, { headers: authHeaders() }),
      ]);

      const statsData = await statsResponse.json().catch(() => ({}));
      const questionsData = await questionsResponse.json().catch(() => ({}));

      if (!statsResponse.ok) {
        throw new Error(statsData.error || "Unable to load quiz stats");
      }
      if (!questionsResponse.ok) {
        throw new Error(questionsData.error || "Unable to load questions");
      }

      setStats(statsData);
      setQuestions(Array.isArray(questionsData.questions) ? questionsData.questions : []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: error?.message || "Failed to load quiz",
      });
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders, toast]);

  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz]);

  const handleAnswer = async (selectedIndex: number) => {
    const currentQuestion = questions[0];

    if (!currentQuestion || submitting) return;

    if (stats.attempts >= stats.maxAttempts) {
      toast({
        title: "Daily limit reached",
        description: "Come back tomorrow for more questions!",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${QUIZ_API}/submit`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedIndex,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Unable to submit answer");
      }

      const toastClass =
        data.status === "reward"
          ? "bg-green-500 text-white border-none"
          : data.status === "warning"
            ? "bg-amber-500 text-white border-none"
            : "bg-red-500 text-white border-none";

      toast({ title: data.message || "Answer submitted", className: toastClass });

      // Server decides the next question and the authoritative attempt count.
      await loadQuiz();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: error?.message || "Error submitting answer",
      });

      // Refresh authoritative state in case the server committed but the response failed.
      await loadQuiz();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Brain className="w-10 h-10 animate-bounce text-primary" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        Please log in to play the daily quiz.
      </div>
    );
  }

  const finished =
    stats.attempts >= stats.maxAttempts || questions.length === 0;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm mb-4 border border-primary/20">
          <Flame className="w-4 h-4" /> Learn to Earn
        </div>
        <h1 className="text-4xl font-black mb-2">Daily Skill Quiz</h1>
        <p className="text-muted-foreground">
          Test your knowledge. Earn credits. Avoid penalties.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card-premium flex items-center justify-between p-5 bg-background">
          <div>
            <div className="text-sm text-muted-foreground font-bold mb-1 uppercase tracking-wider">
              Attempts Today
            </div>
            <div className="text-2xl font-black">
              {stats.attempts}
              <span className="text-muted-foreground text-lg">
                {" "}/ {stats.maxAttempts}
              </span>
            </div>
          </div>
          <Brain className="w-8 h-8 text-primary opacity-50" />
        </div>

        <div className="card-premium flex items-center justify-between p-5 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <div>
            <div className="text-sm text-green-600 font-bold mb-1 uppercase tracking-wider">
              Credits Earned
            </div>
            <div className="text-2xl font-black text-green-600">
              +{stats.earned} cr
            </div>
          </div>
          <Zap className="w-8 h-8 text-green-500" />
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-8 flex items-center gap-3 text-sm text-amber-600 font-medium">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        Rules: Correct = +2 Credits. First wrong = Warning. Second and later
        wrong answers = -2 Credits (up to available balance). Maximum 10
        questions per day.
      </div>

      {finished ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-premium p-12 text-center bg-background"
        >
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2">You're Done for Today!</h2>
          <p className="text-muted-foreground mb-6">
            You've completed today's quiz. Check your wallet to see your total
            credits.
          </p>
          <Button
            onClick={() => {
              window.location.href = "/wallet";
            }}
            className="rounded-full px-8"
          >
            Go to Wallet
          </Button>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={questions[0].id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="card-premium p-8 md:p-10 bg-background shadow-xl"
          >
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Question {stats.attempts + 1} of {stats.maxAttempts}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                {questions[0].category}
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-8 leading-tight">
              {questions[0].q}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {questions[0].options.map((option, index) => (
                <motion.div
                  key={`${questions[0].id}-${index}`}
                  whileHover={{ scale: submitting ? 1 : 1.02 }}
                  whileTap={{ scale: submitting ? 1 : 0.98 }}
                >
                  <Button
                    variant="outline"
                    disabled={submitting}
                    onClick={() => void handleAnswer(index)}
                    className="w-full min-h-16 text-left justify-start px-6 text-base font-medium rounded-2xl border-2 hover:border-primary hover:bg-primary/5 whitespace-normal h-auto py-4"
                  >
                    {option}
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
