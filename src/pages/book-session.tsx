import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Zap, Clock, CheckCircle, ArrowRight, Star, ShieldCheck, Loader2, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetMe, useBookSession } from "@/lib/api";
import { useApiOptions, API_BASE_URL } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const SESSION_TYPES = [
  { id: "micro_15", label: "15-min Quick Help", desc: "Fast concept explanation or doubt clearing", multiplier: 0.25, duration: 15, badge: "Popular", color: "border-orange-500/40 bg-orange-500/5" },
  { id: "micro_30", label: "30-min Deep Dive",  desc: "Focused session on a specific topic",      multiplier: 0.50, duration: 30, badge: "",         color: "border-blue-500/40 bg-blue-500/5" },
  { id: "standard", label: "1-hour Mastery",    desc: "Comprehensive learning with live practice",multiplier: 1.00, duration: 60, badge: "Best Value", color: "border-emerald-500/40 bg-emerald-500/5" },
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
  const mentorIdFromUrl = params?.mentorId ? parseInt(params.mentorId) : null;

  const { data: currentUser } = useGetMe(options);
  
  // FIX: Manual fetch to completely avoid missing hooks
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
        toast({ title: "🎉 Booking Confirmed!", description: "Your mentor has been notified." });
        setBooked(true);
        setTimeout(() => setLocation("/sessions"), 2000);
      },
      onError: (e: any) => {
        toast({ title: "Booking Failed", description: e?.message || "Something went wrong.", variant: "destructive" });
      }
    }
  });

  const availableMentors = (allUsers as any[] || []).filter(u => u.id !== currentUser?.id);
  
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

  if (booked) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center bg-card p-10 rounded-[3rem] shadow-2xl border border-border/50 max-w-md w-full">
          <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-green-500" />
          </div>
          <h2 className="text-3xl font-black mb-3">Session Booked!</h2>
          <p className="text-muted-foreground font-medium mb-8">We are redirecting you to your dashboard...</p>
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-premium pt-12 pb-24 px-4 shadow-inner">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-black text-white flex items-center gap-3">
            <Calendar className="w-10 h-10 text-yellow-300" /> Secure Your Session
          </h1>
          <p className="text-white/80 font-medium mt-3 text-lg">Lock in time with top experts using SkillSwap credits.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-12 space-y-8 relative z-10">
        
        <div className="card-premium bg-card p-6 md:p-8 rounded-[2rem]">
          <h2 className="text-sm font-black text-primary mb-4 uppercase tracking-widest flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">1</span> Choose Format
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SESSION_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                  selectedType === type.id
                    ? type.color + " border-primary shadow-lg scale-[1.02]"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                {type.badge && (
                  <span className="absolute -top-3 -right-2 text-[10px] px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-black shadow-md">
                    {type.badge}
                  </span>
                )}
                <p className="font-black text-base mb-1">{type.label}</p>
                <p className="text-xs text-muted-foreground mb-4 h-8">{type.desc}</p>
                <div className="flex items-center justify-between text-xs font-bold pt-3 border-t border-border/50">
                  <span className="flex items-center gap-1 text-primary"><Zap size={14} /> ~{calcCredits(type.multiplier, mentorRate)} cr</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><Clock size={14} /> {type.duration}m</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card-premium bg-card p-6 md:p-8 rounded-[2rem]">
          <h2 className="text-sm font-black text-primary mb-4 uppercase tracking-widest flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">2</span> Select Mentor
          </h2>
          {mentorsLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableMentors.slice(0, 6).map((mentor: any) => (
                <button
                  key={mentor.id}
                  onClick={() => setSelectedMentorId(mentor.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                    selectedMentorId === mentor.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-background hover:border-primary/30"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-inner">
                      {mentor.name?.charAt(0) || <User size={20} />}
                    </div>
                    {(mentor.isPremium || mentor.trustScore >= 50) && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-card">
                        <ShieldCheck size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black truncate">{mentor.name}</p>
                    <p className="text-xs text-muted-foreground truncate mb-1">{(mentor.skillsTeach || []).join(", ") || "Expert Mentor"}</p>
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="flex items-center gap-1 text-amber-500"><Star size={12} fill="currentColor" /> {mentor.rating || 4.9}</span>
                      <span className="text-primary">{mentor.pricePerHour || 20} cr/hr</span>
                    </div>
                  </div>
                  {selectedMentorId === mentor.id && <CheckCircle size={20} className="text-primary shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card-premium bg-card p-6 md:p-8 rounded-[2rem]">
           <h2 className="text-sm font-black text-primary mb-6 uppercase tracking-widest flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">3</span> Schedule & Confirm
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">What do you want to learn? *</label>
                <input value={skill} onChange={e => setSkill(e.target.value)} placeholder="e.g. React hooks, Next.js routing..." className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-colors font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Date *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-colors font-medium" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Time *</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-colors font-medium" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Message for Mentor (Optional)</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} placeholder="Any specific areas you want to focus on?" className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-colors resize-none font-medium" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-black text-xl mb-4">Booking Summary</h3>
                <div className="space-y-3 mb-6 text-sm font-medium">
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Session Type</span>
                    <span>{selectedTypeObj.label}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Mentor</span>
                    <span>{selectedMentor?.name || "None Selected"}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Schedule</span>
                    <span>{date && time ? `${date} at ${time}` : "Not Set"}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-muted-foreground font-bold">Total Cost</span>
                    <span className="text-primary font-black text-lg">{sessionCredits} Credits</span>
                  </div>
                </div>
              </div>
              
              <div>
                {currentUser && (
                  <p className="text-center text-xs font-bold text-muted-foreground mb-3">
                    Your Wallet: <span className={currentUser.credits < sessionCredits ? "text-red-500" : "text-green-500"}>{currentUser.credits} cr</span>
                  </p>
                )}
                <Button 
                  onClick={handleBook} 
                  disabled={!selectedMentorId || !skill || !date || !time || bookMut.isPending || (currentUser?.credits || 0) < sessionCredits}
                  className="w-full h-14 rounded-xl font-black text-lg shadow-xl hover:scale-[1.02] transition-transform bg-gradient-to-r from-primary to-accent text-white disabled:opacity-50 disabled:hover:scale-100"
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
