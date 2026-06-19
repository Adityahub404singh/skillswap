import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo, useAnimation } from "framer-motion";
import { X, Heart, Info, BadgeCheck, Star, Linkedin, Sparkles, Zap, ChevronDown } from "lucide-react";
import { Link } from "wouter"; 
import confetti from "canvas-confetti";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

// CSS class to prevent body scroll while swiping
const disableScroll = "overflow-hidden overscroll-none touch-none";

export default function Discover() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchModal, setMatchModal] = useState<any>(null); 
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);

  useEffect(() => {
    // Prevent overall page bounce/scroll on mobile
    document.body.className = disableScroll;
    
    const fetchProfiles = async () => {
      try {
        const response = await fetch("/api/discover/profiles");
        if (!response.ok) throw new Error("Network error");
        const data = await response.json();
        
        const formattedData = data.map((user: any) => {
          let parsedSkills = user.skillsTeach || [];
          if (typeof parsedSkills === 'string') {
             try { parsedSkills = JSON.parse(parsedSkills); } catch { parsedSkills = [parsedSkills]; }
          }
          return {
            id: user.id,
            name: user.name || "Unknown User",
            experience: "Pro Mentor",
            bio: user.bio || "I am super excited to learn and teach new skills here! Let's connect.",
            teaches: Array.isArray(parsedSkills) ? parsedSkills : [],
            sessions: user.sessionsCompleted || 0,
            reviews: user.reviewsCount || 0,
            style: user.teachingStyle || "Interactive",
            rating: user.averageRating || 0,
            linkedinUrl: user.linkedinUrl,
            image: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&size=400`, // Reduced image size for better performance
          };
        });
        setCards(formattedData);
      } catch (error) {
        console.error("Error fetching profiles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();

    return () => {
      document.body.className = ""; // Cleanup on unmount
    };
  }, []);

  // Optimized swipe handler using useCallback
  const handleSwipe = useCallback(async (action: "like" | "pass", id: number) => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(()=>console.log('Haptics not supported'));
    }

    // Capture the swiped profile before removing it
    const swipedProfile = cards.find(c => c.id === id); 
    
    // Instantly remove card from UI for smooth feel
    setCards((prev) => prev.filter((card) => card.id !== id));
    setExpandedCardId(null); // Close if expanded
    
    try {
      const response = await fetch("/api/discover/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swipedOnId: id, action }),
      });
      const result = await response.json();
      
      if (result.isMatch && swipedProfile) {
        if (Capacitor.isNativePlatform()) {
          Haptics.notification({ type: NotificationType.Success }).catch(()=>console.log('Haptics not supported'));
        }
        confetti({
          particleCount: 150, // Reduced particles for performance
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#ec4899', '#f59e0b', '#ffffff'],
          disableForReducedMotion: true // respect system settings
        });
        setMatchModal(swipedProfile); 
      }
    } catch (error) {
      console.error("Error saving swipe action:", error);
    }
  }, [cards]);

  const handleDragEnd = (event: any, info: PanInfo, id: number) => {
    const swipeThreshold = 80; // Make it easier to swipe (reduced from 100)
    const velocityThreshold = 500; // Swipe speed check

    if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      handleSwipe("like", id);
    } else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      handleSwipe("pass", id);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#F8FAFC] overflow-hidden relative font-sans w-full">
      
      {/* Background Glows - Using absolute CSS instead of framer motion to save main thread */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 pointer-events-none"></div>

      {/* Header */}
      <div className="w-full flex justify-between items-center px-6 py-4 absolute top-0 z-50 bg-white/40 backdrop-blur-md border-b border-white/50 safe-area-top">
        <h1 className="text-2xl font-black tracking-tight bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
          <Zap className="w-6 h-6 text-indigo-500 fill-indigo-500/20" /> Discover
        </h1>
      </div>

      {/* Cards Container */}
      <div className="relative w-full max-w-sm h-[60vh] min-h-[500px] mt-12 flex justify-center items-center">
        
        {loading && (
          <div className="flex flex-col items-center text-center text-indigo-400 animate-pulse">
            <Sparkles className="w-10 h-10 mb-3 opacity-50" />
            <h2 className="text-lg font-bold tracking-tight">Finding magic...</h2>
          </div>
        )}

        <AnimatePresence>
          {!loading && cards.length === 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center text-slate-500 bg-white/60 backdrop-blur-lg p-8 rounded-[2rem] border border-white shadow-xl shadow-indigo-100/50 w-[85%]">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">You're caught up!</h2>
              <p className="text-sm font-medium text-slate-400">Come back later for new sparks.</p>
            </motion.div>
          )}

          {cards.map((profile, index) => {
            const isTopCard = index === cards.length - 1;
            const isExpanded = expandedCardId === profile.id;
            // Only render top 3 cards to save memory (Fixes "Skipped frames" error)
            if (index < cards.length - 3) return null;
            
            return (
              <motion.div
                key={profile.id}
                className="absolute w-[95%] bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100 flex flex-col will-change-transform"
                style={{ 
                  zIndex: index,
                  touchAction: "none" // Crucial for smooth dragging on mobile
                }}
                animate={{ 
                  scale: isTopCard ? 1 : 1 - (cards.length - 1 - index) * 0.05, 
                  opacity: isTopCard ? 1 : 1 - (cards.length - 1 - index) * 0.3,
                  y: isTopCard ? 0 : (cards.length - 1 - index) * -15,
                  height: isExpanded ? "85vh" : "100%"
                }}
                transition={{ type: "tween", ease: "easeOut", duration: 0.2 }} // Tween is smoother than Spring on low-end devices
                drag={isTopCard ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                whileDrag={{ scale: 1.02, cursor: "grabbing" }}
                onDragEnd={(e, info) => handleDragEnd(e, info, profile.id)}
                exit={{ x: 500, opacity: 0, transition: { duration: 0.2 } }}
              >
                
                {/* Image Area */}
                <div className="relative h-[60%] w-full flex-shrink-0 bg-slate-100">
                  <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" loading={isTopCard ? "eager" : "lazy"} />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 pointer-events-none"></div>
                  <div className="absolute top-4 right-4 bg-white/30 backdrop-blur-md border border-white/40 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,1)]"></span> Online
                  </div>
                </div>

                {/* Action Buttons Container (Overlapping image and content) */}
                <div className="absolute top-[60%] left-0 right-0 -translate-y-1/2 flex justify-center gap-5 px-4 z-20 pointer-events-none">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleSwipe("pass", profile.id); }} 
                    className="pointer-events-auto w-14 h-14 bg-white text-red-500 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                  >
                    <X className="w-7 h-7 stroke-[3]" />
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCardId(isExpanded ? null : profile.id);
                    }}
                    className="pointer-events-auto w-10 h-10 bg-white/90 backdrop-blur-sm text-indigo-500 border border-indigo-50 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform translate-y-2"
                  >
                    {isExpanded ? <ChevronDown className="w-5 h-5 stroke-[2.5]" /> : <Info className="w-5 h-5 stroke-[2.5]" />}
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); handleSwipe("like", profile.id); }} 
                    className="pointer-events-auto w-14 h-14 bg-gradient-to-tr from-indigo-500 to-pink-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-pink-500/30 active:scale-95 transition-transform"
                  >
                    <Heart className="w-7 h-7 fill-white stroke-white" />
                  </button>
                </div>

                {/* Profile Data */}
                <div className="pt-10 p-5 flex-1 flex flex-col overflow-y-auto bg-white relative z-10 overscroll-contain">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-1.5 tracking-tight leading-none">
                      {profile.name} <BadgeCheck className="w-5 h-5 text-blue-500" />
                    </h2>
                    <p className="text-indigo-600 font-bold text-xs mt-1">{profile.experience}</p>
                  </div>

                  <p className="text-slate-500 text-sm mt-3 font-medium line-clamp-3">
                    {profile.bio}
                  </p>

                  <div className="mt-4 mb-2 flex gap-1.5 flex-wrap">
                    {profile.teaches.slice(0, 4).map((skill: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-100">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-center mt-auto pt-3 border-t border-slate-100">
                    <div className="flex-1">
                      <p className="font-black text-lg text-slate-800 leading-none">{profile.sessions}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Sessions</p>
                    </div>
                    <div className="w-px h-6 bg-slate-200"></div>
                    <div className="flex-1 flex flex-col items-center">
                      <div className="flex items-center gap-1 font-black text-lg text-slate-800 leading-none">
                        {profile.rating} <Star className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">Rating</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Match Modal */}
        <AnimatePresence>
          {matchModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-[2rem] p-6 max-w-[300px] w-full text-center shadow-2xl border border-white"
              >
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mb-1">
                  It's a Match!
                </h2>
                <p className="text-slate-500 text-sm font-medium mb-6">You and <span className="text-slate-800 font-bold">{matchModal.name}</span> connected.</p>
                
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full blur-md opacity-40"></div>
                    <img src={matchModal.image} className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover relative z-10" alt="Match" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Link href={`/book/${matchModal.id}`}>
                    <button className="w-full bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform">
                      Book a Session
                    </button>
                  </Link>
                  <button onClick={() => setMatchModal(null)} className="w-full bg-slate-100 text-slate-500 font-bold py-3.5 rounded-xl active:scale-95 transition-transform">
                    Keep Swiping
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}