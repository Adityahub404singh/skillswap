import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Preferences } from "@capacitor/preferences";
import {
  Sparkles, Coins, ShieldCheck, ArrowRight, ArrowLeft,
  Users, Repeat, Star, CheckCircle2, Award, Wallet,
} from "lucide-react";

const ONBOARDING_KEY = "has_seen_onboarding";
const AUTO_MS = 5200;   // time per slide before auto-advance
const TICK_MS = 50;

// ─── per-slide content ─────────────────────────────────────────────────────
const slides = [
  {
    icon: Sparkles,
    title: "Learn Anything.",
    titleAccent: "Teach Everything.",
    desc: "Swap skills with real people. Teach what you know, learn what you love — no money needed.",
    gradient: "from-[#6C3BFF] to-[#8B5CF6]",
    glow: "rgba(108,59,255,0.45)",
  },
  {
    icon: Coins,
    title: "Earn Credits.",
    titleAccent: "Spend Credits.",
    desc: "Every hour you teach earns you credits. Use them to book sessions and learn from real experts.",
    gradient: "from-orange-500 to-pink-500",
    glow: "rgba(249,115,22,0.45)",
  },
  {
    icon: ShieldCheck,
    title: "Build Trust.",
    titleAccent: "Get Verified.",
    desc: "Complete sessions, earn badges, and grow your trust score as a reliable teacher and learner.",
    gradient: "from-green-500 to-emerald-600",
    glow: "rgba(16,185,129,0.45)",
  },
];

// ─── word-by-word reveal for headline text ─────────────────────────────────
function RevealText({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.28em] last:mr-0">
          <motion.span
            className="inline-block"
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ delay: 0.15 + i * 0.06, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

// ─── illustration 1: skill-swap orbit ──────────────────────────────────────
function SwapIllustration() {
  return (
    <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
      <motion.div
        className="absolute w-full h-full rounded-full border-2 border-white/25"
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -left-2 sm:left-0 w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-xl"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Users className="w-9 h-9 text-white" />
      </motion.div>
      <motion.div
        className="absolute -right-2 sm:right-0 w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-xl"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      >
        <Award className="w-9 h-9 text-white" />
      </motion.div>
      <motion.div
        className="relative z-10 w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-2xl"
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      >
        <Repeat className="w-11 h-11 text-[#6C3BFF]" strokeWidth={2.4} />
      </motion.div>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute w-2.5 h-2.5 rounded-full bg-yellow-300"
          style={{ top: `${20 + i * 25}%`, left: i % 2 === 0 ? "8%" : "88%" }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
          transition={{ duration: 1.8 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
    </div>
  );
}

// ─── illustration 2: floating credits ──────────────────────────────────────
function CreditsIllustration() {
  const coins = [0, 1, 2, 3, 4];
  return (
    <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
      {coins.map(i => (
        <motion.div
          key={i}
          className="absolute w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-lg"
          style={{ left: `${12 + i * 18}%` }}
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: [90, -110], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.55, ease: "easeInOut" }}
        >
          <Coins className="w-4.5 h-4.5 text-orange-500" />
        </motion.div>
      ))}
      <motion.div
        className="relative z-10 w-28 h-28 rounded-[28px] bg-white flex items-center justify-center shadow-2xl"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Wallet className="w-12 h-12 text-orange-500" strokeWidth={2} />
      </motion.div>
    </div>
  );
}

// ─── illustration 3: orbiting trust badges ─────────────────────────────────
function TrustIllustration() {
  const badges = [
    { Icon: Star, angle: 0 },
    { Icon: CheckCircle2, angle: 120 },
    { Icon: Award, angle: 240 },
  ];
  return (
    <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
      {[0, 1].map(i => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 border-white/25"
          style={{ width: `${70 + i * 16}%`, height: `${70 + i * 16}%` }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
        />
      ))}
      <motion.div
        className="absolute w-full h-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      >
        {badges.map(({ Icon, angle }, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 w-11 h-11"
            style={{ transform: `rotate(${angle}deg) translate(6.8rem) rotate(-${angle}deg)`, marginLeft: "-1.375rem", marginTop: "-1.375rem" }}
          >
            <motion.div
              className="w-11 h-11 rounded-2xl bg-white/95 flex items-center justify-center shadow-lg"
              animate={{ rotate: -360 }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            >
              <Icon className="w-5 h-5 text-emerald-600" />
            </motion.div>
          </div>
        ))}
      </motion.div>
      <motion.div
        className="relative z-10 w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-2xl"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <ShieldCheck className="w-11 h-11 text-emerald-600" strokeWidth={2.2} />
      </motion.div>
    </div>
  );
}

const ILLUSTRATIONS = [SwapIllustration, CreditsIllustration, TrustIllustration];

interface OnboardingProps {
  onFinish: () => void;
}

export default function Onboarding({ onFinish }: OnboardingProps) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [progress, setProgress] = useState(0); // 0..1 for the current slide
  const [paused, setPaused] = useState(false);

  const isLast = idx === slides.length - 1;
  const slide = slides[idx];
  const Icon = slide.icon;
  const Illustration = ILLUSTRATIONS[idx];

  const goTo = useCallback((next: number) => {
    setDir(next > idx ? 1 : -1);
    setIdx(Math.max(0, Math.min(slides.length - 1, next)));
  }, [idx]);

  const goNext = useCallback(() => {
    if (idx < slides.length - 1) goTo(idx + 1);
  }, [idx, goTo]);

  const goPrev = useCallback(() => {
    if (idx > 0) goTo(idx - 1);
  }, [idx, goTo]);

  // reset progress whenever the slide changes
  useEffect(() => { setProgress(0); }, [idx]);

  // story-style autoplay — pauses on press/drag, stops on the final slide
  useEffect(() => {
    if (paused || isLast) return;
    const t = setInterval(() => {
      setProgress(p => {
        const n = p + TICK_MS / AUTO_MS;
        if (n >= 1) {
          clearInterval(t);
          goNext();
          return 1;
        }
        return n;
      });
    }, TICK_MS);
    return () => clearInterval(t);
  }, [idx, paused, isLast, goNext]);

  // keyboard navigation for desktop
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const handleNext = () => {
    if (isLast) handleDone();
    else goNext();
  };

  const handleSkip = () => handleDone();

  const handleDone = async () => {
    try {
      await Preferences.set({ key: ONBOARDING_KEY, value: "true" });
    } catch {
      // Storage failed - proceed anyway
    }
    onFinish();
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    setPaused(false);
    const threshold = 60;
    if (info.offset.x < -threshold) goNext();
    else if (info.offset.x > threshold) goPrev();
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-hidden select-none">

      {/* ── Segmented story-style progress bar (spans full width, both layouts) ── */}
      <div className="absolute top-0 inset-x-0 z-30 flex gap-1.5 p-4 sm:p-5">
        {slides.map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full bg-white/30 lg:bg-slate-200 overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${slide.gradient}`}
              style={{
                width: i < idx ? "100%" : i === idx ? `${progress * 100}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* ── Skip button ── */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-4 sm:top-7 sm:right-6 z-30 text-xs font-bold text-white/80 lg:text-slate-400 hover:text-white lg:hover:text-slate-700 transition-colors bg-black/10 lg:bg-slate-100 px-3.5 py-1.5 rounded-full backdrop-blur-sm"
      >
        Skip
      </button>

      <motion.div
        className="h-full w-full flex flex-col lg:flex-row"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragStart={() => setPaused(true)}
        onDragEnd={handleDragEnd}
      >
        {/* ══════════════ VISUAL PANEL ══════════════ */}
        <div
          className={`relative flex items-center justify-center overflow-hidden shrink-0 h-[46vh] lg:h-full lg:w-1/2 bg-gradient-to-br ${slide.gradient} transition-colors duration-700`}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
        >
          {/* ambient glow blobs */}
          <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full blur-[90px] pointer-events-none" style={{ background: slide.glow }} />
          <div className="absolute -bottom-20 -right-10 w-80 h-80 rounded-full blur-[100px] pointer-events-none" style={{ background: slide.glow }} />

          {/* desktop prev/next chevrons */}
          <button
            onClick={goPrev}
            disabled={idx === 0}
            className="hidden lg:flex absolute left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md items-center justify-center text-white disabled:opacity-0 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goNext}
            disabled={isLast}
            className="hidden lg:flex absolute right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md items-center justify-center text-white disabled:opacity-0 transition-all"
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={idx}
              custom={dir}
              initial={{ opacity: 0, scale: 0.85, rotate: dir > 0 ? 8 : -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.85, rotate: dir > 0 ? -8 : 8 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10"
            >
              <Illustration />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ══════════════ CONTENT PANEL ══════════════ */}
        <div className="relative flex-1 flex flex-col justify-between px-7 sm:px-10 lg:px-16 xl:px-20 py-7 lg:py-0 lg:justify-center bg-white">

          <div className="lg:max-w-md">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={idx}
                custom={dir}
                initial={{ opacity: 0, x: dir > 0 ? 40 : -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir > 0 ? -40 : 40 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="mt-2 lg:mt-0"
              >
                <div className={`hidden lg:flex w-14 h-14 rounded-2xl bg-gradient-to-br ${slide.gradient} items-center justify-center shadow-lg mb-6`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>

                <h1 className="text-[32px] sm:text-4xl lg:text-[42px] leading-[1.08] font-black tracking-tight text-slate-900">
                  <RevealText text={slide.title} />
                </h1>
                <h1 className={`text-[32px] sm:text-4xl lg:text-[42px] leading-[1.08] font-black tracking-tight bg-gradient-to-r ${slide.gradient} bg-clip-text text-transparent mb-5`}>
                  <RevealText text={slide.titleAccent} />
                </h1>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                  className="text-slate-500 text-[15px] sm:text-lg leading-relaxed font-medium"
                >
                  {slide.desc}
                </motion.p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* footer: dots + counter + CTA */}
          <div className="mt-8 lg:mt-14 lg:max-w-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${i === idx ? `w-8 bg-gradient-to-r ${slide.gradient}` : "w-2 bg-slate-200 hover:bg-slate-300"}`}
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-slate-400 tracking-wider">{idx + 1} / {slides.length}</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNext}
              className={`group w-full h-14 rounded-full bg-gradient-to-r ${slide.gradient} text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-shadow`}
            >
              {isLast ? "Get Started" : "Continue"}
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </motion.button>

            <p className="hidden lg:block text-center text-[11px] font-semibold text-slate-300 mt-4 tracking-wide">
              Use ← → arrow keys, swipe, or tap the dots to navigate
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export { ONBOARDING_KEY };
