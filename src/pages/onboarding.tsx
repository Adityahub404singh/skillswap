import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, PanInfo, useReducedMotion } from "framer-motion";
import { Preferences } from "@capacitor/preferences";
import {
  Sparkles,
  Coins,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Users,
  Repeat2,
  Star,
  CheckCircle2,
  Award,
  Wallet,
  BookOpen,
  GraduationCap,
  X,
  Play,
  Pause,
} from "lucide-react";

const ONBOARDING_KEY = "has_seen_onboarding";
const AUTO_ADVANCE_MS = 6500;

type Slide = {
  eyebrow: string;
  title: string;
  titleAccent: string;
  desc: string;
  gradient: string;
  glow: string;
  icon: typeof Sparkles;
  points: string[];
};

const slides: Slide[] = [
  {
    eyebrow: "A community built around sharing",
    icon: Sparkles,
    title: "Learn Anything.",
    titleAccent: "Teach Everything.",
    desc: "Connect with people who have the skills you want—and share the knowledge you already have.",
    gradient: "from-[#6335F5] via-[#7545F6] to-[#9A63F8]",
    glow: "rgba(147,90,255,0.42)",
    points: ["Discover people with useful skills", "Share what you know with others"],
  },
  {
    eyebrow: "Your knowledge has value",
    icon: Coins,
    title: "Teach to Earn.",
    titleAccent: "Learn with Credits.",
    desc: "Earn SkillSwap credits through eligible teaching sessions, then use your credits to book sessions and learn from others.",
    gradient: "from-[#F97316] via-[#F45A75] to-[#D946A8]",
    glow: "rgba(249,115,22,0.34)",
    points: ["Earn credits for completed teaching", "Use credits to book learning sessions"],
  },
  {
    eyebrow: "Grow a reputation that matters",
    icon: ShieldCheck,
    title: "Build Trust.",
    titleAccent: "Grow Together.",
    desc: "Show up, complete sessions, share feedback, and build your reputation as a dependable learner and teacher.",
    gradient: "from-[#059669] via-[#10B981] to-[#34D399]",
    glow: "rgba(16,185,129,0.34)",
    points: ["Build trust through platform activity", "Celebrate progress and achievements"],
  },
];

function RevealText({ text, className = "", reducedMotion = false }: { text: string; className?: string; reducedMotion?: boolean }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="mr-[0.25em] inline-block overflow-hidden align-bottom last:mr-0">
          <motion.span
            className="inline-block"
            initial={reducedMotion ? false : { y: "110%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ delay: reducedMotion ? 0 : 0.12 + index * 0.055, duration: reducedMotion ? 0 : 0.58, ease: [0.16, 1, 0.3, 1] }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

function OrbitIllustration({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="relative flex h-64 w-64 items-center justify-center sm:h-[300px] sm:w-[300px]">
      <motion.div
        className="absolute inset-4 rounded-full border border-white/25"
        animate={reducedMotion ? undefined : { scale: [1, 1.06, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border border-dashed border-white/20"
        animate={reducedMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute left-1 top-12 flex h-[76px] w-[76px] items-center justify-center rounded-[25px] border border-white/30 bg-white/15 shadow-2xl backdrop-blur-xl"
        animate={reducedMotion ? undefined : { y: [0, -10, 0], rotate: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Users className="h-9 w-9 text-white" />
      </motion.div>
      <motion.div
        className="absolute bottom-10 right-0 flex h-[76px] w-[76px] items-center justify-center rounded-[25px] border border-white/30 bg-white/15 shadow-2xl backdrop-blur-xl"
        animate={reducedMotion ? undefined : { y: [0, 10, 0], rotate: [0, 4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
      >
        <GraduationCap className="h-10 w-10 text-white" />
      </motion.div>
      <motion.div
        className="relative z-10 flex h-28 w-28 items-center justify-center rounded-[34px] border border-white/70 bg-white shadow-[0_22px_70px_rgba(31,15,85,0.25)]"
        animate={reducedMotion ? undefined : { y: [0, -7, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Repeat2 className="h-14 w-14 text-[#6C3BFF]" strokeWidth={2.2} />
      </motion.div>
      {Array.from({ length: 6 }).map((_, index) => (
        <motion.span
          key={index}
          className="absolute h-2.5 w-2.5 rounded-full bg-amber-200 shadow-[0_0_16px_rgba(253,230,138,0.9)]"
          style={{ top: `${12 + (index % 3) * 34}%`, left: index % 2 ? "88%" : "8%" }}
          animate={reducedMotion ? undefined : { opacity: [0.25, 1, 0.25], scale: [0.7, 1.3, 0.7] }}
          transition={{ duration: 2 + index * 0.2, repeat: Infinity, delay: index * 0.18 }}
        />
      ))}
    </div>
  );
}

function CreditsIllustration({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="relative flex h-64 w-64 items-center justify-center sm:h-[300px] sm:w-[300px]">
      <div className="absolute inset-5 rounded-full border border-white/20" />
      <div className="absolute inset-12 rounded-full border border-dashed border-white/25" />
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <motion.div
          key={item}
          className="absolute flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white shadow-xl"
          style={{ left: `${10 + item * 15}%`, top: `${18 + (item % 2) * 48}%` }}
          animate={reducedMotion ? undefined : { y: [0, item % 2 ? -15 : 15, 0], rotate: [0, item % 2 ? 12 : -12, 0] }}
          transition={{ duration: 2.4 + item * 0.2, repeat: Infinity, ease: "easeInOut", delay: item * 0.12 }}
        >
          <Coins className="h-5 w-5 text-orange-500" />
        </motion.div>
      ))}
      <motion.div
        className="relative z-10 flex h-32 w-32 items-center justify-center rounded-[36px] border border-white/80 bg-white shadow-[0_22px_70px_rgba(90,20,60,0.25)]"
        animate={reducedMotion ? undefined : { y: [0, -8, 0], scale: [1, 1.035, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Wallet className="h-16 w-16 text-orange-500" strokeWidth={1.8} />
        <span className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300 text-lg font-black text-orange-900 shadow-lg">+</span>
      </motion.div>
    </div>
  );
}

function TrustIllustration({ reducedMotion }: { reducedMotion: boolean }) {
  const badges = [
    { Icon: Star, label: "Rating" },
    { Icon: CheckCircle2, label: "Complete" },
    { Icon: Award, label: "Milestone" },
  ];
  return (
    <div className="relative flex h-64 w-64 items-center justify-center sm:h-[300px] sm:w-[300px]">
      <div className="absolute inset-4 rounded-full border border-white/25" />
      <div className="absolute inset-12 rounded-full border border-dashed border-white/30" />
      <motion.div
        className="absolute inset-0"
        animate={reducedMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      >
        {badges.map(({ Icon, label }, index) => (
          <div
            key={label}
            className="absolute left-1/2 top-1/2"
            style={{ transform: `rotate(${index * 120}deg) translateY(-118px) rotate(-${index * 120}deg) translate(-50%, -50%)` }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/80 bg-white shadow-xl">
              <Icon className="h-7 w-7 text-emerald-600" />
            </div>
          </div>
        ))}
      </motion.div>
      <motion.div
        className="relative z-10 flex h-28 w-28 items-center justify-center rounded-[34px] border border-white/80 bg-white shadow-[0_22px_70px_rgba(0,60,40,0.22)]"
        animate={reducedMotion ? undefined : { scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <ShieldCheck className="h-14 w-14 text-emerald-600" strokeWidth={2} />
      </motion.div>
    </div>
  );
}

const ILLUSTRATIONS = [OrbitIllustration, CreditsIllustration, TrustIllustration];

interface OnboardingProps {
  onFinish: () => void;
}

export default function Onboarding({ onFinish }: OnboardingProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const startedAt = useRef<number>(Date.now());
  const reducedMotion = Boolean(useReducedMotion());

  const slide = slides[index];
  const isLast = index === slides.length - 1;
  const Illustration = ILLUSTRATIONS[index];
  const SlideIcon = slide.icon;

  const goTo = useCallback((nextIndex: number) => {
    setDirection(nextIndex > index ? 1 : -1);
    setIndex(Math.max(0, Math.min(slides.length - 1, nextIndex)));
    setProgress(0);
    startedAt.current = Date.now();
  }, [index]);

  const goNext = useCallback(() => {
    if (index < slides.length - 1) goTo(index + 1);
  }, [goTo, index]);

  const goPrevious = useCallback(() => {
    if (index > 0) goTo(index - 1);
  }, [goTo, index]);

  const finish = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await Preferences.set({ key: ONBOARDING_KEY, value: "true" });
    } catch {
      try {
        window.localStorage.setItem(ONBOARDING_KEY, "true");
      } catch {
        // Continue into the app even if persistent storage is unavailable.
      }
    } finally {
      setIsSaving(false);
      onFinish();
    }
  }, [isSaving, onFinish]);

  const handleNext = useCallback(() => {
    if (isLast) void finish();
    else goNext();
  }, [finish, goNext, isLast]);

  useEffect(() => {
    if (paused || isLast || reducedMotion) return;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt.current;
      const nextProgress = Math.min(elapsed / AUTO_ADVANCE_MS, 1);
      setProgress(nextProgress);
      if (nextProgress >= 1) goNext();
    }, 60);
    return () => window.clearInterval(timer);
  }, [goNext, index, isLast, paused, reducedMotion]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (isLast) void finish();
        else goNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      } else if (event.key === "Escape") {
        event.preventDefault();
        void finish();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finish, goNext, goPrevious, isLast]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setPaused(false);
    if (info.offset.x < -65) goNext();
    else if (info.offset.x > 65) goPrevious();
  };

  const progressSegments = useMemo(() => slides.map((item, itemIndex) => ({
    key: item.title,
    state: itemIndex < index ? "complete" : itemIndex === index ? "active" : "upcoming",
  })), [index]);

  return (
    <main className="fixed inset-0 z-[100] overflow-hidden bg-[#f8f7ff] text-slate-900 selection:bg-violet-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(124,58,237,0.08),transparent_28%),radial-gradient(circle_at_90%_90%,rgba(99,102,241,0.08),transparent_30%)]" />

      <div className="absolute left-4 right-4 top-4 z-40 flex items-center gap-2 sm:left-7 sm:right-7 sm:top-6">
        <div className="mr-auto flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-black text-white shadow-lg shadow-violet-600/25">S</div>
          <span className="text-base font-black tracking-tight text-slate-900">Skill<span className="text-violet-600">Swap</span></span>
        </div>

        <div className="flex max-w-[45%] flex-1 gap-1.5 sm:max-w-[38%]">
          {progressSegments.map((segment, itemIndex) => (
            <button
              key={segment.key}
              type="button"
              onClick={() => goTo(itemIndex)}
              aria-label={`Go to introduction slide ${itemIndex + 1}`}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/90"
            >
              <motion.span
                className={`block h-full rounded-full bg-gradient-to-r ${slides[itemIndex].gradient}`}
                style={{ width: segment.state === "complete" ? "100%" : segment.state === "active" ? `${progress * 100}%` : "0%" }}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void finish()}
          disabled={isSaving}
          className="ml-2 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/85 px-3.5 py-2 text-xs font-bold text-slate-500 shadow-sm backdrop-blur transition hover:border-violet-200 hover:text-violet-700 disabled:opacity-50 sm:px-4"
        >
          Skip <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <motion.div
        className="relative z-10 flex h-full w-full flex-col lg:flex-row"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        onDragStart={() => setPaused(true)}
        onDragEnd={handleDragEnd}
      >
        <section className={`relative flex h-[43vh] shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br ${slide.gradient} pt-12 sm:h-[46vh] lg:h-full lg:w-[53%] lg:pt-0`}>
          <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/15 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-28 -right-16 h-96 w-96 rounded-full bg-black/10 blur-[100px]" />
          <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.25)_1px,transparent_1px)] [background-size:42px_42px]" />

          <div className="absolute left-6 top-20 hidden items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/85 backdrop-blur-md lg:flex">
            <Sparkles className="h-3.5 w-3.5" /> SkillSwap community
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              initial={reducedMotion ? false : { opacity: 0, scale: 0.88, y: 18, rotate: direction > 0 ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, scale: 0.9, y: -12, rotate: direction > 0 ? -4 : 4 }}
              transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 mt-6 lg:mt-0"
            >
              <Illustration reducedMotion={reducedMotion} />
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-5 left-0 right-0 hidden justify-center gap-2 lg:flex">
            {slides.map((item, itemIndex) => (
              <button
                key={item.title}
                onClick={() => goTo(itemIndex)}
                aria-label={`Show slide ${itemIndex + 1}`}
                className={`h-2 rounded-full transition-all ${index === itemIndex ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        </section>

        <section
          className="relative flex min-h-0 flex-1 flex-col justify-between overflow-y-auto bg-white px-6 pb-7 pt-7 sm:px-10 sm:pb-9 lg:justify-center lg:px-14 xl:px-20"
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerCancel={() => setPaused(false)}
        >
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={index}
                custom={direction}
                initial={reducedMotion ? false : { opacity: 0, x: direction > 0 ? 32 : -32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, x: direction > 0 ? -24 : 24 }}
                transition={{ duration: reducedMotion ? 0 : 0.38, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="mb-5 flex items-center gap-2 lg:hidden">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${slide.gradient} text-white shadow-lg`}>
                    <SlideIcon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">{slide.eyebrow}</span>
                </div>

                <div className="mb-6 hidden items-center gap-3 lg:flex">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${slide.gradient} text-white shadow-lg`}>
                    <SlideIcon className="h-6 w-6" />
                  </span>
                  <span className="text-xs font-extrabold uppercase tracking-[0.17em] text-slate-400">{slide.eyebrow}</span>
                </div>

                <h1 className="text-[34px] font-black leading-[1.04] tracking-[-0.045em] text-slate-950 sm:text-5xl xl:text-[56px]">
                  <RevealText text={slide.title} reducedMotion={reducedMotion} />
                </h1>
                <h2 className={`mt-1 bg-gradient-to-r ${slide.gradient} bg-clip-text text-[34px] font-black leading-[1.08] tracking-[-0.045em] text-transparent sm:text-5xl xl:text-[56px]`}>
                  <RevealText text={slide.titleAccent} reducedMotion={reducedMotion} />
                </h2>

                <motion.p
                  initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reducedMotion ? 0 : 0.25, duration: 0.4 }}
                  className="mt-5 max-w-lg text-[15px] font-medium leading-7 text-slate-500 sm:text-lg sm:leading-8"
                >
                  {slide.desc}
                </motion.p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {slide.points.map((point) => (
                    <div key={point} className="flex items-start gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/90 p-3.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-xs font-bold leading-5 text-slate-600 sm:text-sm">{point}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-between lg:mt-12">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900">0{index + 1}</span>
                <span className="h-px w-7 bg-slate-300" />
                <span className="text-xs font-bold text-slate-400">0{slides.length}</span>
                <span className="ml-2 text-xs font-semibold text-slate-400">Introduction</span>
              </div>
              {!isLast && !reducedMotion && (
                <button
                  type="button"
                  onClick={() => setPaused((value) => !value)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label={paused ? "Resume automatic slides" : "Pause automatic slides"}
                >
                  {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  {paused ? "Resume" : "Auto"}
                </button>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={goPrevious}
                disabled={index === 0}
                aria-label="Previous slide"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <motion.button
                type="button"
                whileHover={reducedMotion ? undefined : { scale: 1.015 }}
                whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                onClick={handleNext}
                disabled={isSaving}
                className={`group flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r ${slide.gradient} px-6 text-base font-extrabold text-white shadow-[0_12px_28px_rgba(99,53,220,0.24)] transition hover:brightness-105 disabled:opacity-60`}
              >
                {isSaving ? "Getting things ready…" : isLast ? "Get started" : "Continue"}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </div>

            <p className="mt-4 text-center text-[11px] font-semibold text-slate-300">
              Swipe to explore · Your SkillSwap journey starts here
            </p>
          </div>
        </section>
      </motion.div>
    </main>
  );
}

export { ONBOARDING_KEY };
