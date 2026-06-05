"use client";
import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Zap, Clock, MessageCircle, Star, CheckCircle, ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const SESSION_TYPES = [
  {
    id: "micro_15",
    label: "15-min Quick Session",
    desc: "Fast concept explanation or code review",
    credits: 3,
    duration: 15,
    icon: "âš¡",
    color: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
    iconColor: "text-yellow-400",
    badge: "Most Popular",
  },
  {
    id: "micro_30",
    label: "30-min Session",
    desc: "Deep-dive on one specific topic",
    credits: 5,
    duration: 30,
    icon: "ðŸš€",
    color: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
    iconColor: "text-violet-400",
    badge: "",
  },
  {
    id: "doubt",
    label: "Doubt Solving",
    desc: "Stuck on something? Get it cleared instantly",
    credits: 4,
    duration: 20,
    icon: "ðŸ’¡",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    iconColor: "text-blue-400",
    badge: "New",
  },
  {
    id: "standard",
    label: "1-hour Full Session",
    desc: "Comprehensive learning with practice",
    credits: 10,
    duration: 60,
    icon: "ðŸ“š",
    color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
    iconColor: "text-emerald-400",
    badge: "",
  },
  {
    id: "extended",
    label: "1.5-hour Deep Dive",
    desc: "End-to-end topic mastery session",
    credits: 15,
    duration: 90,
    icon: "ðŸŽ“",
    color: "from-pink-500/20 to-pink-600/10 border-pink-500/30",
    iconColor: "text-pink-400",
    badge: "Best Value",
  },
];

const MENTORS = [
  { id: 1, name: "Rahul Sharma",  skills: ["English", "Public Speaking"], rating: 4.8, sessions: 42, streak: 15, verified: true },
  { id: 2, name: "Priya Patel",   skills: ["UI/UX", "Figma", "Design"],   rating: 4.7, sessions: 19, streak: 7,  verified: true },
  { id: 3, name: "Vikram Singh",  skills: ["Python", "AI/ML", "SQL"],     rating: 4.9, sessions: 55, streak: 45, verified: false },
  { id: 4, name: "Arjun Mehta",   skills: ["DevOps", "Docker", "AWS"],    rating: 4.5, sessions: 22, streak: 12, verified: true },
];

export default function BookMicroSession() {
  const [selectedType, setSelectedType]     = useState("micro_15");
  const [selectedMentor, setSelectedMentor] = useState<number | null>(null);
  const [skill, setSkill]                   = useState("");
  const [date, setDate]                     = useState("");
  const [time, setTime]                     = useState("");
  const [booked, setBooked]                 = useState(false);

  const selected = SESSION_TYPES.find(s => s.id === selectedType)!;

  function handleBook() {
    if (!selectedMentor || !skill || !date || !time) return;
    setBooked(true);
  }

  if (booked) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={36} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Session Booked! ðŸŽ‰</h2>
          <p className="text-gray-400 text-sm mb-2">
            Your <span className="text-violet-300 font-medium">{selected.label}</span> is confirmed.
          </p>
          <p className="text-gray-500 text-xs mb-8">
            {date} at {time} Â· {selected.credits} credits deducted
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/sessions">
              <Button className="bg-violet-500 hover:bg-violet-600 text-white">View Sessions</Button>
            </Link>
            <Button variant="outline" onClick={() => setBooked(false)}>Book Another</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
            <Zap size={22} className="text-violet-400" /> Book a Session
          </h1>
          <p className="text-gray-400 text-sm">Choose your session type â€” from quick 15-min doubts to full 90-min sessions</p>
        </div>

        {/* Step 1 â€” Session Type */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Step 1 â€” Session Type</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SESSION_TYPES.map(type => (
              <motion.button
                key={type.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedType(type.id)}
                className={`relative text-left p-4 rounded-2xl border transition-all ${
                  selectedType === type.id
                    ? `bg-gradient-to-br ${type.color} ring-1 ring-white/20`
                    : "bg-gray-900/60 border-white/8 hover:border-white/20"
                }`}
              >
                {type.badge && (
                  <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-medium">
                    {type.badge}
                  </span>
                )}
                <span className="text-2xl mb-2 block">{type.icon}</span>
                <p className="font-semibold text-white text-sm mb-1">{type.label}</p>
                <p className="text-xs text-gray-400 mb-3 leading-relaxed">{type.desc}</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-violet-300">
                    <Zap size={11} /> {type.credits} credits
                  </span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <Clock size={11} /> {type.duration} min
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Step 2 â€” Pick Mentor */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Step 2 â€” Pick Mentor</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MENTORS.map(mentor => (
              <button
                key={mentor.id}
                onClick={() => setSelectedMentor(mentor.id)}
                className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                  selectedMentor === mentor.id
                    ? "bg-violet-500/10 border-violet-500/40"
                    : "bg-gray-900/60 border-white/8 hover:border-white/20"
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                    {mentor.name.charAt(0)}
                  </div>
                  {mentor.verified && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <CheckCircle size={9} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{mentor.name}</p>
                  <p className="text-xs text-gray-500 truncate">{mentor.skills.join(", ")}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-0.5 text-yellow-400 text-xs">
                      <Star size={10} fill="currentColor" /> {mentor.rating}
                    </span>
                    <span className="text-xs text-gray-600">{mentor.sessions} sessions</span>
                    <span className="text-xs text-orange-400">ðŸ”¥ {mentor.streak}d</span>
                  </div>
                </div>
                {selectedMentor === mentor.id && (
                  <CheckCircle size={16} className="text-violet-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3 â€” Details */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Step 3 â€” Details</h2>
          <div className="bg-gray-900/60 border border-white/8 rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Skill / Topic</label>
              <input
                value={skill}
                onChange={e => setSkill(e.target.value)}
                placeholder="e.g. React hooks, English pronunciation..."
                className="w-full bg-gray-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-gray-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full bg-gray-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary + Book */}
        <div className="bg-gradient-to-r from-violet-900/40 to-indigo-900/30 border border-violet-500/25 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">{selected.icon} {selected.label}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Clock size={11} /> {selected.duration} min</span>
                <span className="flex items-center gap-1 text-violet-300"><Zap size={11} /> {selected.credits} credits</span>
                {selectedMentor && <span className="flex items-center gap-1"><Calendar size={11} /> {date || "Pick date"} {time || ""}</span>}
              </div>
            </div>
            <Button
              onClick={handleBook}
              disabled={!selectedMentor || !skill || !date || !time}
              className="bg-violet-500 hover:bg-violet-600 text-white font-semibold disabled:opacity-40 flex items-center gap-2"
            >
              Confirm Booking <ArrowRight size={15} />
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

