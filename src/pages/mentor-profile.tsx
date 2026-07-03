import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetUserById, useGetMentorRatings, useGetMe } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Star, Award, ShieldCheck, CheckCircle2, MessageSquare, Edit, Coins, User,
  Flag, X, Loader2, BookOpen, Trophy, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const BADGES = [
  { icon: "🏅", label: "First Session",  color: "bg-blue-50 border-blue-100 text-blue-600" },
  { icon: "🔥", label: "7-Day Streak",   color: "bg-orange-50 border-orange-100 text-orange-600" },
  { icon: "⭐", label: "30-Day Legend",  color: "bg-yellow-50 border-yellow-100 text-yellow-700" },
  { icon: "👑", label: "Top Mentor",     color: "bg-purple-50 border-purple-100 text-purple-600" },
  { icon: "✅", label: "Verified Expert", color: "bg-green-50 border-green-100 text-green-600" },
  { icon: "🌟", label: "Community Star",  color: "bg-cyan-50 border-cyan-100 text-cyan-600" },
];

const REPORT_REASONS = [
  { value: "spam",          label: "Spam or scam" },
  { value: "abuse",         label: "Abusive behavior" },
  { value: "fake_profile",  label: "Fake profile" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other",         label: "Other" },
];

// ─── Report Modal ────────────────────────────────────────────────────────────
function ReportModal({ mentorId, mentorName, onClose }: { mentorId: number; mentorName: string; onClose: () => void }) {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason || !token) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/reports/${mentorId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason, message: message.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit report");
      toast({ title: "Report submitted", description: "Our team will review it shortly." });
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Couldn't submit report", description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" /> Report {mentorName}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 bg-slate-100 p-1.5 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {REPORT_REASONS.map(r => (
            <button
              key={r.value}
              onClick={() => setReason(r.value)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                reason === r.value
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Additional details (optional)"
          rows={3}
          maxLength={500}
          className="w-full rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm resize-none mb-4"
        />

        <Button
          onClick={handleSubmit}
          disabled={!reason || submitting}
          className="w-full rounded-full h-11 font-bold bg-red-500 hover:bg-red-600 text-white"
        >
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Submit Report"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

export default function MentorProfile() {
  const [, params] = useRoute("/mentor/:id");
  const mentorId = parseInt(params?.id || "0");
  const options = useApiOptions();
  const [activeTab, setActiveTab] = useState<"about" | "portfolio" | "reviews" | "badges">("about");
  const [showReport, setShowReport] = useState(false);

  const { data: mentor, isLoading } = useGetUserById(mentorId, {
    ...options,
    query: { queryKey: ["mentor", mentorId], enabled: !!mentorId }
  });

  const { data: currentUser } = useGetMe({
    ...options,
    query: { queryKey: ["me"], enabled: true }
  });

  const { data: ratings, isLoading: ratingsLoading } = useGetMentorRatings(mentorId, {
    ...options,
    query: { queryKey: ["ratings", mentorId], enabled: !!mentorId }
  });

  const isOwnProfile = currentUser?.id === mentorId;

  const unlockedBadges: number[] = [];
  if (mentor && mentor.sessionsCompleted > 0) unlockedBadges.push(0);
  if (mentor && (mentor as any).currentStreak >= 7) unlockedBadges.push(1);
  if (mentor && (mentor as any).currentStreak >= 30) unlockedBadges.push(2);
  if (mentor && ((mentor as any).averageRating ?? 0) >= 4.8 && mentor.sessionsCompleted >= 10) unlockedBadges.push(3);
  if (mentor && mentor.trustScore >= 80) unlockedBadges.push(4);

  if (isLoading) return (
    <div className="py-8 max-w-4xl mx-auto space-y-6 px-4">
      <Skeleton className="w-full h-48 rounded-[24px]" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="md:col-span-2 h-40 rounded-[24px]" />
        <Skeleton className="h-40 rounded-[24px]" />
      </div>
    </div>
  );

  if (!mentor) return (
    <div className="py-20 text-center flex flex-col items-center">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <User className="w-10 h-10 text-slate-300" />
      </div>
      <h2 className="text-xl font-black text-slate-800">Mentor not found</h2>
      <p className="text-sm text-slate-500 mt-1">The profile you're looking for doesn't exist.</p>
      <Link href="/explore">
        <Button className="mt-6 rounded-full bg-[#6C3BFF] text-white font-bold px-8">Back to Explore</Button>
      </Link>
    </div>
  );

  const tabs = [
    { id: "about" as const,     label: "About",     icon: Info },
    { id: "portfolio" as const, label: "Portfolio", icon: Award },
    { id: "reviews" as const,   label: "Reviews",   icon: MessageSquare },
    { id: "badges" as const,    label: "Badges",    icon: Trophy },
  ];

  return (
    <div className="py-6 px-4 sm:px-6 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-8">

      {/* 🌟 PREMIUM HERO CARD */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">

        {/* Cover Banner */}
        <div className="h-32 sm:h-48 bg-gradient-to-br from-[#6C3BFF] to-[#8B5CF6] relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>
          {/* 🔥 NEW: Report button — sirf dusre users ke liye dikhta hai */}
          {!isOwnProfile && currentUser && (
            <button
              onClick={() => setShowReport(true)}
              className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/25 hover:bg-black/40 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 transition-colors"
            >
              <Flag className="w-3.5 h-3.5" /> Report
            </button>
          )}
        </div>

        <div className="px-5 sm:px-8 pb-8 relative">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">

            <div className="-mt-12 sm:-mt-16 w-24 h-24 sm:w-32 sm:h-32 rounded-[24px] overflow-hidden border-4 border-white shadow-md bg-indigo-50 shrink-0 flex items-center justify-center relative z-10">
              {mentor.avatar && !mentor.avatar.includes('ui-avatars') ? (
                <img src={mentor.avatar} alt={mentor.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl sm:text-5xl font-black text-[#6C3BFF]">{mentor.name.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="flex-1 pt-2 sm:pt-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight tracking-tight">{mentor.name}</h1>
                    {mentor.trustScore > 80 && (
                      <span title="Verified Expert" className="flex items-center mt-1">
                        <ShieldCheck className="w-6 h-6 text-blue-500 fill-blue-50" />
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-md text-xs">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      {mentor.averageRating?.toFixed(1) || 'New'} ({ratings?.length || 0})
                    </span>
                    <span className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-md text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {mentor.sessionsCompleted} Sessions
                    </span>
                    <span className="flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-md text-xs">
                      <Award className="w-3.5 h-3.5" />
                      Trust {mentor.trustScore}
                    </span>
                    <span className="flex items-center gap-1 bg-purple-50 border border-purple-100 text-[#6C3BFF] font-black px-2.5 py-1 rounded-md text-xs">
                      <Coins className="w-3.5 h-3.5" />
                      {(mentor as any).pricePerHour || 50} cr / session
                    </span>
                  </div>
                </div>

                <div className="w-full sm:w-auto shrink-0 mt-1">
                  {isOwnProfile ? (
                    <Link href="/profile">
                      <Button className="w-full sm:w-auto rounded-full h-11 px-8 font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 shadow-sm border border-slate-200">
                        <Edit className="w-4 h-4 mr-2" /> Edit Profile
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/book/${mentor.id}`}>
                      <Button className="w-full sm:w-auto rounded-full bg-[#6C3BFF] hover:bg-[#5b32d6] text-white shadow-md h-11 px-8 font-bold text-sm">
                        Book Session
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 🔥 NEW: Tabs — About / Portfolio / Reviews / Badges */}
          <div className="flex gap-2 p-1 bg-slate-50 border border-gray-100 rounded-full shadow-sm mt-6">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full text-xs font-bold transition-all ${
                  activeTab === t.id ? "bg-[#6C3BFF] text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-white"
                }`}>
                <t.icon className="w-3.5 h-3.5" /> <span className="hidden sm:block">{t.label}</span>
              </button>
            ))}
          </div>

          {/* ── ABOUT TAB ── */}
          {activeTab === "about" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 mt-4">
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-slate-400" /> About Me
                </h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed whitespace-pre-line bg-slate-50 p-5 rounded-[20px] border border-gray-100">
                  {mentor.bio || "This user prefers to let their skills do the talking. No bio added yet!"}
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Expertise (Teaches)</h3>
                  <div className="flex flex-wrap gap-2">
                    {mentor.skillsTeach?.length > 0 ? mentor.skillsTeach.map((skill: string) => (
                      <span key={skill} className="px-3 py-1.5 bg-green-50 text-green-700 font-bold text-xs rounded-full border border-green-100">
                        {skill}
                      </span>
                    )) : (
                      <span className="text-xs text-slate-400 font-medium">No skills added</span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Learning Journey</h3>
                  <div className="flex flex-wrap gap-2">
                    {mentor.skillsLearn?.length > 0 ? mentor.skillsLearn.map((skill: string) => (
                      <span key={skill} className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-full border border-blue-100">
                        {skill}
                      </span>
                    )) : (
                      <span className="text-xs text-slate-400 font-medium">No skills added</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PORTFOLIO TAB ── */}
          {activeTab === "portfolio" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pt-6 mt-4 space-y-4">
              <div className="p-6 rounded-[20px] bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
                <div className="flex items-center gap-4 p-5 rounded-[16px] bg-white border border-indigo-50 shadow-sm mb-4">
                  <div className="w-14 h-14 rounded-[14px] bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                    {mentor.avatar && !mentor.avatar.includes('ui-avatars') ? (
                      <img src={mentor.avatar} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-xl font-black text-[#6C3BFF]">{mentor.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800">{mentor.name}</h3>
                    <p className="text-sm font-medium text-slate-500">SkillSwap Member · Trust {mentor.trustScore}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <BookOpen className="w-4 h-4 text-slate-400 mt-1" />
                  {mentor.skillsTeach?.length > 0 ? mentor.skillsTeach.map((s: string) => (
                    <span key={s} className="text-xs font-bold text-[#6C3BFF] bg-white px-2.5 py-1 rounded-lg border border-indigo-100">{s}</span>
                  )) : <span className="text-xs text-slate-400">No published skills yet</span>}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── REVIEWS TAB ── */}
          {activeTab === "reviews" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pt-6 mt-4">
              {ratingsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-[20px]" />)}
                </div>
              ) : ratings && ratings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ratings.map((rating: any) => (
                    <motion.div key={rating.id} whileHover={{ y: -2 }} className="bg-slate-50 p-5 rounded-[20px] border border-gray-100">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{rating.studentName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{format(new Date(rating.createdAt), 'MMM d, yyyy')}</p>
                        </div>
                        <div className="flex gap-0.5 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < rating.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">"{rating.review || "Great session, highly recommended!"}"</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center bg-slate-50/50 rounded-[20px] border border-dashed border-gray-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <Star className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-base font-bold text-slate-700">No reviews yet</p>
                  <p className="text-xs font-medium text-slate-500 mt-1">Be the first to review after completing a session.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── BADGES TAB ── */}
          {activeTab === "badges" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pt-6 mt-4">
              <p className="text-sm font-medium text-slate-500 mb-4">{unlockedBadges.length} of {BADGES.length} badges earned</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {BADGES.map((badge, i) => {
                  const unlocked = unlockedBadges.includes(i);
                  return (
                    <motion.div key={i} whileHover={{ scale: 1.02 }}
                      className={`p-5 rounded-[20px] border text-center transition-all ${unlocked ? badge.color : "bg-slate-50 border-slate-100 grayscale opacity-50"}`}>
                      <div className="text-4xl mb-3 drop-shadow-sm">{badge.icon}</div>
                      <div className="font-bold text-sm text-slate-800">{badge.label}</div>
                      {unlocked
                        ? <div className="mt-2 flex justify-center"><span className="text-[10px] px-2 py-0.5 rounded-full bg-white/50 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Earned</span></div>
                        : <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Locked</div>
                      }
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showReport && (
          <ReportModal mentorId={mentor.id} mentorName={mentor.name} onClose={() => setShowReport(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
