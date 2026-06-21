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
import { Clock, CheckCircle2, XCircle, Star, CalendarDays, Loader2, Video, Users, Plus, BookOpen, GraduationCap, Coins, Filter, Lock, Key, User, Compass, Timer, ArrowRightLeft } from "lucide-react";

type SessionTab    = "learning" | "teaching";
type StatusFilter  = "all" | "requested" | "accepted" | "in_progress" | "completed" | "cancelled";

// LIVE COUNTDOWN LOGIC
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

  // LIVE TIMER TICKER
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // API Hooks
  const { data: user } = useGetMe(options);
  const { data: allSessions, isLoading } = useGetMySessions({ role: tab === "learning" ? "student" : "mentor" }, options);

  // 🆕 HEARTBEAT — sends a ping every 30s for sessions currently in_progress
  useEffect(() => {
    const liveSessions = (allSessions || []).filter((s: any) => s.status === "in_progress");
    if (liveSessions.length === 0) return;

    const interval = setInterval(() => {
      liveSessions.forEach((s: any) => {
        fetch(`/api/sessions/${s.id}/heartbeat`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [allSessions, token]);

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
      requested:   { label: "Pending",     icon: Clock,        cls: "bg-amber-50 text-amber-600 border-amber-100" },
      accepted:    { label: "Upcoming",    icon: CalendarDays, cls: "bg-blue-50 text-blue-600 border-blue-100" },
      in_progress: { label: "Live Now",    icon: Video,        cls: "bg-indigo-600 text-white border-indigo-600 animate-pulse shadow-sm" },
      completed:   { label: "Completed",   icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-600 border-emerald-100" },
      cancelled:   { label: "Cancelled",   icon: XCircle,      cls: "bg-red-50 text-red-600 border-red-100" },
    };
    const c = cfg[status] || cfg["requested"];
    const Icon = c.icon;
    return (
      <span className={`px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded-full border flex items-center gap-1.5 ${c.cls}`}>
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
    <div className="space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header (Clean Solid Gradient) */}
      <div className="bg-gradient-to-br from-[#6C3BFF] to-[#8B5CF6] p-6 rounded-[24px] text-white shadow-md relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black mb-1 flex items-center gap-2">
              <CalendarDays className="w-7 h-7 text-white/90" /> My Sessions
            </h1>
            <p className="text-white/80 font-medium text-sm">Manage your teaching and learning schedule.</p>
          </div>
          {tab === "teaching" && (
            <Button onClick={() => setGroupModal(true)} className="rounded-full bg-white text-[#6C3BFF] hover:bg-slate-50 font-bold px-6 shadow-sm h-10 w-full md:w-auto">
              <Plus className="w-4 h-4 mr-1.5" /> Group Class
            </Button>
          )}
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Main Tabs */}
        <div className="flex p-1 bg-white border border-gray-100 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.02)] w-full sm:w-fit">
          <button
            onClick={() => { setTab("learning"); setStatusFilter("all"); }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 py-2 text-xs font-bold rounded-full transition-all ${tab === "learning" ? "bg-[#6C3BFF] text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
            <BookOpen className="w-4 h-4" /> Learning
          </button>
          <button
            onClick={() => { setTab("teaching"); setStatusFilter("all"); }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 py-2 text-xs font-bold rounded-full transition-all ${tab === "teaching" ? "bg-[#8B5CF6] text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
            <GraduationCap className="w-4 h-4" /> Teaching
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 hide-scrollbar w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0 mr-1 hidden sm:block" />
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all whitespace-nowrap border ${
                statusFilter === f.value
                  ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                  : "bg-white border-gray-100 text-slate-500 hover:border-[#6C3BFF]/30 hover:text-slate-800"
              }`}>
              {f.label}
              {f.value !== "all" && counts[f.value] > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${statusFilter === f.value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{counts[f.value]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#6C3BFF]" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center rounded-[24px] border border-gray-100 bg-white shadow-sm">
            <CalendarDays className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <h3 className="text-xl font-black mb-1 text-slate-800">No sessions found</h3>
            <p className="text-slate-500 text-sm font-medium mb-5">
              {tab === "learning" ? "Time to learn something new! Book your first session." : "You have no teaching sessions yet. Share your profile!"}
            </p>
            {tab === "learning" && (
              <a href="/explore" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#6C3BFF] text-white rounded-full text-xs font-bold shadow-md hover:bg-[#5b32d6] transition-all">
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
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 overflow-hidden group hover:border-[#6C3BFF]/20 transition-all">

                  <div className="p-5 sm:p-6 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
                    
                    {/* User Info & Skill */}
                    <div className="flex items-start gap-4 flex-1 min-w-0 w-full">
                      <div className={`w-14 h-14 rounded-[16px] flex items-center justify-center text-[#6C3BFF] font-bold text-xl flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform ${
                        isGroupSession ? "bg-cyan-50 border border-cyan-100" :
                        tab === "learning" ? "bg-indigo-50 border border-indigo-100" : "bg-purple-50 border border-purple-100"
                      }`}>
                        {isGroupSession ? <Users className="w-6 h-6" /> :
                          otherUser?.avatar ? <img src={otherUser.avatar} className="w-full h-full rounded-[16px] object-cover" alt="" /> : (otherUser?.name?.charAt(0)?.toUpperCase() ?? "?")}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                          <h3 className="font-black text-lg text-slate-800 truncate">{session.skill}</h3>
                          {getStatusBadge(session.status)}
                        </div>

                        <p className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <>{tab === "learning" ? "Mentor: " : "Student: "} <span className="text-slate-800 font-bold">{otherName}</span></>
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                            <CalendarDays className="w-3 h-3 text-[#6C3BFF]" />
                            {format(new Date(session.scheduledDate), "EEE, MMM d • h:mm a")}
                          </span>
                          <span className="text-[11px] font-bold text-[#6C3BFF] bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                            <Coins className="w-3 h-3" />{session.creditsAmount} cr
                            {session.negotiatedPrice ? <span className="text-emerald-600 ml-1">(Negotiated)</span> : null}
                          </span>
                          
                          {/* LIVE COUNTDOWN */}
                          {session.status === "accepted" && (
                            <span className="text-[11px] font-bold text-[#F59E0B] bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                              <Timer className="w-3 h-3" /> {getCountdown(session.scheduledDate)}
                            </span>
                          )}
                        </div>

                        {session.message && (
                          <div className="mt-3 bg-slate-50 rounded-xl p-3 text-xs font-medium text-slate-500 border border-slate-100">
                            "{session.message}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex flex-col items-end gap-2 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-gray-100 shrink-0">
                      
                      {/* TEACHING: Requested */}
                      {tab === "teaching" && session.status === "requested" && (
                        <div className="flex gap-2 w-full md:w-auto">
                          <Button variant="outline" size="sm" className="flex-1 md:flex-none text-blue-600 border-blue-100 hover:bg-blue-50 font-bold rounded-full text-xs" onClick={() => { setNegotiateModal(session); setProposedPrice(String(session.creditsAmount)); }}>
                            Negotiate
                          </Button>
                          <Button size="sm" className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full shadow-sm text-xs" onClick={() => acceptMut.mutate({ sessionId: session.id })}>
                            Accept
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full h-8 w-8" onClick={() => cancelMut.mutate({ sessionId: session.id })}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      {/* TEACHING: Accepted (Needs OTP to start) */}
                      {tab === "teaching" && session.status === "accepted" && (
                        <div className="flex flex-col items-end gap-1.5 w-full md:w-auto">
                          <Button size="sm" className="w-full md:w-auto bg-[#6C3BFF] hover:bg-[#5b32d6] text-white font-bold rounded-full shadow-sm text-xs h-8" onClick={() => setOtpModal(session)}>
                            <Lock className="w-3 h-3 mr-1.5" /> Verify OTP to Start
                          </Button>
                          <button className="text-[10px] font-bold text-red-400 hover:text-red-600 px-2" onClick={() => cancelMut.mutate({ sessionId: session.id })}>Cancel Class</button>
                        </div>
                      )}

                      {/* LEARNING: Requested */}
                      {tab === "learning" && session.status === "requested" && (
                        <div className="flex gap-2 w-full md:w-auto">
                          <Button variant="outline" size="sm" className="flex-1 md:flex-none text-red-500 border-red-100 hover:bg-red-50 font-bold rounded-full text-xs h-8" onClick={() => cancelMut.mutate({ sessionId: session.id })}>
                            Cancel Request
                          </Button>
                        </div>
                      )}

                      {/* LEARNING: Accepted (Shows OTP & Join Link) */}
                      {tab === "learning" && session.status === "accepted" && (
                        <div className="flex flex-col items-end gap-2 w-full md:w-auto bg-slate-50 p-3 rounded-[16px] border border-gray-100">
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Your OTP:</span>
                            <span className="font-mono font-black text-[#6C3BFF] tracking-widest text-sm bg-white px-2 py-0.5 rounded border border-gray-200">{session.sessionOtp || "123456"}</span>
                          </div>
                          {session.meetLink && (
                            <a href={session.meetLink} target="_blank" rel="noopener noreferrer" className="w-full mt-1">
                              <Button size="sm" className="w-full bg-[#6C3BFF] hover:bg-[#5b32d6] text-white font-bold rounded-full shadow-sm text-xs h-8">
                                <Video className="w-3 h-3 mr-1.5" /> Join Meet
                              </Button>
                            </a>
                          )}
                        </div>
                      )}

                      {/* BOTH: In Progress (Mark Complete) */}
                      {session.status === "in_progress" && (
                         <Button size="sm" className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full shadow-sm animate-pulse text-xs h-8" onClick={() => completeMut.mutate({ sessionId: session.id })}>
                           <CheckCircle2 className="w-3 h-3 mr-1.5" /> Mark as Done
                         </Button>
                      )}

                      {/* LEARNING: Completed (Rate) */}
                      {tab === "learning" && session.status === "completed" && !session.teacherRating && (
                        <Button variant="outline" size="sm" className="w-full md:w-auto border-orange-200 text-orange-500 hover:bg-orange-50 font-bold rounded-full shadow-sm text-xs h-8" onClick={() => setRatingId(session.id)}>
                          <Star className="w-3 h-3 mr-1.5" /> Rate Mentor
                        </Button>
                      )}
                      {session.status === "completed" && session.teacherRating && (
                        <div className="px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full flex items-center gap-1 w-full md:w-auto justify-center">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span className="font-bold text-amber-600 text-xs">{session.teacherRating}/5</span>
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
          MODALS (Cleaned & Rounded 24px)
          ========================================== */}

      {/* 1. OTP Dialog */}
      <Dialog open={!!otpModal} onOpenChange={o => !o && setOtpModal(null)}>
        <DialogContent className="sm:max-w-md rounded-[24px] p-6 border border-gray-100 shadow-xl bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-xl font-black text-slate-800"><Key className="w-5 h-5 text-[#6C3BFF]" /> Start Session</DialogTitle>
            <DialogDescription className="text-center font-medium text-slate-500 mt-1 text-xs">Enter the 6-digit OTP from student to unlock credits.</DialogDescription>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center justify-center">
            <Input type="text" maxLength={6} placeholder="• • • • • •" value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
              className="text-center text-3xl tracking-[0.5em] font-mono h-16 w-full bg-slate-50 border border-slate-200 focus-visible:ring-[#6C3BFF] focus-visible:border-[#6C3BFF] rounded-2xl" />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-full font-bold border-slate-200 h-10 text-xs" onClick={() => setOtpModal(null)}>Cancel</Button>
            <Button onClick={startSession} className="bg-[#6C3BFF] hover:bg-[#5b32d6] text-white rounded-full font-bold shadow-sm h-10 text-xs" disabled={otpInput.length < 6}>
              Verify OTP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Rating Dialog */}
      <Dialog open={!!ratingId} onOpenChange={o => !o && setRatingId(null)}>
        <DialogContent className="sm:max-w-md rounded-[24px] border border-gray-100 shadow-xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-center text-slate-800">Rate your mentor</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRatingVal(star)} className="transition-transform active:scale-95">
                  <Star className={`w-10 h-10 ${star <= ratingVal ? "fill-orange-400 text-orange-400" : "text-slate-200"}`} />
                </button>
              ))}
            </div>
            <Textarea placeholder="How was the session? (Optional)" value={reviewText} onChange={e => setReviewText(e.target.value)} className="resize-none h-24 rounded-2xl border border-slate-200 focus-visible:ring-[#6C3BFF] p-3 text-sm font-medium bg-slate-50" />
          </div>
          <DialogFooter>
            <Button onClick={handleRate} disabled={rateMut.isPending} className="w-full h-12 rounded-full font-bold text-sm bg-slate-900 text-white shadow-sm">
              {rateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Group Class Dialog */}
      <Dialog open={groupModal} onOpenChange={setGroupModal}>
        <DialogContent className="sm:max-w-md rounded-[24px] border border-gray-100 shadow-xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#6C3BFF]" /> Create Group Class
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Topic / Skill</label>
              <Input placeholder="e.g. Advanced React Patterns" value={groupForm.skill} onChange={e => setGroupForm({...groupForm, skill: e.target.value})} className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Date & Time</label>
              <Input type="datetime-local" value={groupForm.scheduledDate} onChange={e => setGroupForm({...groupForm, scheduledDate: e.target.value})} className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Cost (Credits)</label>
                <Input type="number" placeholder="20" value={groupForm.creditsAmount} onChange={e => setGroupForm({...groupForm, creditsAmount: e.target.value})} className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Max Students</label>
                <Input type="number" placeholder="10" value={groupForm.maxStudents} onChange={e => setGroupForm({...groupForm, maxStudents: e.target.value})} className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setGroupModal(false)} className="rounded-full h-10 text-xs font-bold w-full">Cancel</Button>
            <Button onClick={createGroupSession} className="rounded-full h-10 text-xs font-bold w-full bg-[#6C3BFF] hover:bg-[#5b32d6] text-white">Create Class</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Negotiate Dialog */}
      <Dialog open={!!negotiateModal} onOpenChange={o => !o && setNegotiateModal(null)}>
        <DialogContent className="sm:max-w-sm rounded-[24px] border border-gray-100 shadow-xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-[#6C3BFF]" /> Negotiate Price
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Proposed Credits</label>
            <Input type="number" placeholder="Enter amount..." value={proposedPrice} onChange={e => setProposedPrice(e.target.value)} className="h-12 text-base rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800" />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-full h-10 text-xs font-bold" onClick={() => setNegotiateModal(null)}>Cancel</Button>
            <Button onClick={negotiatePrice} className="bg-slate-900 text-white rounded-full h-10 text-xs font-bold">
              Send Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}