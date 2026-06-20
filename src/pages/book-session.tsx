import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Clock, CheckCircle, Star, ShieldCheck, Loader2, Calendar, User, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetMe, useBookSession } from "@/lib/api";
import { useApiOptions, API_BASE_URL } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import confetti from "canvas-confetti";

const SESSION_TYPES = [
  { id: "micro_15", label: "15-min Quick Help", desc: "Fast concept explanation", multiplier: 0.25, duration: 15, badge: "Popular", color: "border-orange-500 bg-orange-50/50", glow: "shadow-orange-500/20" },
  { id: "micro_30", label: "30-min Deep Dive",  desc: "Focused session on a topic",   multiplier: 0.50, duration: 30, badge: "",         color: "border-blue-500 bg-blue-50/50", glow: "shadow-blue-500/20" },
  { id: "standard", label: "1-hour Mastery",    desc: "Comprehensive learning",       multiplier: 1.00, duration: 60, badge: "Best Value", color: "border-emerald-500 bg-emerald-50/50", glow: "shadow-emerald-500/20" },
];

function calcCredits(multiplier: number, pricePerHour: number): number {
  const rate = Math.max(pricePerHour || 10, 10);
  return Math.max(Math.round(rate * multiplier), 3);
}

export default function BookSession() {
  const [, params] = useRoute("/book/:mentorId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const options = useApiOptions();

  const urlParams = new URLSearchParams(window.location.search);
  const skillFromUrl = urlParams.get("skill") || "";
  
  // ?? FIX 1: Safe Number Parsing
  const mentorIdFromUrl = params?.mentorId && !isNaN(Number(params.mentorId)) ? parseInt(params.mentorId) : null;

  const { data: currentUser } = useGetMe(options);
  
  const { data: allUsers, isLoading: mentorsLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/users`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  const [selectedType, setSelectedType] = useState("standard");
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(mentorIdFromUrl);
  const [skill, setSkill] = useState(skillFromUrl);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (mentorIdFromUrl && !selectedMentorId && allUsers) {
      setSelectedMentorId(mentorIdFromUrl);
    }
  }, [mentorIdFromUrl, allUsers, selectedMentorId]);

  const bookMut = useBookSession({
    ...options,
    mutation: {
      onSuccess: () => {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
        toast({ title: "?? Booking Confirmed!", description: "Your mentor has been notified." });
        setBooked(true);
        setTimeout(() => setLocation("/sessions"), 2500);
      },
      onError: (e: any) => {
        toast({ title: "Booking Failed", description: e?.message || "Something went wrong.", variant: "destructive" });
      }
    }
  });

  // ?? FIX 2: Sorting Logic - Keep selected mentor visible at the top!
  const availableMentors = (allUsers as any[] || [])
    .filter(u => u.id !== currentUser?.id)
    .sort((a, b) => {
      if (a.id === selectedMentorId) return -1;
      if (b.id === selectedMentorId) return 1;
      return 0;
    });
  
  const selectedTypeObj = SESSION_TYPES.find(t => t.id === selectedType) || SESSION_TYPES[2];
  const selectedMentor = availableMentors.find((m: any) => m.id === selectedMentorId);
  const mentorRate = selectedMentor?.pricePerHour || 20;
  const sessionCredits = calcCredits(selectedTypeObj.multiplier, mentorRate);

  function handleBook() {
    if (!selectedMentorId || !skill.trim() || !date || !time) {
      toast({ title: "Missing details", description: "Please complete all fields before booking.", variant: "destructive" });
      return;
    }
    if ((currentUser?.credits || 0) < sessionCredits) {
      toast({ title: "Low Balance", description: `You need ${sessionCredits} credits. Visit Wallet.`, variant: "destructive" });
      return;
    }

    bookMut.mutate({ 
      data: { 
        mentorId: selectedMentorId, 
        skill: skill.trim(), 
        sessionType: selectedType, 
        scheduledDate: new Date(`${date}T${time}:00`).toISOString(), 
        message: message || undefined 
      } 
    } as any);
  }

  // ?? SUCCESS STATE UI
  if (booked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center bg-white p-10 rounded-[3rem] shadow-2xl border border-indigo-50 max-w-md w-full relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-green-400/20 to-emerald-400/20 opacity-50 blur-3xl"></div>
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 relative z-10 shadow-inner">
            <CheckCircle size={48} className="text-green-500" />
          </div>
          <h2 className="text-3xl font-black mb-3 text-slate-800 relative z-10">Session Booked!</h2>
          <p className="text-slate-500 font-medium mb-8 relative z-10">We are redirecting you to your dashboard...</p>
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto relative z-10" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans relative overflow-hidden">
      
      {/* ?? UNICORN GLOWS */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-30 animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-30 animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 pt-8 pb-20 px-4 shadow-lg relative z-10">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <button onClick={() => window.history.back()} className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-3xl md:text-5xl font-black text-white flex items-center gap-3 tracking-tight">
            <Calendar className="w-10 h-10 text-yellow-300 drop-shadow-md" /> Secure Session
          </h1>
          <p className="text-indigo-100 font-medium text-lg">Lock in time with top experts using SkillSwap credits.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-10 space-y-6 relative z-20">
        
        {/* STEP 1: CHOOSE FORMAT */}
        <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-xl border border-white">
          <h2 className="text-sm font-black text-indigo-600 mb-5 uppercase tracking-widest flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow-md">1</span> Choose Format
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {SESSION_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-300 ${
                  selectedType === type.id
                    ? type.color + " shadow-xl " + type.glow + " scale-[1.03]"
                    : "border-slate-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/30"
                }`}
              >
                {type.badge && (
                  <span className="absolute -top-3 -right-2 text-[10px] px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-black shadow-lg">
                    {type.badge}
                  </span>
                )}
                <p className="font-black text-lg mb-1 text-slate-800 tracking-tight">{type.label}</p>
                <p className="text-xs text-slate-500 mb-4 h-8 leading-relaxed font-medium">{type.desc}</p>
                <div className="flex items-center justify-between text-xs font-bold pt-4 border-t border-slate-200/60">
                  <span className="flex items-center gap-1 text-indigo-600 bg-indigo-100/50 px-2 py-1 rounded-md"><Zap size={14} /> ~{calcCredits(type.multiplier, mentorRate)} cr</span>
                  <span className="flex items-center gap-1 text-slate-500"><Clock size={14} /> {type.duration}m</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* STEP 2: SELECT MENTOR */}
        <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-xl border border-white">
          <h2 className="text-sm font-black text-indigo-600 mb-5 uppercase tracking-widest flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow-md">2</span> Select Mentor
          </h2>
          {mentorsLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ?? SAFE: Render sorted list so selected mentor is always visible */}
              {availableMentors.slice(0, 6).map((mentor: any) => (
                <button
                  key={mentor.id}
                  onClick={() => setSelectedMentorId(mentor.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-300 ${
                    selectedMentorId === mentor.id
                      ? "border-indigo-500 bg-indigo-50/50 shadow-lg shadow-indigo-500/10 scale-[1.02]"
                      : "border-slate-100 bg-white hover:border-indigo-200"
                  }`}
                >
                  <div className="relative shrink-0">
                    <img src={mentor.avatar || `https://ui-avatars.com/api/?name=${mentor.name}`} alt={mentor.name} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
                    {(mentor.isPremium || mentor.trustScore >= 50) && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                        <ShieldCheck size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black text-slate-800 truncate">{mentor.name}</p>
                    <p className="text-xs text-slate-500 truncate mb-1 font-medium">{(mentor.skillsTeach || []).join(", ") || "Expert Mentor"}</p>
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md"><Star size={12} fill="currentColor" /> {mentor.rating || 4.9}</span>
                      <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{mentor.pricePerHour || 20} cr/hr</span>
                    </div>
                  </div>
                  {selectedMentorId === mentor.id && <CheckCircle size={24} className="text-indigo-600 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* STEP 3: SCHEDULE */}
        <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-xl border border-white">
          <h2 className="text-sm font-black text-indigo-600 mb-6 uppercase tracking-widest flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow-md">3</span> Schedule & Confirm
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-2 block tracking-wider">What do you want to learn? *</label>
                <input value={skill} onChange={e => setSkill(e.target.value)} placeholder="e.g. React hooks, Next.js routing..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold shadow-inner" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase mb-2 block tracking-wider">Date *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold shadow-inner" />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase mb-2 block tracking-wider">Time *</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold shadow-inner" />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-2 block tracking-wider">Message for Mentor</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} placeholder="Any specific areas you want to focus on?" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none font-bold shadow-inner" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-pink-50 border-2 border-indigo-100 rounded-2xl p-6 flex flex-col justify-between shadow-inner">
              <div>
                <h3 className="font-black text-xl text-slate-800 mb-5">Booking Summary</h3>
                <div className="space-y-4 mb-6 text-sm font-medium">
                  <div className="flex justify-between items-center border-b border-indigo-200/50 pb-3">
                    <span className="text-slate-500">Session Type</span>
                    <span className="font-bold text-slate-800">{selectedTypeObj.label}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-indigo-200/50 pb-3">
                    <span className="text-slate-500">Mentor</span>
                    <span className="font-bold text-slate-800">{selectedMentor?.name || "None Selected"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-indigo-200/50 pb-3">
                    <span className="text-slate-500">Schedule</span>
                    <span className="font-bold text-slate-800">{date && time ? `${date} at ${time}` : "Not Set"}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-600 font-black">Total Cost</span>
                    <span className="text-indigo-600 font-black text-2xl">{sessionCredits} <span className="text-sm">cr</span></span>
                  </div>
                </div>
              </div>
              
              <div>
                {currentUser && (
                  <p className="text-center text-xs font-black text-slate-400 mb-4 uppercase tracking-widest">
                    Your Wallet: <span className={currentUser.credits < sessionCredits ? "text-red-500" : "text-emerald-500"}>{currentUser.credits} Credits</span>
                  </p>
                )}
                <Button 
                  onClick={handleBook} 
                  disabled={!selectedMentorId || !skill || !date || !time || bookMut.isPending || (currentUser?.credits || 0) < sessionCredits}
                  className="w-full h-14 rounded-xl font-black text-lg shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] transition-all bg-gradient-to-r from-indigo-600 to-pink-500 text-white disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
                >
                  {bookMut.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Confirm Booking"}
                </Button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
