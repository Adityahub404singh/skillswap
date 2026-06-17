import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useGetMySessions, useAcceptSession, useCompleteSession, useCancelSession, useCreateRating, useGetMe } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Clock, CheckCircle2, AlertTriangle, XCircle, Star, CalendarDays, Loader2, Video, Users, Plus, BookOpen, GraduationCap, Coins, Filter, Zap, Lock, Key, Info, User, Compass, Timer, ArrowRightLeft } from "lucide-react";

type SessionTab    = "learning" | "teaching";
type StatusFilter  = "all" | "requested" | "accepted" | "in_progress" | "completed" | "cancelled";

// ?? HELPER: Live Countdown Logic
const getCountdown = (targetDateStr: string) => {
  const target = new Date(targetDateStr).getTime();
  const now = new Date().getTime();
  const diff = target - now;

  if (diff <= 0) return "Ready to Start";

  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) return `In ${Math.floor(hours / 24)} days`;
  if (hours > 0) return `In ${hours}h ${minutes}m`;
  return `In ${minutes} mins`;
};

export default function Sessions() {
  const options      = useApiOptions();
  const token        = useAuthStore(s => s.token);
  const queryClient  = useQueryClient();
  const { toast }    = useToast();

  // State Declarations
  const [tab,             setTab]             = useState<SessionTab>("learning");
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>("all");
  const [ratingId,      setRatingId]      = useState<number | null>(null);
  const [ratingVal,     setRatingVal]     = useState(5);
  const [reviewText,    setReviewText]    = useState("");
  const [groupModal,    setGroupModal]    = useState(false);
  const [negotiateModal,setNegotiateModal]= useState<any>(null);
  const [proposedPrice, setProposedPrice] = useState("");
  const [otpModal,      setOtpModal]      = useState<any>(null);
  const [otpInput,      setOtpInput]      = useState("");
  const [groupForm,     setGroupForm]     = useState({ skill: "", scheduledDate: "", creditsAmount: "20", maxStudents: "10", message: "" });

  // ?? LIVE TIMER TICKER (Updates countdown every minute)
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // API Hooks
  const { data: user } = useGetMe(options);
  const { data: allSessions, isLoading } = useGetMySessions({ role: tab === "learning" ? "student" : "mentor" }, options);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
  };

  const acceptMut   = useAcceptSession({   ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session Accepted!" }); } } });
  const completeMut = useCompleteSession({ ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session Completed! Credits transferred." }); } } });
  const cancelMut   = useCancelSession({   ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session Cancelled." }); } } });
  const rateMut     = useCreateRating({    ...options, mutation: { onSuccess: () => { invalidate(); setRatingId(null); setReviewText(""); toast({ title: "Review Submitted!" }); } }});

  // Action Handlers
  const handleRate = () => {
    if (!ratingId) return;
    rateMut.mutate({ data: { sessionId: ratingId!, rating: ratingVal, review: reviewText } });
  };

  const startSession = async () => {
    if (!otpInput || otpInput.length !== 6) {
      toast({ title: "Enter a valid 6-digit OTP", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(`/api/sessions/${otpModal.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp: otpInput }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Session Started!", description: "OTP Verified successfully." });
        setOtpModal(null);
        setOtpInput("");
        invalidate();
      } else {
        toast({ title: "Verification Failed", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
  };

  const createGroupSession = async () => {
    if (!groupForm.skill || !groupForm.scheduledDate) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch("/api/sessions/group", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          skill:         groupForm.skill,
          scheduledDate: new Date(groupForm.scheduledDate).toISOString(),
          creditsAmount: parseInt(groupForm.creditsAmount) || 20,
          maxStudents:   parseInt(groupForm.maxStudents)   || 10,
          message:       groupForm.message || undefined,
        }),
      });
      if (res.ok) {
        toast({ title: "Group Session Created!", description: "Students can now join your session." });
        setGroupModal(false);
        setGroupForm({ skill: "", scheduledDate: "", creditsAmount: "20", maxStudents: "10", message: "" });
        invalidate();
      } else {
        const err = await res.json();
        toast({ title: err.error || "Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
  };

  const negotiatePrice = async () => {
    if (!negotiateModal || !proposedPrice) return;
    try {
      const res = await fetch(`/api/sessions/${negotiateModal.id}/negotiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ proposedPrice: parseInt(proposedPrice) }),
      });
      if (res.ok) {
        toast({ title: `Price proposed: ${proposedPrice} credits` });
        setNegotiateModal(null);
        setProposedPrice("");
        invalidate();
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  // Derived Data
  const myId = (user as any)?.id;

  const sessions = (allSessions || []).filter((s: any) => {
    if (s.isGroup === 1 && tab === "learning" && s.mentorId === myId) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  }).sort((a: any, b: any) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

  const counts = {
    all:         (allSessions || []).length,
    requested:   (allSessions || []).filter((s: any) => s.status === "requested").length,
    accepted:    (allSessions || []).filter((s: any) => s.status === "accepted").length,
    in_progress: (allSessions || []).filter((s: any) => s.status === "in_progress").length,
    completed:   (allSessions || []).filter((s: any) => s.status === "completed").length,
    cancelled:   (allSessions || []).filter((s: any) => s.status === "cancelled").length,
  };

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { label: string; icon: any; cls: string }> = {
      requested:   { label: "Pending",     icon: Clock,        cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
      accepted:    { label: "Upcoming",    icon: CalendarDays, cls: "bg-blue-500/10 text-blue-600 border-blue-500/20 shadow-sm" },
      in_progress: { label: "Live Now",    icon: Video,        cls: "bg-indigo-600 text-white border-indigo-600 animate-pulse shadow-md" },
      completed:   { label: "Completed",   icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
      cancelled:   { label: "Cancelled",   icon: XCircle,      cls: "bg-red-500/10 text-red-600 border-red-500/20" },
    };
    const c = cfg[status] || cfg["requested"];
    const Icon = c.icon;
    return (
      <span className={`px-3 py-1 text-[11px] font-black tracking-wider uppercase rounded-full border flex items-center gap-1.5 ${c.cls}`}>
        <Icon className="w-3.5 h-3.5" /> {c.label}
      </span>
    );
  };

  const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: "all",         label: "All" },
    { value: "requested",   label: "Pending" },
    { value: "accepted",    label: "Upcoming" },
    { value: "in_progress", label: "Live" },
    { value: "completed",   label: "History" },
  ];

  return (
    <div className="py-8 max-w-5xl mx-auto space-y-8 px-4 font-sans relative overflow-hidden">
      
      {/* ?? Premium Unicorn Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-pulse pointer-events-none"></div>

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden z-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black mb-2 flex items-center gap-3 tracking-tight">
              <CalendarDays className="w-8 h-8 text-yellow-300 drop-shadow-md" /> My Sessions
            </h1>
            <p className="text-white/80 font-medium text-lg">Manage your teaching and learning schedule.</p>
          </div>
          {tab === "teaching" && (
            <Button onClick={() => setGroupModal(true)} className="rounded-full bg-white text-indigo-600 hover:bg-gray-50 font-black px-6 shadow-xl hover:scale-105 transition-all h-12">
              <Plus className="w-5 h-5 mr-2" /> Create Group Class
            </Button>
          )}
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full sm:w-fit border border-slate-200">
          <button
            onClick={() => { setTab("learning"); setStatusFilter("all"); }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-black rounded-xl transition-all ${tab === "learning" ? "bg-white shadow-md text-indigo-600" : "text-slate-500 hover:text-slate-800"}`}>
            <BookOpen className="w-4 h-4" /> Learning
          </button>
          <button
            onClick={() => { setTab("teaching"); setStatusFilter("all"); }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-black rounded-xl transition-all ${tab === "teaching" ? "bg-white shadow-md text-pink-600" : "text-slate-500 hover:text-slate-800"}`}>
            <GraduationCap className="w-4 h-4" /> Teaching
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0 mr-1" />
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border-2 ${
                statusFilter === f.value
                  ? "bg-slate-800 text-white border-slate-800 shadow-md"
                  : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-slate-800"
              }`}>
              {f.label}
              {f.value !== "all" && counts[f.value] > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === f.value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{counts[f.value]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="space-y-5 relative z-10">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-16 text-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-white/50 backdrop-blur-sm">
            <CalendarDays className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-2xl font-black mb-2 text-slate-800">No sessions found</h3>
            <p className="text-slate-500 text-base font-medium mb-6">
              {tab === "learning" ? "Time to learn something new! Book your first session." : "You have no teaching sessions yet. Share your profile!"}
            </p>
            {tab === "learning" && (
              <a href="/explore" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-pink-500 text-white rounded-full text-sm font-bold shadow-lg hover:shadow-indigo-500/30 hover:scale-105 transition-all">
                <Compass className="w-4 h-4" /> Discover Mentors
              </a>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {sessions.map((session: any, i: number) => {
              const isGroupSession = session.isGroup === 1;
              const otherUser = tab === "learning" ? session.mentor : session.student;
              const otherName = isGroupSession && tab === "teaching" ? `Group Class (${session.maxStudents} max)` : otherUser?.name ?? "Unknown";

              return (
                <motion.div key={session.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.05 }}
                  className="bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-lg border border-slate-100 overflow-hidden group hover:shadow-xl hover:border-indigo-100 transition-all">

                  <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    
                    {/* User Info & Skill */}
                    <div className="flex items-start gap-5 flex-1 min-w-0 w-full">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform ${
                        isGroupSession ? "bg-gradient-to-br from-cyan-500 to-blue-600" :
                        tab === "learning" ? "bg-gradient-to-br from-indigo-500 to-purple-600" : "bg-gradient-to-br from-pink-500 to-orange-400"
                      }`}>
                        {isGroupSession ? <Users className="w-7 h-7" /> :
                          otherUser?.avatar ? <img src={otherUser.avatar} className="w-full h-full rounded-full object-cover" alt="" /> : (otherUser?.name?.charAt(0)?.toUpperCase() ?? "?")}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="font-black text-xl text-slate-800 truncate">{session.skill}</h3>
                          {getStatusBadge(session.status)}
                        </div>

                        <p className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                          <User className="w-4 h-4 opacity-50" />
                          <>{tab === "learning" ? "Mentor: " : "Student: "} <span className="text-slate-800 font-bold">{otherName}</span></>
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                            {format(new Date(session.scheduledDate), "EEE, MMM d • h:mm a")}
                          </span>
                          <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                            <Coins className="w-3.5 h-3.5" />{session.creditsAmount} cr
                            {session.negotiatedPrice ? <span className="text-emerald-600 ml-1 font-semibold">(Negotiated)</span> : null}
                          </span>
                          
                          {/* ?? LIVE COUNTDOWN */}
                          {session.status === "accepted" && (
                            <span className="text-xs font-black text-pink-600 bg-pink-50 border border-pink-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                              <Timer className="w-3.5 h-3.5" /> {getCountdown(session.scheduledDate)}
                            </span>
                          )}
                        </div>

                        {session.message && (
                          <div className="mt-4 bg-slate-50 rounded-xl p-3 text-sm italic text-slate-500 border-l-4 border-indigo-300">
                            "{session.message}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ?? ACTION BUTTONS BASED ON STATUS */}
                    <div className="flex flex-col items-end gap-3 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 shrink-0">
                      
                      {/* TEACHING: Requested */}
                      {tab === "teaching" && session.status === "requested" && (
                        <div className="flex gap-2 w-full md:w-auto">
                          <Button variant="outline" className="flex-1 md:flex-none text-blue-600 border-blue-200 hover:bg-blue-50 font-bold rounded-xl" onClick={() => { setNegotiateModal(session); setProposedPrice(String(session.creditsAmount)); }}>
                            Negotiate
                          </Button>
                          <Button className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20" onClick={() => acceptMut.mutate({ sessionId: session.id })}>
                            Accept
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 rounded-xl" onClick={() => cancelMut.mutate({ sessionId: session.id })}>
                            <XCircle className="w-5 h-5" />
                          </Button>
                        </div>
                      )}

                      {/* TEACHING: Accepted (Needs OTP to start) */}
                      {tab === "teaching" && session.status === "accepted" && (
                        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                          <Button className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-500/30" onClick={() => setOtpModal(session)}>
                            <Lock className="w-4 h-4 mr-2" /> Start Session (OTP)
                          </Button>
                          <button className="text-xs font-bold text-red-500 hover:underline" onClick={() => cancelMut.mutate({ sessionId: session.id })}>Cancel Class</button>
                        </div>
                      )}

                      {/* LEARNING: Requested */}
                      {tab === "learning" && session.status === "requested" && (
                        <div className="flex gap-2 w-full md:w-auto">
                          <Button variant="outline" className="flex-1 md:flex-none text-red-500 border-red-200 hover:bg-red-50 font-bold rounded-xl" onClick={() => cancelMut.mutate({ sessionId: session.id })}>
                            Cancel Request
                          </Button>
                        </div>
                      )}

                      {/* LEARNING: Accepted (Shows OTP & Join Link) */}
                      {tab === "learning" && session.status === "accepted" && (
                        <div className="flex flex-col items-end gap-3 w-full md:w-auto bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div className="flex flex-col items-end w-full">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Share OTP with Mentor</span>
                            <span className="font-mono font-black text-indigo-600 tracking-[0.2em] text-xl bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200">{session.sessionOtp || "123456"}</span>
                          </div>
                          {session.meetLink && (
                            <a href={session.meetLink} target="_blank" rel="noopener noreferrer" className="w-full">
                              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-500/30">
                                <Video className="w-4 h-4 mr-2" /> Join Meeting
                              </Button>
                            </a>
                          )}
                        </div>
                      )}

                      {/* BOTH: In Progress (Mark Complete) */}
                      {session.status === "in_progress" && (
                         <Button className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-500/30 animate-pulse" onClick={() => completeMut.mutate({ sessionId: session.id })}>
                           <CheckCircle2 className="w-5 h-5 mr-2" /> Mark as Done
                         </Button>
                      )}

                      {/* LEARNING: Completed (Rate) */}
                      {tab === "learning" && session.status === "completed" && !session.teacherRating && (
                        <Button variant="outline" className="w-full md:w-auto border-orange-400 text-orange-500 hover:bg-orange-50 font-bold rounded-xl shadow-sm" onClick={() => setRatingId(session.id)}>
                          <Star className="w-4 h-4 mr-2" /> Rate Experience
                        </Button>
                      )}
                      {session.status === "completed" && session.teacherRating && (
                        <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-1.5 w-full md:w-auto justify-center">
                          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                          <span className="font-black text-amber-600">{session.teacherRating} / 5</span>
                        </div>
                      )}

                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* ==========================================
          ALL FULLY INTACT MODALS (NO CUTS)
          ========================================== */}

      {/* 1. OTP Dialog */}
      <Dialog open={!!otpModal} onOpenChange={o => !o && setOtpModal(null)}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-8 border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-2xl font-black text-slate-800"><Key className="w-6 h-6 text-indigo-600" /> Start Session</DialogTitle>
            <DialogDescription className="text-center font-medium text-slate-500 mt-2">Enter the 6-digit OTP provided by the student to unlock credits and start.</DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center justify-center">
            <Input type="text" maxLength={6} placeholder="• • • • • •" value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
              className="text-center text-4xl tracking-[0.5em] font-mono h-20 w-full bg-slate-50 border-2 border-slate-200 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 rounded-2xl shadow-inner" />
          </div>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="outline" className="rounded-xl font-bold border-slate-200 h-12" onClick={() => setOtpModal(null)}>Cancel</Button>
            <Button onClick={startSession} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 h-12" disabled={otpInput.length < 6}>
              Verify OTP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Rating Dialog */}
      <Dialog open={!!ratingId} onOpenChange={o => !o && setRatingId(null)}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-0 shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-center text-slate-800">Rate your mentor</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="flex justify-center gap-3">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRatingVal(star)} className="transition-transform hover:scale-110 active:scale-95">
                  <Star className={`w-12 h-12 ${star <= ratingVal ? "fill-orange-400 text-orange-400 drop-shadow-md" : "text-slate-200"}`} />
                </button>
              ))}
            </div>
            <Textarea placeholder="How was the session? (Optional)" value={reviewText} onChange={e => setReviewText(e.target.value)} className="resize-none h-28 rounded-2xl border-2 border-slate-200 focus-visible:ring-indigo-500 p-4 text-base font-medium shadow-inner" />
          </div>
          <DialogFooter>
            <Button onClick={handleRate} disabled={rateMut.isPending} className="w-full h-14 rounded-2xl font-black text-lg bg-gradient-to-r from-orange-400 to-pink-500 text-white shadow-lg shadow-orange-500/30 hover:scale-[1.02] transition-transform">
              {rateMut.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Group Class Dialog */}
      <Dialog open={groupModal} onOpenChange={setGroupModal}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-0 shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600" /> Create Group Class
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500">Host a class for multiple students at once.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Topic / Skill</label>
              <Input placeholder="e.g. Advanced React Patterns" value={groupForm.skill} onChange={e => setGroupForm({...groupForm, skill: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 font-medium" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Date & Time</label>
              <Input type="datetime-local" value={groupForm.scheduledDate} onChange={e => setGroupForm({...groupForm, scheduledDate: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 font-medium" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Cost (Credits)</label>
                <Input type="number" placeholder="20" value={groupForm.creditsAmount} onChange={e => setGroupForm({...groupForm, creditsAmount: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 font-medium" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Max Students</label>
                <Input type="number" placeholder="10" value={groupForm.maxStudents} onChange={e => setGroupForm({...groupForm, maxStudents: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-slate-200 font-medium" />
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase mb-1 block">Details (Optional)</label>
              <Textarea placeholder="What will be covered in this class?" value={groupForm.message} onChange={e => setGroupForm({...groupForm, message: e.target.value})} className="resize-none h-20 rounded-xl bg-slate-50 border-slate-200 font-medium" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupModal(false)} className="rounded-xl h-12 font-bold">Cancel</Button>
            <Button onClick={createGroupSession} className="rounded-xl h-12 font-bold bg-indigo-600 hover:bg-indigo-700 text-white">Create Class</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Negotiate Dialog */}
      <Dialog open={!!negotiateModal} onOpenChange={o => !o && setNegotiateModal(null)}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-0 shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
  <ArrowRightLeft className="w-6 h-6 text-indigo-600" /> Negotiate Price
</DialogTitle>
            <DialogDescription className="font-medium text-slate-500">Propose a new credit amount for this session.</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <label className="text-xs font-black text-slate-400 uppercase mb-2 block">Proposed Credits</label>
            <Input type="number" placeholder="Enter amount..." value={proposedPrice} onChange={e => setProposedPrice(e.target.value)} className="h-14 text-lg rounded-xl bg-slate-50 border-2 border-slate-200 font-bold text-slate-800 focus-visible:ring-indigo-500" />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-xl h-12 font-bold" onClick={() => setNegotiateModal(null)}>Cancel</Button>
            <Button onClick={negotiatePrice} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 font-bold shadow-lg shadow-indigo-500/30">
              Send Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
