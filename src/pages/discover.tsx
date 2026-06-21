import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { 
  X, Heart, Info, BadgeCheck, Star, Sparkles, Zap, ChevronUp,
  MessageCircle, Calendar, Loader2, MapPin, ShieldCheck, Award,
  IndianRupee, BookOpen, Clock
} from "lucide-react";
import { Link } from "wouter";
import confetti from "canvas-confetti";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";
import { useAuthStore } from "@/store/auth";

// ─── constants ───────────────────────────────────────────────────────────────
const disableScroll = "overflow-hidden overscroll-none touch-none";

// ─── types ───────────────────────────────────────────────────────────────────
interface ProfileCardData {
  id: number;
  name: string;
  experience: string;
  bio: string;
  teaches: string[];
  sessions: number;
  rating: number;
  price: number;
  location: string;
  linkedinUrl?: string;
  image: string;
  hasPhoto: boolean;
  trustScore: number;
}

// ─── ProfileImage ─────────────────────────────────────────────────────────────
const ProfileImage = ({ src, name, className }: { src: string; name: string; className?: string }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [loaded, setLoaded]  = useState(false);
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6C3BFF&color=fff&size=500&bold=true`;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-indigo-900 to-purple-900 ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center animate-pulse">
          <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
        </div>
      )}
      <img
        src={imgSrc}
        alt={name}
        onError={() => setImgSrc(fallback)}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
};

// ─── SwipeCard ────────────────────────────────────────────────────────────────
function SwipeCard({
  profile, isTopCard, stackOffset, isExpanded, onToggleExpand, onSwipe
}: {
  profile: ProfileCardData;
  isTopCard: boolean;
  stackOffset: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSwipe: (action: "like" | "pass", id: number) => void;
}) {
  const x        = useMotionValue(0);
  const rotate   = useTransform(x, [-250, 250], [-15, 15]);
  const likeOp   = useTransform(x, [20, 120],  [0, 1]);
  const nopeOp   = useTransform(x, [-120, -20], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 90 || info.velocity.x > 600) onSwipe("like", profile.id);
    else if (info.offset.x < -90 || info.velocity.x < -600) onSwipe("pass", profile.id);
  };

  const scale   = isTopCard ? 1 : 1 - stackOffset * 0.05;
  const yOffset = isTopCard ? 0 : stackOffset * -18;
  const opacity = isTopCard ? 1 : 1 - stackOffset * 0.3;

  return (
    <motion.div
      className="absolute w-[min(340px,92vw)] bg-white rounded-[32px] overflow-hidden border border-slate-100 flex flex-col will-change-transform"
      style={{
        zIndex: 100 - stackOffset,
        touchAction: "none",
        x: isTopCard ? x : 0,
        rotate: isTopCard ? rotate : 0,
        boxShadow: isTopCard
          ? "0 20px 60px -10px rgba(108,59,255,0.25), 0 8px 20px rgba(0,0,0,0.08)"
          : "0 8px 24px rgba(0,0,0,0.06)",
      }}
      animate={{
        scale,
        opacity,
        y: yOffset,
        height: isExpanded ? "calc(100svh - 130px)" : "min(560px, calc(100svh - 175px))",
        maxHeight: 860,
      }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      drag={isTopCard ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.75}
      whileDrag={{ scale: 1.02, cursor: "grabbing" }}
      onDragEnd={handleDragEnd}
      exit={{
        x: x.get() > 0 ? 700 : -700,
        opacity: 0,
        scale: 0.9,
        transition: { duration: 0.28, ease: "easeIn" },
      }}
    >
      {/* ── Photo ──────────────────────────────────────────────────── */}
      <div className="relative flex-shrink-0 overflow-hidden" style={{ height: "52%" }}>
        <ProfileImage src={profile.image} name={profile.name} className="w-full h-full" />

        {/* gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />

        {/* LIKE / NOPE stamps */}
        {isTopCard && (
          <>
            <motion.div style={{ opacity: likeOp }}
              className="absolute top-8 left-5 border-[3px] border-emerald-400 text-emerald-400 font-black text-3xl px-5 py-1.5 rounded-2xl -rotate-12 tracking-widest bg-emerald-400/10 backdrop-blur-sm pointer-events-none z-30">
              LIKE ✓
            </motion.div>
            <motion.div style={{ opacity: nopeOp }}
              className="absolute top-8 right-5 border-[3px] border-rose-400 text-rose-400 font-black text-3xl px-5 py-1.5 rounded-2xl rotate-12 tracking-widest bg-rose-400/10 backdrop-blur-sm pointer-events-none z-30">
              NOPE ✗
            </motion.div>
          </>
        )}

        {/* badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end z-20">
          <div className="bg-black/30 backdrop-blur-md border border-white/20 text-emerald-400 text-[10px] px-3 py-1.5 rounded-full font-black flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]" />
            ONLINE
          </div>
          <div className="bg-black/30 backdrop-blur-md border border-white/20 text-white text-[10px] px-3 py-1.5 rounded-full font-black flex items-center gap-1">
            <IndianRupee className="w-2.5 h-2.5" />{profile.price}/hr
          </div>
        </div>

        {/* name overlay (hidden when expanded) */}
        <AnimatePresence>
          {!isExpanded && (
            <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute bottom-4 left-5 right-20 text-white z-10">
              <h2 className="text-[28px] font-black flex items-center gap-2 drop-shadow-lg leading-tight">
                {profile.name}
                <BadgeCheck className="w-6 h-6 text-blue-400 flex-shrink-0" />
              </h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-white/80 text-xs font-semibold">
                  <MapPin className="w-3 h-3" /> {profile.location}
                </span>
                {profile.rating > 0 && (
                  <span className="flex items-center gap-1 text-amber-300 text-xs font-bold">
                    <Star className="w-3 h-3 fill-amber-300" /> {Number(profile.rating).toFixed(1)}
                  </span>
                )}
                {profile.trustScore >= 70 && (
                  <span className="flex items-center gap-1 text-emerald-300 text-xs font-bold">
                    <ShieldCheck className="w-3 h-3" /> Trusted
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Action Buttons ──────────────────────────────────────────── */}
      <div className="absolute left-0 right-0 flex justify-center gap-5 px-6 z-20 pointer-events-none"
        style={{ top: "52%", transform: "translateY(-50%)" }}>

        <motion.button whileTap={{ scale: 0.88 }}
          onClick={e => { e.stopPropagation(); onSwipe("pass", profile.id); }}
          className="pointer-events-auto w-15 h-15 w-[60px] h-[60px] bg-white text-slate-300 hover:text-rose-500 rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.12)] active:scale-90 transition-colors border border-slate-100 group">
          <X className="w-6 h-6 stroke-[2.5] group-hover:scale-110 transition-transform" />
        </motion.button>

        <motion.button whileTap={{ scale: 0.88 }}
          onClick={e => { e.stopPropagation(); onToggleExpand(); }}
          className="pointer-events-auto w-[46px] h-[46px] bg-white/95 backdrop-blur-sm text-[#6C3BFF] border border-[#6C3BFF]/20 rounded-full flex items-center justify-center shadow-lg active:scale-90 translate-y-2 hover:bg-indigo-50 transition-colors">
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronUp className="w-5 h-5 stroke-[2.5]" />
          </motion.div>
        </motion.button>

        <motion.button whileTap={{ scale: 0.88 }}
          onClick={e => { e.stopPropagation(); onSwipe("like", profile.id); }}
          className="pointer-events-auto w-[60px] h-[60px] bg-gradient-to-tr from-[#6C3BFF] to-[#8b5cf6] text-white rounded-full flex items-center justify-center shadow-[0_8px_28px_rgba(108,59,255,0.45)] active:scale-90 transition-all group hover:shadow-[0_12px_32px_rgba(108,59,255,0.55)]">
          <Heart className="w-6 h-6 fill-white stroke-white group-hover:scale-110 transition-transform" />
        </motion.button>
      </div>

      {/* ── Profile Details ─────────────────────────────────────────── */}
      <div className="pt-10 px-5 pb-5 flex-1 flex flex-col overflow-y-auto bg-white overscroll-contain">

        {/* Name shown when expanded */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-1.5 tracking-tight">
                {profile.name} <BadgeCheck className="w-5 h-5 text-blue-500" />
              </h2>
              <p className="text-[#6C3BFF] font-bold text-xs mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {profile.location} &nbsp;•&nbsp; {profile.experience}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skills */}
        <div className="mb-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" /> Skills to Teach
          </h3>
          <div className="flex gap-2 flex-wrap">
            {profile.teaches.slice(0, 6).map((skill, i) => (
              <span key={i} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-[#6C3BFF] rounded-xl text-[11px] font-bold border border-indigo-100 hover:bg-indigo-100 transition-colors">
                <BookOpen className="w-2.5 h-2.5" /> {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="mb-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> About
          </h3>
          <p className="text-slate-600 text-sm font-medium leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100 line-clamp-3">
            {profile.bio}
          </p>
        </div>

        {/* Stats */}
        <div className="mt-auto pt-3 border-t border-slate-100">
          <div className="flex justify-between items-center text-center">
            <div className="flex-1 flex flex-col items-center">
              <p className="font-black text-xl text-slate-800 leading-none flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> {profile.sessions}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">Sessions</p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="flex-1 flex flex-col items-center">
              <p className="font-black text-xl text-slate-800 leading-none flex items-center gap-1">
                {Number(profile.rating).toFixed(1)}
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">Rating</p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="flex-1 flex flex-col items-center">
              <p className="font-black text-xl text-slate-800 leading-none flex items-center gap-1">
                <IndianRupee className="w-3.5 h-3.5 text-slate-400" />{profile.price}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">Per Hour</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── MatchModal ───────────────────────────────────────────────────────────────
function MatchModal({ profile, onClose }: { profile: ProfileCardData; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-xl px-4">
      <motion.div
        initial={{ scale: 0.82, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
        className="bg-white rounded-[40px] p-8 max-w-[360px] w-full text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)] relative overflow-hidden border border-white/40"
      >
        {/* top glow */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#6C3BFF]/12 to-transparent pointer-events-none" />

        {/* avatar */}
        <div className="flex justify-center mb-6 mt-2">
          <div className="relative">
            <div className="absolute inset-0 bg-[#6C3BFF] rounded-full blur-2xl opacity-40 animate-pulse" />
            <ProfileImage src={profile.image} name={profile.name}
              className="w-32 h-32 rounded-full border-4 border-white shadow-2xl relative z-10" />
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-pink-500 to-rose-600 text-white p-3 rounded-full border-4 border-white z-20 shadow-xl">
              <Heart className="w-5 h-5 fill-white" />
            </div>
          </div>
        </div>

        <h2 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">It's a Match!</h2>
        <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed px-3">
          You and <span className="text-slate-800 font-black">{profile.name}</span> have connected.
          Start a conversation or book a session now!
        </p>

        <div className="space-y-3 relative z-10">
          <Link href={`/chat/${profile.id}`} onClick={onClose}>
            <button className="w-full bg-gradient-to-r from-[#6C3BFF] to-[#8b5cf6] hover:opacity-90 text-white font-bold text-base py-4 rounded-2xl shadow-lg shadow-[#6C3BFF]/30 active:scale-95 transition-all flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" /> Chat Now
            </button>
          </Link>
          <Link href={`/book/${profile.id}`} onClick={onClose}>
            <button className="w-full mt-2 bg-indigo-50 text-[#6C3BFF] border border-indigo-100 hover:bg-indigo-100 font-bold text-base py-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5" /> Book Session
            </button>
          </Link>
        </div>

        <button onClick={onClose}
          className="mt-6 w-full text-slate-400 hover:text-slate-600 font-bold text-[11px] uppercase tracking-widest transition-colors py-2">
          Keep Swiping
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Discover ────────────────────────────────────────────────────────────
export default function Discover() {
  const token = useAuthStore(s => s.token);

  const [cards,          setCards]          = useState<ProfileCardData[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [matchModal,     setMatchModal]     = useState<ProfileCardData | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);

  useEffect(() => {
    document.body.className = disableScroll;
    const fetchProfiles = async () => {
      try {
        const res  = await fetch("/api/discover/profiles", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();

        const formatted: ProfileCardData[] = data.map((u: any) => {
          let skills = u.skillsTeach || [];
          if (typeof skills === "string") {
            try { skills = JSON.parse(skills); } catch { skills = [skills]; }
          }
          return {
            id:          u.id,
            name:        u.name || "Unknown Expert",
            experience:  u.experience || "Pro Mentor",
            bio:         u.bio || "Excited to connect and grow together on SkillSwap!",
            teaches:     Array.isArray(skills) ? skills : [],
            sessions:    u.sessionsCompleted || 0,
            rating:      Number(u.averageRating || 0),
            price:       u.pricePerHour || 50,
            location:    u.location || "Remote, IN",
            linkedinUrl: u.linkedinUrl,
            hasPhoto:    !!u.avatar,
            image:       u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || "User")}&background=6C3BFF&color=fff&size=500&bold=true`,
            trustScore:  u.trustScore || 0,
          };
        });
        setCards(formatted.sort(() => Math.random() - 0.5));
      } catch (err) {
        console.error("Discover fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchProfiles();
    return () => { document.body.className = ""; };
  }, [token]);

  const handleSwipe = useCallback(async (action: "like" | "pass", id: number) => {
    if (Capacitor.isNativePlatform()) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    const swiped = cards.find(c => c.id === id);
    setCards(prev => prev.filter(c => c.id !== id));
    setExpandedCardId(null);

    try {
      const res    = await fetch("/api/discover/swipe", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ swipedOnId: id, action }),
      });
      const result = await res.json();
      if (result.isMatch && swiped && action === "like") {
        if (Capacitor.isNativePlatform()) Haptics.notification({ type: NotificationType.Success }).catch(() => {});
        confetti({
          particleCount: 200, spread: 90, origin: { y: 0.5 },
          colors: ["#6C3BFF", "#ec4899", "#f59e0b", "#10b981", "#fff"],
          disableForReducedMotion: true, zIndex: 9999,
        });
        setMatchModal(swiped);
      }
    } catch (e) { console.error("swipe error", e); }
  }, [cards, token]);

  return (
    <div className="fixed inset-0 top-16 bg-[#F8FAFC] overflow-hidden font-sans flex flex-col items-center z-10">

      {/* Ambient glows */}
      <motion.div className="absolute top-[-15%] left-[-15%] w-[500px] h-[500px] bg-[#6C3BFF] rounded-full mix-blend-multiply filter blur-[160px] opacity-[0.12] pointer-events-none"
        animate={{ y: [0, 40, 0], x: [0, 20, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute bottom-[-15%] right-[-15%] w-[400px] h-[400px] bg-pink-400 rounded-full mix-blend-multiply filter blur-[160px] opacity-[0.12] pointer-events-none"
        animate={{ y: [0, -30, 0], x: [0, -20, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />

      {/* Header */}
      <div className="w-full flex justify-between items-center px-5 py-3 z-20 bg-white/60 backdrop-blur-xl border-b border-white/70 flex-shrink-0">
        <h1 className="text-xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
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

      {/* Deck */}
      <div className="relative flex-1 flex justify-center items-center w-full overflow-hidden">

        {/* Loading skeleton */}
        {loading && (
          <div className="absolute w-[95%] bg-white rounded-[32px] border border-slate-100 overflow-hidden animate-pulse flex flex-col" style={{ height: 580 }}>
            <div className="flex-shrink-0 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center" style={{ height: "52%" }}>
              <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
            </div>
            <div className="p-6 space-y-3 flex-1">
              <div className="h-6 w-2/3 bg-slate-100 rounded-xl" />
              <div className="h-4 w-1/3 bg-slate-50 rounded-lg" />
              <div className="flex gap-2 mt-4">
                {[1,2,3].map(i => <div key={i} className="h-7 w-16 bg-indigo-50 rounded-xl" />)}
              </div>
              <div className="space-y-2 mt-3">
                <div className="h-3 w-full bg-slate-50 rounded" />
                <div className="h-3 w-4/5 bg-slate-50 rounded" />
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        <AnimatePresence>
          {!loading && cards.length === 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              className="text-center bg-white/80 backdrop-blur-xl p-10 rounded-[32px] border border-white shadow-sm w-[88%]">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-100">
                <Sparkles className="w-9 h-9 text-[#6C3BFF]" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-3">You're all caught up!</h2>
              <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                You've seen all available mentors for now.<br />Come back later for new sparks.
              </p>
              <button onClick={() => window.location.reload()}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-transform">
                Refresh Deck
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cards */}
        <AnimatePresence>
          {cards.map((profile, index) => {
            const isTopCard   = index === cards.length - 1;
            const stackOffset = cards.length - 1 - index;
            if (index < cards.length - 3) return null;
            return (
              <SwipeCard
                key={profile.id}
                profile={profile}
                isTopCard={isTopCard}
                stackOffset={stackOffset}
                isExpanded={expandedCardId === profile.id}
                onToggleExpand={() => setExpandedCardId(expandedCardId === profile.id ? null : profile.id)}
                onSwipe={handleSwipe}
              />
            );
          })}
        </AnimatePresence>

        {/* Swipe hint */}
        {!loading && cards.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
            className="absolute bottom-6 text-[10px] text-slate-300 font-semibold tracking-wide">
            ← swipe to pass &nbsp;•&nbsp; swipe to like →
          </motion.p>
        )}
      </div>

      {/* Match modal */}
      <AnimatePresence>
        {matchModal && <MatchModal profile={matchModal} onClose={() => setMatchModal(null)} />}
      </AnimatePresence>
    </div>
  );
}
