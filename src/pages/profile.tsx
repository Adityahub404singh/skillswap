import { useState, useEffect } from "react";
import { useGetMe } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useAuthStore } from "@/store/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Camera, CameraResultType } from "@capacitor/camera";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { User, Save, Plus, X, Award, Star, Trophy, CheckCircle, Flame, Copy, Check, Sparkles, Loader2, LogOut } from "lucide-react";

const ALL_SKILLS = ["Python","JavaScript","React","DSA","Web Dev","AI/ML","Design","English","Maths","Node.js","TypeScript","Java","C++","Chess","Music","Spanish","Photography","Marketing","Next.js","MongoDB","DevOps","Figma","Flutter","AWS"];

const BADGES = [
  { icon: "🏅", label: "First Session",  color: "bg-blue-50 border-blue-100 text-blue-600" },
  { icon: "🔥", label: "7-Day Streak",   color: "bg-orange-50 border-orange-100 text-orange-600" },
  { icon: "⭐", label: "30-Day Legend",  color: "bg-yellow-50 border-yellow-100 text-yellow-700" },
  { icon: "👑", label: "Top Mentor",     color: "bg-purple-50 border-purple-100 text-purple-600" },
  { icon: "✅", label: "Verified Expert", color: "bg-green-50 border-green-100 text-green-600" },
  { icon: "🌟", label: "Community Star",  color: "bg-cyan-50 border-cyan-100 text-cyan-600" },
];

export default function Profile() {
  const options = useApiOptions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { token, logout } = useAuthStore();
  const { data: user, isLoading } = useGetMe(options);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [pricePerHour, setPricePerHour] = useState(50);
  const [userLocation, setUserLocation] = useState("");

  const [skillsTeach, setSkillsTeach] = useState<string[]>([]);
  const [skillsLearn, setSkillsLearn] = useState<string[]>([]);
  const [newTeach, setNewTeach] = useState("");
  const [newLearn, setNewLearn] = useState("");
  const [activeTab, setActiveTab] = useState<"profile"|"badges"|"portfolio">("profile");
  const [copied, setCopied] = useState(false);

  const unlockedBadges: number[] = [];
  if (user && user.sessionsCompleted > 0) unlockedBadges.push(0);
  if (user && (user as any).currentStreak >= 7) unlockedBadges.push(1);
  if (user && (user as any).currentStreak >= 30) unlockedBadges.push(2);
  if (user && ((user as any).averageRating ?? 0) >= 4.8 && user.sessionsCompleted >= 10) unlockedBadges.push(3);
  if (user && user.trustScore >= 80) unlockedBadges.push(4);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio(user.bio || "");
      setAvatar(user.avatar || "");
      setLinkedinUrl((user as any).linkedinUrl || "");
      setPricePerHour((user as any).pricePerHour || 50);
      setUserLocation((user as any).location || "");
      const teach = (user as any).skillsTeach;
      const learn = (user as any).skillsLearn;
      setSkillsTeach(Array.isArray(teach) ? teach : []);
      setSkillsLearn(Array.isArray(learn) ? learn : []);
    }
  }, [user]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
          avatar: avatar.trim() || undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          location: userLocation.trim() || undefined,
          pricePerHour: Number(pricePerHour),
          skillsTeach,
          skillsLearn,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({ title: "Profile Updated! ✅", description: "Your changes have been saved." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e.message });
    }
    setSaving(false);
  };

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  // 🔥 FIX: Ab base64 ko seedha DB me save nahi karta — Cloudinary pe upload karke
  // real URL DB me save hota hai. (Base64-in-DB issue pehle bhi clean karna pada tha.)
  const handleCamera = async () => {
    if (!token) return;
    try {
      const image = await Camera.getPhoto({ quality: 80, allowEditing: true, resultType: CameraResultType.Base64 });
      if (!image.base64String) return;

      setUploadingAvatar(true);

      const byteChars = atob(image.base64String);
      const byteNumbers = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: `image/${image.format || "jpeg"}` });
      const file = new File([blob], `avatar.${image.format || "jpg"}`, { type: blob.type });

      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/upload/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setAvatar(data.avatar);
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({ title: "Photo updated! 📸" });
    } catch (e: any) {
      console.error("Camera error:", e);
      toast({ variant: "destructive", title: "Upload failed", description: e.message || "Try again." });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const addSkill = (skill: string, type: "teach" | "learn") => {
    if (type === "teach" && !skillsTeach.includes(skill)) setSkillsTeach(p => [...p, skill]);
    if (type === "learn" && !skillsLearn.includes(skill)) setSkillsLearn(p => [...p, skill]);
  };

  const copyPortfolio = () => {
    const text = `🌟 SkillSwap Portfolio — ${user?.name}\n⭐ Trust Score: ${user?.trustScore}/100\n📚 Skills I Teach: ${skillsTeach.join(", ") || "—"}\n🎯 Skills I Learn: ${skillsLearn.join(", ") || "—"}\n🏆 Badges: ${unlockedBadges.map(i => BADGES[i].label).join(", ") || "—"}\n🔗 https://skillswap-india.vercel.app`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Portfolio copied!", description: "Share it anywhere!" });
  };

  if (isLoading || !user) return (
    <div className="max-w-3xl mx-auto py-10 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white border border-gray-100 rounded-[24px] animate-pulse" />)}
    </div>
  );

  const tabs = [
    { id: "profile" as const, label: "Edit Profile", icon: User },
    { id: "badges"  as const, label: "Badges",       icon: Trophy },
    { id: "portfolio" as const, label: "Portfolio",  icon: Award },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6 pb-6">

      {/* Hero Header */}
      <div className="rounded-[24px] bg-gradient-to-br from-[#6C3BFF] to-[#8B5CF6] text-white p-6 shadow-md relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center gap-5 relative z-10">
          <div
            onClick={handleCamera}
            className="w-20 h-20 rounded-[20px] bg-white border-2 border-white/20 flex items-center justify-center text-3xl shadow-lg overflow-hidden flex-shrink-0 cursor-pointer active:scale-95 transition-transform relative"
          >
            {uploadingAvatar ? (
              <Loader2 className="w-8 h-8 text-[#6C3BFF] animate-spin" />
            ) : avatar ? (
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-[#6C3BFF]" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black">{user.name}</h1>
            <p className="text-white/80 text-sm mt-0.5 line-clamp-1">{user.bio || "No bio yet — add one below!"}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="flex items-center gap-1.5 bg-black/15 border border-white/10 rounded-full px-3 py-1 text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> Trust: {user.trustScore}
              </span>
              <span className="flex items-center gap-1.5 bg-black/15 border border-white/10 rounded-full px-3 py-1 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-white/90" /> {user.credits} cr
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex gap-2 p-1 bg-white border border-gray-100 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full text-xs font-bold transition-all ${
              activeTab === t.id ? "bg-[#6C3BFF] text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}>
            <t.icon className="w-4 h-4" /> <span className="hidden sm:block">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">

          {/* Basic info */}
          <div className="p-6 rounded-[24px] bg-white border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
            <h2 className="font-bold text-lg text-slate-800">Basic Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="rounded-xl bg-slate-50 border-slate-100" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</label>
                <Input value={userLocation} onChange={e => setUserLocation(e.target.value)} placeholder="City, Country" className="rounded-xl bg-slate-50 border-slate-100" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avatar URL</label>
                <Input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://..." className="rounded-xl bg-slate-50 border-slate-100" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">LinkedIn Profile</label>
                <Input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/username" className="rounded-xl bg-slate-50 border-slate-100" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bio</label>
              <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell learners about yourself..." rows={3} className="resize-none rounded-xl bg-slate-50 border-slate-100" />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Price per Session (credits)</label>
              <div className="flex items-center gap-3">
                <Input type="number" value={pricePerHour} onChange={e => setPricePerHour(Number(e.target.value))} className="w-32 rounded-xl bg-slate-50 border-slate-100" min={10} max={250} />
                <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${pricePerHour <= 40 ? "bg-green-50 text-green-600" : pricePerHour <= 100 ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                  {pricePerHour <= 40 ? "Basic" : pricePerHour <= 100 ? "Medium" : "Premium"}
                </span>
              </div>
            </div>
          </div>

          {/* Skills Teach */}
          <div className="p-6 rounded-[24px] bg-white border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
            <h2 className="font-bold text-lg text-slate-800">Skills I Teach</h2>
            <div className="flex flex-wrap gap-2">
              {skillsTeach.map(s => (
                <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-100 text-green-700 text-xs font-bold">
                  {s} <button onClick={() => setSkillsTeach(p => p.filter(x => x !== s))}><X className="w-3 h-3 hover:text-red-500" /></button>
                </span>
              ))}
              {skillsTeach.length === 0 && <p className="text-sm text-slate-400 italic">No skills added yet</p>}
            </div>
            <div className="flex gap-2">
              <Input value={newTeach} onChange={e => setNewTeach(e.target.value)} placeholder="Type a skill..." className="flex-1 rounded-xl bg-slate-50 border-slate-100"
                onKeyDown={e => { if (e.key === "Enter" && newTeach.trim()) { addSkill(newTeach.trim(), "teach"); setNewTeach(""); }}} />
              <Button onClick={() => { if (newTeach.trim()) { addSkill(newTeach.trim(), "teach"); setNewTeach(""); }}} className="rounded-xl bg-slate-900 text-white">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_SKILLS.filter(s => !skillsTeach.includes(s)).slice(0, 10).map(s => (
                <button key={s} onClick={() => addSkill(s, "teach")} className="px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-500 font-medium hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors">
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {/* Skills Learn */}
          <div className="p-6 rounded-[24px] bg-white border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
            <h2 className="font-bold text-lg text-slate-800">Skills I Want to Learn</h2>
            <div className="flex flex-wrap gap-2">
              {skillsLearn.map(s => (
                <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">
                  {s} <button onClick={() => setSkillsLearn(p => p.filter(x => x !== s))}><X className="w-3 h-3 hover:text-red-500" /></button>
                </span>
              ))}
              {skillsLearn.length === 0 && <p className="text-sm text-slate-400 italic">No skills added yet</p>}
            </div>
            <div className="flex gap-2">
              <Input value={newLearn} onChange={e => setNewLearn(e.target.value)} placeholder="Type a skill..." className="flex-1 rounded-xl bg-slate-50 border-slate-100"
                onKeyDown={e => { if (e.key === "Enter" && newLearn.trim()) { addSkill(newLearn.trim(), "learn"); setNewLearn(""); }}} />
              <Button onClick={() => { if (newLearn.trim()) { addSkill(newLearn.trim(), "learn"); setNewLearn(""); }}} className="rounded-xl bg-slate-900 text-white">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_SKILLS.filter(s => !skillsLearn.includes(s)).slice(0, 10).map(s => (
                <button key={s} onClick={() => addSkill(s, "learn")} className="px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-500 font-medium hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">
                  + {s}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 space-y-3">
            {/* Save Button */}
            <Button onClick={handleSave} disabled={saving} className="w-full rounded-full h-14 font-bold text-sm bg-[#6C3BFF] hover:bg-[#5b32d6] text-white shadow-lg shadow-indigo-200">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving changes...</> : <><Save className="w-4 h-4 mr-2" /> Save Profile</>}
            </Button>
            
            {/* Logout Button */}
            <Button onClick={handleLogout} variant="outline" className="w-full rounded-full h-14 font-bold text-sm text-red-500 border-red-100 hover:bg-red-50 hover:text-red-600">
              <LogOut className="w-4 h-4 mr-2" /> Log out securely
            </Button>
          </div>
        </motion.div>
      )}

      {/* Badges Tab */}
      {activeTab === "badges" && (
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="p-6 rounded-[24px] bg-white border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
          <div>
            <h2 className="font-bold text-xl text-slate-800">Your Achievements</h2>
            <p className="text-sm font-medium text-slate-500">{unlockedBadges.length} of {BADGES.length} badges earned</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {BADGES.map((badge, i) => {
              const unlocked = unlockedBadges.includes(i);
              return (
                <motion.div key={i} whileHover={{ scale: 1.02 }}
                  className={`p-5 rounded-[20px] border text-center transition-all ${unlocked ? badge.color : "bg-slate-50 border-slate-100 grayscale opacity-50"}`}>
                  <div className="text-4xl mb-3 drop-shadow-sm">{badge.icon}</div>
                  <div className="font-bold text-sm text-slate-800">{badge.label}</div>
                  {unlocked
                    ? <div className="mt-2 flex justify-center"><span className="text-[10px] px-2 py-0.5 rounded-full bg-white/50 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Earned</span></div>
                    : <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Locked</div>
                  }
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Portfolio Tab */}
      {activeTab === "portfolio" && (
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="p-6 rounded-[24px] bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-slate-800">Public Portfolio</h2>
              <Button size="sm" onClick={copyPortfolio} className="rounded-full gap-2 bg-white text-[#6C3BFF] border border-[#6C3BFF]/20 hover:bg-indigo-50 shadow-sm">
                {copied ? <><Check className="w-4 h-4 text-green-500" /> Copied!</> : <><Copy className="w-4 h-4" /> Share</>}
              </Button>
            </div>

            <div className="flex items-center gap-4 p-5 rounded-[20px] bg-white border border-indigo-50 shadow-sm">
              <div className="w-16 h-16 rounded-[16px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl overflow-hidden shadow-inner">
                {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <User className="w-8 h-8 text-[#6C3BFF]" />}
              </div>
              <div>
                <h3 className="font-black text-xl text-slate-800">{user.name}</h3>
                <p className="text-sm font-medium text-slate-500">{user.bio || "SkillSwap Member"}</p>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-[20px] shadow-sm border border-indigo-50 text-sm font-medium text-slate-600 text-center">
              Share your portfolio link to attract more learners and showcase your skills!
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
