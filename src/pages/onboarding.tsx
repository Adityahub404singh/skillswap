import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Preferences } from "@capacitor/preferences";
import { Sparkles, Coins, ShieldCheck, ArrowRight } from "lucide-react";

const ONBOARDING_KEY = "has_seen_onboarding";

const slides = [
  {
    icon: Sparkles,
    title: "Learn Anything.",
    titleAccent: "Teach Everything.",
    desc: "Swap skills with real people. Teach what you know, learn what you love — no money needed.",
    gradient: "from-primary to-accent",
  },
  {
    icon: Coins,
    title: "Earn Credits.",
    titleAccent: "Spend Credits.",
    desc: "Every hour you teach earns you credits. Use them to book sessions and learn from real experts.",
    gradient: "from-orange-500 to-pink-500",
  },
  {
    icon: ShieldCheck,
    title: "Build Trust.",
    titleAccent: "Get Verified.",
    desc: "Complete sessions, earn badges, and grow your trust score as a reliable teacher and learner.",
    gradient: "from-green-500 to-emerald-600",
  },
];

interface OnboardingProps {
  onFinish: () => void;
}

export default function Onboarding({ onFinish }: OnboardingProps) {
  const [idx, setIdx] = useState(0);
  const isLast = idx === slides.length - 1;
  const slide = slides[idx];
  const Icon = slide.icon;

  const handleNext = () => {
    if (isLast) {
      handleDone();
    } else {
      setIdx((i) => i + 1);
    }
  };

  const handleSkip = () => {
    handleDone();
  };

  const handleDone = async () => {
    try {
      await Preferences.set({ key: ONBOARDING_KEY, value: "true" });
    } catch {
      // Storage failed - proceed anyway
    }
    onFinish();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex justify-end p-4 sm:p-6">
        <button
          onClick={handleSkip}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center max-w-sm"
          >
            <div
              className={"w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br " + slide.gradient + " flex items-center justify-center shadow-lg mb-10"}
            >
              <Icon className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-foreground mb-1">
              {slide.title}
            </h1>
            <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-primary mb-5">
              {slide.titleAccent}
            </h1>

            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              {slide.desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-8 pb-10 sm:pb-12">
        <div className="flex items-center justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={"h-2 rounded-full transition-all duration-300 " + (i === idx ? "w-8 bg-primary" : "w-2 bg-muted")}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 shadow-lg hover:bg-primary/90 transition-colors"
        >
          {isLast ? "Get Started" : "Continue"}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export { ONBOARDING_KEY };
