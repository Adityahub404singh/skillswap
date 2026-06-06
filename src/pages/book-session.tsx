import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Zap, Clock, CheckCircle, ArrowRight, Star, ShieldCheck, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetMatchedMentors, useGetMe, useBookSession } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";

const SESSION_TYPES = [
  { id: "micro_15", label: "15-min Quick Session", desc: "Fast concept explanation or code review", multiplier: 0.25, duration: 15, badge: "Most Popular", color: "border-yellow-500/40 bg-yellow-500/5" },
  { id: "micro_30", label: "30-min Session",        desc: "Deep-dive on one specific topic",        multiplier: 0.50, duration: 30, badge: "",            color: "border-violet-500/40 bg-violet-500/5" },
  { id: "doubt",    label: "Doubt Solving",         desc: "Stuck on something? Get it cleared",    multiplier: 0.33, duration: 20, badge: "New",         color: "border-blue-500/40 bg-blue-500/5" },
  { id: "standard", label: "1-hour Full Session",   desc: "Comprehensive learning with practice",  multiplier: 1.00, duration: 60, badge: "",             color: "border-emerald-500/40 bg-emerald-500/5" },
  { id: "extended", label: "1.5-hour Deep Dive",    desc: "End-to-end topic mastery session",      multiplier: 1.50, duration: 90, badge: "Best Value",  color: "border-pink-500/40 bg-pink-500/5" },
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

  const [selectedType, setSelectedType] = useState("standard");
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(mentorIdFromUrl);
  const [skill, setSkill] = useState(skillFromUrl);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [booked, setBooked] = useState(false);

  const bookMut = useBookSession({
    ...options,
    mutation: {
      onSuccess: () => {
        toast({ title: "Session Booked!", description: "Your session has been confirmed." });
        setBooked(true);
        setTimeout(() => setLocation("/sessions"), 1500);
      },
      onError: (e: any) => {
        toast({ title: "Booking Failed", description: e?.message || "Please try again.", variant: "destructive" });
      }
    }
  });

  const selectedTypeObj = SESSION_TYPES.find(t => t.id === selectedType) || SESSION_TYPES[3];
  const selectedMentor = (matchedMentors as any[])?.find((m: any) => m.user?.id === selectedMentorId || m.id === selectedMentorId);
  const mentorRate = selectedMentor?.user?.pricePerHour || selectedMentor?.pricePerHour || 10;
  const sessionCredits = calcCredits(selectedTypeObj.multiplier, mentorRate);

  function handleBook() {
    if (!selectedMentorId || !skill.trim() || !date || !time) {
      toast({ title: "Missing fields", description: "Please select mentor, skill, date and time.", variant: "destructive" });
      return;
    }
    if ((currentUser?.credits || 0) < sessionCredits) {
      toast({ title: "Insufficient credits", description: `Need ${sessionCredits} credits. Buy more in wallet.`, variant: "destructive" });
      return;
    }

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

    bookMut.mutate({ mentorId: selectedMentorId!, skill: skill.trim(), sessionType: selectedType, scheduledDate: new Date(`${date}T${time}:00`).toISOString(), message: message || undefined } as any);
  }

  if (booked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={36} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Session Booked!</h2>
          <p className="text-muted-foreground text-sm mb-6">Redirecting to sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap size={22} className="text-primary" /> Book a Session
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Choose session type -- from 15-min quick help to full 90-min deep dive
          </p>
        </div>

        {/* Step 1: Session Type */}
        <div>
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
                    <Zap size={11} /> ~{calcCredits(type.multiplier, mentorRate)} cr
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock size={11} /> {type.duration} min
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Pick Mentor */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Step 2 -- Pick Mentor
          </h2>
          {mentorsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm p-4">
              <Loader2 size={16} className="animate-spin" /> Loading mentors...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {((matchedMentors as any[]) || []).slice(0, 6).map((mentor: any) => {
                const u = mentor.user || mentor;
                const uid = u.id;
                return (
                  <button
                    key={uid}
                    onClick={() => setSelectedMentorId(uid)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                      selectedMentorId === uid
                        ? "border-primary/50 bg-primary/5"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                        {u.name?.charAt(0) || "?"}
                      </div>
                      {u.trustScore >= 50 && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <ShieldCheck size={9} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(u.skillsTeach || []).slice(0, 3).join(", ")}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-0.5 text-yellow-500 text-xs">
                          <Star size={10} fill="currentColor" /> {(u.averageRating || 0).toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">{u.sessionsCompleted || 0} sessions</span>
                        <span className="text-xs text-primary font-medium">{u.pricePerHour || 10} cr/hr</span>
                      </div>
                    </div>
                    {selectedMentorId === uid && (
                      <CheckCircle size={16} className="text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 3: Details */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Step 3 -- Details
          </h2>
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Skill / Topic *</label>
              <input
                value={skill}
                onChange={e => setSkill(e.target.value)}
                placeholder="e.g. React hooks, English pronunciation..."
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Time *</label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Message (optional)</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                placeholder="What do you want to learn specifically?"
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Summary + Book */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <p className="font-bold text-lg">{selectedTypeObj.label}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Clock size={11} /> {selectedTypeObj.duration} min</span>
                <span className="flex items-center gap-1 text-primary font-extrabold text-sm">
                  <Zap size={11} /> {sessionCredits} credits
                </span>
                {selectedMentor && (
                  <span className="text-foreground font-medium">
                    with {selectedMentor.user?.name || selectedMentor.name}
                  </span>
                )}
                {date && time && (
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> {date} {time}
                  </span>
                )}
              </div>
              {currentUser && (
                <p className="text-xs text-muted-foreground">
                  Balance: <span className="text-primary font-bold">{currentUser.credits} credits</span>
                  {currentUser.credits < sessionCredits && (
                    <span className="text-destructive ml-2 font-semibold">
                      -- Need {sessionCredits - currentUser.credits} more
                    </span>
                  )}
                </p>
              )}
            </div>
            <Button
              onClick={handleBook}
              disabled={!selectedMentorId || !skill || !date || !time || bookMut.isPending || (currentUser?.credits || 0) < sessionCredits}
              className="rounded-full px-8 h-11 font-bold"
            >
              {bookMut.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking...</>
                : <>Confirm -- {sessionCredits} credits <ArrowRight size={15} className="ml-2" /></>
              }
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

