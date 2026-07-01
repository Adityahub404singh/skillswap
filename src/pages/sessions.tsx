import { useState, useEffect, useCallback } from "react";
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
import {
  Clock, CheckCircle2, XCircle, Star, CalendarDays, Loader2,
  Video, Users, Plus, BookOpen, GraduationCap, Coins, Filter,
  Lock, Key, User, Compass, Timer, ArrowRightLeft, UserCheck,
  PlayCircle, StopCircle, BadgeCheck, TrendingUp,
} from "lucide-react";

type SessionTab   = "learning" | "teaching" | "groups";
type StatusFilter = "all" | "requested" | "accepted" | "in_progress" | "completed" | "cancelled";

const getCountdown = (targetDateStr: string) => {
  const diff = new Date(targetDateStr).getTime() - Date.now();
  if (diff <= 0) return "Ready to Start";
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `In ${Math.floor(hours / 24)} days`;
  if (hours > 0)  return `In ${hours}h ${minutes}m`;
  return `In ${minutes} mins`;
};

export default function Sessions() {
  const options     = useApiOptions();
  const token       = useAuthStore(s => s.token);
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const [tab,            setTab]           = useState<SessionTab>("learning");
  const [statusFilter,   setStatusFilter]  = useState<StatusFilter>("all");
  const [ratingId,       setRatingId]      = useState<number | null>(null);
  const [ratingVal,      setRatingVal]     = useState(5);
  const [reviewText,     setReviewText]    = useState("");
  const [groupModal,     setGroupModal]    = useState(false);
  const [negotiateModal, setNegotiateModal]= useState<any>(null);
  const [proposedPrice,  setProposedPrice] = useState("");
  const [otpModal,       setOtpModal]      = useState<any>(null);
  const [otpInput,       setOtpInput]      = useState("");
  const [membersModal,   setMembersModal]  = useState<any>(null);
  const [groupMembers,   setGroupMembers]  = useState<any[]>([]);
  const [membersLoading, setMembersLoading]= useState(false);
  const [groupForm,      setGroupForm]     = useState({ skill: "", scheduledDate: "", creditsAmount: "20", maxStudents: "10", message: "", sessionType: "standard" });

  // Group browse state
  const [groupBrowse,    setGroupBrowse]   = useState<any[]>([]);
  const [myEnrolled,     setMyEnrolled]    = useState<any[]>([]);
  const [groupLoading,   setGroupLoading]  = useState(false);
  const [joinLoading,    setJoinLoading]   = useState<number | null>(null);

  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const { data: user }        = useGetMe(options);
  const { data: allSessions, isLoading } = useGetMySessions({ role: tab === "learning" ? "student" : "mentor" }, options);

  // Heartbeat for in_progress sessions
  useEffect(() => {
    const live = (allSessions || []).filter((s: any) => s.status === "in_progress");
    const enrolled = myEnrolled.filter(s => s.status === "in_progress");
    const allLive = [...live, ...enrolled];
    if (allLive.length === 0) return;
    const interval = setInterval(() => {
      // 🔥 EXPERT FIX: Prevent background polling & Reduced frequency to 60s
      if (document.visibilityState !== "visible") return;
      
      allLive.forEach((s: any) => {
        fetch(`/api/sessions/${s.id}/heartbeat`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      });
    }, 60000); // Shifted to 60 seconds
    return () => clearInterval(interval);
  }, [allSessions, myEnrolled, token]);

  // Fetch group browse when Groups tab active
  useEffect(() => {
    if (tab !== "groups" || !token) return;
    fetchGroupBrowse();
    fetchMyEnrollments();
  }, [tab, token]);

  const fetchGroupBrowse = async () => {
    setGroupLoading(true);
    try {
      const res = await fetch("/api/sessions/group/browse", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGroupBrowse(Array.isArray(data) ? data : []);
    } catch { setGroupBrowse([]); }
    setGroupLoading(false);
  };

  const fetchMyEnrollments = async () => {
    try {
      const res = await fetch("/api/sessions/group/my-enrollments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMyEnrolled(Array.isArray(data) ? data : []);
    } catch { setMyEnrolled([]); }
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
  };

  const acceptMut   = useAcceptSession({   ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session Accepted!" }); } } });
  const completeMut = useCompleteSession({ ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session Completed! Credits transferred." }); } } });
  const cancelMut   = useCancelSession({   ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session Cancelled." }); } } });
  const rateMut     = useCreateRating({    ...options, mutation: { onSuccess: () => { invalidate(); setRatingId(null); setReviewText(""); toast({ title: "Review Submitted!" }); } } });

  const handleRate = () => {
    if (!ratingId) return;
    rateMut.mutate({ data: { sessionId: ratingId, rating: ratingVal, review: reviewText } });
  };

  const startSession = async () => {
    if (!otpInput || otpInput.length !== 6) {
      toast({ title: "Enter valid 6-digit OTP", variant: "destructive" }); return;
    }
    try {
      const res = await fetch(`/api/sessions/${otpModal.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp: otpInput }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Session Started!", description: "OTP Verified." });
        setOtpModal(null); setOtpInput(""); invalidate();
      } else {
        toast({ title: "Failed", description: data.error, variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
  };

  const startGroupSession = async (sessionId: number) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/start-group`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Group Session Started!", description: data.message });
        invalidate();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
  };

  const endGroupSession = async (sessionId: number) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/end-group`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Session Ended! 🎉", description: data.message });
        invalidate();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
  };

  const joinGroupSession = async (sessionId: number, creditsAmount: number) => {
    setJoinLoading(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/join-group`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Joined! 🎉", description: `${creditsAmount} credits deducted. You're in!` });
        fetchGroupBrowse(); fetchMyEnrollments(); invalidate();
      } else {
        toast({ title: "Couldn't join", description: data.error, variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    setJoinLoading(null);
  };

  const leaveGroupSession = async (sessionId: number) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/leave-group`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Left session", description: data.message });
        fetchGroupBrowse(); fetchMyEnrollments(); invalidate();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
  };

  const viewGroupMembers = async (session: any) => {
    setMembersModal(session);
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/group-members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGroupMembers(data.members || []);
    } catch { setGroupMembers([]); }
    setMembersLoading(false);
  };

  const createGroupSession = async () => {
    if (!groupForm.skill || !groupForm.scheduledDate) {
      toast({ title: "Fill all required fields", variant: "destructive" }); return;
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
          sessionType:   groupForm.sessionType || "standard",
        }),
      });
      if (res.ok) {
        toast({ title: "Group Class Created! 🎓", description: "Students can now join your session." });
        setGroupModal(false);
        setGroupForm({ skill: "", scheduledDate: "", creditsAmount: "20", maxStudents: "10", message: "", sessionType: "standard" });
        invalidate();
      } else {
        const err = await res.json();
        toast({ title: err.error || "Failed", variant: "destructive" });
      }
    } catch { toast({ title: "Network error", variant: "destructive" }); }
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
        setNegotiateModal(null); setProposedPrice(""); invalidate();
      }
    } catch { toast({ title: "Error", variant: "destructive" }); }
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
      requested:   { label: "Pending",   icon: Clock,        cls: "bg-amber-50 text-amber-600 border-amber-100" },
      accepted:    { label: "Upcoming",  icon: CalendarDays, cls: "bg-blue-50 text-blue-600 border-blue-100" },
      in_progress: { label: "Live Now",  icon: Video,        cls: "bg-indigo-600 text-white border-indigo-600 animate-pulse" },
      completed:   { label: "Completed", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-600 border-emerald-100" },
      cancelled:   { label: "Cancelled", icon: XCircle,      cls: "bg-red-50 text-red-600 border-red-100" },
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
    { value: "all", label: "All" }, { value: "requested", label: "Pending" },
    { value: "accepted", label: "Upcoming" }, { value: "in_progress", label: "Live" },
    { value: "completed", label: "History" },
  ];

  return (
    <div className="space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
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
              <Plus className="w-4 h-4 mr-1.5" /> Create Group Class
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex p-1 bg-white border border-gray-100 rounded-full shadow-sm w-full sm:w-fit">
          <button onClick={() => { setTab("learning"); setStatusFilter("all"); }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold rounded-full transition-all ${tab === "learning" ? "bg-[#6C3BFF] text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
            <BookOpen className="w-4 h-4" /> Learning
          </button>
          <button onClick={() => { setTab("teaching"); setStatusFilter("all"); }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold rounded-full transition-all ${tab === "teaching" ? "bg-[#8B5CF6] text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
            <GraduationCap className="w-4 h-4" /> Teaching
          </button>
          <button onClick={() => { setTab("groups"); }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold rounded-full transition-all ${tab === "groups" ? "bg-emerald-500 text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
            <Users className="w-4 h-4" /> Group Classes
          </button>
        </div>

        {tab !== "groups" && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 hide-scrollbar w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0 mr-1 hidden sm:block" />
            {STATUS_FILTERS.map(f => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all whitespace-nowrap border ${statusFilter === f.value ? "bg-slate-800 text-white border-slate-800 shadow-sm" : "bg-white border-gray-100 text-slate-500 hover:border-[#6C3BFF]/30 hover:text-slate-800"}`}>
                {f.label}
                {f.value !== "all" && counts[f.value] > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${statusFilter === f.value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{counts[f.value]}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          GROUP BROWSE TAB
          ═══════════════════════════════════════════ */}
      {tab === "groups" && (
        <div className="space-y-4">

          {/* My Enrolled Group Sessions */}
          {myEnrolled.length > 0 && (
            <div>
              <h2 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-emerald-500" /> My Enrolled Sessions ({myEnrolled.length})
              </h2>
              <div className="space-y-3">
                {myEnrolled.map((session: any) => (
                  <motion.div key={`enrolled-${session.id}`}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-50 border border-emerald-100 rounded-[20px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-11 h-11 rounded-[12px] bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 font-black text-sm flex-shrink-0">
                        {session.mentor?.avatar
                          ? <img src={session.mentor.avatar} className="w-full h-full rounded-[12px] object-cover" alt="" />
                          : (session.mentor?.name?.charAt(0)?.toUpperCase() || "?")}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{session.skill}</p>
                        <p className="text-[11px] text-slate-500 font-medium">by {session.mentor?.name || "Mentor"}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {format(new Date(session.scheduledDate), "EEE, MMM d • h:mm a")}
                          <span className="ml-2 text-emerald-600 font-bold">{session.enrolledCount}/{session.maxStudents} students</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {getStatusBadge(session.status)}
                      {session.status === "in_progress" && session.meetLink && (
                        <a href={session.meetLink} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="bg-[#6C3BFF] text-white font-bold rounded-full text-xs h-8">
                            <Video className="w-3 h-3 mr-1" /> Join Meet
                          </Button>
                        </a>
                      )}
                      {session.status === "accepted" && (
                        <Button size="sm" variant="outline" onClick={() => leaveGroupSession(session.id)}
                          className="border-red-200 text-red-500 hover:bg-red-50 font-bold rounded-full text-xs h-8">
                          Leave
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {myEnrolled.length > 0 && <div className="border-t border-slate-100 pt-2" />}

          {/* Browse Available Group Sessions */}
          <h2 className="text-sm font-black text-slate-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#6C3BFF]" /> Available Group Classes
          </h2>

          {groupLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#6C3BFF]" />
            </div>
          ) : groupBrowse.length === 0 ? (
            <div className="p-12 text-center rounded-[24px] border border-gray-100 bg-white shadow-sm">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <h3 className="text-xl font-black mb-1 text-slate-800">No group classes available</h3>
              <p className="text-slate-500 text-sm font-medium">Check back soon — mentors are creating new group sessions!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {groupBrowse.filter(s => s.mentorId !== myId).map((session: any) => (
                <motion.div key={session.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden hover:border-[#6C3BFF]/20 transition-all">

                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-[#6C3BFF]/5 to-[#8B5CF6]/5 p-4 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-[14px] bg-indigo-100 border border-indigo-200 flex items-center justify-center font-black text-[#6C3BFF] text-lg flex-shrink-0 overflow-hidden">
                        {session.mentor?.avatar
                          ? <img src={session.mentor.avatar} className="w-full h-full object-cover" alt="" />
                          : (session.mentor?.name?.charAt(0)?.toUpperCase() || "?")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-800 text-base truncate">{session.skill}</p>
                        <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" /> {session.mentor?.name || "Mentor"}
                          {session.mentor?.averageRating > 0 && (
                            <span className="ml-1 text-amber-500 font-bold flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-amber-400" /> {Number(session.mentor.averageRating).toFixed(1)}
                            </span>
                          )}
                        </p>
                      </div>
                      {getStatusBadge(session.status)}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                      <span className="text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <CalendarDays className="w-3 h-3 text-[#6C3BFF]" />
                        {format(new Date(session.scheduledDate), "EEE, MMM d • h:mm a")}
                      </span>
                      <span className="text-[#6C3BFF] bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Coins className="w-3 h-3" /> {session.creditsAmount} cr / student
                      </span>
                    </div>

                    {/* Spots progress */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {session.enrolledCount}/{session.maxStudents} enrolled
                        </span>
                        <span className={`text-[10px] font-black ${session.isFull ? "text-red-500" : "text-emerald-600"}`}>
                          {session.isFull ? "FULL" : `${session.spotsLeft} spots left`}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${session.isFull ? "bg-red-400" : "bg-emerald-400"}`}
                          style={{ width: `${Math.min(100, (session.enrolledCount / session.maxStudents) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {session.message && (
                      <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 font-medium line-clamp-2">
                        "{session.message}"
                      </p>
                    )}

                    {/* Action Button */}
                    <div className="pt-1">
                      {session.status === "in_progress" && session.isEnrolled ? (
                        <a href={session.meetLink} target="_blank" rel="noopener noreferrer">
                          <Button className="w-full bg-[#6C3BFF] text-white font-bold rounded-full h-9 text-xs shadow-sm">
                            <Video className="w-3.5 h-3.5 mr-1.5" /> Join Live Session
                          </Button>
                        </a>
                      ) : session.isEnrolled ? (
                        <div className="flex gap-2">
                          <Button disabled className="flex-1 bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold rounded-full h-9 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Enrolled ✓
                          </Button>
                          {session.status === "accepted" && (
                            <Button variant="outline" size="sm" onClick={() => leaveGroupSession(session.id)}
                              className="border-red-200 text-red-500 hover:bg-red-50 font-bold rounded-full h-9 text-xs">
                              Leave
                            </Button>
                          )}
                        </div>
                      ) : session.isFull ? (
                        <Button disabled className="w-full bg-slate-100 text-slate-400 font-bold rounded-full h-9 text-xs">
                          Session Full
                        </Button>
                      ) : (
                        <Button
                          onClick={() => joinGroupSession(session.id, session.creditsAmount)}
                          disabled={joinLoading === session.id}
                          className="w-full bg-gradient-to-r from-[#6C3BFF] to-[#8B5CF6] text-white font-bold rounded-full h-9 text-xs shadow-sm">
                          {joinLoading === session.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <><Coins className="w-3.5 h-3.5 mr-1.5" /> Join — {session.creditsAmount} credits</>}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" onClick={() => { fetchGroupBrowse(); fetchMyEnrollments(); }}
              className="rounded-full text-xs font-bold border-slate-200 text-slate-500">
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          LEARNING / TEACHING SESSIONS LIST
          ═══════════════════════════════════════════ */}
      {tab !== "groups" && (
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
                {tab === "learning" ? "Book your first session!" : "You have no teaching sessions yet."}
              </p>
              {tab === "learning" && (
                <a href="/explore" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#6C3BFF] text-white rounded-full text-xs font-bold shadow-md">
                  <Compass className="w-4 h-4" /> Discover Mentors
                </a>
              )}
            </div>
          ) : (
            <AnimatePresence>
              {sessions.map((session: any, i: number) => {
                const isGroupSession = session.isGroup === 1;
                const otherUser = tab === "learning" ? session.mentor : session.student;
                const otherName = isGroupSession && tab === "teaching"
                  ? `Group Class (${session.enrolledCount || 0}/${session.maxStudents} students)`
                  : otherUser?.name ?? "Unknown";

                return (
                  <motion.div key={session.id}
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ delay: i * 0.04 }}
                    className={`bg-white rounded-[24px] shadow-sm border overflow-hidden group transition-all ${isGroupSession ? "border-emerald-100 hover:border-emerald-200" : "border-gray-100 hover:border-[#6C3BFF]/20"}`}>

                    <div className="p-5 sm:p-6 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">

                      {/* User Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0 w-full">
                        <div className={`w-14 h-14 rounded-[16px] flex items-center justify-center text-[#6C3BFF] font-bold text-xl flex-shrink-0 shadow-inner transition-transform group-hover:scale-105 ${isGroupSession ? "bg-emerald-50 border border-emerald-100 text-emerald-600" : tab === "learning" ? "bg-indigo-50 border border-indigo-100" : "bg-purple-50 border border-purple-100"}`}>
                          {isGroupSession ? <Users className="w-6 h-6" />
                            : otherUser?.avatar
                              ? <img src={otherUser.avatar} className="w-full h-full rounded-[16px] object-cover" alt="" />
                              : (otherUser?.name?.charAt(0)?.toUpperCase() ?? "?")}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                            <h3 className="font-black text-lg text-slate-800 truncate">{session.skill}</h3>
                            {getStatusBadge(session.status)}
                            {isGroupSession && (
                              <span className="px-2 py-0.5 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full uppercase tracking-wider">
                                GROUP
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-medium text-slate-500 mb-3 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            {tab === "learning" ? "Mentor: " : "Student: "}
                            <span className="text-slate-800 font-bold">{otherName}</span>
                          </p>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                              <CalendarDays className="w-3 h-3 text-[#6C3BFF]" />
                              {format(new Date(session.scheduledDate), "EEE, MMM d • h:mm a")}
                            </span>
                            <span className="text-[11px] font-bold text-[#6C3BFF] bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                              <Coins className="w-3 h-3" />{session.creditsAmount} cr
                            </span>
                            {session.status === "accepted" && (
                              <span className="text-[11px] font-bold text-amber-600 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-md flex items-center gap-1.5">
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

                        {/* ── TEACHING: 1-on-1 Requested ── */}
                        {tab === "teaching" && !isGroupSession && session.status === "requested" && (
                          <div className="flex gap-2 w-full md:w-auto">
                            <Button variant="outline" size="sm" className="flex-1 md:flex-none text-blue-600 border-blue-100 hover:bg-blue-50 font-bold rounded-full text-xs"
                              onClick={() => { setNegotiateModal(session); setProposedPrice(String(session.creditsAmount)); }}>
                              Negotiate
                            </Button>
                            <Button size="sm" className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full text-xs"
                              onClick={() => acceptMut.mutate({ sessionId: session.id })}>
                              Accept
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full h-8 w-8"
                              onClick={() => cancelMut.mutate({ sessionId: session.id })}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        {/* ── TEACHING: 1-on-1 Accepted → OTP ── */}
                        {tab === "teaching" && !isGroupSession && session.status === "accepted" && (
                          <div className="flex flex-col items-end gap-1.5 w-full md:w-auto">
                            <Button size="sm" className="w-full md:w-auto bg-[#6C3BFF] text-white font-bold rounded-full text-xs h-8"
                              onClick={() => setOtpModal(session)}>
                              <Lock className="w-3 h-3 mr-1.5" /> Verify OTP to Start
                            </Button>
                            <button className="text-[10px] font-bold text-red-400 hover:text-red-600 px-2"
                              onClick={() => cancelMut.mutate({ sessionId: session.id })}>
                              Cancel Class
                            </button>
                          </div>
                        )}

                        {/* ── TEACHING: GROUP Accepted → Start Group ── */}
                        {tab === "teaching" && isGroupSession && session.status === "accepted" && (
                          <div className="flex flex-col gap-2 w-full md:w-auto">
                            <div className="text-[11px] text-slate-500 font-bold text-right">
                              {session.enrolledCount || 0}/{session.maxStudents} students enrolled
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline"
                                className="flex-1 text-[#6C3BFF] border-indigo-100 hover:bg-indigo-50 font-bold rounded-full text-xs h-8"
                                onClick={() => viewGroupMembers(session)}>
                                <UserCheck className="w-3 h-3 mr-1" /> Members
                              </Button>
                              <Button size="sm" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full text-xs h-8"
                                onClick={() => startGroupSession(session.id)}>
                                <PlayCircle className="w-3 h-3 mr-1" /> Start
                              </Button>
                            </div>
                            <button className="text-[10px] font-bold text-red-400 hover:text-red-600 px-2 text-right"
                              onClick={() => cancelMut.mutate({ sessionId: session.id })}>
                              Cancel Class
                            </button>
                          </div>
                        )}

                        {/* ── TEACHING: GROUP In Progress → End Group ── */}
                        {tab === "teaching" && isGroupSession && session.status === "in_progress" && (
                          <div className="flex flex-col gap-2 w-full md:w-auto">
                            {session.meetLink && (
                              <a href={session.meetLink} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" className="w-full bg-[#6C3BFF] text-white font-bold rounded-full text-xs h-8">
                                  <Video className="w-3 h-3 mr-1" /> Open Meet
                                </Button>
                              </a>
                            )}
                            <Button size="sm"
                              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-full text-xs h-8"
                              onClick={() => endGroupSession(session.id)}>
                              <StopCircle className="w-3 h-3 mr-1.5" /> End Session & Pay
                            </Button>
                            <Button size="sm" variant="outline"
                              className="w-full text-slate-500 border-slate-200 font-bold rounded-full text-xs h-8"
                              onClick={() => viewGroupMembers(session)}>
                              <UserCheck className="w-3 h-3 mr-1" /> View Members
                            </Button>
                          </div>
                        )}

                        {/* ── LEARNING: Requested ── */}
                        {tab === "learning" && session.status === "requested" && (
                          <Button variant="outline" size="sm"
                            className="w-full md:w-auto text-red-500 border-red-100 hover:bg-red-50 font-bold rounded-full text-xs h-8"
                            onClick={() => cancelMut.mutate({ sessionId: session.id })}>
                            Cancel Request
                          </Button>
                        )}

                        {/* ── LEARNING: Accepted (OTP + Meet Link) ── */}
                        {tab === "learning" && session.status === "accepted" && (
                          <div className="flex flex-col gap-2 w-full md:w-auto bg-slate-50 p-3 rounded-[16px] border border-gray-100">
                            {!isGroupSession && (
                              <div className="flex items-center justify-between w-full gap-4">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Your OTP:</span>
                                <span className="font-mono font-black text-[#6C3BFF] tracking-widest text-sm bg-white px-2 py-0.5 rounded border border-gray-200">
                                  {session.sessionOtp || "••••••"}
                                </span>
                              </div>
                            )}
                            {isGroupSession && (
                              <p className="text-[10px] font-bold text-slate-500 text-center">
                                Waiting for mentor to start the class
                              </p>
                            )}
                            {session.meetLink && (
                              <a href={session.meetLink} target="_blank" rel="noopener noreferrer" className="w-full">
                                <Button size="sm" className="w-full bg-[#6C3BFF] text-white font-bold rounded-full text-xs h-8">
                                  <Video className="w-3 h-3 mr-1.5" /> Join Meet
                                </Button>
                              </a>
                            )}
                          </div>
                        )}

                        {/* ── BOTH: In Progress ── */}
                        {session.status === "in_progress" && (
                          <div className="flex flex-col gap-2 w-full md:w-auto">
                            {session.meetLink && (
                              <a href={session.meetLink} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" className="w-full bg-[#6C3BFF] text-white font-bold rounded-full animate-pulse text-xs h-8">
                                  <Video className="w-3 h-3 mr-1.5" /> Join Live
                                </Button>
                              </a>
                            )}
                            {/* Only student can mark 1-on-1 complete; group sessions ended by mentor */}
                            {tab === "learning" && !isGroupSession && (
                              <Button size="sm"
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full text-xs h-8"
                                onClick={() => completeMut.mutate({ sessionId: session.id })}>
                                <CheckCircle2 className="w-3 h-3 mr-1.5" /> Mark as Done
                              </Button>
                            )}
                          </div>
                        )}

                        {/* ── LEARNING: Completed → Rate ── */}
                        {tab === "learning" && session.status === "completed" && !session.teacherRating && !isGroupSession && (
                          <Button variant="outline" size="sm"
                            className="w-full md:w-auto border-orange-200 text-orange-500 hover:bg-orange-50 font-bold rounded-full text-xs h-8"
                            onClick={() => setRatingId(session.id)}>
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
      )}

      {/* ═══════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════ */}

      {/* OTP Dialog */}
      <Dialog open={!!otpModal} onOpenChange={o => !o && setOtpModal(null)}>
        <DialogContent className="sm:max-w-md rounded-[24px] p-6 border border-gray-100 shadow-xl bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-xl font-black text-slate-800">
              <Key className="w-5 h-5 text-[#6C3BFF]" /> Start Session
            </DialogTitle>
            <DialogDescription className="text-center font-medium text-slate-500 mt-1 text-xs">
              Enter the 6-digit OTP from student to unlock credits.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex flex-col items-center">
            <Input type="text" maxLength={6} placeholder="• • • • • •" value={otpInput}
              onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
              className="text-center text-3xl tracking-[0.5em] font-mono h-16 w-full bg-slate-50 border border-slate-200 focus-visible:ring-[#6C3BFF] rounded-2xl" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full font-bold h-10 text-xs" onClick={() => setOtpModal(null)}>Cancel</Button>
            <Button onClick={startSession} disabled={otpInput.length < 6}
              className="bg-[#6C3BFF] text-white rounded-full font-bold h-10 text-xs">
              Verify OTP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
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
            <Textarea placeholder="How was the session? (Optional)" value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              className="resize-none h-24 rounded-2xl border border-slate-200 p-3 text-sm font-medium bg-slate-50" />
          </div>
          <DialogFooter>
            <Button onClick={handleRate} disabled={rateMut.isPending} className="w-full h-12 rounded-full font-bold bg-slate-900 text-white">
              {rateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Group Class Dialog */}
      <Dialog open={groupModal} onOpenChange={setGroupModal}>
        <DialogContent className="sm:max-w-md rounded-[24px] border border-gray-100 shadow-xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#6C3BFF]" /> Create Group Class
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs font-medium mt-1">
              Students can browse and join. You get paid when you end the session.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Topic / Skill *</label>
              <Input placeholder="e.g. Advanced React Patterns"
                value={groupForm.skill} onChange={e => setGroupForm({...groupForm, skill: e.target.value})}
                className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Date & Time *</label>
              <Input type="datetime-local" value={groupForm.scheduledDate}
                onChange={e => setGroupForm({...groupForm, scheduledDate: e.target.value})}
                className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Session Type</label>
              <select value={groupForm.sessionType} onChange={e => setGroupForm({...groupForm, sessionType: e.target.value})}
                className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium px-3">
                <option value="micro_15">15-min Quick (micro_15)</option>
                <option value="micro_30">30-min Session (micro_30)</option>
                <option value="standard">1-hour Standard</option>
                <option value="extended">1.5-hour Deep Dive</option>
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Credits / Student</label>
                <Input type="number" placeholder="20" value={groupForm.creditsAmount}
                  onChange={e => setGroupForm({...groupForm, creditsAmount: e.target.value})}
                  className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Max Students</label>
                <Input type="number" placeholder="10" value={groupForm.maxStudents}
                  onChange={e => setGroupForm({...groupForm, maxStudents: e.target.value})}
                  className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Message (Optional)</label>
              <Input placeholder="What will students learn?" value={groupForm.message}
                onChange={e => setGroupForm({...groupForm, message: e.target.value})}
                className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              💡 You earn: (students × credits) − 15% platform fee, paid when you end the session.
            </p>
          </div>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setGroupModal(false)} className="rounded-full h-10 text-xs font-bold w-full">Cancel</Button>
            <Button onClick={createGroupSession} className="rounded-full h-10 text-xs font-bold w-full bg-[#6C3BFF] text-white">
              Create Group Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Members Dialog */}
      <Dialog open={!!membersModal} onOpenChange={o => !o && setMembersModal(null)}>
        <DialogContent className="sm:max-w-md rounded-[24px] border border-gray-100 shadow-xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#6C3BFF]" /> Enrolled Students
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs font-medium mt-1">
              {membersModal?.skill} • {groupMembers.length}/{membersModal?.maxStudents} enrolled
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
            {membersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#6C3BFF]" />
              </div>
            ) : groupMembers.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">No students enrolled yet</p>
            ) : groupMembers.map((member: any, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center font-black text-[#6C3BFF] text-sm flex-shrink-0 overflow-hidden">
                  {member.student?.avatar
                    ? <img src={member.student.avatar} className="w-full h-full object-cover" alt="" />
                    : (member.student?.name?.charAt(0)?.toUpperCase() || "?")}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-sm">{member.student?.name || "Student"}</p>
                  <p className="text-[10px] text-slate-400 font-medium">Paid: {member.creditsAmount} cr</p>
                </div>
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 uppercase">
                  {member.status}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setMembersModal(null)} variant="outline" className="w-full rounded-full h-10 text-xs font-bold">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Negotiate Dialog */}
      <Dialog open={!!negotiateModal} onOpenChange={o => !o && setNegotiateModal(null)}>
        <DialogContent className="sm:max-w-sm rounded-[24px] border border-gray-100 shadow-xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-[#6C3BFF]" /> Negotiate Price
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Proposed Credits</label>
            <Input type="number" placeholder="Enter amount..." value={proposedPrice}
              onChange={e => setProposedPrice(e.target.value)}
              className="h-12 text-base rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800" />
          </div>
          <DialogFooter className="gap-2">
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
