import { useState, useEffect, useMemo, useRef } from "react";
import { useGetMe, useGetMentorRatings } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useAuthStore } from "@/store/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Camera, CameraResultType } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { format } from "date-fns";
import {
  User, Save, Plus, X, Award, Star, Trophy, CheckCircle, Copy, Check, Sparkles,
  Loader2, LogOut, MessageSquare, MapPin, LocateFixed, Camera as CameraIcon,
  Share2, Flame, Lock, Linkedin, AlertTriangle, Undo2, Trash2,
} from "lucide-react";

/* ───────────────────────── constants ───────────────────────── */

const ALL_SKILLS = ["Python","JavaScript","React","DSA","Web Dev","AI/ML","Design","English","Maths","Node.js","TypeScript","Java","C++","Chess","Music","Spanish","Photography","Marketing","Next.js","MongoDB","DevOps","Figma","Flutter","AWS"];
const MAX_SKILLS = 12;
const MAX_BIO = 200;
const MIN_PRICE = 10;
const MAX_PRICE = 250;
const LINKEDIN_RE = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/.+/i;

type TabId = "profile" | "badges" | "portfolio" | "reviews";

const cardCls = "p-5 sm:p-6 rounded-[24px] bg-white border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]";
const labelCls = "text-xs font-bold text-slate-500 tracking-wide";
const inputCls = "rounded-xl bg-slate-50 border-slate-100 focus-visible:ring-[#6C3BFF]/30";

/* ───────────────────────── skill editor ───────────────────────── */

function SkillEditor({
  title, hint, skills, setSkills, tone, onToast,
}: {
  title: string;
  hint: string;
  skills: string[];
  setSkills: (fn: (p: string[]) => string[]) => void;
  tone: "green" | "blue";
  onToast: (msg: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const chip = tone === "green"
    ? "bg-green-50 border-green-100 text-green-700"
    : "bg-blue-50 border-blue-100 text-blue-700";
  const suggestHover = tone === "green"
    ? "hover:bg-green-50 hover:text-green-600 hover:border-green-200"
    : "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200";

  const add = (raw: string) => {
    const skill = raw.trim().replace(/\s+/g, " ").slice(0, 30);
    if (!skill) return;
    if (skills.some(s => s.toLowerCase() === skill.toLowerCase())) { setDraft(""); return; }
    if (skills.length >= MAX_SKILLS) { onToast(`You can add up to ${MAX_SKILLS} skills.`); return; }
    setSkills(p => [...p, skill]);
    setDraft("");
  };

  const suggestions = ALL_SKILLS
    .filter(s => !skills.some(x => x.toLowerCase() === s.toLowerCase()))
    .filter(s => !draft || s.toLowerCase().includes(draft.toLowerCase()))
    .slice(0, 10);

  return (
    <section className={`${cardCls} space-y-4`} aria-label={title}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-lg text-slate-800">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
        </div>
        <span className="text-xs font-bold text-slate-400 tabular-nums">{skills.length}/{MAX_SKILLS}</span>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[34px]">
        <AnimatePresence initial={false}>
          {skills.map(s => (
            <motion.span key={s} layout initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
              className={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full border text-xs font-bold ${chip}`}>
              {s}
              <button type="button" aria-label={`Remove ${s}`} onClick={() => setSkills(p => p.filter(x => x !== s))}
                className="rounded-full p-0.5 hover:bg-white/70 hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        {skills.length === 0 && <p className="text-sm text-slate-400">Add at least one skill so people can find you.</p>}
      </div>

      <div className="flex gap-2">
        <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Type a skill and press Enter"
          className={`flex-1 ${inputCls}`} maxLength={30}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(draft); } }} />
        <Button type="button" aria-label="Add skill" onClick={() => add(draft)} disabled={!draft.trim()} className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map(s => (
            <button key={s} type="button" onClick={() => add(s)}
              className={`px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-500 font-medium transition-colors ${suggestHover}`}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/* ───────────────────────── delete dialog ───────────────────────── */

function DeleteDialog({ open, busy, onCancel, onConfirm }: { open: boolean; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const [text, setText] = useState("");
  useEffect(() => { if (!open) setText(""); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => !busy && onCancel()}>
          <motion.div role="alertdialog" aria-modal="true" aria-labelledby="del-title"
            initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-[24px] p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 id="del-title" className="font-bold text-lg text-slate-800">Delete your account?</h3>
              <p className="text-sm text-slate-500 mt-1">Your profile, credits, badges and reviews will be removed for good. This can't be undone.</p>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Type DELETE to confirm</label>
              <Input value={text} onChange={e => setText(e.target.value)} placeholder="DELETE" className={inputCls} autoFocus />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={onCancel} disabled={busy} className="flex-1 rounded-full h-11 font-bold">Keep my account</Button>
              <Button onClick={onConfirm} disabled={busy || text.trim() !== "DELETE"} className="flex-1 rounded-full h-11 font-bold bg-red-500 hover:bg-red-600 text-white disabled:opacity-40">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-1.5" /> Delete</>}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────── main page ───────────────────────── */

export default function Profile() {
  const options = useApiOptions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { token, logout } = useAuthStore();
  const { data: user, isLoading } = useGetMe(options);
  const u = user as any;

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [locating, setLocating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [pricePerHour, setPricePerHour] = useState(50);
  const [userLocation, setUserLocation] = useState("");
  const [skillsTeach, setSkillsTeach] = useState<string[]>([]);
  const [skillsLearn, setSkillsLearn] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [copied, setCopied] = useState(false);

  const { data: myRatings, isLoading: ratingsLoading } = useGetMentorRatings(user?.id || 0, {
    ...options,
    query: { queryKey: ["ratings", user?.id], enabled: !!user?.id },
  });

  /* deep-link ?tab= */
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "profile" || t === "badges" || t === "portfolio" || t === "reviews") setActiveTab(t);
  }, []);

  const changeTab = (id: TabId) => {
    setActiveTab(id);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", id);
      window.history.replaceState(null, "", url.toString());
    } catch { /* ignore */ }
  };

  /* hydrate form from server */
  const serverSnapshot = useMemo(() => ({
    name: user?.name || "",
    bio: user?.bio || "",
    avatar: user?.avatar || "",
    linkedinUrl: u?.linkedinUrl || "",
    pricePerHour: Number(u?.pricePerHour) || 50,
    location: u?.location || "",
    teach: Array.isArray(u?.skillsTeach) ? (u.skillsTeach as string[]) : [],
    learn: Array.isArray(u?.skillsLearn) ? (u.skillsLearn as string[]) : [],
  }), [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setName(serverSnapshot.name);
    setBio(serverSnapshot.bio);
    setAvatar(serverSnapshot.avatar);
    setLinkedinUrl(serverSnapshot.linkedinUrl);
    setPricePerHour(serverSnapshot.pricePerHour);
    setUserLocation(serverSnapshot.location);
    setSkillsTeach(serverSnapshot.teach);
    setSkillsLearn(serverSnapshot.learn);
  };

  useEffect(() => { if (user) resetForm(); }, [serverSnapshot]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setAvatarBroken(false); }, [avatar]);

  const isDirty = useMemo(() => JSON.stringify({
    name, bio, avatar, linkedinUrl, pricePerHour, location: userLocation, teach: skillsTeach, learn: skillsLearn,
  }) !== JSON.stringify(serverSnapshot), [name, bio, avatar, linkedinUrl, pricePerHour, userLocation, skillsTeach, skillsLearn, serverSnapshot]);

  /* warn before leaving with unsaved changes */
  useEffect(() => {
    if (!isDirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [isDirty]);

  /* validation */
  const nameError = name.trim().length < 2 ? "Enter your name (at least 2 characters)." : "";
  const linkedinError = linkedinUrl.trim() && !LINKEDIN_RE.test(linkedinUrl.trim()) ? "Use a full link like https://linkedin.com/in/username" : "";
  const avatarError = avatar && !avatar.startsWith("https://") ? "Only https:// links are allowed." : "";
  const hasErrors = !!(nameError || linkedinError || avatarError);

  /* badges with progress */
  const sessions: number = u?.sessionsCompleted ?? 0;
  const streak: number = u?.currentStreak ?? 0;
  const avgRating: number = u?.averageRating ?? 0;
  const trust: number = u?.trustScore ?? 0;
  const reviewCount = Array.isArray(myRatings) ? myRatings.length : 0;

  const badges = [
    { icon: "🏅", label: "First Session",   hint: "Complete your first session",        color: "bg-blue-50 border-blue-100 text-blue-600",      progress: Math.min(sessions / 1, 1),  detail: `${Math.min(sessions, 1)}/1 sessions` },
    { icon: "🔥", label: "7-Day Streak",    hint: "Learn or teach 7 days in a row",     color: "bg-orange-50 border-orange-100 text-orange-600", progress: Math.min(streak / 7, 1),    detail: `${Math.min(streak, 7)}/7 days` },
    { icon: "⭐", label: "30-Day Legend",   hint: "Keep a 30-day streak",               color: "bg-yellow-50 border-yellow-100 text-yellow-700", progress: Math.min(streak / 30, 1),   detail: `${Math.min(streak, 30)}/30 days` },
    { icon: "👑", label: "Top Mentor",      hint: "4.8+ rating across 10+ sessions",    color: "bg-purple-50 border-purple-100 text-purple-600", progress: Math.min(sessions / 10, 1) * (avgRating >= 4.8 ? 1 : 0.9), detail: `${Math.min(sessions, 10)}/10 sessions · ${avgRating ? avgRating.toFixed(1) : "–"}★` },
    { icon: "✅", label: "Verified Expert", hint: "Reach a trust score of 80",          color: "bg-green-50 border-green-100 text-green-600",   progress: Math.min(trust / 80, 1),    detail: `${Math.min(trust, 80)}/80 trust` },
    { icon: "🌟", label: "Community Star",  hint: "Collect 5 reviews from learners",    color: "bg-cyan-50 border-cyan-100 text-cyan-600",      progress: Math.min(reviewCount / 5, 1), detail: `${Math.min(reviewCount, 5)}/5 reviews` },
  ].map((b, i) => {
    const unlocked =
      (i === 0 && sessions > 0) ||
      (i === 1 && streak >= 7) ||
      (i === 2 && streak >= 30) ||
      (i === 3 && avgRating >= 4.8 && sessions >= 10) ||
      (i === 4 && trust >= 80) ||
      (i === 5 && reviewCount >= 5);
    return { ...b, unlocked };
  });
  const unlockedBadges = badges.filter(b => b.unlocked);

  /* profile completeness */
  const checklist = [
    { done: !!avatar && !avatarBroken, label: "Add a profile photo" },
    { done: bio.trim().length >= 20, label: "Write a bio (20+ characters)" },
    { done: !!userLocation.trim(), label: "Add your location" },
    { done: LINKEDIN_RE.test(linkedinUrl.trim()), label: "Link your LinkedIn" },
    { done: skillsTeach.length > 0, label: "Add a skill you teach" },
    { done: skillsLearn.length > 0, label: "Add a skill you want to learn" },
  ];
  const completion = Math.round((checklist.filter(c => c.done).length / checklist.length) * 100);

  /* reviews summary */
  const ratingList: any[] = Array.isArray(myRatings) ? myRatings : [];
  const reviewAvg = ratingList.length ? ratingList.reduce((s, r) => s + (r.rating || 0), 0) / ratingList.length : 0;
  const dist = [5, 4, 3, 2, 1].map(n => ({ n, count: ratingList.filter(r => Math.round(r.rating) === n).length }));

  /* ── actions ── */

  const apiUrl = (path: string) => `${import.meta.env.VITE_API_URL || ""}${path}`;

  const handleSave = async () => {
    if (!token || saving) return;
    if (hasErrors) {
      toast({ variant: "destructive", title: "Fix the highlighted fields", description: nameError || linkedinError || avatarError });
      return;
    }
    const price = Math.min(MAX_PRICE, Math.max(MIN_PRICE, Number(pricePerHour) || MIN_PRICE));
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/users/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
          avatar: avatar.trim().startsWith("https://") ? avatar.trim() : undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          location: userLocation.trim() || undefined,
          pricePerHour: price,
          skillsTeach,
          skillsLearn,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setPricePerHour(price);
      await queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({ title: "Profile saved ✅", description: "Your changes are live." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Couldn't save profile", description: e.message || "Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => { logout(); setLocation("/login"); };

  const handleDeleteAccount = async () => {
    if (!token) return;
    setDeleting(true);
    try {
      const res = await fetch(apiUrl("/api/users/me"), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error || "Failed to delete account");
      }
      toast({ title: "Account deleted", description: "Your account has been removed." });
      logout();
      setLocation("/login");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Couldn't delete account", description: e.message });
      setDeleting(false);
    }
  };

  const uploadAvatarFile = async (file: File) => {
    if (!token) return;
    if (!file.type.startsWith("image/")) { toast({ variant: "destructive", title: "Choose an image file" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ variant: "destructive", title: "Image too large", description: "Pick a photo under 5 MB." }); return; }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch(apiUrl("/api/upload/avatar"), { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setAvatar(data.avatar);
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({ title: "Photo updated 📸" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Photo upload failed", description: e.message || "Try again." });
    } finally {
      setUploadingAvatar(false);
    }
  };

  /* native → camera sheet, web → file picker (Camera plugin needs PWA elements on web) */
  const handleAvatarClick = async () => {
    if (uploadingAvatar) return;
    if (!Capacitor.isNativePlatform()) { fileRef.current?.click(); return; }
    try {
      const image = await Camera.getPhoto({ quality: 80, allowEditing: true, resultType: CameraResultType.Base64 });
      if (!image.base64String) return;
      const bytes = Uint8Array.from(atob(image.base64String), c => c.charCodeAt(0));
      const type = `image/${image.format || "jpeg"}`;
      await uploadAvatarFile(new File([bytes], `avatar.${image.format || "jpg"}`, { type }));
    } catch (e: any) {
      if (!String(e?.message || "").toLowerCase().includes("cancel")) {
        toast({ variant: "destructive", title: "Couldn't open camera", description: "Allow camera/photo access in settings." });
      }
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Not supported", description: "This device can't detect location. Type it instead." });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { latitude, longitude } = coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&accept-language=en&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const a = data?.address || {};
          const city = a.city || a.town || a.village || a.county || a.state_district;
          const label = [city, a.country].filter(Boolean).join(", ");
          setUserLocation(label || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          toast({ title: "Location detected 📍" });
        } catch {
          toast({ variant: "destructive", title: "Couldn't find your city", description: "Please type it manually." });
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast({ variant: "destructive", title: "Location permission denied", description: "Allow location access, or type your city." });
      },
      { timeout: 8000 }
    );
  };

  const portfolioUrl = "https://skillswap-india.vercel.app";
  const portfolioText = () =>
    `🌟 SkillSwap Portfolio — ${user?.name}\n` +
    `⭐ Trust Score: ${user?.trustScore}/100\n` +
    `📚 I teach: ${skillsTeach.join(", ") || "—"}\n` +
    `🎯 I'm learning: ${skillsLearn.join(", ") || "—"}\n` +
    `🏆 Badges: ${unlockedBadges.map(b => b.label).join(", ") || "—"}\n` +
    `🔗 ${portfolioUrl}`;

  const sharePortfolio = async () => {
    const text = portfolioText();
    try {
      if (navigator.share) {
        await navigator.share({ title: `${user?.name} on SkillSwap`, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Portfolio copied", description: "Paste it anywhere to share." });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      toast({ variant: "destructive", title: "Couldn't share", description: "Copy failed — try again." });
    }
  };

  /* ── loading ── */
  if (isLoading || !user) return (
    <div className="max-w-3xl mx-auto py-6 space-y-4" aria-busy="true">
      <div className="h-44 bg-slate-100 rounded-[24px] animate-pulse" />
      <div className="h-14 bg-white border border-gray-100 rounded-full animate-pulse" />
      {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white border border-gray-100 rounded-[24px] animate-pulse" />)}
    </div>
  );

  const tabs = [
    { id: "profile" as const,   label: "Profile",   icon: User },
    { id: "badges" as const,    label: "Badges",    icon: Trophy },
    { id: "portfolio" as const, label: "Portfolio", icon: Award },
    { id: "reviews" as const,   label: "Reviews",   icon: MessageSquare },
  ];

  const initials = (user.name || "?").split(" ").filter(Boolean).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join("");
  const showAvatarImg = !!avatar && !avatarBroken;

  const stats = [
    { label: "Sessions", value: sessions, icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> },
    { label: "Day streak", value: streak, icon: <Flame className="w-4 h-4 text-orange-500" /> },
    { label: "Avg rating", value: avgRating ? avgRating.toFixed(1) : "–", icon: <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> },
    { label: "Reviews", value: reviewCount, icon: <MessageSquare className="w-4 h-4 text-indigo-500" /> },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-5 pb-8">

        {/* ───── Hero ───── */}
        <header className="rounded-[28px] bg-gradient-to-br from-[#5B2FF0] via-[#6C3BFF] to-[#8B5CF6] text-white p-5 sm:p-7 shadow-lg shadow-indigo-200/60 relative overflow-hidden">
          <div className="absolute -top-16 -right-10 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-48 h-48 bg-fuchsia-300/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center gap-4 sm:gap-6">
            <button type="button" onClick={handleAvatarClick} aria-label="Change profile photo"
              className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-[24px] bg-white ring-4 ring-white/25 shadow-xl overflow-hidden flex-shrink-0 flex items-center justify-center active:scale-95 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              {uploadingAvatar ? (
                <Loader2 className="w-8 h-8 text-[#6C3BFF] animate-spin" />
              ) : showAvatarImg ? (
                <img src={avatar} alt="" onError={() => setAvatarBroken(true)} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl sm:text-3xl font-black text-[#6C3BFF]">{initials || <User className="w-10 h-10" />}</span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1 flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <CameraIcon className="w-3.5 h-3.5" />
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatarFile(f); e.target.value = ""; }} />

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight truncate">{user.name}</h1>
              <p className="text-white/80 text-sm mt-1 line-clamp-2">{user.bio || "No bio yet — add one so learners know you."}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="flex items-center gap-1.5 bg-black/15 border border-white/10 rounded-full px-3 py-1 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> Trust {user.trustScore}
                </span>
                <span className="flex items-center gap-1.5 bg-black/15 border border-white/10 rounded-full px-3 py-1 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" /> {user.credits} credits
                </span>
                {serverSnapshot.location && (
                  <span className="flex items-center gap-1.5 bg-black/15 border border-white/10 rounded-full px-3 py-1 text-xs font-bold">
                    <MapPin className="w-3.5 h-3.5 text-rose-300" /> {serverSnapshot.location}
                  </span>
                )}
                <Link href="/leaderboard">
                  <span className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/40 rounded-full px-3 py-1 text-xs font-bold transition-colors cursor-pointer shadow-sm">
                    <Trophy className="w-3.5 h-3.5 text-yellow-300" /> Leaderboard
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* ───── Stats ───── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className="rounded-[20px] bg-white border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">{s.icon}{s.label}</div>
              <div className="text-2xl font-black text-slate-800 mt-1 tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>

        {/* ───── Tabs ───── */}
        <div role="tablist" aria-label="Profile sections" className="flex gap-1 p-1 bg-white border border-gray-100 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          {tabs.map(t => (
            <button key={t.id} role="tab" aria-selected={activeTab === t.id} onClick={() => changeTab(t.id)}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 rounded-full text-[11px] sm:text-xs font-bold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C3BFF] ${
                activeTab === t.id ? "bg-[#6C3BFF] text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}>
              <t.icon className="w-4 h-4" /> <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ═════════ PROFILE TAB ═════════ */}
        {activeTab === "profile" && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">

            {/* Completeness */}
            {completion < 100 && (
              <section className={`${cardCls} space-y-3`} aria-label="Profile completeness">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-800">Your profile is {completion}% complete</h2>
                  <span className="text-xs font-bold text-[#6C3BFF] tabular-nums">{checklist.filter(c => c.done).length}/{checklist.length}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-[#6C3BFF] to-[#A78BFA]" initial={{ width: 0 }} animate={{ width: `${completion}%` }} transition={{ duration: 0.6 }} />
                </div>
                <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
                  {checklist.filter(c => !c.done).map(c => (
                    <li key={c.label} className="text-sm text-slate-500 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6C3BFF]/50" /> {c.label}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Basic info */}
            <section className={`${cardCls} space-y-4`} aria-label="Basic info">
              <h2 className="font-bold text-lg text-slate-800">Basic info</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="p-name" className={labelCls}>Full name</label>
                  <Input id="p-name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={60}
                    aria-invalid={!!nameError} className={`${inputCls} ${nameError ? "border-red-300" : ""}`} />
                  {nameError && <p className="text-xs text-red-500">{nameError}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="p-loc" className={`${labelCls} flex items-center gap-1`}>Location</label>
                    <button type="button" onClick={handleDetectLocation} disabled={locating}
                      className="text-[11px] font-bold text-[#6C3BFF] hover:text-indigo-800 flex items-center gap-1 disabled:opacity-50">
                      {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />}
                      {locating ? "Detecting…" : "Use my location"}
                    </button>
                  </div>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input id="p-loc" value={userLocation} onChange={e => setUserLocation(e.target.value)} placeholder="City, Country" maxLength={80} className={`${inputCls} pl-9`} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="p-av" className={labelCls}>Photo link (optional)</label>
                  <Input id="p-av" value={avatar}
                    onChange={e => { const v = e.target.value; if (v.startsWith("data:") || v.length > 500) return; setAvatar(v); }}
                    placeholder="https://example.com/photo.jpg" className={`${inputCls} ${avatarError ? "border-red-300" : ""}`} />
                  {avatarError
                    ? <p className="text-xs text-red-500">{avatarError}</p>
                    : <p className="text-xs text-slate-400">Or tap your photo above to upload one.</p>}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="p-li" className={`${labelCls} flex items-center gap-1`}><Linkedin className="w-3 h-3" /> LinkedIn</label>
                  <Input id="p-li" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/username"
                    aria-invalid={!!linkedinError} className={`${inputCls} ${linkedinError ? "border-red-300" : ""}`} />
                  {linkedinError && <p className="text-xs text-red-500">{linkedinError}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="p-bio" className={labelCls}>Bio</label>
                  <span className={`text-[11px] tabular-nums ${bio.length > MAX_BIO - 20 ? "text-amber-600" : "text-slate-400"}`}>{bio.length}/{MAX_BIO}</span>
                </div>
                <Textarea id="p-bio" value={bio} onChange={e => setBio(e.target.value.slice(0, MAX_BIO))} rows={3}
                  placeholder="What do you teach, and what makes your sessions useful?" className={`resize-none ${inputCls}`} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="p-price" className={labelCls}>Price per session (credits)</label>
                <div className="flex items-center gap-3">
                  <Input id="p-price" type="number" inputMode="numeric" value={pricePerHour}
                    onChange={e => setPricePerHour(Number(e.target.value))}
                    onBlur={() => setPricePerHour(p => Math.min(MAX_PRICE, Math.max(MIN_PRICE, Number(p) || MIN_PRICE)))}
                    className={`w-28 ${inputCls}`} min={MIN_PRICE} max={MAX_PRICE} />
                  <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${pricePerHour <= 40 ? "bg-green-50 text-green-600" : pricePerHour <= 100 ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                    {pricePerHour <= 40 ? "Basic" : pricePerHour <= 100 ? "Medium" : "Premium"}
                  </span>
                  <span className="text-xs text-slate-400">{MIN_PRICE}–{MAX_PRICE}</span>
                </div>
              </div>
            </section>

            <SkillEditor title="Skills I teach" hint="Learners find you through these." skills={skillsTeach} setSkills={setSkillsTeach} tone="green"
              onToast={m => toast({ variant: "destructive", title: "Skill limit reached", description: m })} />
            <SkillEditor title="Skills I want to learn" hint="We use these to match you with mentors." skills={skillsLearn} setSkills={setSkillsLearn} tone="blue"
              onToast={m => toast({ variant: "destructive", title: "Skill limit reached", description: m })} />

            {/* Sticky save bar */}
            <div className="sticky bottom-4 z-30">
              <AnimatePresence>
                {isDirty && (
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                    className="flex items-center gap-2 p-2 pl-4 rounded-full bg-slate-900 text-white shadow-2xl">
                    <span className="text-xs font-semibold flex-1">You have unsaved changes</span>
                    <Button type="button" variant="ghost" onClick={resetForm} disabled={saving}
                      className="rounded-full h-10 px-3 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10">
                      <Undo2 className="w-3.5 h-3.5 mr-1.5" /> Discard
                    </Button>
                    <Button type="button" onClick={handleSave} disabled={saving}
                      className="rounded-full h-10 px-5 text-xs font-bold bg-[#6C3BFF] hover:bg-[#5b32d6] text-white">
                      {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</> : <><Save className="w-4 h-4 mr-1.5" /> Save changes</>}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Account */}
            <section className={`${cardCls} space-y-3`} aria-label="Account">
              <h2 className="font-bold text-lg text-slate-800">Account</h2>
              <Button onClick={handleLogout} variant="outline" className="w-full rounded-full h-12 font-bold text-sm text-slate-700 hover:bg-slate-50">
                <LogOut className="w-4 h-4 mr-2" /> Log out
              </Button>
              <button type="button" onClick={() => setDeleteOpen(true)} className="w-full text-xs text-slate-400 hover:text-red-500 transition-colors py-2 underline underline-offset-2">
                Delete my account
              </button>
            </section>
          </motion.div>
        )}

        {/* ═════════ BADGES TAB ═════════ */}
        {activeTab === "badges" && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className={`${cardCls} space-y-6`}>
            <div>
              <h2 className="font-bold text-xl text-slate-800">Your achievements</h2>
              <p className="text-sm font-medium text-slate-500">{unlockedBadges.length} of {badges.length} badges earned</p>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-3">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-[#6C3BFF] to-[#A78BFA]" initial={{ width: 0 }} animate={{ width: `${(unlockedBadges.length / badges.length) * 100}%` }} transition={{ duration: 0.6 }} />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {badges.map(b => (
                <motion.div key={b.label} whileHover={{ y: -2 }}
                  className={`p-4 sm:p-5 rounded-[20px] border text-center transition-colors ${b.unlocked ? b.color : "bg-slate-50 border-slate-100"}`}>
                  <div className={`text-4xl mb-2 ${b.unlocked ? "" : "grayscale opacity-40"}`}>{b.icon}</div>
                  <div className="font-bold text-sm text-slate-800">{b.label}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{b.hint}</p>
                  {b.unlocked ? (
                    <span className="mt-2 inline-flex text-[10px] px-2 py-0.5 rounded-full bg-white/70 font-bold items-center gap-1"><CheckCircle className="w-3 h-3" /> Earned</span>
                  ) : (
                    <div className="mt-3">
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full bg-[#6C3BFF]/60" style={{ width: `${Math.round(b.progress * 100)}%` }} />
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-1.5 flex items-center justify-center gap-1"><Lock className="w-2.5 h-2.5" /> {b.detail}</div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═════════ PORTFOLIO TAB ═════════ */}
        {activeTab === "portfolio" && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="p-5 sm:p-6 rounded-[24px] bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-lg text-slate-800">Public portfolio</h2>
                <p className="text-xs text-slate-500">This is what people see when you share.</p>
              </div>
              <Button size="sm" onClick={sharePortfolio} className="rounded-full gap-2 bg-[#6C3BFF] hover:bg-[#5b32d6] text-white shadow-md">
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Share2 className="w-4 h-4" /> Share</>}
              </Button>
            </div>

            <div className="p-5 rounded-[20px] bg-white border border-indigo-50 shadow-sm space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[18px] bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {showAvatarImg ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-xl font-black text-[#6C3BFF]">{initials}</span>}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-xl text-slate-800 truncate">{user.name}</h3>
                  {userLocation && <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {userLocation}</p>}
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{user.bio || "SkillSwap member"}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[{ l: "Trust", v: `${user.trustScore}/100` }, { l: "Sessions", v: sessions }, { l: "Rating", v: avgRating ? avgRating.toFixed(1) : "–" }].map(x => (
                  <div key={x.l} className="rounded-2xl bg-slate-50 py-2.5">
                    <div className="font-black text-slate-800 tabular-nums">{x.v}</div>
                    <div className="text-[11px] font-semibold text-slate-500">{x.l}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div>
                  <p className={`${labelCls} mb-1.5`}>Teaches</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skillsTeach.length ? skillsTeach.map(s => <span key={s} className="px-2.5 py-1 rounded-full bg-green-50 border border-green-100 text-green-700 text-xs font-bold">{s}</span>)
                      : <span className="text-sm text-slate-400">Add skills in the Profile tab.</span>}
                  </div>
                </div>
                <div>
                  <p className={`${labelCls} mb-1.5`}>Learning</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skillsLearn.length ? skillsLearn.map(s => <span key={s} className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">{s}</span>)
                      : <span className="text-sm text-slate-400">Nothing yet.</span>}
                  </div>
                </div>
                {unlockedBadges.length > 0 && (
                  <div>
                    <p className={`${labelCls} mb-1.5`}>Badges</p>
                    <div className="flex flex-wrap gap-1.5">
                      {unlockedBadges.map(b => <span key={b.label} className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700">{b.icon} {b.label}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═════════ REVIEWS TAB ═════════ */}
        {activeTab === "reviews" && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className={`${cardCls} space-y-6`}>
            <div>
              <h2 className="font-bold text-xl text-slate-800">Your reviews</h2>
              <p className="text-sm font-medium text-slate-500">What learners say about your sessions</p>
            </div>

            {ratingsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map(i => <div key={i} className="h-28 bg-slate-50 rounded-[20px] animate-pulse" />)}
              </div>
            ) : ratingList.length > 0 ? (
              <>
                <div className="flex flex-col sm:flex-row gap-5 sm:items-center p-5 rounded-[20px] bg-slate-50 border border-gray-100">
                  <div className="text-center sm:pr-5 sm:border-r border-gray-200">
                    <div className="text-4xl font-black text-slate-800 tabular-nums">{reviewAvg.toFixed(1)}</div>
                    <div className="flex justify-center gap-0.5 my-1">
                      {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.round(reviewAvg) ? "fill-amber-500 text-amber-500" : "text-slate-200"}`} />)}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">{ratingList.length} review{ratingList.length === 1 ? "" : "s"}</div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {dist.map(d => (
                      <div key={d.n} className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="w-3 font-bold tabular-nums">{d.n}</span>
                        <div className="flex-1 h-2 rounded-full bg-white overflow-hidden border border-gray-100">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(d.count / ratingList.length) * 100}%` }} />
                        </div>
                        <span className="w-5 text-right tabular-nums">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ratingList.map((r: any) => (
                    <article key={r.id} className="bg-slate-50 p-5 rounded-[20px] border border-gray-100">
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{r.studentName || "A learner"}</p>
                          <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : ""}</p>
                        </div>
                        <div className="flex gap-0.5 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm flex-shrink-0" aria-label={`${r.rating} out of 5 stars`}>
                          {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-amber-500 text-amber-500" : "text-slate-200"}`} />)}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">
                        {r.review ? `“${r.review}”` : <span className="text-slate-400 italic">Rated without a written review.</span>}
                      </p>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-10 px-4 text-center bg-slate-50/60 rounded-[20px] border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <Star className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-base font-bold text-slate-700">No reviews yet</p>
                <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">Finish a session and ask your learner for a rating. Reviews help new learners trust you.</p>
              </div>
            )}
          </motion.div>
        )}

        <DeleteDialog open={deleteOpen} busy={deleting} onCancel={() => setDeleteOpen(false)} onConfirm={handleDeleteAccount} />
      </motion.div>
    </MotionConfig>
  );
}
