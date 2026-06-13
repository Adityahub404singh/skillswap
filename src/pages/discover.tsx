import React, { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, Heart, Info, BadgeCheck, Smartphone, Star } from "lucide-react";

// Dummy Data (Backend se connect karne tak)
const PROFILES = [
  {
    id: 1,
    name: "Emma Thompson",
    experience: "5 years experience",
    bio: "Customer service expert with 5+ years experience, looking to transition into tech",
    teaches: ["English", "Spanish"],
    sessions: 28,
    reviews: 42,
    style: "Interactive",
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: 2,
    name: "Rahul Sharma",
    experience: "3 years experience",
    bio: "Frontend Developer passionate about teaching React and Tailwind CSS.",
    teaches: ["React", "JavaScript"],
    sessions: 15,
    reviews: 20,
    style: "Hands-on",
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800",
  }
];

export default function Discover() {
  const [cards, setCards] = useState(PROFILES);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, id: number) => {
    const swipeThreshold = 100;
    if (info.offset.x > swipeThreshold) {
      handleSwipe("right", id); // Liked
    } else if (info.offset.x < -swipeThreshold) {
      handleSwipe("left", id); // Passed
    }
  };

  const handleSwipe = (direction: "left" | "right", id: number) => {
    // API call yahan aayegi (e.g., save match to database)
    console.log(`Swiped ${direction} on profile ${id}`);
    setCards((prev) => prev.filter((card) => card.id !== id));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 overflow-hidden px-4">
      
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-600">Discover</h1>
        <div className="flex gap-4 text-slate-500">
          <BadgeCheck className="w-6 h-6" />
          <Heart className="w-6 h-6" />
        </div>
      </div>

      {/* Card Container */}
      <div className="relative w-full max-w-md h-[600px] flex justify-center items-center">
        <AnimatePresence>
          {cards.length === 0 && (
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
                {/* Profile Image */}
                <div className="relative h-1/2 w-full">
                  <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
                  <div className="absolute top-4 right-4 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    Online
                  </div>
                </div>

                {/* Profile Info */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        {profile.name} <BadgeCheck className="w-5 h-5 text-blue-500" />
                      </h2>
                      <p className="text-slate-500 text-sm">{profile.experience}</p>
                    </div>
                    <div className="flex items-center text-orange-500 font-semibold">
                      <Star className="w-4 h-4 fill-current mr-1" /> {profile.rating}
                    </div>
                  </div>

                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">{profile.bio}</p>

                  {/* Skills/Tags */}
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold flex items-center gap-1 mb-2">
                      🎓 Teaches:
                    </h3>
                    <div className="flex gap-2">
                      {profile.teaches.map((skill) => (
                        <span key={skill} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stats Footer */}
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

                {/* Action Buttons */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 px-6">
                  <button 
                    onClick={() => handleSwipe("left", profile.id)}
                    className="w-14 h-14 bg-white border-2 border-red-100 text-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 transition-colors"
                  >
                    <X className="w-8 h-8" />
                  </button>
                  <button className="w-12 h-12 bg-white border-2 border-blue-100 text-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-50 transition-colors mt-2">
                    <Info className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => handleSwipe("right", profile.id)}
                    className="w-14 h-14 bg-white border-2 border-green-100 text-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-50 transition-colors"
                  >
                    <Heart className="w-8 h-8 fill-current" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
