import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Zap, Clock, CheckCircle, ArrowRight, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const SESSION_TYPES = [
  { id: "micro_15", label: "15-min Quick Session", desc: "Fast concept explanation or code review", credits: 3, duration: 15, badge: "Most Popular", color: "border-yellow-500/40 bg-yellow-500/5" },
  { id: "micro_30", label: "30-min Session",       desc: "Deep-dive on one specific topic",       credits: 5, duration: 30, badge: "", color: "border-violet-500/40 bg-violet-500/5" },
  { id: "doubt",    label: "Doubt Solving",         desc: "Stuck on something? Get it cleared",   credits: 4, duration: 20, badge: "New", color: "border-blue-500/40 bg-blue-500/5" },
  { id: "standard", label: "1-hour Full Session",   desc: "Comprehensive learning with practice", credits: 10, duration: 60, badge: "", color: "border-emerald-500/40 bg-emerald-500/5" },
  { id: "extended", label: "1.5-hour Deep Dive",    desc: "End-to-end topic mastery session",     credits: 15, duration: 90, badge: "Best Value", color: "border-pink-500/40 bg-pink-500/5" },
];

const MENTORS = [
  { id: 1, name: "Rahul Sharma",  skills: ["English", "Public Speaking"], rating: 4.8, sessions: 42, streak: 15, verified: true },
  { id: 2, name: "Priya Patel",   skills: ["UI/UX", "Figma", "Design"],   rating: 4.7, sessions: 19, streak: 7,  verified: true },
  { id: 3, name: "Vikram Singh",  skills: ["Python", "AI/ML", "SQL"],     rating: 4.9, sessions: 55, streak: 45, verified: false },
  { id: 4, name: "Arjun Mehta",   skills: ["DevOps", "Docker", "AWS"],    rating: 4.5, sessions: 22, streak: 12, verified: true },
];

export default function BookMicroSession() {
  const [selectedType,   setSelectedType]   = useState("micro_15");
  const [selectedMentor, setSelectedMentor] = useState<number | null>(null);
  const [skill,  setSkill]  = useState("");
  const [date,   setDate]   = useState("");
  const [time,   setTime]   = useState("");
  const [booked, setBooked] = useState(false);

  const selected = SESSION_TYPES.find(s => s.id === selectedType)!;

  if (booked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={36} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Session Booked!</h2>
          <p className="text-muted-foreground text-sm mb-2">
            Your <span className="text-primary font-medium">{selected.label}</span> is confirmed.
          </p>
          <p className="text-muted-foreground text-xs mb-8">
            {date} at {time} &middot; {selected.credits} credits deducted
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/sessions">
              <Button>View Sessions</Button>
            </Link>
            <Button variant="outline" onClick={() => setBooked(false)}>Book Another</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
            <Zap size={22} className="text-primary" /> Book a Session
          </h1>
          <p className="text-muted-foreground text-sm">
            Choose your session type -- from quick 15-min doubts to full 90-min sessions
          </p>
        </div>

        {/* Step 1 */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Step 1 -- Session Type
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SESSION_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`relative text-left p-4 rounded-2xl border-2 transition-all ${
                  selectedType === type.id
                    ? type.color + " ring-1 ring-primary/30"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {type.badge && (
                  <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {type.badge}
                  </span>
                )}
                <p className="font-semibold text-sm mb-1 mt-1">{type.label}</p>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{type.desc}</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-primary">
                    <Zap size={11} /> {type.credits} credits
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock size={11} /> {type.duration} min
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Step 2 -- Pick Mentor
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MENTORS.map(mentor => (
              <button
                key={mentor.id}
                onClick={() => setSelectedMentor(mentor.id)}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  selectedMentor === mentor.id
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-card hover:border-primary/30"
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
                  <p className="text-sm font-semibold">{mentor.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{mentor.skills.join(", ")}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-0.5 text-yellow-500 text-xs">
                      <Star size={10} fill="currentColor" /> {mentor.rating}
                    </span>
                    <span className="text-xs text-muted-foreground">{mentor.sessions} sessions</span>
                    <span className="text-xs text-orange-500">{mentor.streak}d streak</span>
                  </div>
                </div>
                {selectedMentor === mentor.id && (
                  <CheckCircle size={16} className="text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3 */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Step 3 -- Details
          </h2>
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Skill / Topic</label>
              <input
                value={skill}
                onChange={e => setSkill(e.target.value)}
                placeholder="e.g. React hooks, English pronunciation..."
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <p className="text-sm font-semibold">{selected.label}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock size={11} /> {selected.duration} min</span>
                <span className="flex items-center gap-1 text-primary"><Zap size={11} /> {selected.credits} credits</span>
                {selectedMentor && <span>{date || "Pick date"} {time || ""}</span>}
              </div>
            </div>
            <Button
              onClick={() => { if (selectedMentor && skill && date && time) setBooked(true); }}
              disabled={!selectedMentor || !skill || !date || !time}
              className="flex items-center gap-2"
            >
              Confirm Booking <ArrowRight size={15} />
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
