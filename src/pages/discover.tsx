import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, Heart, Info, BadgeCheck, Star, Linkedin } from "lucide-react";
import { Link } from "wouter"; // 🔥 Link import kiya booking ke liye

export default function Discover() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchModal, setMatchModal] = useState<any>(null); // 🔥 Match Modal State

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/discover/profiles");
        const data = await response.json();
        
        const formattedData = data.map((user: any) => {
          let parsedSkills = [];
          try {
            parsedSkills = user.skillsTeach ? JSON.parse(user.skillsTeach) : [];
          } catch (e) {
            parsedSkills = [];
          }

          return {
            id: user.id,
            name: user.name || "Unknown User",
            experience: "SkillSwap Member",
            bio: user.bio || "I am super excited to learn and teach new skills here!",
            teaches: parsedSkills,
            sessions: user.sessionsCompleted || 0,
            reviews: 0,
            style: "Interactive",
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
    const swipedProfile = cards.find(c => c.id === id); // 🔥 Swipe hue user ka data
    setCards((prev) => prev.filter((card) => card.id !== id));
    
    try {
      const response = await fetch("http://localhost:5000/api/discover/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swipedOnId: id, action }),
      });
      const result = await response.json();
      
      if (result.isMatch && swipedProfile) {
        setMatchModal(swipedProfile); // 🔥 Alert hata kar Modal trigger kiya
      }
    } catch (error) {
      console.error("Error saving swipe action:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 overflow-hidden px-4">
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-600">Discover</h1>
        <div className="flex gap-4 text-slate-500">
          <BadgeCheck className="w-6 h-6" />
          <Heart className="w-6 h-6" />
        </div>
      </div>

      <div className="relative w-full max-w-md h-[600px] flex justify-center items-center">
        {loading && (
          <div className="text-center text-slate-500 animate-pulse">
            <h2 className="text-xl font-semibold">Finding matches for you...</h2>
          </div>
        )}

        <AnimatePresence>
          {!loading && cards.length === 0 && (
            <div className="text-center text-slate-500">
              <h2 className="text-xl font-semibold">No more profiles!</h2>
              <p>Check back later for new matches.</p>
            </div>
          )}

          {cards.map((profile, index) => {
            const isTopCard = index === cards.length - 1;
            return (
              <motion.div
                key={profile.id}
                className="absolute w-full h-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex flex-col"
                style={{ zIndex: index }}
                drag={isTopCard ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, info) => handleDragEnd(e, info, profile.id)}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: isTopCard ? 1 : 0.95, opacity: 1 }}
                exit={{ x: 500, opacity: 0, transition: { duration: 0.2 } }}
                whileDrag={{ scale: 1.05, cursor: "grabbing" }}
              >
                <div className="relative h-1/2 w-full">
                  <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
                  <div className="absolute top-4 right-4 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    Online
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        {profile.name} <BadgeCheck className="w-5 h-5 text-blue-500" />
                        {profile.linkedinUrl && (
                          <a 
                            href={profile.linkedinUrl.startsWith('http') ? profile.linkedinUrl : `https://${profile.linkedinUrl}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <Linkedin className="w-5 h-5 text-[#0A66C2] hover:scale-110 transition-transform cursor-pointer" />
                          </a>
                        )}
                      </h2>
                      <p className="text-slate-500 text-sm">{profile.experience}</p>
                    </div>
                    <div className="flex items-center text-orange-500 font-semibold">
                      <Star className="w-4 h-4 fill-current mr-1" /> {profile.rating}
                    </div>
                  </div>

                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">{profile.bio}</p>

                  <div className="mb-4">
                    <h3 className="text-sm font-semibold flex items-center gap-1 mb-2">🎓 Teaches:</h3>
                    <div className="flex gap-2 flex-wrap">
                      {profile.teaches.map((skill: string) => (
                        <span key={skill} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                      {profile.teaches.length === 0 && (
                        <span className="text-xs text-slate-400 italic">No skills added yet</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-center mt-auto border-t pt-4">
                    <div>
                      <p className="font-bold text-lg">{profile.sessions}</p>
                      <p className="text-xs text-slate-500">Sessions</p>
                    </div>
                    <div>
                      <p className="font-bold text-lg">{profile.reviews}</p>
                      <p className="text-xs text-slate-500">Reviews</p>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-700">{profile.style}</p>
                      <p className="text-xs text-slate-500">Style</p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 px-6">
                  <button onClick={() => handleSwipe("pass", profile.id)} className="w-14 h-14 bg-white border-2 border-red-100 text-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 transition-colors">
                    <X className="w-8 h-8" />
                  </button>
                  <button className="w-12 h-12 bg-white border-2 border-blue-100 text-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-50 transition-colors mt-2">
                    <Info className="w-6 h-6" />
                  </button>
                  <button onClick={() => handleSwipe("like", profile.id)} className="w-14 h-14 bg-white border-2 border-green-100 text-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-50 transition-colors">
                    <Heart className="w-8 h-8 fill-current" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* 🔥 Match Modal UI */}
        <AnimatePresence>
          {matchModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            >
              <motion.div 
                initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl"
              >
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-400 mb-2">
                  It's a Match! 🎉
                </h2>
                <p className="text-slate-600 mb-6">You and {matchModal.name} liked each other.</p>
                
                <div className="flex justify-center mb-6 relative">
                  <img src={matchModal.image} className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover z-10" alt="Match" />
                </div>

                <div className="space-y-3">
                  <Link href={`/book/${matchModal.id}`}>
                    <button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold py-3 rounded-xl shadow-lg hover:scale-105 transition-transform">
                      Book a Session
                    </button>
                  </Link>
                  <button 
                    onClick={() => setMatchModal(null)}
                    className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                  >
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