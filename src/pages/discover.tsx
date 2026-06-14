import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, Heart, Info, BadgeCheck, Star, Linkedin, Sparkles, Zap, ChevronDown } from "lucide-react";
import { Link } from "wouter"; 
import confetti from "canvas-confetti";

export default function Discover() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchModal, setMatchModal] = useState<any>(null); 
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/discover/profiles");
        if (!response.ok) throw new Error("Network error");
        const data = await response.json();
        
        const formattedData = data.map((user: any) => {
          // Frontend backup parsing just in case
          let parsedSkills = user.skillsTeach || [];
          if (typeof parsedSkills === 'string') {
             try { parsedSkills = JSON.parse(parsedSkills); } catch { parsedSkills = [parsedSkills]; }
          }

          return {
            id: user.id,
            name: user.name || "Unknown User",
            experience: "Pro Mentor",
            bio: user.bio || "I am super excited to learn and teach new skills here! Let's connect.",
            teaches: Array.isArray(parsedSkills) ? parsedSkills : [], // Guaranteed Array
            sessions: user.sessionsCompleted || 0,
            reviews: user.reviewsCount || 0,
            style: user.teachingStyle || "Interactive",
            rating: user.averageRating || 0,
            linkedinUrl: user.linkedinUrl,
            image: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&size=800`,
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
  }, []);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, id: number) => {
    const swipeThreshold = 100;
    if (info.offset.x > swipeThreshold) {
      handleSwipe("like", id);
    } else if (info.offset.x < -swipeThreshold) {
      handleSwipe("pass", id);
    }
  };

  const handleSwipe = async (action: "like" | "pass", id: number) => {
    const swipedProfile = cards.find(c => c.id === id); 
    setCards((prev) => prev.filter((card) => card.id !== id));
    
    try {
      const response = await fetch("http://localhost:5000/api/discover/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swipedOnId: id, action }),
      });
      const result = await response.json();
      
      if (result.isMatch && swipedProfile) {
        confetti({
          particleCount: 200,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#6366f1', '#ec4899', '#f59e0b', '#ffffff'] 
        });
        setMatchModal(swipedProfile); 
      }
    } catch (error) {
      console.error("Error saving swipe action:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] overflow-hidden relative font-sans">
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md flex justify-between items-center px-6 py-6 absolute top-0 z-50 bg-white/40 backdrop-blur-md border-b border-white/50">
        <h1 className="text-2xl font-black tracking-tight bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
          <Zap className="w-6 h-6 text-indigo-500 fill-indigo-500/20" /> Discover
        </h1>
        <div className="flex gap-4 text-slate-400">
          <BadgeCheck className="w-6 h-6 hover:text-indigo-500 cursor-pointer transition-colors" />
        </div>
      </div>

      <div className="relative w-full max-w-md h-[650px] mt-16 flex justify-center items-center perspective-1000">
        
        {loading && (
          <div className="flex flex-col items-center text-center text-indigo-400 animate-pulse">
            <Sparkles className="w-12 h-12 mb-4 opacity-50" />
            <h2 className="text-xl font-bold tracking-tight">Finding magic...</h2>
          </div>
        )}

        <AnimatePresence>
          {!loading && cards.length === 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center text-slate-500 bg-white/60 backdrop-blur-lg p-10 rounded-[2rem] border border-white shadow-xl shadow-indigo-100/50 w-[85%]">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">You're caught up!</h2>
              <p className="text-sm font-medium text-slate-400">Come back later for new sparks.</p>
            </motion.div>
          )}

          {cards.map((profile, index) => {
            const isTopCard = index === cards.length - 1;
            const isExpanded = expandedCardId === profile.id;
            
            return (
              <motion.div
                key={profile.id}
                className="absolute w-[92%] bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(99,102,241,0.2)] overflow-hidden border border-white/80 flex flex-col"
                style={{ zIndex: index }}
                animate={{ 
                  scale: isTopCard ? 1 : 0.93 - (cards.length - 1 - index) * 0.03, 
                  opacity: isTopCard ? 1 : 1 - (cards.length - 1 - index) * 0.2,
                  height: isExpanded ? "85%" : "600px",
                  y: isTopCard ? 0 : (cards.length - 1 - index) * 20
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                drag={isTopCard ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                whileDrag={{ scale: 1.02, rotate: 2, cursor: "grabbing" }}
                onDragEnd={(e, info) => handleDragEnd(e, info, profile.id)}
                exit={{ x: 500, opacity: 0, rotate: 10, transition: { duration: 0.2 } }}
              >
                
                <div className="relative h-[55%] w-full flex-shrink-0 bg-slate-100 group">
                  <img src={profile.image} alt={profile.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20"></div>
                  <div className="absolute top-5 right-5 bg-white/20 backdrop-blur-md border border-white/40 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,1)]"></span> Online
                  </div>
                </div>

                <div className="absolute top-[55%] left-0 right-0 -translate-y-1/2 flex justify-center gap-4 px-6 z-20 pointer-events-none">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleSwipe("pass", profile.id); }} 
                    className="pointer-events-auto w-16 h-16 bg-white text-red-500 rounded-full flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(239,68,68,0.3)] hover:scale-110 hover:bg-red-50 transition-all duration-300"
                  >
                    <X className="w-8 h-8 stroke-[3]" />
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCardId(isExpanded ? null : profile.id);
                    }}
                    className="pointer-events-auto w-12 h-12 bg-white/90 backdrop-blur-sm text-indigo-500 border border-indigo-50 rounded-full flex items-center justify-center shadow-lg hover:scale-110 hover:bg-indigo-50 transition-all duration-300 translate-y-2"
                  >
                    {isExpanded ? <ChevronDown className="w-5 h-5 stroke-[2.5]" /> : <Info className="w-5 h-5 stroke-[2.5]" />}
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); handleSwipe("like", profile.id); }} 
                    className="pointer-events-auto w-16 h-16 bg-gradient-to-tr from-indigo-600 to-pink-500 text-white rounded-full flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(99,102,241,0.5)] hover:scale-110 hover:shadow-pink-500/40 transition-all duration-300"
                  >
                    <Heart className="w-8 h-8 fill-white stroke-white" />
                  </button>
                </div>

                <div className="pt-12 p-6 flex-1 flex flex-col overflow-y-auto scrollbar-hide bg-white relative z-10">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h2 className="text-3xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
                        {profile.name} <BadgeCheck className="w-6 h-6 text-blue-500" />
                        {profile.linkedinUrl && (
                          <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" onPointerDown={(e) => e.stopPropagation()} className="hover:scale-110 transition-transform">
                            <Linkedin className="w-5 h-5 text-[#0A66C2]" />
                          </a>
                        )}
                      </h2>
                      <p className="text-indigo-600 font-bold text-sm mt-1">{profile.experience}</p>
                    </div>
                  </div>

                  <p className="text-slate-500 text-[15px] mb-5 leading-relaxed mt-3 font-medium">
                    {profile.bio}
                  </p>

                  <div className="mb-4">
                    <div className="flex gap-2 flex-wrap">
                      {/* 🔥 CRASH PROOF RENDERING */}
                      {Array.isArray(profile.teaches) && profile.teaches.length > 0 ? (
                        profile.teaches.map((skill: string, idx: number) => (
                          <span key={idx} className="px-4 py-2 bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200/60 shadow-sm">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No skills listed</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-center mt-auto bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex-1">
                      <p className="font-black text-xl text-slate-800">{profile.sessions}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sessions</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="flex-1 flex flex-col items-center">
                      <div className="flex items-center gap-1 font-black text-xl text-slate-800">
                        {profile.rating} <Star className="w-4 h-4 text-orange-400 fill-orange-400" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rating</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <AnimatePresence>
          {matchModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4"
            >
              <motion.div 
                initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-[0_0_100px_rgba(236,72,153,0.2)] border border-white"
              >
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mb-2">
                  It's a Match!
                </h2>
                <p className="text-slate-500 font-medium mb-8">You and <span className="text-slate-800 font-bold">{matchModal.name}</span> connected.</p>
                
                <div className="flex justify-center mb-8 relative">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <img src={matchModal.image} className="w-32 h-32 rounded-full border-[6px] border-white shadow-2xl object-cover relative z-10" alt="Match" />
                  </div>
                </div>

                <div className="space-y-4">
                  <Link href={`/book/${matchModal.id}`}>
                    <button className="w-full bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-pink-500/30 hover:scale-[1.02] transition-all">
                      Book a Session
                    </button>
                  </Link>
                  <button onClick={() => setMatchModal(null)} className="w-full bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-colors">
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