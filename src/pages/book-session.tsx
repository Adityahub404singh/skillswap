import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Zap, Clock, CheckCircle, Star, ShieldCheck, Loader2, Calendar,
  ChevronLeft, AlertTriangle, RefreshCw, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookSession } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";

const BASE = (import.meta.env.VITE_API_URL || "https://skillswap-b59w.onrender.com").replace(/\/$/, "");

type UserRecord = {
  id: string | number;
  name?: string;
  avatar?: string | null;
  skillsTeach?: string[] | string | null;
  averageRating?: number | string | null;
  pricePerHour?: number | string | null;
  trustScore?: number | null;
  isPremium?: boolean;
  credits?: number | string | null;
};

const SESSION_TYPES = [
  { id: "micro_15", label: "15-min Quick Help", desc: "Fast concept explanation", multiplier: 0.25, duration: 15, badge: "Popular", color: "border-orange-500 bg-orange-50/50", glow: "shadow-orange-500/20" },
  { id: "micro_30", label: "30-min Deep Dive", desc: "Focused session on a topic", multiplier: 0.5, duration: 30, badge: "", color: "border-blue-500 bg-blue-50/50", glow: "shadow-blue-500/20" },
  { id: "standard", label: "1-hour Mastery", desc: "Comprehensive learning", multiplier: 1, duration: 60, badge: "Best Value", color: "border-emerald-500 bg-emerald-50/50", glow: "shadow-emerald-500/20" },
] as const;

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function unwrapUser(value: unknown): UserRecord | null {
  const root = asObject(value);
  const user = asObject(root.user ?? root.data?.user ?? root.data ?? root);
  return user.id == null ? null : user as UserRecord;
}

function unwrapUsers(value: unknown): UserRecord[] {
  if (Array.isArray(value)) return value.filter((u) => asObject(u).id != null) as UserRecord[];
  const root = asObject(value);
  const candidates = [root.users, root.data?.users, root.data, root.results];
  const list = candidates.find(Array.isArray);
  return Array.isArray(list) ? list.filter((u) => asObject(u).id != null) as UserRecord[] : [];
}

function getToken(): string | null {
  try {
    return localStorage.getItem("skillswap_token")?.replace(/^["']|["']$/g, "") || null;
  } catch {
    return null;
  }
}

function parseSkills(user: UserRecord): string[] {
  const raw = user.skillsTeach;
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean);
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean);
  } catch {
    // Some existing records store a single skill or comma-separated skills.
  }
  return raw.split(",").map((x) => x.trim()).filter(Boolean);
}

function normalizeId(value: unknown): string {
  return value == null ? "" : String(value);
}

function getLocalToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSelectedDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sanitizeSkill(value: string): string {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").slice(0, 80);
}

function getCreditsForSession(multiplier: number, hourlyRate: number): number {
  const rate = Number.isFinite(hourlyRate) && hourlyRate > 0 ? hourlyRate : 20;
  return Math.max(Math.round(rate * multiplier), 3);
}

function getErrorMessage(error: unknown): string {
  const err = asObject(error);
  const responseData = asObject(err.response?.data);
  return String(responseData.message ?? responseData.error ?? err.message ?? "Please try again.");
}

export default function BookSession() {
  const [, params] = useRoute("/book/:mentorId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const options = useApiOptions();
  const queryClient = useQueryClient();

  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const skillFromUrl = sanitizeSkill(urlParams.get("skill") || "");
  const routeMentorId = params?.mentorId ? normalizeId(params.mentorId) : "";
  const initialMentorId = routeMentorId && /^\d+$/.test(routeMentorId) ? routeMentorId : "";

  const [selectedType, setSelectedType] = useState<string>("standard");
  const [selectedMentorId, setSelectedMentorId] = useState<string>(initialMentorId);
  const [skill, setSkill] = useState(skillFromUrl);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [booked, setBooked] = useState(false);

  const token = getToken();

  const {
    data: currentUserResponse,
    isLoading: userLoading,
    isError: userError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["/api/users/me"],
    enabled: Boolean(token),
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      const activeToken = getToken();
      if (!activeToken) throw new Error("Please sign in to book a session.");
      const response = await fetch(`${BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error("Your session has expired. Please sign in again.");
        throw new Error(`Unable to load your account (${response.status}).`);
      }
      return response.json();
    },
  });

  const {
    data: usersResponse,
    isLoading: mentorsLoading,
    isError: mentorsError,
    refetch: refetchMentors,
  } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      const response = await fetch(`${BASE}/api/users`);
      if (!response.ok) throw new Error(`Unable to load mentors (${response.status}).`);
      return response.json();
    },
  });

  const currentUser = unwrapUser(currentUserResponse);
  const allUsers = useMemo(() => unwrapUsers(usersResponse), [usersResponse]);
  const currentUserId = normalizeId(currentUser?.id);
  const skillKey = skill.trim().toLocaleLowerCase();

  const availableMentors = useMemo(() => {
    const candidates = allUsers.filter((mentor) => {
      if (normalizeId(mentor.id) === currentUserId) return false;
      if (!skillKey) return true;
      return parseSkills(mentor).some((item) => item.toLocaleLowerCase() === skillKey);
    });

    return candidates.sort((a, b) => {
      const aRating = Number(a.averageRating) || 0;
      const bRating = Number(b.averageRating) || 0;
      return bRating - aRating;
    }).slice(0, 20);
  }, [allUsers, currentUserId, skillKey]);

  // Keep a URL-selected mentor only if the mentor is present in the fetched list and eligible.
  const selectedMentor = availableMentors.find(
    (mentor) => normalizeId(mentor.id) === selectedMentorId
  );

  useEffect(() => {
    if (initialMentorId && availableMentors.some((mentor) => normalizeId(mentor.id) === initialMentorId)) {
      setSelectedMentorId(initialMentorId);
    }
  }, [initialMentorId, availableMentors]);

  const selectedTypeObj = SESSION_TYPES.find((item) => item.id === selectedType) ?? SESSION_TYPES[2];
  const rawRate = Number(selectedMentor?.pricePerHour);
  const mentorRate = Number.isFinite(rawRate) && rawRate > 0 ? rawRate : 20;
  const sessionCredits = getCreditsForSession(selectedTypeObj.multiplier, mentorRate);
  const userCredits = Math.max(0, Number(currentUser?.credits) || 0);
  const hasEnoughCredits = userCredits >= sessionCredits;
  const selectedDateTime = getSelectedDateTime(date, time);
  const isDateTimeValid = Boolean(selectedDateTime && selectedDateTime.getTime() > Date.now());
  const isSelfBooking = Boolean(selectedMentor && currentUserId && normalizeId(selectedMentor.id) === currentUserId);
  const bookMut = useBookSession({
    ...options,
    mutation: {
      ...((options as any)?.mutation ?? {}),
      onSuccess: async (...args: any[]) => {
        await queryClient.invalidateQueries();
        try {
          confetti({ particleCount: 160, spread: 85, origin: { y: 0.62 } });
        } catch {
          // Booking is already successful; visual effects are optional.
        }
        toast({ title: "Booking request submitted", description: "Your mentor has been notified." });
        setBooked(true);
        setTimeout(() => setLocation("/sessions"), 2200);
      },
      onError: (error: unknown) => {
        toast({
          title: "Booking failed",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      },
    },
  });

  function handleBook() {
    if (!token || !currentUser) {
      toast({ title: "Sign in required", description: "Please sign in again before booking.", variant: "destructive" });
      setLocation("/login");
      return;
    }
    if (!selectedMentor) {
      toast({ title: "Select an eligible mentor", description: "Choose a mentor who teaches this skill.", variant: "destructive" });
      return;
    }
    if (isSelfBooking) {
      toast({ title: "Invalid mentor", description: "You cannot book a session with yourself.", variant: "destructive" });
      return;
    }
    if (!skill.trim()) {
      toast({ title: "Skill required", description: "Enter the skill you want to learn.", variant: "destructive" });
      return;
    }
    if (!selectedDateTime || selectedDateTime.getTime() <= Date.now()) {
      toast({ title: "Invalid schedule", description: "Choose a date and time in the future.", variant: "destructive" });
      return;
    }
    if (!hasEnoughCredits) {
      toast({ title: "Insufficient credits", description: `You need ${sessionCredits - userCredits} more credits.`, variant: "destructive" });
      return;
    }
    if (bookMut.isPending) return;

    bookMut.mutate({
      data: {
        mentorId: selectedMentor.id,
        skill: skill.trim(),
        sessionType: selectedType,
        scheduledDate: selectedDateTime.toISOString(),
        message: message.trim() || undefined,
      },
    } as any);
  }

  const today = getLocalToday();

  if (booked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center bg-white p-10 rounded-[3rem] shadow-2xl border border-indigo-50 max-w-md w-full relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-green-400/20 to-emerald-400/20 opacity-50 blur-3xl" />
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 relative z-10 shadow-inner">
            <CheckCircle size={48} className="text-green-500" />
          </div>
          <h2 className="text-3xl font-black mb-3 text-slate-800 relative z-10">Session Booked!</h2>
          <p className="text-slate-500 font-medium mb-8 relative z-10">Redirecting you to your sessions...</p>
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto relative z-10" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-30 animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-[120px] opacity-30 animate-pulse pointer-events-none" style={{ animationDelay: "2s" }} />

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
        {userLoading ? (
          <div className="rounded-2xl bg-white p-4 text-sm text-slate-600 shadow">Loading your account and wallet balance…</div>
        ) : userError || !currentUser ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div><p className="font-bold text-amber-800">Your account could not be verified.</p><p className="text-xs text-amber-700 mt-1">Sign in again or retry before booking.</p></div>
            <Button variant="outline" onClick={() => refetchUser()}><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button>
          </div>
        ) : null}
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
                  <span className="flex items-center gap-1 text-indigo-600 bg-indigo-100/50 px-2 py-1 rounded-md"><Zap size={14} /> ~{getCreditsForSession(type.multiplier, mentorRate)} cr</span>
                  <span className="flex items-center gap-1 text-slate-500"><Clock size={14} /> {type.duration}m</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-xl border border-white">
          <h2 className="text-sm font-black text-indigo-600 mb-5 uppercase tracking-widest flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow-md">2</span> Select Mentor
          </h2>
          {mentorsLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
          ) : mentorsError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
              <AlertTriangle className="mx-auto mb-2 text-red-500" />
              <p className="text-sm font-bold text-red-700">Could not load mentors.</p>
              <Button variant="outline" className="mt-3" onClick={() => refetchMentors()}><RefreshCw className="mr-2 h-4 w-4" /> Try again</Button>
            </div>
          ) : availableMentors.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-center">
              <Users className="mx-auto mb-2 text-slate-400" />
              <p className="font-bold text-slate-700">No matching mentors found</p>
              <p className="mt-1 text-xs text-slate-500">{skill.trim() ? `No mentor currently lists “${skill.trim()}”. Try the exact skill name shown on mentor profiles.` : "No mentors are available right now."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableMentors.map((mentor: any) => (
                <button
                  key={mentor.id}
                  onClick={() => setSelectedMentorId(normalizeId(mentor.id))}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-300 ${
                    selectedMentorId === normalizeId(mentor.id)
                      ? "border-indigo-500 bg-indigo-50/50 shadow-lg shadow-indigo-500/10 scale-[1.02]"
                      : "border-slate-100 bg-white hover:border-indigo-200"
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={mentor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name || "Mentor")}`}
                      alt={mentor.name || "Mentor"}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    {(mentor.isPremium || mentor.trustScore >= 50) && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                        <ShieldCheck size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black text-slate-800 truncate">{mentor.name || "SkillSwap Mentor"}</p>
                    <p className="text-xs text-slate-500 truncate mb-1 font-medium">
                      {parseSkills(mentor).slice(0, 3).join(", ") || "Mentor"}
                    </p>
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md">
                        <Star size={12} fill="currentColor" /> {Number(mentor.averageRating) > 0 ? Number(mentor.averageRating).toFixed(1) : "New"}
                      </span>
                      <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{Number(mentor.pricePerHour) > 0 ? Number(mentor.pricePerHour) : 20} cr/hr</span>
                    </div>
                  </div>
                  {selectedMentorId === normalizeId(mentor.id) && <CheckCircle size={24} className="text-indigo-600 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-xl border border-white">
          <h2 className="text-sm font-black text-indigo-600 mb-6 uppercase tracking-widest flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow-md">3</span> Schedule & Confirm
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-2 block tracking-wider">What do you want to learn? *</label>
                <input
                  value={skill}
                  onChange={e => setSkill(sanitizeSkill(e.target.value))}
                  maxLength={50}
                  placeholder="e.g. React hooks, Next.js routing..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold shadow-inner"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase mb-2 block tracking-wider">Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    min={today}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase mb-2 block tracking-wider">Time *</label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold shadow-inner"
                  />
                </div>
              </div>

              {date && time && !isDateTimeValid && (
                <div className="flex items-center gap-2 text-xs text-red-500 font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                  <AlertTriangle size={14} /> Please select a future date and time.
                </div>
              )}

              <div>
                <label className="text-xs font-black text-slate-400 uppercase mb-2 block tracking-wider">Message for Mentor</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value.slice(0, 500))}
                  rows={2}
                  placeholder="Any specific areas you want to focus on?"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-4 text-sm text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none font-bold shadow-inner"
                />
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
                    Your Wallet:{" "}
                    <span className={!hasEnoughCredits ? "text-red-500" : "text-emerald-500"}>
                      {userCredits} Credits
                    </span>
                  </p>
                )}

                {currentUser && !hasEnoughCredits && (
                  <div className="flex items-center gap-2 text-xs text-red-500 font-bold bg-red-50 px-3 py-2 rounded-xl border border-red-100 mb-3">
                    <AlertTriangle size={13} /> Need {Math.max(0, sessionCredits - userCredits)} more credits.{" "}
                    <button onClick={() => setLocation("/wallet")} className="underline ml-1">Top up ↗</button>
                  </div>
                )}

                <Button
                  onClick={handleBook}
                  disabled={
                    !token ||
                    userLoading ||
                    !currentUser ||
                    !selectedMentor ||
                    isSelfBooking ||
                    !skill.trim() ||
                    !isDateTimeValid ||
                    !hasEnoughCredits ||
                    bookMut.isPending
                  }
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