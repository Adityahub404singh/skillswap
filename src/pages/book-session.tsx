import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Zap, Clock, CheckCircle, ArrowRight, Star, ShieldCheck, Loader2, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetMatchedMentors, useGetMe, useBookSession } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";

const SESSION_TYPES = [
  { id: "micro_15", label: "15-min Quick Session", desc: "Fast concept explanation or code review", multiplier: 0.25, duration: 15, badge: "Most Popular", color: "border-yellow-500/40 bg-yellow-500/5" },
  { id: "micro_30", label: "30-min Session",        desc: "Deep-dive on one specific topic",       multiplier: 0.50, duration: 30, badge: "",             color: "border-violet-500/40 bg-violet-500/5" },
  { id: "doubt",    label: "Doubt Solving",          desc: "Stuck on something? Get it cleared",   multiplier: 0.33, duration: 20, badge: "New",           color: "border-blue-500/40 bg-blue-500/5" },
  { id: "standard", label: "1-hour Full Session",    desc: "Comprehensive learning with practice", multiplier: 1.00, duration: 60, badge: "",              color: "border-emerald-500/40 bg-emerald-500/5" },
  { id: "extended", label: "1.5-hour Deep Dive",     desc: "End-to-end topic mastery session",     multiplier: 1.50, duration: 90, badge: "Best Value",    color: "border-pink-500/40 bg-pink-500/5" },
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
  const { data: matchedMentors, isLoading: mentorsLoading } = useGetMatchedMentors(
    skillFromUrl || "all",
    { ...options, enabled: true } as any
  );

  const bookMut = useBookSession({
    ...options,
    mutation: {
      onSuccess: () => {
        toast({ title: "Session Booked!", description: "Your session has been confirmed." });
        setBooked(true);
      },
      onError: (e: any) => {
        toast({ title: "Booking Failed", description: e?.message || "Please try again.", variant: "destructive" });
      }
    }
  });

  const [selectedType, setSelectedType] = useState("standard");
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(mentorIdFromUrl);
  const [skill, setSkill] = useState(skillFromUrl);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [booked, setBooked] = useState(false);

  const selectedTypeObj = SESSION_TYPES.find(s => s.id === selectedType)!;
  const selectedMentor = matchedMentors?.find((m: any) => m.user.id === selectedMentorId);
  const mentorRate = (selectedMentor as any)?.pricePerHour || (selectedMentor as any)?.user?.pricePerHour || 10;
  const sessionCredits = calcCredits(selectedTypeObj.multiplier, mentorRate);

  const handleBook = () => {
    if (!selectedMentorId || !skill || !date || !time) {
      toast({ title: "Missing info", description: "Please fill all fields.", variant: "destructive" });
      return;
    }
    const scheduledDate = new Date(`${date}T${time}`).toISOString();
    bookMut.mutate({ mentorId: selectedMentorId!, skill: skill, scheduledAt: new Date(`${date}T${time}`).toISOString(), sessionType: selectedType, message: message || undefined } as any);
  };

  if (booked) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-3xl font-extrabold mb-2">Session Booked! 🎉</h2>
          <p className="text-muted-foreground mb-1">
            <span className="text-primary font-semibold">{selectedTypeObj.label}</span> confirmed.
          </p>
          <p className="text-sm text-muted-foreground mb-2">{date} at {time}</p>
          <p className="text-sm font-bold text-primary mb-8">{sessionCredits} credits deducted</p>
          <div className="flex gap-3 justify-center">
            <Link href="/sessions"><Button className="rounded-full">View Sessions</Button></Link>
            <Button variant="outline" className="rounded-full" onClick={() => setBooked(false)}>Book Another</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
          <Zap size={22} className="text-primary" /> Book a Session
        </h1>
        <p className="text-muted-foreground text-sm">
          {skillFromUrl ? <>Booking for: <span className="text-primary font-semibold">{skillFromUrl}</span></> : "Choose session type and mentor"}
        </p>
      </div>

      {/* Step 1: Session Type */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Step 1 — Session Type</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SESSION_TYPES.map(type => {
            const credits = calcCredits(type.multiplier, mentorRate);
            return (
              <motion.button key={type.id} onClick={() => setSelectedType(type.id)}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className={`relative text-left p-4 rounded-2xl border-2 transition-all ${
                  selectedType === type.id ? type.color + " ring-1 ring-primary/30" : "border-border bg-card hover:border-primary/30"
                }`}>
                {type.badge && (
                  <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{type.badge}</span>
                )}
                <p className="font-semibold text-sm mb-1 mt-1">{type.label}</p>
                <p className="text-xs text-muted-foreground mb-3">{type.desc}</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-primary font-bold">
                    <Zap size={11} /> {credits} credits
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock size={11} /> {type.duration} min
                  </span>
                </div>
                {selectedMentor && (
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    = {mentorRate} cr/hr × {type.multiplier}hr
                  </div>
                )}
                {selectedType === type.id && <CheckCircle className="absolute bottom-3 right-3 w-4 h-4 text-primary" />}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Pick Mentor */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Step 2 — Pick Mentor</h2>
        {mentorsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : !matchedMentors?.length ? (
          <div className="text-center py-8 card-premium">
            <User className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No mentors found.</p>
            <Link href="/explore"><Button size="sm" className="mt-3 rounded-full">Browse Skills</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {matchedMentors.map((match: any) => {
              const rate = match.pricePerHour || match.user?.pricePerHour || 10;
              const previewCredits = calcCredits(selectedTypeObj.multiplier, rate);
              return (
                <motion.button key={match.user.id} onClick={() => setSelectedMentorId(match.user.id)}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                    selectedMentorId === match.user.id ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/30"
                  }`}>
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-white overflow-hidden">
                      {match.user.avatar ? <img src={match.user.avatar} className="w-full h-full object-cover" alt={match.user.name} /> : match.user.name?.charAt(0)}
                    </div>
                    {match.isVerified && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <CheckCircle size={9} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">{match.user.name}</p>
                      {match.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{match.user.skillsTeach?.slice(0,3).join(", ")}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="flex items-center gap-0.5 text-yellow-500 text-xs font-medium">
                        <Star size={10} fill="currentColor" /> {match.user.averageRating?.toFixed(1) || "New"}
                      </span>
                      <span className="text-xs text-muted-foreground">{match.user.sessionsCompleted || 0} sessions</span>
                      <span className="text-xs font-bold text-muted-foreground">{rate} cr/hr</span>
                      <span className="text-xs font-extrabold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                        {previewCredits} cr for {selectedTypeObj.duration}min
                      </span>
                    </div>
                  </div>
                  {selectedMentorId === match.user.id && <CheckCircle size={16} className="text-primary shrink-0" />}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 3: Details */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Step 3 — Details</h2>
        <div className="card-premium space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Skill / Topic *</label>
            <input value={skill} onChange={e => setSkill(e.target.value)}
              placeholder="e.g. React hooks, English pronunciation..."
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Time *</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Message to Mentor (optional)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
              placeholder="What do you want to learn specifically?"
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
        </div>
      </div>

      {/* Summary + Book */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1.5">
            <p className="font-bold text-lg">{selectedTypeObj.label}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Clock size={11} /> {selectedTypeObj.duration} min</span>
              {selectedMentor && (
                <span className="text-muted-foreground">
                  {mentorRate} cr/hr × {selectedTypeObj.multiplier} =
                </span>
              )}
              <span className="flex items-center gap-1 text-primary font-extrabold text-sm">
                <Zap size={11} /> {sessionCredits} credits
              </span>
              {selectedMentor && <span className="text-foreground font-medium">with {selectedMentor.user.name}</span>}
              {date && time && <span className="flex items-center gap-1"><Calendar size={11} /> {date} {time}</span>}
            </div>
            {currentUser && (
              <p className="text-xs text-muted-foreground">
                Your balance: <span className="text-primary font-bold">{currentUser.credits} credits</span>
                {currentUser.credits < sessionCredits && (
                  <span className="text-destructive ml-2 font-semibold">⚠️ Insufficient — need {sessionCredits - currentUser.credits} more</span>
                )}
              </p>
            )}
          </div>
          <Button onClick={handleBook}
            disabled={!selectedMentorId || !skill || !date || !time || bookMut.isPending || (currentUser?.credits || 0) < sessionCredits}
            className="rounded-full px-8 h-11 font-bold bg-gradient-to-r from-primary to-accent border-0 shadow-lg">
            {bookMut.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking...</>
              : <>Confirm — {sessionCredits} credits <ArrowRight size={15} className="ml-2" /></>}
          </Button>
        </div>
      </div>
    </div>
  );
}