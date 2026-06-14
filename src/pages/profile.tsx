import { useState, useEffect } from "react";
import { useGetMe } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useAuthStore } from "@/store/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { User, Save, Plus, X, Award, Star, Trophy, CheckCircle, Flame, Copy, Check, Share2, Sparkles, Loader2 } from "lucide-react";

const ALL_SKILLS = ["Python","JavaScript","React","DSA","Web Dev","AI/ML","Design","English","Maths","Node.js","TypeScript","Java","C++","Chess","Music","Spanish","Photography","Marketing","Next.js","MongoDB","DevOps","Figma","Flutter","AWS"];

const BADGES = [
  { icon: "🎯", label: "First Session",   color: "from-blue-500/20 to-blue-600/10 border-blue-500/30" },
  { icon: "🔥", label: "7-Day Streak",    color: "from-orange-500/20 to-orange-600/10 border-orange-500/30" },
  { icon: "⚡", label: "30-Day Legend",   color: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30" },
  { icon: "🏆", label: "Top Mentor",      color: "from-purple-500/20 to-purple-600/10 border-purple-500/30" },
  { icon: "✅", label: "Verified Expert", color: "from-green-500/20 to-green-600/10 border-green-500/30" },
  { icon: "👥", label: "Community Star",  color: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30" },
];

export default function Profile() {
  const options = useApiOptions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const token = useAuthStore(s => s.token);
  const { data: user, isLoading } = useGetMe(options);

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState(""); // 🔥 Naya state
  const [pricePerHour, setPricePerHour] = useState(50);
  const [location, setLocation] = useState("");
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
      setLinkedinUrl((user as any).linkedinUrl || ""); // 🔥 Load existing URL
      setPricePerHour((user as any).pricePerHour || 50);
      setLocation((user as any).location || "");
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
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name:         name.trim(),
          bio:          bio.trim(),
          avatar:       avatar.trim() || undefined,
          linkedinUrl:  linkedinUrl.trim() || undefined, // 🔥 Send to backend
          location:     location.trim() || undefined,
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

  const addSkill = (skill: string, type: "teach" | "learn") => {
    if (type === "teach" && !skillsTeach.includes(skill)) setSkillsTeach(p => [...p, skill]);
    if (type === "learn" && !skillsLearn.includes(skill)) setSkillsLearn(p => [...p, skill]);
  };

  const copyPortfolio = () => {
    const text = `🎓 SkillSwap Portfolio — ${user?.name}\n⭐ Trust Score: ${user?.trustScore}/100\n💡 Skills I Teach: ${skillsTeach.join(", ") || "—"}\n📚 Skills I Learn: ${skillsLearn.join(", ") || "—"}\n🏅 Badges: ${unlockedBadges.map(i => BADGES[i].label).join(", ") || "—"}\n🔗 https://skillswap-fawn-mu.vercel.app`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Portfolio copied!", description: "Share it anywhere!" });
  };

  if (isLoading || !user) return (
    <div className="max-w-3xl mx-auto py-10 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
    </div>
  );

  const tabs = [
    { id: "profile" as const, label: "Edit Profile", icon: User },
    { id: "badges"  as const, label: "Badges",       icon: Trophy },
    { id: "portfolio" as const, label: "Portfolio",  icon: Award },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto py-6 space-y-6">

      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700 text-white p-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-3xl shadow-xl overflow-hidden flex-shrink-0">
            {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-white" />}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold">{user.name}</h1>
            <p className="text-white/70 text-sm mt-1">{user.bio || "No bio yet — add one below!"}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 text-sm">
                <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" /> Trust: {user.trustScore}
              </span>
              <span className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 text-sm">
                <Sparkles className="w-3.5 h-3.5" /> {user.credits} credits
              </span>
              <span className="flex items-center gap-1.5 bg-orange-500/40 rounded-full px-3 py-1 text-sm">
                <Flame className="w-3.5 h-3.5" /> {unlockedBadges.length} badges
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-2xl">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
              activeTab === t.id ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === "profile" && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">

          {/* Basic info */}
          <div className="p-6 rounded-2xl bg-background border border-border space-y-4">
            <h2 className="font-bold text-lg">Basic Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Full Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Location</label>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Avatar URL</label>
                <Input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://..." />
              </div>
              {/* 🔥 Naya LinkedIn Input Field */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">LinkedIn Profile</label>
                <Input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/username" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bio</label>
              <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell learners about yourself..." rows={3} className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Price per Session (credits)</label>
              <div className="flex items-center gap-3">
                <Input type="number" value={pricePerHour} onChange={e => setPricePerHour(Number(e.target.value))} className="w-32" min={10} max={250} />
                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${pricePerHour <= 40 ? "bg-green-500/10 text-green-600" : pricePerHour <= 100 ? "bg-blue-500/10 text-blue-600" : "bg-purple-500/10 text-purple-600"}`}>
                  {pricePerHour <= 40 ? "Basic" : pricePerHour <= 100 ? "Medium" : "Advanced"}
                </span>
              </div>
            </div>
          </div>

          {/* Skills Teach */}
          <div className="p-6 rounded-2xl bg-background border border-border space-y-4">
            <h2 className="font-bold text-lg text-green-600">Skills I Teach</h2>
            <div className="flex flex-wrap gap-2">
              {skillsTeach.map(s => (
                <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-sm font-medium">
                  {s}
                  <button onClick={() => setSkillsTeach(p => p.filter(x => x !== s))}><X className="w-3 h-3 hover:text-red-500" /></button>
                </span>
              ))}
              {skillsTeach.length === 0 && <p className="text-sm text-muted-foreground italic">No skills added yet</p>}
            </div>
            <div className="flex gap-2">
              <Input value={newTeach} onChange={e => setNewTeach(e.target.value)} placeholder="Type a skill..." className="flex-1"
                onKeyDown={e => { if (e.key === "Enter" && newTeach.trim()) { addSkill(newTeach.trim(), "teach"); setNewTeach(""); }}} />
              <Button size="sm" onClick={() => { if (newTeach.trim()) { addSkill(newTeach.trim(), "teach"); setNewTeach(""); }}} className="rounded-xl">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SKILLS.filter(s => !skillsTeach.includes(s)).map(s => (
                <button key={s} onClick={() => addSkill(s, "teach")}
                  className="px-2.5 py-1 rounded-full border text-xs text-muted-foreground hover:border-green-500/50 hover:text-green-600 hover:bg-green-500/5 transition-all">
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {/* Skills Learn */}
          <div className="p-6 rounded-2xl bg-background border border-border space-y-4">
            <h2 className="font-bold text-lg text-blue-600">Skills I Want to Learn</h2>
            <div className="flex flex-wrap gap-2">
              {skillsLearn.map(s => (
                <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-sm font-medium">
                  {s}
                  <button onClick={() => setSkillsLearn(p => p.filter(x => x !== s))}><X className="w-3 h-3 hover:text-red-500" /></button>
                </span>
              ))}
              {skillsLearn.length === 0 && <p className="text-sm text-muted-foreground italic">No skills added yet</p>}
            </div>
            <div className="flex gap-2">
              <Input value={newLearn} onChange={e => setNewLearn(e.target.value)} placeholder="Type a skill..." className="flex-1"
                onKeyDown={e => { if (e.key === "Enter" && newLearn.trim()) { addSkill(newLearn.trim(), "learn"); setNewLearn(""); }}} />
              <Button size="sm" onClick={() => { if (newLearn.trim()) { addSkill(newLearn.trim(), "learn"); setNewLearn(""); }}} className="rounded-xl">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SKILLS.filter(s => !skillsLearn.includes(s)).map(s => (
                <button key={s} onClick={() => addSkill(s, "learn")}
                  className="px-2.5 py-1 rounded-full border text-xs text-muted-foreground hover:border-blue-500/50 hover:text-blue-600 hover:bg-blue-500/5 transition-all">
                  + {s}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full rounded-full h-12 font-bold">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Profile</>}
          </Button>
        </motion.div>
      )}

      {/* Badges tab */}
      {activeTab === "badges" && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 rounded-2xl bg-background border border-border space-y-6">
          <div>
            <h2 className="font-bold text-lg mb-1">Your Achievements</h2>
            <p className="text-sm text-muted-foreground">{unlockedBadges.length} of {BADGES.length} badges earned</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {BADGES.map((badge, i) => {
              const unlocked = unlockedBadges.includes(i);
              return (
                <motion.div key={i} whileHover={{ scale: 1.04 }}
                  className={`p-4 rounded-2xl border text-center transition-all ${unlocked ? `bg-gradient-to-br ${badge.color}` : "bg-muted/20 border-border/30 opacity-40 grayscale"}`}>
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <div className="font-bold text-sm">{badge.label}</div>
                  {unlocked
                    ? <div className="mt-2 flex justify-center"><span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Earned</span></div>
                    : <div className="text-xs text-muted-foreground mt-1">Keep going!</div>
                  }
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Portfolio tab (kept exactly the same for brevity) */}
      {activeTab === "portfolio" && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
          <div className="p-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xl">Auto-Generated Portfolio</h2>
              <Button size="sm" onClick={copyPortfolio} variant="outline" className="rounded-full gap-2">
                {copied ? <><Check className="w-4 h-4 text-green-500" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
              </Button>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-background/60">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl overflow-hidden">
                {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover rounded-2xl" alt="" /> : "👤"}
              </div>
              <div>
                <h3 className="font-bold text-lg">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.bio || "SkillSwap Member"}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}