import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useGetMySessions, useAcceptSession, useCompleteSession, useCancelSession, useCreateRating, useGetMe } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Clock, CheckCircle2, XCircle, Star, CalendarDays, Loader2, Video, Users, Plus, Coins, BookOpen, GraduationCap } from "lucide-react";

export default function Sessions() {
  const options = useApiOptions();
  const token = useAuthStore(s => s.token);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<"learning" | "teaching">("learning");
  const [ratingSessionId, setRatingSessionId] = useState<number | null>(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [groupModal, setGroupModal] = useState(false);
  const [negotiateModal, setNegotiateModal] = useState<any>(null);
  const [proposedPrice, setProposedPrice] = useState("");
  const [groupForm, setGroupForm] = useState({ skill: "", scheduledDate: "", creditsAmount: "50", maxStudents: "10", message: "" });

  const { data: user } = useGetMe(options);
  const { data: sessions, isLoading } = useGetMySessions({ role: tab === "learning" ? "student" : "mentor" }, options);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
  };

  const acceptMut = useAcceptSession({ ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session Accepted!" }); } } });
  const completeMut = useCompleteSession({ ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session Completed!", description: "Credits transferred!" }); } } });
  const cancelMut = useCancelSession({ ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session Cancelled" }); } } });
  const rateMut = useCreateRating({ ...options, mutation: {
    onSuccess: () => { invalidate(); setRatingSessionId(null); setReviewText(""); toast({ title: "Review Submitted!" }); }
  }});

  const handleRate = () => {
    if (!ratingSessionId) return;
    rateMut.mutate({ data: { sessionId: ratingSessionId, rating: ratingVal, review: reviewText } });
  };

  const createGroupSession = async () => {
    try {
      const res = await fetch("/api/sessions/group", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ skill: groupForm.skill, scheduledDate: new Date(groupForm.scheduledDate).toISOString(), creditsAmount: parseInt(groupForm.creditsAmount), maxStudents: parseInt(groupForm.maxStudents), message: groupForm.message || undefined }),
      });
      if (res.ok) {
        toast({ title: "Group Session Created!" });
        setGroupModal(false);
        invalidate();
      } else {
        toast({ title: "Failed to create group session", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
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
        toast({ title: `? Price negotiated to ${proposedPrice} credits!` });
        setNegotiateModal(null);
        setProposedPrice("");
        invalidate();
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "requested": return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Requested</span>;
      case "accepted":  return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Upcoming</span>;
      case "in_progress": return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center gap-1.5"><Video className="w-3 h-3" /> Live</span>;
      case "completed": return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-green-500/10 text-green-600 border border-green-500/20 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      case "cancelled": return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-500/10 text-red-600 border border-red-500/20 flex items-center gap-1.5"><XCircle className="w-3 h-3" /> Cancelled</span>;
      default: return null;
    }
  };

  return (
    <div className="py-6 max-w-5xl mx-auto space-y-6">

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

      {/* Tabs */}
      <div className="flex p-1 bg-muted/40 rounded-2xl w-full sm:w-fit border border-border/50 gap-1">
        <button
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${tab === "learning" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("learning")}
        >
          <BookOpen className="w-4 h-4" /> Learning
        </button>
        <button
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${tab === "teaching" ? "bg-background shadow-sm text-violet-600" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("teaching")}
        >
          <GraduationCap className="w-4 h-4" /> Teaching
        </button>
      </div>

      {/* Status guide */}
      <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 text-xs flex flex-wrap gap-x-5 gap-y-2 items-center">
        <span className="font-bold text-foreground text-xs uppercase tracking-wide">Status:</span>
        <span className="flex items-center gap-1.5 text-yellow-600"><Clock className="w-3 h-3" /> <strong>Requested</strong> � Waiting for mentor</span>
        <span className="flex items-center gap-1.5 text-blue-600"><CalendarDays className="w-3 h-3" /> <strong>Upcoming</strong> � Accepted, join when ready</span>
        <span className="flex items-center gap-1.5 text-purple-600"><Video className="w-3 h-3" /> <strong>Live</strong> � In progress</span>
        <span className="flex items-center gap-1.5 text-green-600"><CheckCircle2 className="w-3 h-3" /> <strong>Completed</strong> � Rate your mentor</span>
      </div>

      {/* Sessions list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : sessions?.length === 0 ? (
          <div className="p-16 text-center rounded-2xl border border-dashed border-border bg-muted/20">
            <CalendarDays className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">No sessions found</h3>
            <p className="text-muted-foreground text-sm">You don't have any {tab} sessions yet.</p>
          </div>
        ) : (
          sessions?.sort((a: any, b: any) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()).map((session: any, i: number) => {
            const otherUser = tab === "learning" ? session.mentor : session.student;
            const isActive = session.status === "accepted" || session.status === "in_progress";
            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-5 rounded-2xl bg-background border border-border hover:border-primary/20 hover:shadow-md transition-all duration-200 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${tab === "learning" ? "bg-gradient-to-br from-primary to-violet-600" : "bg-gradient-to-br from-violet-500 to-cyan-500"} shadow-sm`}>
                    {otherUser?.avatar
                      ? <img src={otherUser.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                      : otherUser?.name?.charAt(0)
                    }
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-black text-base">{session.skill}</h3>
                      {getStatusBadge(session.status)}
                      {session.isGroup === 1 && (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 flex items-center gap-1.5">
                          <Users className="w-3 h-3" /> Group
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      with <span className="font-semibold text-foreground">{otherUser?.name}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium bg-muted border border-border px-3 py-1.5 rounded-lg">
                        {format(new Date(session.scheduledDate), "EEE, MMM d � h:mm a")}
                      </span>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg flex items-center gap-1">
                        <Coins className="w-3 h-3" />{session.creditsAmount} cr
                        {session.negotiatedPrice && <span className="text-green-600 ml-1">(negotiated)</span>}
                      </span>
                    </div>
                    {session.message && (
                      <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-border pl-3">"{session.message}"</p>
                    )}
                    {session.meetLink && isActive && (
                      <a href={session.meetLink} target="_blank" rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors">
                        <Video className="w-3.5 h-3.5" /> Join Meeting
                      </a>
                    )}
                    {session.status === "completed" && session.actualDuration != null && session.actualDuration > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Duration: {Math.min(session.actualDuration, 480)} min
                        {session.actualDuration < 10 ? " � Full refund issued" : session.actualDuration < 30 ? " � Partial refund issued" : " � Full payment"}
                      </p>
                    )}
                  </div>
                </div>

                {/* BUG FIX: Button Render Logic */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-border/50 shrink-0">
                  {tab === "teaching" && session.status === "requested" && (
                    <>
                      <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 text-xs rounded-xl" onClick={() => { setNegotiateModal(session); setProposedPrice(String(session.creditsAmount)); }}>
                        Negotiate
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 text-xs rounded-xl" onClick={() => cancelMut.mutate({ sessionId: session.id })}>
                        Decline
                      </Button>
                      <Button size="sm" className="text-xs rounded-xl" onClick={() => acceptMut.mutate({ sessionId: session.id })}>
                        Accept ?
                      </Button>
                    </>
                  )}
                  {tab === "teaching" && (session.status === "accepted" || session.status === "in_progress") && (
                    <>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 text-xs rounded-xl" onClick={() => cancelMut.mutate({ sessionId: session.id })}>Cancel</Button>
                      {/* Removed mentor's ability to release funds */}
                    </>
                  )}
                  {tab === "learning" && session.status === "requested" && (
                    <>
                      <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 text-xs rounded-xl" onClick={() => { setNegotiateModal(session); setProposedPrice(String(session.creditsAmount)); }}>
                        Negotiate
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 text-xs rounded-xl" onClick={() => cancelMut.mutate({ sessionId: session.id })}>Cancel</Button>
                    </>
                  )}
                  {tab === "learning" && session.status === "accepted" && (
                    <>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 text-xs rounded-xl" onClick={() => cancelMut.mutate({ sessionId: session.id })}>Cancel</Button>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs rounded-xl" onClick={() => completeMut.mutate({ sessionId: session.id })}>Mark Done (Release Funds)</Button>
                    </>
                  )}
                  {tab === "learning" && session.status === "in_progress" && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs rounded-xl" onClick={() => completeMut.mutate({ sessionId: session.id })}>Mark Done (Release Funds)</Button>
                  )}
                  {tab === "learning" && session.status === "completed" && !session.rating && (
                    <Button variant="outline" size="sm" className="border-orange-300 text-orange-600 text-xs rounded-xl" onClick={() => setRatingSessionId(session.id)}>
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
          })
        )}
      </div>

      {/* Rating dialog */}
      <Dialog open={!!ratingSessionId} onOpenChange={(o) => !o && setRatingSessionId(null)}>
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
            <Textarea placeholder="Leave a review (optional)" value={reviewText} onChange={e => setReviewText(e.target.value)} className="resize-none h-24" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingSessionId(null)}>Cancel</Button>
            <Button onClick={handleRate} disabled={rateMut.isPending}>
              {rateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Negotiate dialog */}
      <Dialog open={!!negotiateModal} onOpenChange={(o) => !o && setNegotiateModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Negotiate Price</DialogTitle>
            <DialogDescription>Propose a new price (10�250 credits)</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-muted/50 p-3 rounded-xl text-sm">Current: <strong>{negotiateModal?.creditsAmount} credits</strong></div>
            <div>
              <label className="text-sm font-medium mb-1 block">Your proposed price</label>
              <Input type="number" min={10} max={250} value={proposedPrice} onChange={e => setProposedPrice(e.target.value)} placeholder="e.g. 50" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-center text-muted-foreground">
              <div className="bg-green-500/5 border border-green-500/10 p-2 rounded-xl">Basic<br /><strong>10�40 cr</strong></div>
              <div className="bg-blue-500/5 border border-blue-500/10 p-2 rounded-xl">Medium<br /><strong>40�100 cr</strong></div>
              <div className="bg-purple-500/5 border border-purple-500/10 p-2 rounded-xl">Advanced<br /><strong>100�250 cr</strong></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNegotiateModal(null)}>Cancel</Button>
            <Button onClick={negotiatePrice} className="bg-blue-600 hover:bg-blue-700 text-white">Send Proposal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group session dialog */}
      <Dialog open={groupModal} onOpenChange={setGroupModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Group Session</DialogTitle>
            <DialogDescription>Create a session multiple students can join</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Skill</label>
              <Input placeholder="e.g. Python, DSA, Web Dev" value={groupForm.skill} onChange={e => setGroupForm(f => ({ ...f, skill: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Date & Time</label>
              <Input type="datetime-local" value={groupForm.scheduledDate} onChange={e => setGroupForm(f => ({ ...f, scheduledDate: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Price per student (cr)</label>
                <Input type="number" min={10} max={250} value={groupForm.creditsAmount} onChange={e => setGroupForm(f => ({ ...f, creditsAmount: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Max students</label>
                <Input type="number" min={2} max={10} value={groupForm.maxStudents} onChange={e => setGroupForm(f => ({ ...f, maxStudents: e.target.value }))} />
              </div>
            </div>
            <div className="bg-muted/50 p-3 rounded-xl text-xs space-y-1 text-muted-foreground">
              <p className="font-bold text-foreground">Platform Commission:</p>
              <p>1�2 students ? 10% fee</p>
              <p>3�5 students ? 15% fee</p>
              <p>6+ students ? 20% fee</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Message (optional)</label>
              <Textarea placeholder="What will you teach?" value={groupForm.message} onChange={e => setGroupForm(f => ({ ...f, message: e.target.value }))} className="resize-none h-16" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupModal(false)}>Cancel</Button>
            <Button onClick={createGroupSession}>Create Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
