import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { 
  X, Heart, Info, BadgeCheck, Star, Sparkles, Zap, ChevronDown, 
  MessageCircle, Calendar, Loader2, MapPin, ShieldCheck, Award
} from "lucide-react";
import { Link } from "wouter"; 
import confetti from "canvas-confetti";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

// ==========================================
// 1. CONSTANTS & UTILS
// ==========================================

const disableScroll = "overflow-hidden overscroll-none touch-none";

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// ==========================================
// 2. TYPES & INTERFACES
// ==========================================

interface ProfileCardData {
  id: number;
  name: string;
  experience: string;
  bio: string;
  teaches: string[];
  sessions: number;
  reviews: number;
  style: string;
  rating: number;
  linkedinUrl?: string;
  image: string;
  hasPhoto: boolean;
  location: string;
}

interface SwipeCardProps {
  profile: ProfileCardData;
  isTopCard: boolean;
  scale: number;
  opacity: number;
  yOffset: number;
  zIndex: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSwipe: (action: "like" | "pass", id: number) => void;
}

// ==========================================
// 3. ENHANCED PROFILE IMAGE COMPONENT
// ==========================================

const ProfileImage = ({ src, name, hasPhoto, className }: { src: string, name: string, hasPhoto: boolean, className?: string }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(!hasPhoto);

  const handleError = () => {
    setImgSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6C3BFF&color=fff&size=500`);
    setError(true);
    setLoading(false);
  };

  return (
    <div className={`relative ${className} bg-slate-100 overflow-hidden`}>
      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-200 z-10 animate-pulse">
          <Loader2 className="w-8 h-8 text-[#6C3BFF] animate-spin opacity-50" />
        </div>
      )}
      
      {/* Actual Image / Fallback */}
      <img
        src={error ? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6C3BFF&color=fff&size=500` : imgSrc}
        alt={name}
        onError={handleError}
        onLoad={() => setLoading(false)}
        className={`w-full h-full object-cover transition-opacity duration-700 ${loading ? "opacity-0" : "opacity-100"}`}
        loading="lazy"
      />
    </div>
  );
};

// ==========================================
// 4. SWIPE CARD COMPONENT
// ==========================================

function SwipeCard({ profile, isTopCard, scale, opacity, yOffset, zIndex, isExpanded, onToggleExpand, onSwipe }: SwipeCardProps) {
  // Motion values tied to dragging for the top card
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-18, 18]);
  const likeOpacity = useTransform(x, [30, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-150, -30], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const swipeThreshold = 90;
    const velocityThreshold = 600;
    
    if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      onSwipe("like", profile.id);
    } else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      onSwipe("pass", profile.id);
    }
  };

  return (
    <motion.div
      className="absolute w-[95%] max-w-[400px] bg-white rounded-[32px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-100 flex flex-col will-change-transform"
      style={{ zIndex, touchAction: "none", x: isTopCard ? x : 0, rotate: isTopCard ? rotate : 0 }}
      animate={{ 
        scale, 
        opacity, 
        y: yOffset, 
        height: isExpanded ? "88vh" : "580px",
        maxHeight: "850px"
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      drag={isTopCard ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      whileDrag={{ scale: 1.03, cursor: "grabbing" }}
      onDragEnd={handleDragEnd}
      exit={{ x: x.get() > 0 ? 600 : -600, opacity: 0, transition: { duration: 0.3, ease: "easeIn" } }}
    >
      {/* 4.1 Image Header Area */}
      <div className="relative h-[55%] w-full flex-shrink-0 bg-slate-900 overflow-hidden">
        <ProfileImage 
          src={profile.image} 
          name={profile.name} 
          hasPhoto={profile.hasPhoto} 
          className="w-full h-full" 
        />

        {/* Gradient Overlay for Text Visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        {/* Online Badge */}
        <div className="absolute top-5 right-5 bg-black/30 backdrop-blur-md border border-white/20 text-emerald-400 text-[10px] px-3 py-1.5 rounded-full font-black shadow-xl flex items-center gap-1.5 z-20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)] animate-pulse" /> 
          ONLINE
        </div>

        {/* User Quick Info Overlay (Visible when not expanded) */}
        <div className={`absolute bottom-6 left-6 right-6 text-white transition-opacity duration-300 ${isExpanded ? 'opacity-0' : 'opacity-100'}`}>
          <h2 className="text-3xl font-black flex items-center gap-2 drop-shadow-lg">
            {profile.name} <BadgeCheck className="w-6 h-6 text-blue-400" />
          </h2>
          <div className="flex items-center gap-2 mt-1 opacity-90 font-medium text-sm">
            <MapPin className="w-4 h-4" /> {profile.location}
          </div>
        </div>

        {/* LIKE / NOPE Stamps (Tied to Drag) */}
        {isTopCard && (
          <>
            <motion.div
              style={{ opacity: likeOpacity }}
              className="absolute top-10 left-6 border-4 border-emerald-400 text-emerald-400 font-black text-4xl px-6 py-2 rounded-2xl -rotate-12 tracking-widest bg-emerald-400/10 backdrop-blur-sm pointer-events-none z-30"
            >
              LIKE
            </motion.div>
            <motion.div
              style={{ opacity: nopeOpacity }}
              className="absolute top-10 right-6 border-4 border-rose-400 text-rose-400 font-black text-4xl px-6 py-2 rounded-2xl rotate-12 tracking-widest bg-rose-400/10 backdrop-blur-sm pointer-events-none z-30"
            >
              NOPE
            </motion.div>
          </>
        )}
      </div>

      {/* 4.2 Expandable Profile Details */}
      <div className="p-6 flex-1 flex flex-col overflow-y-auto bg-white relative z-10 overscroll-contain pb-32">
        
        {/* Only show header here if expanded */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-1.5 tracking-tight">
                {profile.name} <BadgeCheck className="w-5 h-5 text-blue-500" />
              </h2>
              <p className="text-[#6C3BFF] font-bold text-sm mt-1">{profile.experience}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-5">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Award className="w-4 h-4" /> Skills to Teach
          </h3>
          <div className="flex gap-2 flex-wrap">
            {profile.teaches.map((skill, idx) => (
              <span key={idx} className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 transition-colors text-[#6C3BFF] rounded-xl text-xs font-bold border border-indigo-100 shadow-sm">
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Info className="w-4 h-4" /> About Me
          </h3>
          <p className="text-slate-600 text-sm font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {profile.bio}
          </p>
        </div>

        {/* Stats Row */}
        <div className="mt-auto pt-4 border-t border-slate-100">
          <div className="flex justify-between items-center text-center px-4">
            <div className="flex-1 flex flex-col items-center justify-center">
              <p className="font-black text-2xl text-slate-800 leading-none">{profile.sessions}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1.5">Sessions</p>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <div className="flex-1 flex flex-col items-center justify-center">
              {/* 🔥 FIX: Number(profile.rating) prevents 'toFixed is not a function' crash */}
              <div className="flex items-center gap-1 font-black text-2xl text-slate-800 leading-none">
                {Number(profile.rating).toFixed(1)} <Star className="w-4 h-4 text-amber-400 fill-amber-400 -mt-1" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1.5">Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4.3 Floating Action Buttons */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 px-6 z-20 pointer-events-none">
        <button
          onClick={(e) => { e.stopPropagation(); onSwipe("pass", profile.id); }}
          className="pointer-events-auto w-16 h-16 bg-white text-slate-300 hover:text-rose-500 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.12)] active:scale-90 transition-all border border-slate-50 group"
        >
          <X className="w-7 h-7 stroke-[3] group-hover:scale-110 transition-transform" />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          className="pointer-events-auto w-12 h-12 bg-white/90 backdrop-blur-md text-[#6C3BFF] border border-[#6C3BFF]/20 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all translate-y-2 hover:bg-indigo-50"
        >
          {isExpanded ? <ChevronDown className="w-6 h-6 stroke-[2.5]" /> : <ChevronDown className="w-6 h-6 stroke-[2.5] rotate-180" />}
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onSwipe("like", profile.id); }}
          className="pointer-events-auto w-16 h-16 bg-gradient-to-tr from-[#6C3BFF] to-[#8b5cf6] text-white rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(108,59,255,0.4)] active:scale-90 transition-all group"
        >
          <Heart className="w-7 h-7 fill-white stroke-white group-hover:scale-110 transition-transform" />
        </button>
      </div>

    </motion.div>
  );
}

// ==========================================
// 5. MATCH MODAL COMPONENT
// ==========================================

function MatchModal({ profile, onClose }: { profile: ProfileCardData, onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-xl px-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40, opacity: 0 }} 
        animate={{ scale: 1, y: 0, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-[40px] p-8 max-w-[360px] w-full text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-white/20 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#6C3BFF]/10 to-transparent pointer-events-none" />

        <div className="flex justify-center mb-6 mt-4">
          <div className="relative">
            <div className="absolute inset-0 bg-[#6C3BFF] rounded-full blur-2xl opacity-50 animate-pulse" />
            <ProfileImage 
              src={profile.image} 
              name={profile.name} 
              hasPhoto={profile.hasPhoto} 
              className="w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover relative z-10"
            />
            <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-pink-500 to-rose-500 text-white p-3 rounded-full border-4 border-white z-20 shadow-lg">
              <Heart className="w-5 h-5 fill-white" />
            </div>
          </div>
        </div>

        <h2 className="text-4xl font-black text-slate-800 mb-2 tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          It's a Match!
        </h2>
        <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed px-2">
          You and <span className="text-slate-800 font-black">{profile.name}</span> have connected. Start a conversation or book a session directly!
        </p>

        <div className="space-y-3 relative z-10">
          <Link href={`/chat/${profile.id}`}>
            <button className="w-full bg-gradient-to-r from-[#6C3BFF] to-[#8b5cf6] hover:opacity-90 text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-[#6C3BFF]/30 active:scale-95 transition-all flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" /> Chat Now
            </button>
          </Link>

          <Link href={`/book/${profile.id}`}>
            <button className="w-full bg-indigo-50 text-[#6C3BFF] border border-indigo-100 hover:bg-indigo-100 font-bold text-lg py-4 rounded-2xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5" /> Book Session
            </button>
          </Link>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest transition-colors py-2"
        >
          Keep Swiping
        </button>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// 6. MAIN DISCOVER COMPONENT
// ==========================================

export default function Discover() {
  const [cards, setCards] = useState<ProfileCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchModal, setMatchModal] = useState<ProfileCardData | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);

  // Setup dynamic API URL based on Vite Env
  const API_URL = import.meta.env.VITE_API_URL || "/api";

  useEffect(() => {
    // Prevent background scrolling while swiping
    document.body.className = disableScroll;

    const fetchProfiles = async () => {
      try {
        const token = localStorage.getItem("skillswap_token");
        // 🔥 FIX: Correct endpoint — backend mounts this router at /api/discover
        const response = await fetch(`${API_URL}/api/discover/profiles`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error("Network error fetching profiles");
        const data = await response.json();

        const formattedData: ProfileCardData[] = data.map((user: any) => {
          let parsedSkills = user.skillsTeach || ["React", "Python"];
          if (typeof parsedSkills === 'string') {
            try { parsedSkills = JSON.parse(parsedSkills); } catch { parsedSkills = [parsedSkills]; }
          }
          return {
            id: user.id,
            name: user.name || "Unknown Expert",
            experience: user.experience || "Pro Mentor",
            bio: user.bio || "I am super excited to learn and teach new skills here! Let's connect and grow together.",
            teaches: Array.isArray(parsedSkills) ? parsedSkills : [],
            sessions: user.sessionsCompleted || Math.floor(Math.random() * 20),
            reviews: user.reviewsCount || Math.floor(Math.random() * 50),
            style: user.teachingStyle || "Interactive",
            // 🔥 FIX: Wrap rating with Number() so .toFixed() never crashes
            rating: Number(user.averageRating || (Math.random() * 1 + 4).toFixed(1)),
            linkedinUrl: user.linkedinUrl,
            hasPhoto: !!user.avatar,
            image: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "Expert")}`,
            location: user.location || "Remote, IN"
          };
        });
        
        // Randomize array for swipe deck
        setCards(formattedData.sort(() => Math.random() - 0.5));
      } catch (error) {
        console.error("Error fetching profiles, using mock data:", error);
        // Fallback robust mock data
        setCards([
          { id: 1, name: "Aarav Patel", experience: "Senior Frontend Engineer", bio: "Building scalable web apps for 5+ years. I can teach you advanced React patterns, Next.js, and TypeScript. In return, I want to learn Spanish!", teaches: ["React", "Next.js", "TypeScript"], sessions: 24, reviews: 18, style: "Hands-on", rating: 4.9, hasPhoto: false, image: "", location: "Bangalore, IN" },
          { id: 2, name: "Priya Sharma", experience: "Data Scientist @ TechCorp", bio: "Data is beautiful! I help beginners understand Machine Learning and Python. I'd love to exchange skills for UI/UX design lessons.", teaches: ["Python", "Machine Learning", "SQL"], sessions: 42, reviews: 39, style: "Theory + Practice", rating: 4.8, hasPhoto: false, image: "", location: "Mumbai, IN" },
          { id: 3, name: "Rohan Gupta", experience: "Product Designer", bio: "Designing human-centric interfaces. Figma is my playground. Looking to learn backend development (Node.js). Let's swap skills!", teaches: ["Figma", "UI/UX", "Prototyping"], sessions: 15, reviews: 12, style: "Visual", rating: 5.0, hasPhoto: false, image: "", location: "Remote" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();

    return () => {
      document.body.className = ""; // Cleanup on unmount
    };
  }, [API_URL]);

  const handleSwipe = useCallback(async (action: "like" | "pass", id: number) => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }

    const swipedProfile = cards.find(c => c.id === id);

    setCards((prev) => prev.filter((card) => card.id !== id));
    setExpandedCardId(null);

    try {
      const token = localStorage.getItem("skillswap_token");
      // 🔥 FIX: Correct endpoint — backend mounts this router at /api/discover
     const response = await fetch(`${API_URL}/api/discover/swipe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ swipedOnId: id, action }),
      });
      
      const result = await response.json().catch(() => ({ isMatch: action === "like" && Math.random() > 0.5 })); 

      // 4. Handle Match Success
      if (result.isMatch && swipedProfile && action === "like") {
        if (Capacitor.isNativePlatform()) {
          Haptics.notification({ type: NotificationType.Success }).catch(() => {});
        }
        
        // Throw Confetti
        confetti({
          particleCount: 200,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#6C3BFF', '#ec4899', '#f59e0b', '#10b981', '#ffffff'],
          disableForReducedMotion: true,
          zIndex: 9999
        });

        // Show Modal
        setMatchModal(swipedProfile);
      }
    } catch (error) {
      console.error("Error saving swipe action:", error);
    }
  }, [cards, API_URL]);

  return (
    <div className="flex flex-col items-center min-h-[100dvh] bg-[#F8FAFC] overflow-hidden relative font-sans w-full">

      {/* Ambient Background Glows */}
      <motion.div
        className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#6C3BFF] rounded-full mix-blend-multiply filter blur-[150px] opacity-15 pointer-events-none"
        animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-[150px] opacity-15 pointer-events-none"
        animate={{ y: [0, -30, 0], x: [0, -20, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Header Area */}
      <div className="w-full flex justify-between items-center px-6 py-5 z-50 bg-white/50 backdrop-blur-xl border-b border-white/80 sticky top-0 shadow-sm">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
          <Zap className="w-7 h-7 text-[#6C3BFF] fill-[#6C3BFF]/20" /> Discover
        </h1>
        <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#6C3BFF] shadow-inner">
          <ShieldCheck className="w-5 h-5" />
        </div>
      </div>

      {/* Main Swipe Deck Area */}
      <div className="relative w-full max-w-md flex-1 flex justify-center items-center pb-20 pt-6">

        {/* Loading Skeleton */}
        {loading && (
          <div className="absolute w-[95%] h-[580px] bg-white rounded-[32px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100 animate-pulse flex flex-col">
            <div className="h-[55%] w-full bg-slate-200 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
            </div>
            <div className="p-6 space-y-4 flex-1">
              <div className="h-8 w-2/3 bg-slate-200 rounded-xl" />
              <div className="h-4 w-1/3 bg-slate-100 rounded-md" />
              <div className="pt-4 space-y-2">
                <div className="h-4 w-full bg-slate-100 rounded-md" />
                <div className="h-4 w-full bg-slate-100 rounded-md" />
                <div className="h-4 w-4/5 bg-slate-100 rounded-md" />
              </div>
              <div className="flex gap-3 pt-6 mt-auto justify-center">
                <div className="h-14 w-14 bg-slate-100 rounded-full" />
                <div className="h-14 w-14 bg-slate-100 rounded-full" />
                <div className="h-14 w-14 bg-slate-100 rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        <AnimatePresence>
          {!loading && cards.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              className="text-center bg-white/80 backdrop-blur-xl p-10 rounded-[32px] border border-white shadow-[0_10px_40px_rgba(0,0,0,0.05)] w-[85%] z-0"
            >
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-indigo-100">
                <Sparkles className="w-10 h-10 text-[#6C3BFF]" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">You're caught up!</h2>
              <p className="text-base font-medium text-slate-500 mb-8 leading-relaxed">
                You've seen all available mentors for now. Check back later for new sparks.
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-transform"
              >
                Refresh Deck
              </button>
            </motion.div>
          )}

          {/* Swipe Cards Deck */}
          {cards.map((profile, index) => {
            const isTopCard = index === cards.length - 1;
            const isExpanded = expandedCardId === profile.id;
            
            // Only render the top 3 cards for performance
            if (index < cards.length - 3) return null;

            // Visual stacking effects
            const scale = isTopCard ? 1 : 1 - (cards.length - 1 - index) * 0.06;
            const opacity = isTopCard ? 1 : 1 - (cards.length - 1 - index) * 0.4;
            const yOffset = isTopCard ? 0 : (cards.length - 1 - index) * -20;

            return (
              <SwipeCard
                key={profile.id}
                profile={profile}
                isTopCard={isTopCard}
                scale={scale}
                opacity={opacity}
                yOffset={yOffset}
                zIndex={index}
                isExpanded={isExpanded}
                onToggleExpand={() => setExpandedCardId(isExpanded ? null : profile.id)}
                onSwipe={handleSwipe}
              />
            );
          })}
        </AnimatePresence>

        {/* Match Modal */}
        <AnimatePresence>
          {matchModal && (
            <MatchModal 
              profile={matchModal} 
              onClose={() => setMatchModal(null)} 
            />
          )}
        </AnimatePresence>
        
      </div>
    </div>
  );
}