# Fix sessions.tsx - group session "with yourself" bug, status filters, clean UI
# cd C:\Users\alc\skillswap  then  .\sessions-fixed.ps1
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

$sessions = @'
import { useState } from "react";
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
import { Clock, CheckCircle2, XCircle, Star, CalendarDays, Loader2, Video, Users, Plus, BookOpen, GraduationCap, Coins, Filter, Zap } from "lucide-react";

type SessionTab    = "learning" | "teaching";
type StatusFilter  = "all" | "requested" | "accepted" | "completed" | "cancelled";

export default function Sessions() {
  const options      = useApiOptions();
  const token        = useAuthStore(s => s.token);
  const queryClient  = useQueryClient();
  const { toast }    = useToast();

  const [tab,           setTab]           = useState<SessionTab>("learning");
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>("all");
  const [ratingId,      setRatingId]      = useState<number | null>(null);
  const [ratingVal,     setRatingVal]     = useState(5);
  const [reviewText,    setReviewText]    = useState("");
  const [groupModal,    setGroupModal]    = useState(false);
  const [negotiateModal,setNegotiateModal]= useState<any>(null);
  const [proposedPrice, setProposedPrice] = useState("");
  const [groupForm,     setGroupForm]     = useState({
    skill: "", scheduledDate: "", creditsAmount: "20", maxStudents: "10", message: "",
  });

  const { data: user } = useGetMe(options);
  const { data: allSessions, isLoading } = useGetMySessions(
    { role: tab === "learning" ? "student" : "mentor" }, options
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
  };

  const acceptMut   = useAcceptSession({   ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session Accepted!" }); } } });
  const completeMut = useCompleteSession({ ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session Completed! Credits transferred." }); } } });
  const cancelMut   = useCancelSession({   ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session Cancelled." }); } } });
  const rateMut     = useCreateRating({    ...options, mutation: {
    onSuccess: () => { invalidate(); setRatingId(null); setReviewText(""); toast({ title: "Review Submitted!" }); }
  }});

  const handleRate = () => {
    if (!ratingId) return;
    rateMut.mutate({ data: { sessionId: ratingId, rating: ratingVal, review: reviewText } });
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

  // ── Filter sessions ───────────────────────────────────────────
  const myId = (user as any)?.id;

  const sessions = (allSessions || []).filter((s: any) => {
    // Hide group sessions where user is both mentor AND student (self-created group = appears in teaching tab)
    if (s.isGroup === 1 && tab === "learning" && s.mentorId === myId) return false;
    // Status filter
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  }).sort((a: any, b: any) =>
    new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
  );

  // Count by status for badges
  const counts = {
    all:       (allSessions || []).length,
    requested: (allSessions || []).filter((s: any) => s.status === "requested").length,
    accepted:  (allSessions || []).filter((s: any) => s.status === "accepted").length,
    completed: (allSessions || []).filter((s: any) => s.status === "completed").length,
    cancelled: (allSessions || []).filter((s: any) => s.status === "cancelled").length,
  };

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { label: string; icon: any; cls: string }> = {
      requested:   { label: "Requested",  icon: Clock,         cls: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
      accepted:    { label: "Upcoming",   icon: CalendarDays,  cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
      in_progress: { label: "Live",       icon: Video,         cls: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
      completed:   { label: "Completed",  icon: CheckCircle2,  cls: "bg-green-500/10 text-green-600 border-green-500/20" },
      cancelled:   { label: "Cancelled",  icon: XCircle,       cls: "bg-red-500/10 text-red-600 border-red-500/20" },
      pending:     { label: "Pending",    icon: Clock,         cls: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
    };
    const c = cfg[status];
    if (!c) return null;
    const Icon = c.icon;
    return (
      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center gap-1.5 ${c.cls}`}>
        <Icon className="w-3 h-3" /> {c.label}
      </span>
    );
  };

  const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: "all",       label: "All" },
    { value: "requested", label: "Pending" },
    { value: "accepted",  label: "Upcoming" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="py-6 max-w-5xl mx-auto space-y-5 px-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black mb-1">My Sessions</h1>
          <p className="text-muted-foreground text-sm">Manage your teaching and learning appointments.</p>
        </div>
        {tab === "teaching" && (
          <Button onClick={() => setGroupModal(true)} className="rounded-xl gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Create Group Session
          </Button>
        )}
      </div>

      {/* Tab toggle */}
      <div className="flex p-1 bg-muted/40 rounded-2xl w-full sm:w-fit border border-border/50 gap-1">
        <button
          onClick={() => { setTab("learning"); setStatusFilter("all"); }}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${tab === "learning" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}>
          <BookOpen className="w-4 h-4" /> Learning
        </button>
        <button
          onClick={() => { setTab("teaching"); setStatusFilter("all"); }}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${tab === "teaching" ? "bg-background shadow-sm text-violet-600" : "text-muted-foreground hover:text-foreground"}`}>
          <GraduationCap className="w-4 h-4" /> Teaching
        </button>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              statusFilter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/30 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}>
            {f.label}
            {f.value !== "all" && counts[f.value] > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">{counts[f.value]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Sessions list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-16 text-center rounded-2xl border border-dashed border-border bg-muted/20">
            <CalendarDays className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">No sessions found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {tab === "learning" ? "Go to Explore to book your first session!" : "You have no teaching sessions yet."}
            </p>
            {tab === "learning" && (
              <a href="/explore" className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold hover:bg-primary/90 transition-colors">
                <Zap className="w-4 h-4" /> Find a Mentor
              </a>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {sessions.map((session: any, i: number) => {
              // Determine "other user" — for group sessions in teaching tab, show "Group Session"
              const isGroupSession = session.isGroup === 1;
              const otherUser = tab === "learning" ? session.mentor : session.student;
              const otherName = isGroupSession && tab === "teaching"
                ? `Group Session (${session.maxStudents} max)`
                : otherUser?.name ?? "Unknown";
              const isActive = session.status === "accepted" || session.status === "in_progress";

              return (
                <motion.div key={session.id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }} transition={{ delay: i * 0.04 }}
                  className="p-5 rounded-2xl bg-background border border-border hover:border-primary/20 hover:shadow-md transition-all duration-200 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">

                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
                      isGroupSession ? "bg-gradient-to-br from-cyan-500 to-blue-600" :
                      tab === "learning" ? "bg-gradient-to-br from-primary to-violet-600" :
                      "bg-gradient-to-br from-violet-500 to-cyan-500"
                    } shadow-sm`}>
                      {isGroupSession ? <Users className="w-5 h-5" /> :
                        otherUser?.avatar
                          ? <img src={otherUser.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                          : (otherUser?.name?.charAt(0)?.toUpperCase() ?? "?")}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Title row */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-black text-base">{session.skill}</h3>
                        {getStatusBadge(session.status)}
                        {isGroupSession && (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 flex items-center gap-1.5">
                            <Users className="w-3 h-3" /> Group
                          </span>
                        )}
                      </div>

                      {/* Who */}
                      <p className="text-sm text-muted-foreground mb-2">
                        {isGroupSession && tab === "teaching" ? (
                          <span className="font-semibold text-cyan-600">{otherName}</span>
                        ) : (
                          <>{tab === "learning" ? "with mentor " : "student: "}
                          <span className="font-semibold text-foreground">{otherName}</span></>
                        )}
                      </p>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium bg-muted border border-border px-3 py-1.5 rounded-lg">
                          {format(new Date(session.scheduledDate), "EEE, MMM d · h:mm a")}
                        </span>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg flex items-center gap-1">
                          <Coins className="w-3 h-3" />{session.creditsAmount} cr
                          {session.negotiatedPrice ? <span className="text-green-600 ml-1">(negotiated)</span> : null}
                        </span>
                        {session.duration && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1.5 rounded-lg">
                            {session.duration} min
                          </span>
                        )}
                      </div>

                      {/* Message */}
                      {session.message && (
                        <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-border pl-3 line-clamp-2">
                          "{session.message}"
                        </p>
                      )}

                      {/* Meet link */}
                      {session.meetLink && isActive && (
                        <a href={session.meetLink} target="_blank" rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors">
                          <Video className="w-3.5 h-3.5" /> Join Meeting
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-border/50 shrink-0">

                    {/* Teaching actions */}
                    {tab === "teaching" && session.status === "requested" && !isGroupSession && (
                      <>
                        <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 text-xs rounded-xl"
                          onClick={() => { setNegotiateModal(session); setProposedPrice(String(session.creditsAmount)); }}>
                          Negotiate
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-200 text-xs rounded-xl"
                          onClick={() => cancelMut.mutate({ sessionId: session.id })}>
                          Decline
                        </Button>
                        <Button size="sm" className="text-xs rounded-xl bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => acceptMut.mutate({ sessionId: session.id })}>
                          Accept
                        </Button>
                      </>
                    )}

                    {tab === "teaching" && (session.status === "accepted" || session.status === "in_progress") && (
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 text-xs rounded-xl"
                        onClick={() => cancelMut.mutate({ sessionId: session.id })}>
                        Cancel
                      </Button>
                    )}

                    {/* Group session — cancel only */}
                    {tab === "teaching" && isGroupSession && session.status === "pending" && (
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 text-xs rounded-xl"
                        onClick={() => cancelMut.mutate({ sessionId: session.id })}>
                        Cancel Group Session
                      </Button>
                    )}

                    {/* Learning actions */}
                    {tab === "learning" && session.status === "requested" && (
                      <>
                        <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 text-xs rounded-xl"
                          onClick={() => { setNegotiateModal(session); setProposedPrice(String(session.creditsAmount)); }}>
                          Negotiate
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-200 text-xs rounded-xl"
                          onClick={() => cancelMut.mutate({ sessionId: session.id })}>
                          Cancel
                        </Button>
                      </>
                    )}

                    {tab === "learning" && (session.status === "accepted" || session.status === "in_progress") && (
                      <>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-200 text-xs rounded-xl"
                          onClick={() => cancelMut.mutate({ sessionId: session.id })}>
                          Cancel
                        </Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs rounded-xl"
                          onClick={() => completeMut.mutate({ sessionId: session.id })}>
                          Mark Done
                        </Button>
                      </>
                    )}

                    {tab === "learning" && session.status === "completed" && !session.rating && (
                      <Button variant="outline" size="sm" className="border-orange-300 text-orange-600 text-xs rounded-xl"
                        onClick={() => setRatingId(session.id)}>
                        <Star className="w-3.5 h-3.5 mr-1" /> Rate
                      </Button>
                    )}

                    {session.status === "completed" && session.rating && (
                      <div className="px-3 py-1.5 bg-muted rounded-xl text-xs font-medium flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-orange-400 text-orange-400" /> {session.rating.rating}/5
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* ── Rating Dialog ── */}
      <Dialog open={!!ratingId} onOpenChange={o => !o && setRatingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate your session</DialogTitle>
            <DialogDescription>Help the community by sharing your experience.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-5">
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRatingVal(star)} className="transition-transform hover:scale-110">
                  <Star className={`w-10 h-10 ${star <= ratingVal ? "fill-orange-400 text-orange-400" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
            <Textarea placeholder="Leave a review (optional)" value={reviewText}
              onChange={e => setReviewText(e.target.value)} className="resize-none h-24" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingId(null)}>Cancel</Button>
            <Button onClick={handleRate} disabled={rateMut.isPending}>
              {rateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Negotiate Dialog ── */}
      <Dialog open={!!negotiateModal} onOpenChange={o => !o && setNegotiateModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Negotiate Price</DialogTitle>
            <DialogDescription>Propose a fair price for this session</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-muted/50 p-3 rounded-xl text-sm">
              Current: <strong>{negotiateModal?.creditsAmount} credits</strong>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Your proposed price (credits)</label>
              <Input type="number" min={5} max={500} value={proposedPrice}
                onChange={e => setProposedPrice(e.target.value)} placeholder="e.g. 15" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-center text-muted-foreground">
              <div className="bg-green-500/5 border border-green-500/10 p-2 rounded-xl">Basic<br /><strong>5-20 cr</strong></div>
              <div className="bg-blue-500/5 border border-blue-500/10 p-2 rounded-xl">Medium<br /><strong>20-50 cr</strong></div>
              <div className="bg-purple-500/5 border border-purple-500/10 p-2 rounded-xl">Advanced<br /><strong>50-200 cr</strong></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNegotiateModal(null)}>Cancel</Button>
            <Button onClick={negotiatePrice} className="bg-blue-600 hover:bg-blue-700 text-white">Send Proposal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Group Session Dialog ── */}
      <Dialog open={groupModal} onOpenChange={setGroupModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Group Session</DialogTitle>
            <DialogDescription>Multiple students can join and pay separately</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Skill <span className="text-red-500">*</span></label>
              <Input placeholder="e.g. Python, DSA, Web Dev"
                value={groupForm.skill} onChange={e => setGroupForm(f => ({ ...f, skill: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Date & Time <span className="text-red-500">*</span></label>
              <Input type="datetime-local"
                value={groupForm.scheduledDate} onChange={e => setGroupForm(f => ({ ...f, scheduledDate: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Price per student (cr)</label>
                <Input type="number" min={5} max={200} value={groupForm.creditsAmount}
                  onChange={e => setGroupForm(f => ({ ...f, creditsAmount: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Max students</label>
                <Input type="number" min={2} max={50} value={groupForm.maxStudents}
                  onChange={e => setGroupForm(f => ({ ...f, maxStudents: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description (optional)</label>
              <Textarea placeholder="What will you teach? What should students know beforehand?"
                value={groupForm.message} onChange={e => setGroupForm(f => ({ ...f, message: e.target.value }))}
                className="resize-none h-16" />
            </div>
            <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">How it works:</p>
              <p>Each student pays <strong>{groupForm.creditsAmount || 20} credits</strong> to join.</p>
              <p>You earn credits when session completes.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupModal(false)}>Cancel</Button>
            <Button onClick={createGroupSession} disabled={!groupForm.skill || !groupForm.scheduledDate}>
              Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
'@

[System.IO.File]::WriteAllText("$pwd\src\pages\sessions.tsx", $sessions, [System.Text.Encoding]::UTF8)
Write-Host "sessions.tsx fixed!" -ForegroundColor Green

# Build check
$out = npm run build 2>&1
$errs = $out | Select-String "error TS"
if ($errs) {
  Write-Host "TS errors:" -ForegroundColor Red
  $errs | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
} else {
  Write-Host "BUILD PASSED!" -ForegroundColor Green
  $out | Select-String "built in" | ForEach-Object { Write-Host "  $_" }
}

Write-Host ""
Write-Host "Changes:" -ForegroundColor Yellow
Write-Host "  1. Group sessions in Learning tab hidden (mentor=student)" -ForegroundColor White
Write-Host "  2. Status filter bar added (All/Pending/Upcoming/Completed/Cancelled)" -ForegroundColor White
Write-Host "  3. Group session shows 'Group Session (10 max)' not own name" -ForegroundColor White
Write-Host "  4. Empty state has Find a Mentor button" -ForegroundColor White
Write-Host "  5. AnimatePresence for smooth filter transitions" -ForegroundColor White
