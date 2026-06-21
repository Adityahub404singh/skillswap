import { useState, useEffect, useCallback, useRef } from "react";
import {
  motion, AnimatePresence, PanInfo,
  useMotionValue, useTransform, animate,
} from "framer-motion";
import {
  X, Heart, BadgeCheck, Star, Sparkles, Zap, ChevronUp,
  MessageCircle, Calendar, Loader2, MapPin, ShieldCheck,
  Award, Coins, BookOpen, Info,
} from "lucide-react";
import { Link } from "wouter";
import confetti from "canvas-confetti";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";
import { useAuthStore } from "@/store/auth";

// ─── types ───────────────────────────────────────────────────────────────────
interface Card {
  id: number;
  name: string;
  bio: string;
  teaches: string[];
  sessions: number;
  rating: number;
  price: number;
  location: string;
  image: string;
  trustScore: number;
}

// ─── constants ───────────────────────────────────────────────────────────────
const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 500;

// ─── smooth image with gradient skeleton ─────────────────────────────────────
function CardImage({ src, name }: { src: string; name: string }) {
  const [ready, setReady] = useState(false);
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6C3BFF&color=fff&size=500&bold=true`;
  return (
    <div className="w-full h-full relative bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900">
      {!ready && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      )}
      <img
        src={src}
        alt={name}
        onError={e => { (e.target as HTMLImageElement).src = fallback; }}
        onLoad={() => setReady(true)}
        className="w-full h-full object-cover"
        style={{ opacity: ready ? 1 : 0, transition: "opacity 0.4s ease" }}
        loading="eager"
        decoding="async"
        draggable={false}
      />
    </div>
  );
}

// ─── single swipe card ────────────────────────────────────────────────────────
function SwipeCard({
  card, isTop, depth, expanded, onExpand, onGone,
}: {
  card: Card;
  isTop: boolean;
  depth: number;
  expanded: boolean;
  onExpand: () => void;
  onGone: (dir: "like" | "pass") => void;
}) {
  const x    = useMotionValue(0);
  const y    = useMotionValue(0);
  const gone = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  // smooth spring-like rotation, tied to horizontal drag
  const rotate = useTransform(x, [-300, 300], [-22, 22]);

  // subtle lift while dragging — card feels "picked up"
  const dragScale = useTransform(x, [-300, 0, 300], [0.97, 1, 0.97]);

  // stamp opacities — zero-rerender, butter smooth
  const likeOp = useTransform(x, [10, 110], [0, 1]);
  const nopeOp = useTransform(x, [-110, -10], [1, 0]);
  const likeScale = useTransform(x, [10, 110], [0.8, 1.05]);
  const nopeScale = useTransform(x, [-110, -10], [1.05, 0.8]);

  // background tint as card is dragged
  const likeTint = useTransform(x, [0, 150], ["rgba(16,185,129,0)", "rgba(16,185,129,0.10)"]);
  const nopeTint = useTransform(x, [-150, 0], ["rgba(239,68,68,0.10)", "rgba(239,68,68,0)"]);

  const flyOut = (dir: "like" | "pass") => {
    if (gone.current) return;
    gone.current = true;
    const targetX = dir === "like" ? 1000 : -1000;
    const targetY = (Math.random() - 0.5) * 200; // slight arc, feels alive
    animate(x, targetX, { duration: 0.32, ease: [0.32, 0, 0.67, 0] });
    animate(y, targetY, { duration: 0.32, ease: [0.32, 0, 0.67, 0] });
    setTimeout(() => onGone(dir), 300);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    const ox = info.offset.x, vx = info.velocity.x;
    if (ox > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD) flyOut("like");
    else if (ox < -SWIPE_THRESHOLD || vx < -VELOCITY_THRESHOLD) flyOut("pass");
    // snap back handled by framer's dragElastic + spring transition below
  };

  // stacking visual — deeper cards sit slightly smaller, faded, pushed back
  const stackScale = isTop ? 1 : 1 - depth * 0.045;
  const stackY     = isTop ? 0 : depth * -14;
  const stackOp    = isTop ? 1 : Math.max(0.55, 1 - depth * 0.22);

  return (
    <motion.div
      className="absolute flex flex-col overflow-hidden rounded-[28px] border border-slate-100/80 will-change-transform select-none cursor-grab active:cursor-grabbing"
      style={{
        width: "min(360px, 92vw)",
        height: expanded ? "calc(100dvh - 130px)" : "min(570px, calc(100dvh - 155px))",
        zIndex: 50 - depth,
        x: isTop ? x : 0,
        y: isTop ? y : 0,
        rotate: isTop ? rotate : 0,
        scale: isTop ? dragScale : 1,
        touchAction: "none",
        boxShadow: isTop
          ? isDragging
            ? "0 32px 80px -8px rgba(108,59,255,0.30), 0 12px 32px rgba(0,0,0,0.14)"
            : "0 24px 64px -8px rgba(108,59,255,0.22), 0 8px 24px rgba(0,0,0,0.10)"
          : "0 8px 24px rgba(0,0,0,0.07)",
      }}
      animate={{ scale: stackScale, y: stackY, opacity: stackOp }}
      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
      drag={isTop ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.22}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      whileTap={isTop ? { scale: 0.99 } : undefined}
    >
      {/* background tint overlay */}
      {isTop && (
        <>
          <motion.div className="absolute inset-0 pointer-events-none z-10 rounded-[28px]" style={{ backgroundColor: likeTint }} />
          <motion.div className="absolute inset-0 pointer-events-none z-10 rounded-[28px]" style={{ backgroundColor: nopeTint }} />
        </>
      )}

      {/* ── photo ── */}
      <div className="relative flex-shrink-0" style={{ height: "52%" }}>
        <CardImage src={card.image} name={card.name} />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

        {/* LIKE / NOPE stamps */}
        {isTop && (
          <>
            <motion.div
              style={{ opacity: likeOp, scale: likeScale }}
              className="absolute top-8 left-5 z-30 pointer-events-none border-[3px] border-emerald-400 text-emerald-400 font-black text-2xl px-5 py-1.5 rounded-2xl -rotate-12 tracking-widest bg-emerald-400/10 backdrop-blur-sm"
            >
              LIKE ✓
            </motion.div>
            <motion.div
              style={{ opacity: nopeOp, scale: nopeScale }}
              className="absolute top-8 right-5 z-30 pointer-events-none border-[3px] border-rose-400 text-rose-400 font-black text-2xl px-5 py-1.5 rounded-2xl rotate-12 tracking-widest bg-rose-400/10 backdrop-blur-sm"
            >
              NOPE ✗
            </motion.div>
          </>
        )}

        {/* top-right badges */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 items-end">
          <div className="bg-black/30 backdrop-blur-md border border-white/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-black flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ONLINE
          </div>
          <div className="bg-black/30 backdrop-blur-md border border-white/20 text-white text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
            <Coins className="w-2.5 h-2.5" />{card.price} cr/hr
          </div>
        </div>

        {/* name overlay — hidden when expanded */}
        <AnimatePresence>
          {!expanded && (
            <motion.div
              key="nameOverlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-[70px] left-5 right-5 z-20 pointer-events-none"
            >
              <h2 className="text-[26px] font-black text-white flex items-center gap-2 leading-tight drop-shadow-lg">
                {card.name}
                <BadgeCheck className="w-5 h-5 text-blue-400 flex-shrink-0" />
              </h2>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <span className="text-white/80 text-xs font-semibold flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {card.location}
                </span>
                {card.rating > 0 && (
                  <span className="text-amber-300 text-xs font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-300" /> {Number(card.rating).toFixed(1)}
                  </span>
                )}
                {card.trustScore >= 70 && (
                  <span className="text-emerald-300 text-xs font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Trusted
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── action buttons ── */}
      <div
        className="absolute left-0 right-0 flex justify-center items-center gap-5 z-30 pointer-events-none"
        style={{ top: "52%", transform: "translateY(-50%)" }}
      >
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.82 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          onClick={e => { e.stopPropagation(); flyOut("pass"); }}
          className="pointer-events-auto w-[58px] h-[58px] bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-lg text-slate-300 hover:text-rose-500 transition-colors"
        >
          <X strokeWidth={2.5} className="w-6 h-6" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.82 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          onClick={e => { e.stopPropagation(); onExpand(); }}
          className="pointer-events-auto w-[44px] h-[44px] bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center border border-[#6C3BFF]/25 shadow-md text-[#6C3BFF] translate-y-2 hover:bg-indigo-50 transition-colors"
        >
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25, ease: "easeInOut" }}>
            <ChevronUp strokeWidth={2.5} className="w-5 h-5" />
          </motion.div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.82 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          onClick={e => { e.stopPropagation(); flyOut("like"); }}
          className="pointer-events-auto w-[58px] h-[58px] bg-gradient-to-tr from-[#6C3BFF] to-[#8b5cf6] rounded-full flex items-center justify-center shadow-[0_8px_28px_rgba(108,59,255,0.45)] text-white hover:shadow-[0_12px_36px_rgba(108,59,255,0.55)] transition-shadow"
        >
          <Heart fill="white" strokeWidth={0} className="w-6 h-6" />
        </motion.button>
      </div>

      {/* ── profile details ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain bg-white px-5 pt-10 pb-4">

        <AnimatePresence>
          {expanded && (
            <motion.div
              key="expHeader"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-4"
            >
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-1.5">
                {card.name} <BadgeCheck className="w-5 h-5 text-blue-500" />
              </h2>
              <p className="text-[#6C3BFF] text-xs font-bold mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {card.location}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
            <Award className="w-3 h-3" /> Skills to Teach
          </p>
          <div className="flex flex-wrap gap-1.5">
            {card.teaches.slice(0, 6).map((s, i) => (
              <span key={i} className="flex items-center gap-1 text-[11px] font-bold text-[#6C3BFF] bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-xl">
                <BookOpen className="w-2.5 h-2.5" /> {s}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
            <Info className="w-3 h-3" /> About
          </p>
          <p className="text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 border border-slate-100 rounded-2xl px-3.5 py-3 line-clamp-3">
            {card.bio}
          </p>
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100">
          <div className="flex justify-around items-center text-center">
            <div>
              <p className="font-black text-lg text-slate-800 leading-none">{card.sessions}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Sessions</p>
            </div>
            <div className="w-px h-7 bg-slate-100" />
            <div>
              <p className="font-black text-lg text-slate-800 leading-none flex items-center justify-center gap-0.5">
                {Number(card.rating).toFixed(1)}
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Rating</p>
            </div>
            <div className="w-px h-7 bg-slate-100" />
            <div>
              <p className="font-black text-lg text-slate-800 leading-none flex items-center justify-center gap-0.5">
                <Coins className="w-3 h-3 text-slate-500" />{card.price} cr
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Per Hour</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── match modal ─────────────────────────────────────────────────────────────
function MatchModal({ card, onClose }: { card: Card; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 backdrop-blur-xl px-4"
    >
      <motion.div
        initial={{ scale: 0.82, y: 32, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
        className="bg-white rounded-[40px] p-8 w-full max-w-[340px] text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)] relative overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#6C3BFF]/10 to-transparent pointer-events-none" />

        <div className="flex justify-center mb-5 mt-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#6C3BFF] blur-2xl opacity-40 animate-pulse" />
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-2xl relative z-10">
              <CardImage src={card.image} name={card.name} />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center border-4 border-white z-20 shadow-xl">
              <Heart fill="white" strokeWidth={0} className="w-4 h-4" />
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">It's a Match!</h2>
        <p className="text-sm text-slate-500 font-medium mb-7 leading-relaxed">
          You and <span className="font-black text-slate-800">{card.name}</span> connected.
          Chat or book a session now!
        </p>

        <div className="space-y-2.5 relative z-10">
          <Link href={`/chat/${card.id}`} onClick={onClose}>
            <button className="w-full py-3.5 bg-gradient-to-r from-[#6C3BFF] to-[#8b5cf6] text-white font-bold rounded-2xl shadow-lg shadow-[#6C3BFF]/30 active:scale-95 transition-all flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" /> Chat Now
            </button>
          </Link>
          <Link href={`/book/${card.id}`} onClick={onClose}>
            <button className="w-full py-3.5 bg-indigo-50 text-[#6C3BFF] border border-indigo-100 font-bold rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 mt-1">
              <Calendar className="w-5 h-5" /> Book Session
            </button>
          </Link>
        </div>

        <button onClick={onClose}
          className="mt-5 w-full text-slate-400 hover:text-slate-600 font-bold text-[11px] uppercase tracking-widest py-1.5 transition-colors">
          Keep Swiping
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function Discover() {
  const token = useAuthStore(s => s.token);

  const [cards,      setCards]      = useState<Card[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [matchModal, setMatchModal] = useState<Card | null>(null);
  const [expanded,   setExpanded]   = useState<number | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res  = await fetch("/api/discover/profiles", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCards(
          data.map((u: any) => {
            let skills = u.skillsTeach || [];
            if (typeof skills === "string") {
              try { skills = JSON.parse(skills); } catch { skills = [skills]; }
            }
            return {
              id:         u.id,
              name:       u.name       || "Expert",
              bio:        u.bio        || "Let's connect and grow together!",
              teaches:    Array.isArray(skills) ? skills : [],
              sessions:   u.sessionsCompleted || 0,
              rating:     Number(u.averageRating || 0),
              price:      u.pricePerHour || 50,
              location:   u.location   || "Remote, IN",
              image:      u.avatar     || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || "U")}&background=6C3BFF&color=fff&size=500&bold=true`,
              trustScore: u.trustScore || 0,
            };
          }).sort(() => Math.random() - 0.5)
        );
      } catch (e) {
        console.error("profiles fetch error", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleGone = useCallback(async (dir: "like" | "pass", card: Card) => {
    setCards(prev => prev.filter(c => c.id !== card.id));
    setExpanded(null);

    if (Capacitor.isNativePlatform())
      Haptics.impact({ style: dir === "like" ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {});

    try {
      const res    = await fetch("/api/discover/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ swipedOnId: card.id, action: dir }),
      });
      const result = await res.json();
      if (result.isMatch && dir === "like") {
        if (Capacitor.isNativePlatform())
          Haptics.notification({ type: NotificationType.Success }).catch(() => {});
        confetti({
          particleCount: 180, spread: 90, origin: { y: 0.55 },
          colors: ["#6C3BFF", "#ec4899", "#f59e0b", "#10b981", "#fff"],
          disableForReducedMotion: true, zIndex: 9999,
        });
        setMatchModal(card);
      }
    } catch (e) { console.error("swipe error", e); }
  }, [token]);

  return (
    <div
      className="fixed flex flex-col bg-[#F8FAFC] font-sans"
      style={{ inset: 0, top: 64, zIndex: 10 }}
    >
      <div className="absolute -top-1/4 -left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(108,59,255,0.12) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-1/4 -right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)" }} />

      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-white/60 backdrop-blur-xl border-b border-white/60">
        <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#6C3BFF] fill-[#6C3BFF]/20" /> Discover
        </h1>
        <div className="flex items-center gap-2">
          {!loading && cards.length > 0 && (
            <span className="text-[11px] text-slate-400 font-semibold bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
              {cards.length} mentors
            </span>
          )}
          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#6C3BFF]">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="relative flex-1 flex items-center justify-center overflow-hidden">

        {loading && (
          <div
            className="absolute flex flex-col overflow-hidden rounded-[28px] border border-slate-100 animate-pulse bg-white"
            style={{ width: "min(360px, 92vw)", height: "min(570px, calc(100dvh - 160px))" }}
          >
            <div className="flex-shrink-0 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center" style={{ height: "52%" }}>
              <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
            </div>
            <div className="p-5 space-y-3 flex-1">
              <div className="h-6 w-2/3 bg-slate-100 rounded-xl" />
              <div className="h-4 w-1/3 bg-slate-50 rounded-lg" />
              <div className="flex gap-2 mt-3">
                {[1,2,3].map(i => <div key={i} className="h-7 w-16 bg-indigo-50 rounded-xl" />)}
              </div>
              <div className="space-y-2 mt-2">
                <div className="h-3 w-full bg-slate-50 rounded" />
                <div className="h-3 w-4/5 bg-slate-50 rounded" />
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {!loading && cards.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center bg-white/80 backdrop-blur-xl p-10 rounded-[32px] border border-white shadow-sm"
              style={{ width: "min(340px, 88vw)" }}
            >
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-5 border border-indigo-100">
                <Sparkles className="w-9 h-9 text-[#6C3BFF]" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">You're all caught up!</h2>
              <p className="text-sm text-slate-500 font-medium mb-7 leading-relaxed">
                You've seen all available mentors.<br />Come back later for new sparks.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl active:scale-95 transition-transform"
              >
                Refresh Deck
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {cards.slice(-3).map((card, i, arr) => {
            const depth  = arr.length - 1 - i;
            const isTop  = depth === 0;
            return (
              <SwipeCard
                key={card.id}
                card={card}
                isTop={isTop}
                depth={depth}
                expanded={isTop && expanded === card.id}
                onExpand={() => setExpanded(prev => prev === card.id ? null : card.id)}
                onGone={dir => handleGone(dir, card)}
              />
            );
          })}
        </AnimatePresence>

        {!loading && cards.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
            className="absolute bottom-4 text-[10px] text-slate-300 font-semibold tracking-wider pointer-events-none"
          >
            ← pass &nbsp;•&nbsp; like →
          </motion.p>
        )}
      </div>

      <AnimatePresence>
        {matchModal && (
          <MatchModal card={matchModal} onClose={() => setMatchModal(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}