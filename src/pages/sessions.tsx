import { useState, useEffect, useMemo, useCallback, type ReactNode } from "react";
import { useAuthStore } from "@/store/auth";
import { useGetMySessions, useAcceptSession, useCompleteSession, useCancelSession, useCreateRating, useGetMe } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Clock, CheckCircle2, XCircle, Star, CalendarDays, Loader2, Video, Users, Plus, BookOpen,
  GraduationCap, Coins, Lock, Key, User, Compass, Timer, ArrowRightLeft, UserCheck,
  PlayCircle, StopCircle, BadgeCheck, TrendingUp, RefreshCw, Search, Copy, Check,
  CalendarPlus, ChevronRight, AlertTriangle, Link2, Sparkles, WifiOff, Info,
} from "lucide-react";

/* ───────────────────────── constants & helpers ───────────────────────── */

const BASE = import.meta.env.VITE_API_URL || "";
const PLATFORM_FEE = 0.15;

// Keep these in sync with the backend (sessions.ts).
const MAX_GROUP_STUDENTS = 50;   // MAX_STUDENTS_CAP
const MAX_GROUP_CREDITS = 500;   // MAX_CREDITS_PER_STUDENT
const MIN_DISPUTE_CHARS = 20;
const ESCROW_DAYS = 7;           // ESCROW_CLEARANCE_HOURS / 24

type SessionTab = "learning" | "teaching" | "groups";
type StatusFilter = "all" | "requested" | "accepted" | "in_progress" | "completed" | "cancelled";

const SESSION_MINUTES: Record<string, number> = { micro_15: 15, micro_30: 30, doubt: 20, standard: 60, extended: 90 };
const SESSION_TYPES = [
  { value: "micro_15", label: "15 min quick chat" },
  { value: "micro_30", label: "30 min session" },
  { value: "standard", label: "1 hour standard" },
  { value: "extended", label: "1.5 hour deep dive" },
];
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "requested", label: "Pending" },
  { value: "accepted", label: "Upcoming" },
  { value: "in_progress", label: "Live" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];
const UPCOMING_STATUSES = ["requested", "pending", "accepted", "in_progress"];
const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

const safeDate = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const fmt = (v: string | null | undefined, pattern = "EEE, MMM d • h:mm a") => {
  const d = safeDate(v);
  return d ? format(d, pattern) : "Time to be confirmed";
};

const getCountdown = (target?: string | null) => {
  const d = safeDate(target);
  if (!d) return "";
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return "Starting now";
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `In ${days} day${days > 1 ? "s" : ""} ${hours}h`;
  if (hours > 0) return `In ${hours}h ${minutes}m`;
  return `In ${minutes} min${minutes === 1 ? "" : "s"}`;
};

/** Joinable from 15 min before start until 60 min after (or any time once live). */
const isClassReadyToJoin = (scheduled: string | undefined, status: string | undefined) => {
  if (!status || ["cancelled", "completed", "pending_clearance", "disputed"].includes(status)) return false;
  if (status === "in_progress") return true;
  if (status === "accepted") {
    const d = safeDate(scheduled);
    if (!d) return false;
    const mins = (d.getTime() - Date.now()) / 60000;
    return mins <= 15 && mins >= -60;
  }
  return false;
};

/**
 * The server only sends meetLink to people who may join (mentor / enrolled / booked student).
 * Never invent a room URL on the client: a guessed room is not the real one and bypasses the paid link.
 */
const getJoinLink = (s: any): string | null => s?.meetLink || null;

const calendarUrl = (s: any) => {
  const start = safeDate(s?.scheduledDate);
  if (!start) return null;
  const mins = s.duration || SESSION_MINUTES[s.sessionType] || 60;
  const end = new Date(start.getTime() + mins * 60000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `SkillSwap: ${s.skill}`,
    dates: `${f(start)}/${f(end)}`,
    details: `SkillSwap session${getJoinLink(s) ? `\nJoin: ${getJoinLink(s)}` : ""}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

async function apiCall(token: string | null, path: string, method = "POST", body?: unknown) {
  if (!token) {
    return { ok: false, status: 401, data: { error: "Your session has expired. Please sign in again." } as any };
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await res.json().catch(() => ({}))
      : { error: await res.text().catch(() => "") };

    if (!res.ok && !data?.error) {
      data.error = `Request failed (${res.status}). Please try again.`;
    }

    return { ok: res.ok, status: res.status, data: data as any };
  } catch (error) {
    console.error(`[Sessions API] ${method} ${path} failed:`, error);
    return {
      ok: false,
      status: 0,
      data: { error: "Couldn't connect. Check your internet connection and try again." } as any,
    };
  }
}

const STATUS_CFG: Record<string, { label: string; icon: any; cls: string }> = {
  requested:         { label: "Pending",      icon: Clock,        cls: "bg-amber-50 text-amber-700 border-amber-100" },
  pending:           { label: "Waiting",      icon: Clock,        cls: "bg-amber-50 text-amber-700 border-amber-100" },
  accepted:          { label: "Upcoming",     icon: CalendarDays, cls: "bg-blue-50 text-blue-700 border-blue-100" },
  in_progress:       { label: "Live now",     icon: Video,        cls: "bg-indigo-600 text-white border-indigo-600" },
  pending_clearance: { label: "Ended",        icon: CheckCircle2, cls: "bg-slate-100 text-slate-600 border-slate-200" },
  completed:         { label: "Completed",    icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  cancelled:         { label: "Cancelled",    icon: XCircle,      cls: "bg-red-50 text-red-600 border-red-100" },
  disputed:          { label: "Under review", icon: AlertTriangle, cls: "bg-orange-50 text-orange-700 border-orange-100" },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || STATUS_CFG.requested;
  const Icon = c.icon;
  return (
    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border inline-flex items-center gap-1.5 whitespace-nowrap ${c.cls}`}>
      {status === "in_progress"
        ? <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-white" /></span>
        : <Icon className="w-3.5 h-3.5" />}
      {c.label}
    </span>
  );
}

function Avatar({ person, size = 48, group = false }: { person?: any; size?: number; group?: boolean }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  if (group) return <div style={style} className="rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0"><Users className="w-1/2 h-1/2" /></div>;
  return (
    <div style={style} className="rounded-2xl bg-indigo-50 border border-indigo-100 text-[#6C3BFF] font-black flex items-center justify-center overflow-hidden flex-shrink-0">
      {person?.avatar && !broken
        ? <img src={person.avatar} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="w-full h-full object-cover" />
        : <span style={{ fontSize: size * 0.4 }}>{person?.name?.charAt(0)?.toUpperCase() || "?"}</span>}
    </div>
  );
}

type ConfirmCfg = { title: string; description: string; confirmLabel: string; tone?: "danger" | "primary"; onConfirm: () => void };

/* ───────────────────────── page ───────────────────────── */

export default function Sessions() {
  const options = useApiOptions();
  const token = useAuthStore(s => s.token);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location] = useLocation();

  const [tab, setTab] = useState<SessionTab>("learning");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ConfirmCfg | null>(null);

  const [ratingId, setRatingId] = useState<number | null>(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [reviewText, setReviewText] = useState("");

  const [otpModal, setOtpModal] = useState<any>(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");

  const [negotiateModal, setNegotiateModal] = useState<any>(null);
  const [proposedPrice, setProposedPrice] = useState("");

  const [disputeModal, setDisputeModal] = useState<any>(null);
  const [disputeReason, setDisputeReason] = useState("");

  const [membersModal, setMembersModal] = useState<any>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const emptyGroupForm = { skill: "", scheduledDate: "", creditsAmount: "20", maxStudents: "10", message: "", sessionType: "standard" };
  const [groupModal, setGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const [groupTouched, setGroupTouched] = useState(false);

  const [groupBrowse, setGroupBrowse] = useState<any[]>([]);
  const [myEnrolled, setMyEnrolled] = useState<any[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState(false);
  const [search, setSearch] = useState("");
  const [hideFull, setHideFull] = useState(false);
  const [sortBy, setSortBy] = useState<"soonest" | "cheapest" | "spots">("soonest");

  const { data: user, isLoading: userLoading } = useGetMe(options);
  const myId = (user as any)?.id;
  const myCredits: number = (user as any)?.credits ?? 0;

  const sessionsQuery: any = useGetMySessions({ role: tab === "learning" ? "student" : "mentor" }, options);
  const { data: allSessions, isLoading: sessionsLoading, isError: sessionsError } = sessionsQuery;

  /* ── clock tick (countdowns) ── */
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  /* ── deep links: ?tab= and ?action=create ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t === "teaching" || t === "learning" || t === "groups") setTab(t);
    if (params.get("action") === "create") {
      setGroupModal(true);
      params.delete("action");
      const qs = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }
  }, [location]);

  const switchTab = (t: SessionTab) => {
    setTab(t);
    setStatusFilter("all");
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", t);
      window.history.replaceState(null, "", url.toString());
    } catch { /* ignore */ }
  };

  /* ── group data ── */
  const fetchGroupBrowse = useCallback(async () => {
    if (!token) return;
    setGroupLoading(true);
    const { ok, data } = await apiCall(token, "/api/sessions/group/browse", "GET");
    setGroupError(!ok);
    setGroupBrowse(ok && Array.isArray(data) ? data : []);
    setGroupLoading(false);
  }, [token]);

  const fetchMyEnrollments = useCallback(async () => {
    if (!token) return;
    const { ok, data } = await apiCall(token, "/api/sessions/group/my-enrollments", "GET");
    setMyEnrolled(ok && Array.isArray(data) ? data : []);
  }, [token]);

  useEffect(() => { fetchMyEnrollments(); }, [fetchMyEnrollments]);
  useEffect(() => { if (tab === "groups") fetchGroupBrowse(); }, [tab, fetchGroupBrowse]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    sessionsQuery?.refetch?.();
  }, [queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshAll = useCallback(() => {
    invalidate();
    fetchMyEnrollments();
    if (tab === "groups") fetchGroupBrowse();
  }, [invalidate, fetchMyEnrollments, fetchGroupBrowse, tab]);

  /* ── heartbeat: only for group classes I'm enrolled in and that are live ──
     No "tab visible" gate: students attend in the meeting tab (opened in a new tab),
     so this page is usually in the background. The server ignores too-frequent beats.
     We key the effect on the id list so a data refetch does not restart the timer. */
  const liveEnrolledKey = myEnrolled
    .filter((s: any) => s.status === "in_progress")
    .map((s: any) => s.id)
    .sort((a: number, b: number) => a - b)
    .join(",");

  useEffect(() => {
    if (!token || !liveEnrolledKey) return;
    const ids = liveEnrolledKey.split(",");
    const interval = setInterval(() => {
      ids.forEach(id => apiCall(token, `/api/sessions/${id}/heartbeat`));
    }, 60000);
    return () => clearInterval(interval);
  }, [liveEnrolledKey, token]);

  /* ── mutations (with visible errors) ── */
  const mutErr = (e: any) => toast({
    title: "Couldn't complete that",
    description: e?.data?.error || e?.response?.data?.error || e?.message || "Please try again.",
    variant: "destructive",
  });
  const settle = () => setBusy(null);

  const acceptMut = useAcceptSession({ ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session accepted ✅", description: "The student has been notified." }); }, onError: mutErr, onSettled: settle } });
  const completeMut = useCompleteSession({ ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session completed 🎉", description: `Payment is held in escrow for ${ESCROW_DAYS} days. You can rate your mentor now.` }); }, onError: mutErr, onSettled: settle } });
  const cancelMut = useCancelSession({ ...options, mutation: { onSuccess: () => { invalidate(); setDetailId(null); toast({ title: "Session cancelled", description: "Held credits were refunded." }); }, onError: mutErr, onSettled: settle } });
  const rateMut = useCreateRating({ ...options, mutation: { onSuccess: () => { invalidate(); setRatingId(null); setReviewText(""); setRatingVal(5); toast({ title: "Review submitted ⭐", description: "Thanks for the feedback." }); }, onError: mutErr } });

  const accept = (s: any) => { setBusy(`accept-${s.id}`); acceptMut.mutate({ sessionId: s.id } as any); };
  const complete = (s: any) => { setBusy(`complete-${s.id}`); completeMut.mutate({ sessionId: s.id } as any); };
  const cancel = (s: any) => { setBusy(`cancel-${s.id}`); cancelMut.mutate({ sessionId: s.id } as any); };

  const handleRate = () => {
    if (!ratingId) return;
    rateMut.mutate({ data: { sessionId: ratingId, rating: ratingVal, review: reviewText.trim() } } as any);
  };

  /* ── fetch-based actions ── */
  const act = async (
    key: string, path: string,
    opts: { body?: unknown; success: string; describe?: (d: any) => string | undefined; after?: () => void; onError?: (d: any) => void },
  ) => {
    if (busy) return false;
    setBusy(key);
    const { ok, data } = await apiCall(token, path, "POST", opts.body);
    setBusy(null);
    if (ok) {
      toast({ title: opts.success, description: opts.describe?.(data) });
      invalidate(); fetchMyEnrollments();
      if (tab === "groups") fetchGroupBrowse();
      opts.after?.();
    } else {
      toast({ title: "Couldn't complete that", description: data?.error || "Please try again.", variant: "destructive" });
      opts.onError?.(data);
    }
    return ok;
  };

  const startGroupSession = (s: any) => act(`start-${s.id}`, `/api/sessions/${s.id}/start-group`, { success: "Group session started 🚀", describe: d => d?.message });
  const endGroupSession = (s: any) => act(`end-${s.id}`, `/api/sessions/${s.id}/end-group`, { success: "Session ended 🏁", describe: d => d?.message });
  const leaveGroupSession = (s: any) => act(`leave-${s.id}`, `/api/sessions/${s.id}/leave-group`, { success: "You left the class", describe: d => d?.message });
  const joinGroupSession = (s: any) => act(`join-${s.id}`, `/api/sessions/${s.id}/join-group`, { success: "You're in! 🎉", describe: () => `${s.creditsAmount} credits deducted.` });

  const startSession = async () => {
    if (!otpModal) return;
    if (otpInput.length !== 6) { setOtpError("Enter the 6-digit OTP from your student."); return; }
    setOtpError("");
    const ok = await act(`otp-${otpModal.id}`, `/api/sessions/${otpModal.id}/start`, {
      body: { otp: otpInput }, success: "Session started", describe: () => "OTP verified. Have a great class!",
      // Show the server's real reason (wrong OTP, too early, locked out...) instead of always blaming the OTP.
      onError: d => setOtpError(d?.error || "Couldn't start the session. Please try again."),
    });
    if (ok) { setOtpModal(null); setOtpInput(""); }
  };

  const submitDispute = async () => {
    if (!disputeModal) return;
    const reason = disputeReason.trim();
    if (reason.length < MIN_DISPUTE_CHARS) {
      toast({ title: "Add a bit more detail", description: `Please describe the problem in at least ${MIN_DISPUTE_CHARS} characters.`, variant: "destructive" });
      return;
    }
    await act(`dispute-${disputeModal.id}`, `/api/sessions/${disputeModal.id}/dispute`, {
      body: { reason }, success: "Report received", describe: d => d?.message,
      after: () => { setDisputeModal(null); setDisputeReason(""); setDetailId(null); },
    });
  };

  const negotiatePrice = async () => {
    if (!negotiateModal) return;
    const price = parseInt(proposedPrice);
    if (!price || price < 1) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    if (price >= negotiateModal.creditsAmount) { toast({ title: "A discount must be lower than the current price", variant: "destructive" }); return; }
    await act(`neg-${negotiateModal.id}`, `/api/sessions/${negotiateModal.id}/negotiate`, {
      body: { proposedPrice: price }, success: `Price updated to ${price} credits`,
      after: () => { setNegotiateModal(null); setProposedPrice(""); },
    });
  };

  const viewGroupMembers = async (session: any) => {
    setMembersModal(session);
    setMembersLoading(true);
    const { ok, data } = await apiCall(token, `/api/sessions/${session.id}/group-members`, "GET");
    setGroupMembers(ok ? (Array.isArray(data) ? data : data.members || []) : []);
    setMembersLoading(false);
  };

  /* ── group form validation ── */
  const gCredits = parseInt(groupForm.creditsAmount);
  const gMax = parseInt(groupForm.maxStudents);
  const gDate = safeDate(groupForm.scheduledDate);
  const groupErrors = {
    skill: groupForm.skill.trim().length < 3 ? "Enter a topic (at least 3 characters)." : "",
    date: !gDate ? "Pick a date and time." : gDate.getTime() < Date.now() + 5 * 60000 ? "Choose a time in the future." : "",
    credits: !gCredits || gCredits < 1 ? "Credits must be at least 1."
      : gCredits > MAX_GROUP_CREDITS ? `Maximum is ${MAX_GROUP_CREDITS} credits per student.` : "",
    max: !gMax || gMax < 2 || gMax > MAX_GROUP_STUDENTS ? `Choose between 2 and ${MAX_GROUP_STUDENTS} students.` : "",
  };
  const groupValid = !Object.values(groupErrors).some(Boolean);
  const netEarnings = (gross: number) => gross - Math.round(gross * PLATFORM_FEE); // same rounding as the server
  const earningsIfFull = groupValid ? netEarnings(gCredits * gMax) : 0;

  const createGroupSession = async () => {
    setGroupTouched(true);
    if (!groupValid) return;
    await act("create-group", "/api/sessions/group", {
      body: {
        skill: groupForm.skill.trim(),
        scheduledDate: gDate!.toISOString(),
        creditsAmount: gCredits,
        maxStudents: gMax,
        message: groupForm.message.trim() || undefined,
        sessionType: groupForm.sessionType || "standard",
      },
      success: "Group class created 🎉", describe: () => "Students can now find and join it.",
      after: () => { setGroupModal(false); setGroupForm(emptyGroupForm); setGroupTouched(false); },
    });
  };

  const copy = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 1800);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Couldn't copy", description: "Select and copy it manually.", variant: "destructive" });
    }
  };

  /* ── derived lists ── */
  const inScope = useCallback((s: any) => {
    if (tab === "teaching" && s.mentorId !== myId) return false;
    if (tab === "learning" && s.studentId !== myId) return false;
    if (s.isGroup === 1 && tab === "learning" && s.mentorId === myId) return false;
    return true;
  }, [tab, myId]);

  const matchesFilter = (f: StatusFilter, s: any) =>
    f === "all" ? true
    : f === "requested" ? ["requested", "pending"].includes(s.status)
    : f === "completed" ? ["completed", "pending_clearance"].includes(s.status)
    : s.status === f;

  const scoped = useMemo(() => (allSessions || []).filter(inScope), [allSessions, inScope]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: scoped.length, requested: 0, accepted: 0, in_progress: 0, completed: 0, cancelled: 0 };
    scoped.forEach((s: any) => {
      if (s.status === "requested" || s.status === "pending") c.requested++;
      else if (s.status === "accepted") c.accepted++;
      else if (s.status === "in_progress") c.in_progress++;
      else if (s.status === "completed" || s.status === "pending_clearance") c.completed++;
      else if (s.status === "cancelled") c.cancelled++;
    });
    return c;
  }, [scoped]);

  const sessions = useMemo(() => {
    const time = (s: any) => safeDate(s.scheduledDate)?.getTime() ?? 0;
    return scoped.filter((s: any) => matchesFilter(statusFilter, s)).sort((a: any, b: any) => {
      const au = UPCOMING_STATUSES.includes(a.status), bu = UPCOMING_STATUSES.includes(b.status);
      if (au && bu) {
        if (a.status === "in_progress" !== (b.status === "in_progress")) return a.status === "in_progress" ? -1 : 1;
        return time(a) - time(b);
      }
      if (au !== bu) return au ? -1 : 1;
      return time(b) - time(a);
    });
  }, [scoped, statusFilter]);

  const nextUp = useMemo(() => {
    const base: any[] = tab === "groups" ? myEnrolled : scoped;
    const live = base.find(s => s.status === "in_progress");
    if (live) return live;
    return base
      .filter(s => s.status === "accepted" && safeDate(s.scheduledDate) && safeDate(s.scheduledDate)!.getTime() > Date.now() - 60 * 60000)
      .sort((a, b) => safeDate(a.scheduledDate)!.getTime() - safeDate(b.scheduledDate)!.getTime())[0] || null;
  }, [tab, myEnrolled, scoped, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── keep status fresh without hammering the server ──
     1) refresh when the user comes back to this tab (e.g. from the meeting tab),
     2) light 60s poll only while there is a live/upcoming session on screen. */
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") refreshAll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshAll]);

  const hasUpNext = !!nextUp;
  useEffect(() => {
    if (!hasUpNext) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") refreshAll(); }, 60000);
    return () => clearInterval(t);
  }, [hasUpNext, refreshAll]);

  const browseList = useMemo(() => {
    const q = search.trim().toLowerCase();
    const time = (s: any) => safeDate(s.scheduledDate)?.getTime() ?? 0;
    return groupBrowse
      .filter(s => s.mentorId !== myId)
      .filter(s => !hideFull || !s.isFull)
      .filter(s => !q || (s.skill || "").toLowerCase().includes(q) || (s.mentor?.name || "").toLowerCase().includes(q))
      .sort((a, b) =>
        sortBy === "cheapest" ? (a.creditsAmount - b.creditsAmount) || (time(a) - time(b))
        : sortBy === "spots" ? ((b.spotsLeft ?? 0) - (a.spotsLeft ?? 0)) || (time(a) - time(b))
        : time(a) - time(b));
  }, [groupBrowse, myId, hideFull, search, sortBy]);

  const detailSession = useMemo(() => {
    if (detailId == null) return null;
    const pools = tab === "groups" ? [groupBrowse, myEnrolled, allSessions || []] : [allSessions || [], myEnrolled, groupBrowse];
    for (const p of pools) { const f = p.find((s: any) => s.id === detailId); if (f) return f; }
    return null;
  }, [detailId, tab, groupBrowse, myEnrolled, allSessions]);

  const ratingSession = useMemo(() => (allSessions || []).find((s: any) => s.id === ratingId), [allSessions, ratingId]);

  const askConfirm = (cfg: ConfirmCfg) => setConfirm(cfg);
  const otherName = (s: any) => (s.mentorId === myId
    ? (s.isGroup === 1 ? `Group class (${s.enrolledCount || 0}/${s.maxStudents} students)` : s.student?.name ?? "Student")
    : s.mentorId ? (s.mentor?.name ?? "Mentor") : "Waiting for a mentor");

  const headline = counts.in_progress > 0 ? `${counts.in_progress} live now` : counts.accepted > 0 ? `${counts.accepted} upcoming` : "Nothing scheduled";

  /* ───────────────────────── action renderers ───────────────────────── */

  const pend = (k: string) => busy === k;
  const spin = <Loader2 className="w-3.5 h-3.5 animate-spin" />;

  /** One source of truth for every state-dependent button (cards + detail view). */
  const renderActions = (s: any, full = false) => {
    const isMentor = s.mentorId === myId;
    const isGroup = s.isGroup === 1;
    const joinLink = getJoinLink(s);
    const ready = isClassReadyToJoin(s.scheduledDate, s.status);
    const w = full ? "w-full" : "w-full md:w-auto";
    const btn = `${w} font-bold rounded-full text-xs h-9`;
    const nodes: ReactNode[] = [];

    if (isMentor && !isGroup && s.status === "requested") {
      nodes.push(
        <div key="req" className="flex gap-2 w-full">
          <Button variant="outline" size="sm" className="flex-1 text-blue-600 border-blue-100 hover:bg-blue-50 font-bold rounded-full text-xs h-9"
            onClick={() => { setNegotiateModal(s); setProposedPrice(String(s.creditsAmount)); }}>Offer discount</Button>
          <Button size="sm" disabled={!!busy} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full text-xs h-9" onClick={() => accept(s)}>
            {pend(`accept-${s.id}`) ? spin : "Accept"}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Decline request" disabled={!!busy} className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full h-9 w-9 flex-shrink-0"
            onClick={() => askConfirm({ title: "Decline this request?", description: `${s.student?.name || "The student"} will be notified and refunded in full.`, confirmLabel: "Decline request", tone: "danger", onConfirm: () => cancel(s) })}>
            {pend(`cancel-${s.id}`) ? spin : <XCircle className="w-4 h-4" />}
          </Button>
        </div>
      );
    }

    if (isMentor && !isGroup && s.status === "accepted") {
      if (s.meetLink) nodes.push(
        <a key="meet" href={s.meetLink} target="_blank" rel="noopener noreferrer" className={w}>
          <Button size="sm" variant="outline" className={`${btn} border-[#6C3BFF]/30 text-[#6C3BFF] hover:bg-indigo-50`}><Video className="w-3.5 h-3.5 mr-1.5" /> Open meet</Button>
        </a>);
      nodes.push(<Button key="otp" size="sm" className={`${btn} bg-[#6C3BFF] hover:bg-[#5b32d6] text-white`} onClick={() => { setOtpInput(""); setOtpError(""); setOtpModal(s); }}><Lock className="w-3.5 h-3.5 mr-1.5" /> Verify OTP to start</Button>);
    }

    if (isMentor && isGroup && s.status === "accepted") {
      nodes.push(
        <div key="gacc" className="flex gap-2 w-full">
          <Button size="sm" variant="outline" className="flex-1 text-[#6C3BFF] border-indigo-100 hover:bg-indigo-50 font-bold rounded-full text-xs h-9" onClick={() => viewGroupMembers(s)}><UserCheck className="w-3.5 h-3.5 mr-1" /> Members</Button>
          <Button size="sm" disabled={!!busy} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full text-xs h-9"
            onClick={() => askConfirm({ title: "Start this class now?", description: `${s.enrolledCount || 0} of ${s.maxStudents} students are enrolled. Enrolled students will be able to join immediately.`, confirmLabel: "Start class", tone: "primary", onConfirm: () => startGroupSession(s) })}>
            {pend(`start-${s.id}`) ? spin : <><PlayCircle className="w-3.5 h-3.5 mr-1" /> Start</>}
          </Button>
        </div>
      );
    }

    if (isMentor && isGroup && s.status === "in_progress") {
      if (joinLink) nodes.push(<a key="gmeet" href={joinLink} target="_blank" rel="noopener noreferrer" className={w}><Button size="sm" className={`${btn} bg-[#6C3BFF] hover:bg-[#5b32d6] text-white`}><Video className="w-3.5 h-3.5 mr-1.5" /> Open meet</Button></a>);
      nodes.push(
        <Button key="gend" size="sm" disabled={!!busy} className={`${btn} bg-rose-500 hover:bg-rose-600 text-white`}
          onClick={() => askConfirm({
            title: "End the class?",
            description: `The class closes for everyone. Your earnings (minus the ${Math.round(PLATFORM_FEE * 100)}% platform fee) are held in escrow for ${ESCROW_DAYS} days, then released. If the class ran under 80% of its scheduled time, payouts are prorated.`,
            confirmLabel: "End class", tone: "danger", onConfirm: () => endGroupSession(s),
          })}>
          {pend(`end-${s.id}`) ? spin : <><StopCircle className="w-3.5 h-3.5 mr-1.5" /> End session</>}
        </Button>,
        <Button key="gmem" size="sm" variant="outline" className={`${btn} text-slate-600 border-slate-200`} onClick={() => viewGroupMembers(s)}><UserCheck className="w-3.5 h-3.5 mr-1.5" /> View members</Button>
      );
    }

    if (isMentor && s.status === "accepted") {
      nodes.push(
        <button key="mcancel" disabled={!!busy} className="text-[11px] font-bold text-red-400 hover:text-red-600 px-2 py-1"
          onClick={() => askConfirm({ title: "Cancel this class?", description: isGroup ? "All enrolled students will be notified and refunded." : "Your student will be notified and refunded. Frequent cancellations can lower your trust score.", confirmLabel: "Cancel class", tone: "danger", onConfirm: () => cancel(s) })}>
          {pend(`cancel-${s.id}`) ? "Cancelling…" : "Cancel class"}
        </button>
      );
    }

    // Student: pending 1-on-1 request OR an unclaimed doubt (status "pending")
    if (!isMentor && ["requested", "pending"].includes(s.status)) {
      nodes.push(
        <Button key="sreq" variant="outline" size="sm" disabled={!!busy} className={`${btn} text-red-500 border-red-100 hover:bg-red-50`}
          onClick={() => askConfirm({ title: "Cancel your request?", description: "Your credits will be refunded in full.", confirmLabel: "Cancel request", tone: "danger", onConfirm: () => cancel(s) })}>
          {pend(`cancel-${s.id}`) ? spin : "Cancel request"}
        </Button>
      );
    }

    if (!isMentor && s.status === "accepted") {
      nodes.push(
        <div key="sacc" className={`flex flex-col gap-2 ${w} bg-slate-50 p-3 rounded-2xl border border-gray-100`}>
          {!isGroup ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-slate-500">Your start OTP</p>
                <p className="text-[10px] text-slate-400">Share it with your mentor to begin</p>
              </div>
              <button type="button" onClick={() => s.sessionOtp && copy(String(s.sessionOtp), `otp-${s.id}`, "OTP")} disabled={!s.sessionOtp}
                aria-label="Copy OTP" className="font-mono font-black text-[#6C3BFF] tracking-widest text-base bg-white px-3 py-1 rounded-lg border border-gray-200 flex items-center gap-2 hover:border-[#6C3BFF]/40">
                {s.sessionOtp || "••••••"} {copiedKey === `otp-${s.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </div>
          ) : <p className="text-[11px] font-bold text-slate-500 text-center">Waiting for the mentor to start the class</p>}
          {joinLink && ready && (
            <a href={joinLink} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button size="sm" className="w-full bg-[#6C3BFF] hover:bg-[#5b32d6] text-white font-bold rounded-full text-xs h-9"><Video className="w-3.5 h-3.5 mr-1.5" /> Join meet</Button>
            </a>
          )}
          {!ready && s.status === "accepted" && <p className="text-[10px] text-slate-400 text-center">Join opens 15 minutes before the start time.</p>}
          {isGroup && (
            <Button size="sm" variant="outline" disabled={!!busy} className="w-full border-red-200 text-red-500 hover:bg-red-50 font-bold rounded-full text-xs h-9"
              onClick={() => askConfirm({ title: "Leave this class?", description: "You'll give up your spot and get your credits back in full.", confirmLabel: "Leave class", tone: "danger", onConfirm: () => leaveGroupSession(s) })}>
              {pend(`leave-${s.id}`) ? spin : "Leave class"}
            </Button>
          )}
        </div>
      );
    }

    if (!isMentor && s.status === "in_progress") {
      if (joinLink) nodes.push(<a key="live" href={joinLink} target="_blank" rel="noopener noreferrer" className={w}><Button size="sm" className={`${btn} bg-[#6C3BFF] hover:bg-[#5b32d6] text-white`}><Video className="w-3.5 h-3.5 mr-1.5" /> Join live</Button></a>);
      if (!isGroup) nodes.push(
        <Button key="done" size="sm" disabled={!!busy} className={`${btn} bg-emerald-500 hover:bg-emerald-600 text-white`}
          onClick={() => askConfirm({
            title: "Mark this session as done?",
            description: `${s.creditsAmount} credits stay in escrow for ${s.mentor?.name || "your mentor"} and are released after ${ESCROW_DAYS} days unless you report a problem. If less than 80% of the session time has passed, the payout is prorated and the rest is refunded to you.`,
            confirmLabel: "Yes, it's done", tone: "primary", onConfirm: () => complete(s),
          })}>
          {pend(`complete-${s.id}`) ? spin : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Mark as done</>}
        </Button>
      );
    }

    // Student can report a problem while live or during the escrow window (1-on-1 only).
    if (!isMentor && !isGroup && ["in_progress", "pending_clearance"].includes(s.status)) {
      nodes.push(
        <button key="report" type="button" disabled={!!busy} className="text-[11px] font-bold text-orange-500 hover:text-orange-600 px-2 py-1 flex items-center gap-1 self-end"
          onClick={() => { setDisputeReason(""); setDisputeModal(s); }}>
          <AlertTriangle className="w-3 h-3" /> Report a problem
        </button>
      );
    }

    if (isMentor && !isGroup && s.status === "in_progress" && joinLink) {
      nodes.push(<a key="mlive" href={joinLink} target="_blank" rel="noopener noreferrer" className={w}><Button size="sm" className={`${btn} bg-[#6C3BFF] hover:bg-[#5b32d6] text-white`}><Video className="w-3.5 h-3.5 mr-1.5" /> Join live</Button></a>);
    }

    // The server lets students rate as soon as the session ends (no need to wait for escrow).
    const rateable = ["pending_clearance", "completed"].includes(s.status);
    if (!isMentor && rateable && !s.teacherRating && !isGroup) {
      nodes.push(<Button key="rate" variant="outline" size="sm" className={`${btn} border-orange-200 text-orange-600 hover:bg-orange-50`} onClick={() => { setRatingVal(5); setReviewText(""); setRatingId(s.id); }}><Star className="w-3.5 h-3.5 mr-1.5" /> Rate mentor</Button>);
    }
    if (rateable && s.teacherRating) {
      nodes.push(<div key="rated" className={`px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-full flex items-center gap-1 justify-center ${w}`}><Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /><span className="font-bold text-amber-700 text-xs">Rated {s.teacherRating}/5</span></div>);
    }
    if (s.status === "pending_clearance") {
      nodes.push(<p key="clear" className="text-[11px] text-slate-500 flex items-center gap-1.5"><Info className="w-3.5 h-3.5 flex-shrink-0" /> {isMentor ? `Payment is in escrow and releases ${ESCROW_DAYS} days after the session.` : `Held in escrow for ${ESCROW_DAYS} days. You can still report a problem.`}</p>);
    }
    if (s.status === "disputed") {
      nodes.push(<p key="disputed" className="text-[11px] text-orange-600 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> Under review. Funds are frozen until our team decides.</p>);
    }

    return nodes.length ? <div className={`flex flex-col ${full ? "items-stretch" : "items-end"} gap-2 ${full ? "w-full" : ""}`}>{nodes}</div> : null;
  };

  /** Join / enrolled / full states for browsable group classes. */
  const renderJoin = (s: any) => {
    const link = getJoinLink(s);
    if (s.isEnrolled && isClassReadyToJoin(s.scheduledDate, s.status) && link) {
      return <a href={link} target="_blank" rel="noopener noreferrer" className="w-full block"><Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full h-10 text-xs shadow-md"><Video className="w-3.5 h-3.5 mr-1.5" /> Join live class</Button></a>;
    }
    if (s.isEnrolled) {
      return (
        <div className="flex gap-2">
          <Button disabled className="flex-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-full h-10 text-xs"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> You're enrolled</Button>
          {s.status === "accepted" && (
            <Button variant="outline" disabled={!!busy} className="border-red-200 text-red-500 hover:bg-red-50 font-bold rounded-full h-10 text-xs"
              onClick={() => askConfirm({ title: "Leave this class?", description: "You'll give up your spot and get your credits back in full.", confirmLabel: "Leave class", tone: "danger", onConfirm: () => leaveGroupSession(s) })}>
              {pend(`leave-${s.id}`) ? spin : "Leave"}
            </Button>
          )}
        </div>
      );
    }
    if (s.status !== "accepted") return <Button disabled className="w-full bg-slate-100 text-slate-400 font-bold rounded-full h-10 text-xs">{s.status === "in_progress" ? "Already started" : "Class ended"}</Button>;
    if (s.isFull) return <Button disabled className="w-full bg-slate-100 text-slate-400 font-bold rounded-full h-10 text-xs">Class full</Button>;
    if (myCredits < s.creditsAmount) return <Button disabled className="w-full bg-slate-100 text-slate-500 font-bold rounded-full h-10 text-xs"><Coins className="w-3.5 h-3.5 mr-1.5" /> Need {s.creditsAmount - myCredits} more credits</Button>;
    return (
      <Button disabled={!!busy} className="w-full bg-gradient-to-r from-[#6C3BFF] to-[#8B5CF6] text-white font-bold rounded-full h-10 text-xs shadow-sm"
        onClick={() => askConfirm({ title: `Join "${s.skill}"?`, description: `${s.creditsAmount} credits will be deducted now. Your balance after joining: ${myCredits - s.creditsAmount} credits. Leave any time before the class starts for a full refund.`, confirmLabel: `Join for ${s.creditsAmount} credits`, tone: "primary", onConfirm: () => joinGroupSession(s) })}>
        {pend(`join-${s.id}`) ? spin : <><Coins className="w-3.5 h-3.5 mr-1.5" /> Join • {s.creditsAmount} credits</>}
      </Button>
    );
  };

  /* ───────────────────────── card renderers ───────────────────────── */

  const renderSessionCard = (s: any, i: number) => {
    const isGroup = s.isGroup === 1;
    const isMentor = s.mentorId === myId;
    const other = isMentor ? s.student : s.mentor;
    const live = s.status === "in_progress";
    const accent = live ? "border-l-indigo-500" : isGroup ? "border-l-emerald-400" : ["requested", "pending"].includes(s.status) ? "border-l-amber-400" : s.status === "accepted" ? "border-l-blue-400" : s.status === "disputed" ? "border-l-orange-400" : "border-l-transparent";
    return (
      <motion.div key={s.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 6) * 0.03 }}
        onClick={() => setDetailId(s.id)}
        className={`bg-white rounded-[22px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 border-l-4 ${accent} overflow-hidden cursor-pointer hover:shadow-md hover:border-[#6C3BFF]/20 transition-all ${["cancelled"].includes(s.status) ? "opacity-70" : ""}`}>
        <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            <Avatar person={other} size={52} group={isGroup && isMentor} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <button type="button" onClick={e => { e.stopPropagation(); setDetailId(s.id); }} className="font-black text-lg text-slate-800 truncate text-left hover:text-[#6C3BFF]">{s.skill}</button>
                <StatusBadge status={s.status} />
                {isGroup && <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">Group</span>}
              </div>
              <p className="text-xs font-medium text-slate-500 mb-2.5 flex items-center gap-1.5 flex-wrap">
                <User className="w-3.5 h-3.5" />
                {isMentor ? "Student: " : "Mentor: "}
                {!isMentor && other?.id
                  ? <Link href={`/mentor/${other.id}`} onClick={(e: any) => e.stopPropagation()} className="text-[#6C3BFF] font-bold hover:underline">{otherName(s)}</Link>
                  : <span className="text-slate-800 font-bold">{otherName(s)}</span>}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5"><CalendarDays className="w-3 h-3 text-[#6C3BFF]" />{fmt(s.scheduledDate)}</span>
                <span className="text-[11px] font-semibold text-[#6C3BFF] bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5"><Coins className="w-3 h-3" />{s.creditsAmount} cr{isGroup && isMentor ? " / student" : ""}</span>
                {s.status === "accepted" && <span className="text-[11px] font-semibold text-amber-700 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5"><Timer className="w-3 h-3" />{getCountdown(s.scheduledDate)}</span>}
              </div>
              {s.message && <p className="mt-2.5 text-xs text-slate-500 line-clamp-1 italic">“{s.message}”</p>}
            </div>
          </div>
          <div onClick={e => e.stopPropagation()} className="shrink-0 md:min-w-[190px] border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 flex flex-col items-stretch md:items-end gap-1">
            {renderActions(s)}
            <button type="button" onClick={() => setDetailId(s.id)} className="text-[11px] font-bold text-slate-400 hover:text-[#6C3BFF] flex items-center gap-0.5 self-end">Details <ChevronRight className="w-3 h-3" /></button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderBrowseCard = (s: any) => {
    const pct = Math.min(100, ((s.enrolledCount || 0) / Math.max(1, s.maxStudents)) * 100);
    return (
      <motion.div key={s.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => setDetailId(s.id)}
        className="bg-white rounded-[22px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden cursor-pointer hover:shadow-md hover:border-[#6C3BFF]/20 transition-all">
        <div className="bg-gradient-to-r from-[#6C3BFF]/5 to-[#8B5CF6]/5 p-4 border-b border-slate-50 flex items-center gap-3">
          <Avatar person={s.mentor} size={48} />
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-800 text-base truncate">{s.skill}</p>
            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <GraduationCap className="w-3 h-3" /> {s.mentor?.name || "Mentor"}
              {s.mentor?.averageRating > 0 && <span className="ml-1 text-amber-600 font-bold flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />{Number(s.mentor.averageRating).toFixed(1)}</span>}
            </p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="text-slate-600 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1"><CalendarDays className="w-3 h-3 text-[#6C3BFF]" />{fmt(s.scheduledDate)}</span>
            <span className="text-[#6C3BFF] bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg flex items-center gap-1"><Coins className="w-3 h-3" />{s.creditsAmount} cr</span>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5 text-[11px] font-semibold">
              <span className="text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" />{s.enrolledCount}/{s.maxStudents} enrolled</span>
              <span className={s.isFull ? "text-red-500" : s.spotsLeft <= 3 ? "text-amber-600" : "text-emerald-600"}>{s.isFull ? "Full" : `${s.spotsLeft} spot${s.spotsLeft === 1 ? "" : "s"} left`}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full transition-all ${s.isFull ? "bg-red-400" : "bg-emerald-400"}`} style={{ width: `${pct}%` }} /></div>
          </div>
          {s.message && <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 line-clamp-2">“{s.message}”</p>}
          <div onClick={e => e.stopPropagation()}>{renderJoin(s)}</div>
        </div>
      </motion.div>
    );
  };

  /* ───────────────────────── render ───────────────────────── */

  const tabsCfg = [
    { id: "learning" as const, label: "Learning", icon: BookOpen, on: "bg-[#6C3BFF]" },
    { id: "teaching" as const, label: "Teaching", icon: GraduationCap, on: "bg-[#8B5CF6]" },
    { id: "groups" as const, label: "Group classes", icon: Users, on: "bg-emerald-500" },
  ];

  const minDateTime = format(new Date(Date.now() + 10 * 60000), "yyyy-MM-dd'T'HH:mm");
  const showSkeleton = userLoading || sessionsLoading;

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-5 pb-8">

        {/* Header */}
        <header className="bg-gradient-to-br from-[#5B2FF0] via-[#6C3BFF] to-[#8B5CF6] p-5 sm:p-7 rounded-[28px] text-white shadow-lg shadow-indigo-200/60 relative overflow-hidden">
          <div className="absolute -top-14 -right-10 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5"><CalendarDays className="w-7 h-7 text-white/90" /> My sessions</h1>
              <p className="text-white/80 font-medium text-sm mt-1">{tab === "groups" ? "Find group classes and manage the ones you joined." : `${headline} · manage your ${tab === "learning" ? "learning" : "teaching"} schedule.`}</p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button variant="ghost" size="icon" aria-label="Refresh sessions" onClick={refreshAll} className="rounded-full h-10 w-10 bg-white/15 hover:bg-white/25 text-white">
                <RefreshCw className={`w-4 h-4 ${sessionsQuery?.isFetching || groupLoading ? "animate-spin" : ""}`} />
              </Button>
              <span className="hidden sm:flex items-center gap-1.5 bg-black/15 border border-white/10 rounded-full px-3 h-10 text-xs font-bold"><Coins className="w-3.5 h-3.5" /> {myCredits} credits</span>
              {tab !== "learning" && (
                <Button onClick={() => setGroupModal(true)} className="rounded-full bg-white text-[#6C3BFF] hover:bg-slate-50 font-bold px-5 shadow-sm h-10 flex-1 md:flex-none">
                  <Plus className="w-4 h-4 mr-1.5" /> Create group class
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Next up */}
        {nextUp && (
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} aria-label="Next session"
            className={`rounded-[24px] p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center gap-4 justify-between ${nextUp.status === "in_progress" ? "bg-gradient-to-r from-indigo-700 to-[#6C3BFF]" : "bg-slate-900"}`}>
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">{nextUp.status === "in_progress" ? <Video className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}</div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white/70">{nextUp.status === "in_progress" ? "Live right now" : "Next up"}</p>
                <p className="font-black text-lg truncate">{nextUp.skill}</p>
                <p className="text-xs text-white/70 truncate">{otherName(nextUp)} · {fmt(nextUp.scheduledDate)}{nextUp.status === "accepted" ? ` · ${getCountdown(nextUp.scheduledDate)}` : ""}</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {isClassReadyToJoin(nextUp.scheduledDate, nextUp.status) && getJoinLink(nextUp) && (
                <a href={getJoinLink(nextUp)!} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
                  <Button className="w-full rounded-full bg-white text-slate-900 hover:bg-slate-100 font-bold h-10 text-xs"><Video className="w-3.5 h-3.5 mr-1.5" /> Join now</Button>
                </a>
              )}
              <Button variant="ghost" onClick={() => setDetailId(nextUp.id)} className="flex-1 sm:flex-none rounded-full h-10 text-xs font-bold bg-white/10 hover:bg-white/20 text-white">View details</Button>
            </div>
          </motion.section>
        )}

        {/* Tabs + filters */}
        <div className="flex flex-col gap-3">
          <div role="tablist" aria-label="Session type" className="flex p-1 bg-white border border-gray-100 rounded-full shadow-sm w-full sm:w-fit">
            {tabsCfg.map(t => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => switchTab(t.id)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 text-xs font-bold rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C3BFF] ${tab === t.id ? `${t.on} text-white shadow-md` : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
                <t.icon className="w-4 h-4" /> <span>{t.label}</span>
                {t.id === "groups" && myEnrolled.length > 0 && <span className={`px-1.5 rounded-full text-[10px] ${tab === "groups" ? "bg-white/25" : "bg-emerald-100 text-emerald-700"}`}>{myEnrolled.length}</span>}
              </button>
            ))}
          </div>

          {tab !== "groups" && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Filter by status">
              {STATUS_FILTERS.filter(f => f.value === "all" || counts[f.value] > 0 || statusFilter === f.value).map(f => (
                <button key={f.value} onClick={() => setStatusFilter(f.value)} aria-pressed={statusFilter === f.value}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${statusFilter === f.value ? "bg-slate-800 text-white border-slate-800 shadow-sm" : "bg-white border-gray-100 text-slate-500 hover:border-[#6C3BFF]/30 hover:text-slate-800"}`}>
                  {f.label}
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === f.value ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{counts[f.value]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ═════ GROUP CLASSES ═════ */}
        {tab === "groups" && (
          <div className="space-y-5">
            {myEnrolled.length > 0 && (
              <section className="space-y-3" aria-label="My enrolled classes">
                <h2 className="text-sm font-black text-slate-700 flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-emerald-500" /> My enrolled classes ({myEnrolled.length})</h2>
                <div className="space-y-3">{myEnrolled.map((s, i) => renderSessionCard(s, i))}</div>
              </section>
            )}

            <section className="space-y-3" aria-label="Available group classes">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                <h2 className="text-sm font-black text-slate-700 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#6C3BFF]" /> Available classes</h2>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search skill or mentor" aria-label="Search group classes" className="pl-9 h-10 rounded-full bg-white border-gray-200 text-sm" />
                  </div>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} aria-label="Sort classes" className="h-10 rounded-full bg-white border border-gray-200 text-xs font-bold px-3 text-slate-600">
                    <option value="soonest">Soonest</option>
                    <option value="cheapest">Lowest price</option>
                    <option value="spots">Most spots</option>
                  </select>
                  <button onClick={() => setHideFull(v => !v)} aria-pressed={hideFull} className={`h-10 px-4 rounded-full border text-xs font-bold ${hideFull ? "bg-slate-800 text-white border-slate-800" : "bg-white border-gray-200 text-slate-600"}`}>Hide full</button>
                </div>
              </div>

              {groupLoading && groupBrowse.length === 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">{[1, 2].map(i => <div key={i} className="h-64 rounded-[22px] bg-white border border-gray-100 animate-pulse" />)}</div>
              ) : groupError ? (
                <div className="p-10 text-center rounded-[24px] border border-gray-100 bg-white">
                  <WifiOff className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-lg font-black text-slate-800">Couldn't load classes</h3>
                  <p className="text-sm text-slate-500 mb-4">Check your connection and try again.</p>
                  <Button onClick={fetchGroupBrowse} className="rounded-full bg-[#6C3BFF] text-white font-bold text-xs h-10 px-6"><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try again</Button>
                </div>
              ) : browseList.length === 0 ? (
                <div className="p-10 text-center rounded-[24px] border border-gray-100 bg-white">
                  <Users className="w-11 h-11 text-slate-200 mx-auto mb-3" />
                  <h3 className="text-lg font-black text-slate-800">{search || hideFull ? "No classes match" : "No group classes yet"}</h3>
                  <p className="text-sm text-slate-500">{search || hideFull ? "Try a different search or show full classes." : "Mentors add new classes often. Check back soon."}</p>
                  {(search || hideFull) && <Button variant="outline" onClick={() => { setSearch(""); setHideFull(false); }} className="mt-4 rounded-full text-xs font-bold">Clear filters</Button>}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">{browseList.map(renderBrowseCard)}</div>
              )}
            </section>
          </div>
        )}

        {/* ═════ LEARNING / TEACHING ═════ */}
        {tab !== "groups" && (
          <div className="space-y-3">
            {showSkeleton ? (
              [1, 2, 3].map(i => <div key={i} className="h-36 rounded-[22px] bg-white border border-gray-100 animate-pulse" />)
            ) : sessionsError ? (
              <div className="p-10 text-center rounded-[24px] border border-gray-100 bg-white">
                <WifiOff className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-black text-slate-800">Couldn't load your sessions</h3>
                <p className="text-sm text-slate-500 mb-4">Check your connection and try again.</p>
                <Button onClick={() => sessionsQuery?.refetch?.()} className="rounded-full bg-[#6C3BFF] text-white font-bold text-xs h-10 px-6"><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try again</Button>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-10 sm:p-12 text-center rounded-[24px] border border-gray-100 bg-white shadow-sm">
                <CalendarDays className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <h3 className="text-xl font-black mb-1 text-slate-800">{statusFilter !== "all" ? `No ${STATUS_FILTERS.find(f => f.value === statusFilter)?.label.toLowerCase()} sessions` : "No sessions yet"}</h3>
                <p className="text-slate-500 text-sm mb-5 max-w-sm mx-auto">
                  {statusFilter !== "all" ? "Try another filter to see the rest of your sessions."
                    : tab === "learning" ? "Book a mentor or join a group class to get started."
                    : "When learners book you, their requests show up here. Create a group class to get your first students."}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {statusFilter !== "all" && <Button variant="outline" onClick={() => setStatusFilter("all")} className="rounded-full text-xs font-bold">Show all sessions</Button>}
                  {statusFilter === "all" && tab === "learning" && (<>
                    <Link href="/explore"><span className="inline-flex items-center gap-2 px-6 h-10 bg-[#6C3BFF] text-white rounded-full text-xs font-bold shadow-md cursor-pointer"><Compass className="w-4 h-4" /> Find a mentor</span></Link>
                    <Button variant="outline" onClick={() => switchTab("groups")} className="rounded-full text-xs font-bold h-10"><Users className="w-4 h-4 mr-1.5" /> Browse group classes</Button>
                  </>)}
                  {statusFilter === "all" && tab === "teaching" && <Button onClick={() => setGroupModal(true)} className="rounded-full bg-[#6C3BFF] text-white text-xs font-bold h-10"><Plus className="w-4 h-4 mr-1.5" /> Create group class</Button>}
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>{sessions.map((s: any, i: number) => renderSessionCard(s, i))}</AnimatePresence>
            )}
          </div>
        )}

        {/* ═════════ DIALOGS ═════════ */}

        {/* Session detail */}
        <Dialog open={!!detailSession} onOpenChange={o => !o && setDetailId(null)}>
          <DialogContent className="sm:max-w-lg rounded-[24px] border border-gray-100 shadow-xl bg-white p-0 max-h-[90vh] overflow-y-auto">
            {detailSession && (() => {
              const s = detailSession;
              const isMentor = s.mentorId === myId;
              const isGroup = s.isGroup === 1;
              const other = isMentor ? s.student : s.mentor;
              const link = getJoinLink(s);
              const cal = ["accepted", "in_progress", "requested"].includes(s.status) ? calendarUrl(s) : null;
              const browsable = isGroup && !isMentor && (s.isEnrolled !== undefined || s.spotsLeft !== undefined);
              const feeEarnings = isGroup && isMentor ? netEarnings((s.enrolledCount || 0) * s.creditsAmount) : 0;
              const lengthMins = s.duration || SESSION_MINUTES[s.sessionType];
              return (
                <div>
                  <div className="p-6 pb-4 bg-gradient-to-br from-[#6C3BFF]/8 to-[#8B5CF6]/5 border-b border-gray-100">
                    <DialogHeader className="text-left space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar person={other} size={56} group={isGroup && isMentor} />
                        <div className="min-w-0 flex-1">
                          <DialogTitle className="text-xl font-black text-slate-800 truncate">{s.skill}</DialogTitle>
                          <DialogDescription className="text-xs text-slate-500 font-medium">
                            {isMentor ? "Student: " : "Mentor: "}
                            {!isMentor && other?.id ? <Link href={`/mentor/${other.id}`} className="text-[#6C3BFF] font-bold hover:underline">{otherName(s)}</Link> : <span className="font-bold text-slate-700">{otherName(s)}</span>}
                          </DialogDescription>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2"><StatusBadge status={s.status} />{isGroup && <span className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">Group class</span>}</div>
                    </DialogHeader>
                  </div>

                  <div className="p-6 space-y-5">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3"><dt className="text-[11px] font-semibold text-slate-500 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> When</dt><dd className="font-bold text-slate-800 mt-0.5 text-[13px]">{fmt(s.scheduledDate, "EEE, MMM d")}<br />{fmt(s.scheduledDate, "h:mm a")}</dd></div>
                      <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3"><dt className="text-[11px] font-semibold text-slate-500 flex items-center gap-1"><Coins className="w-3 h-3" /> Price</dt><dd className="font-bold text-slate-800 mt-0.5">{s.creditsAmount} credits{isGroup ? <span className="block text-[11px] text-slate-500 font-medium">per student</span> : null}</dd></div>
                      {lengthMins && <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3"><dt className="text-[11px] font-semibold text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Length</dt><dd className="font-bold text-slate-800 mt-0.5">{lengthMins} min</dd></div>}
                      {s.status === "accepted" && <div className="rounded-2xl bg-orange-50 border border-orange-100 p-3"><dt className="text-[11px] font-semibold text-amber-700 flex items-center gap-1"><Timer className="w-3 h-3" /> Starts</dt><dd className="font-bold text-amber-800 mt-0.5">{getCountdown(s.scheduledDate)}</dd></div>}
                      {isGroup && <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 col-span-2"><dt className="text-[11px] font-semibold text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" /> Enrolled</dt><dd className="font-bold text-slate-800 mt-0.5">{s.enrolledCount || 0} of {s.maxStudents} students{feeEarnings > 0 ? <span className="text-emerald-600 font-semibold"> · you'd earn about {feeEarnings} credits</span> : null}</dd></div>}
                    </dl>

                    {s.message && <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-sm text-slate-600 italic">“{s.message}”</div>}

                    {(link || cal) && (
                      <div className="flex flex-wrap gap-2">
                        {link && <Button variant="outline" size="sm" className="rounded-full text-xs font-bold h-9" onClick={() => copy(link, `link-${s.id}`, "Meeting link")}>{copiedKey === `link-${s.id}` ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> : <Link2 className="w-3.5 h-3.5 mr-1.5" />} Copy meeting link</Button>}
                        {cal && <a href={cal} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="rounded-full text-xs font-bold h-9"><CalendarPlus className="w-3.5 h-3.5 mr-1.5" /> Add to calendar</Button></a>}
                      </div>
                    )}

                    <div>{browsable ? renderJoin(s) : renderActions(s, true)}</div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Generic confirm */}
        <Dialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
          <DialogContent className="sm:max-w-sm rounded-[24px] border border-gray-100 shadow-xl bg-white p-6">
            <DialogHeader className="text-left space-y-2">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${confirm?.tone === "danger" ? "bg-red-50" : "bg-indigo-50"}`}>
                {confirm?.tone === "danger" ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <Info className="w-5 h-5 text-[#6C3BFF]" />}
              </div>
              <DialogTitle className="text-lg font-black text-slate-800">{confirm?.title}</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 font-medium">{confirm?.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2 mt-2">
              <Button variant="outline" className="rounded-full h-11 text-xs font-bold flex-1" onClick={() => setConfirm(null)}>Go back</Button>
              <Button className={`rounded-full h-11 text-xs font-bold flex-1 text-white ${confirm?.tone === "danger" ? "bg-red-500 hover:bg-red-600" : "bg-[#6C3BFF] hover:bg-[#5b32d6]"}`}
                onClick={() => { const c = confirm; setConfirm(null); c?.onConfirm(); }}>{confirm?.confirmLabel}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Report a problem (dispute) */}
        <Dialog open={!!disputeModal} onOpenChange={o => { if (!o) { setDisputeModal(null); setDisputeReason(""); } }}>
          <DialogContent className="sm:max-w-md rounded-[24px] border border-gray-100 shadow-xl bg-white p-6">
            <DialogHeader className="text-left space-y-2">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-orange-500" /></div>
              <DialogTitle className="text-lg font-black text-slate-800">Report a problem</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 font-medium">
                Payment for “{disputeModal?.skill}” is frozen while our team reviews it. Tell us what went wrong.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Textarea value={disputeReason} maxLength={500} onChange={e => setDisputeReason(e.target.value)} aria-label="Describe the problem"
                placeholder="e.g. The mentor joined 30 minutes late and left early" className="resize-none h-28 rounded-2xl border border-slate-200 p-3 text-sm font-medium bg-slate-50" />
              <p className={`text-[11px] mt-1 ${disputeReason.trim().length >= MIN_DISPUTE_CHARS ? "text-slate-400" : "text-orange-500"}`}>
                {disputeReason.trim().length}/500 · at least {MIN_DISPUTE_CHARS} characters
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" className="rounded-full h-11 text-xs font-bold flex-1" onClick={() => setDisputeModal(null)}>Cancel</Button>
              <Button onClick={submitDispute} disabled={!!busy || disputeReason.trim().length < MIN_DISPUTE_CHARS} className="rounded-full h-11 text-xs font-bold flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                {busy?.startsWith("dispute-") ? spin : "Submit report"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* OTP */}
        <Dialog open={!!otpModal} onOpenChange={o => { if (!o) { setOtpModal(null); setOtpInput(""); setOtpError(""); } }}>
          <DialogContent className="sm:max-w-md rounded-[24px] p-6 border border-gray-100 shadow-xl bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2 text-xl font-black text-slate-800"><Key className="w-5 h-5 text-[#6C3BFF]" /> Start session</DialogTitle>
              <DialogDescription className="text-center font-medium text-slate-500 mt-1 text-xs">Ask {otpModal?.student?.name || "your student"} for the 6-digit OTP shown in their app.</DialogDescription>
            </DialogHeader>
            <div className="py-3 flex flex-col items-center gap-2">
              <Input type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} placeholder="••••••" value={otpInput} aria-label="6-digit OTP"
                onChange={e => { setOtpInput(e.target.value.replace(/\D/g, "")); setOtpError(""); }}
                onKeyDown={e => { if (e.key === "Enter") startSession(); }}
                className={`text-center text-3xl tracking-[0.5em] font-mono h-16 w-full bg-slate-50 border rounded-2xl focus-visible:ring-[#6C3BFF] ${otpError ? "border-red-300" : "border-slate-200"}`} />
              {otpError && <p role="alert" className="text-xs text-red-500 font-medium text-center">{otpError}</p>}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-full font-bold h-10 text-xs" onClick={() => setOtpModal(null)}>Cancel</Button>
              <Button onClick={startSession} disabled={otpInput.length < 6 || !!busy} className="bg-[#6C3BFF] hover:bg-[#5b32d6] text-white rounded-full font-bold h-10 text-xs">
                {busy?.startsWith("otp-") ? spin : "Verify & start"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rating */}
        <Dialog open={!!ratingId} onOpenChange={o => !o && setRatingId(null)}>
          <DialogContent className="sm:max-w-md rounded-[24px] border border-gray-100 shadow-xl bg-white p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-center text-slate-800">Rate {ratingSession?.mentor?.name || "your mentor"}</DialogTitle>
              <DialogDescription className="text-center text-xs text-slate-500 font-medium">{ratingSession?.skill ? `How was your ${ratingSession.skill} session?` : "How was your session?"}</DialogDescription>
            </DialogHeader>
            <div className="py-3 space-y-4">
              <div className="text-center">
                <div className="flex justify-center gap-1.5" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} role="radio" aria-checked={ratingVal === star} aria-label={`${star} star${star > 1 ? "s" : ""}`} onClick={() => setRatingVal(star)} className="transition-transform active:scale-90 hover:scale-110">
                      <Star className={`w-10 h-10 ${star <= ratingVal ? "fill-orange-400 text-orange-400" : "text-slate-200"}`} />
                    </button>
                  ))}
                </div>
                <p className="text-sm font-bold text-slate-600 mt-2 h-5">{RATING_LABELS[ratingVal]}</p>
              </div>
              <Textarea placeholder="Tell others what made it good (optional)" value={reviewText} maxLength={400} onChange={e => setReviewText(e.target.value)} className="resize-none h-24 rounded-2xl border border-slate-200 p-3 text-sm font-medium bg-slate-50" />
            </div>
            <DialogFooter>
              <Button onClick={handleRate} disabled={rateMut.isPending} className="w-full h-12 rounded-full font-bold bg-slate-900 hover:bg-slate-800 text-white">
                {rateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit review"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create group class */}
        <Dialog open={groupModal} onOpenChange={o => { setGroupModal(o); if (!o) setGroupTouched(false); }}>
          <DialogContent className="sm:max-w-md rounded-[24px] border border-gray-100 shadow-xl bg-white p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-[#6C3BFF]" /> Create group class</DialogTitle>
              <DialogDescription className="text-slate-500 text-xs font-medium mt-1">Students browse and join. Your earnings are released {ESCROW_DAYS} days after you end the class.</DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-3.5">
              {([
                ["Topic or skill *", "skill", <Input key="s" placeholder="e.g. Advanced React patterns" value={groupForm.skill} maxLength={80} onChange={e => setGroupForm({ ...groupForm, skill: e.target.value })} className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm" />],
                ["Date and time *", "date", <Input key="d" type="datetime-local" min={minDateTime} value={groupForm.scheduledDate} onChange={e => setGroupForm({ ...groupForm, scheduledDate: e.target.value })} className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm" />],
              ] as const).map(([label, key, field]) => (
                <div key={key}>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">{label}</label>
                  {field}
                  {groupTouched && (groupErrors as any)[key] && <p className="text-xs text-red-500 mt-1">{(groupErrors as any)[key]}</p>}
                </div>
              ))}
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Session length</label>
                <select value={groupForm.sessionType} onChange={e => setGroupForm({ ...groupForm, sessionType: e.target.value })} className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 text-sm px-3">
                  {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Credits per student</label>
                  <Input type="number" inputMode="numeric" min={1} max={MAX_GROUP_CREDITS} value={groupForm.creditsAmount} onChange={e => setGroupForm({ ...groupForm, creditsAmount: e.target.value })} className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm" />
                  {groupTouched && groupErrors.credits && <p className="text-xs text-red-500 mt-1">{groupErrors.credits}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Max students</label>
                  <Input type="number" inputMode="numeric" min={2} max={MAX_GROUP_STUDENTS} value={groupForm.maxStudents} onChange={e => setGroupForm({ ...groupForm, maxStudents: e.target.value })} className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm" />
                  {groupTouched && groupErrors.max && <p className="text-xs text-red-500 mt-1">{groupErrors.max}</p>}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">What will students learn? (optional)</label>
                <Input value={groupForm.message} maxLength={160} onChange={e => setGroupForm({ ...groupForm, message: e.target.value })} className="h-10 rounded-xl bg-slate-50 border-slate-200 text-sm" />
              </div>
              <p className="text-xs text-slate-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 font-medium">
                {groupValid
                  ? <>If the class fills up ({gMax} × {gCredits} credits) you earn about <b>{earningsIfFull} credits</b> after the {Math.round(PLATFORM_FEE * 100)}% platform fee.</>
                  : <>You earn students × credits, minus a {Math.round(PLATFORM_FEE * 100)}% platform fee, {ESCROW_DAYS} days after you end the class.</>}
              </p>
            </div>
            <DialogFooter className="mt-1 gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setGroupModal(false)} className="rounded-full h-11 text-xs font-bold flex-1">Cancel</Button>
              <Button onClick={createGroupSession} disabled={!!busy} className="rounded-full h-11 text-xs font-bold flex-1 bg-[#6C3BFF] hover:bg-[#5b32d6] text-white">
                {pend("create-group") ? spin : "Create class"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Members */}
        <Dialog open={!!membersModal} onOpenChange={o => !o && setMembersModal(null)}>
          <DialogContent className="sm:max-w-md rounded-[24px] border border-gray-100 shadow-xl bg-white p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-[#6C3BFF]" /> Enrolled students</DialogTitle>
              <DialogDescription className="text-slate-500 text-xs font-medium mt-1">{membersModal?.skill} · {groupMembers.length}/{membersModal?.maxStudents} enrolled</DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
              {membersLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#6C3BFF]" /></div>
                : groupMembers.length === 0 ? <p className="text-center text-slate-400 text-sm py-8">No students have joined yet.</p>
                : groupMembers.map((m: any, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <Avatar person={m.student} size={36} />
                    <div className="flex-1 min-w-0"><p className="font-bold text-slate-800 text-sm truncate">{m.student?.name || "Student"}</p><p className="text-[11px] text-slate-400 font-medium">Paid {m.creditsAmount} credits</p></div>
                    {m.status && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 capitalize">{String(m.status).replace(/_/g, " ")}</span>}
                  </div>
                ))}
            </div>
            <DialogFooter><Button onClick={() => setMembersModal(null)} variant="outline" className="w-full rounded-full h-10 text-xs font-bold">Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Negotiate */}
        <Dialog open={!!negotiateModal} onOpenChange={o => !o && setNegotiateModal(null)}>
          <DialogContent className="sm:max-w-sm rounded-[24px] border border-gray-100 shadow-xl bg-white p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-[#6C3BFF]" /> Offer a discount</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">Current price: {negotiateModal?.creditsAmount} credits. Enter a lower amount to send to {negotiateModal?.student?.name || "the student"}.</DialogDescription>
            </DialogHeader>
            <div className="py-3">
              <label className="text-xs font-bold text-slate-500 mb-1 block">Discounted credits</label>
              <Input type="number" inputMode="numeric" min={1} max={negotiateModal ? negotiateModal.creditsAmount - 1 : undefined} value={proposedPrice} onChange={e => setProposedPrice(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") negotiatePrice(); }}
                className="h-12 text-base rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800" />
              {negotiateModal && parseInt(proposedPrice) >= negotiateModal.creditsAmount && <p className="text-xs text-red-500 mt-1.5">A discount must be lower than the current price.</p>}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-full h-10 text-xs font-bold" onClick={() => setNegotiateModal(null)}>Cancel</Button>
              <Button onClick={negotiatePrice} disabled={!!busy || !proposedPrice || (negotiateModal && parseInt(proposedPrice) >= negotiateModal.creditsAmount)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-full h-10 text-xs font-bold">
                {busy?.startsWith("neg-") ? spin : "Send offer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MotionConfig>
  );
}
