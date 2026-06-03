# SkillSwap Fix3 — Profile TS error + api schema fix
# cd C:\Users\alc\skillswap  then  .\fix3.ps1

# ---- 1. Profile.tsx — hourlyRate cast fix ----
$profile = @'
import { useState, useEffect } from "react";
import { useGetMe, useUpdateMe } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { User, Save, Plus, X, Award, Star, Trophy, CheckCircle, Flame, Copy, Check, Share2, Sparkles } from "lucide-react";

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
  const { data: user, isLoading } = useGetMe(options);
  const updateMut = useUpdateMe({
    ...options,
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
        toast({ title: "Profile Updated!", description: "Your profile has been saved successfully." });
      }
    }
  });

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [hourlyRate, setHourlyRate] = useState("10");
  const [offered, setOffered] = useState<string[]>([]);
  const [wanted, setWanted] = useState<string[]>([]);
  const [newOffered, setNewOffered] = useState("");
  const [newWanted, setNewWanted] = useState("");
  const [activeTab, setActiveTab] = useState<"profile"|"badges"|"portfolio">("profile");
  const [copied, setCopied] = useState(false);
  const [unlockedBadges] = useState([0, 1, 4]);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio((user as any).bio || "");
      setAvatar((user as any).avatar || "");
      // hourlyRate may not exist on type, cast safely
      setHourlyRate(String((user as any).hourlyRate ?? 10));
      setOffered((user as any).skillsOffered || []);
      setWanted((user as any).skillsWanted || []);
    }
  }, [user]);

  const handleSave = () => {
    updateMut.mutate({
      name,
      bio,
      avatar,
      hourlyRate: Number(hourlyRate),
    } as any);
  };

  const profileUrl = "https://skillswap-fawn-mu.vercel.app";

  const copyPortfolio = () => {
    const text = [
      "Skill<>Swap Portfolio — " + (user?.name ?? ""),
      "Trust Score: " + ((user as any)?.trustScore ?? 0) + "/100",
      "Skills I Teach: " + (offered.join(", ") || "—"),
      "Skills I Learn: " + (wanted.join(", ") || "—"),
      "Badges: " + unlockedBadges.map(i => BADGES[i].label).join(", "),
      profileUrl,
    ].join("\n");
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

  const u = user as any;
  const tabs = [
    { id: "profile",    label: "Edit Profile", icon: User },
    { id: "badges",     label: "Badges",       icon: Trophy },
    { id: "portfolio",  label: "Portfolio",    icon: Award },
  ] as const;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto py-6 px-4 space-y-6">

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700 text-white p-6 shadow-xl">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-3xl shadow-xl overflow-hidden flex-shrink-0">
            {u.avatar
              ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
              : <User className="w-10 h-10 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold truncate">{u.name}</h1>
            <p className="text-white/70 text-sm mt-1 line-clamp-2">{u.bio || "No bio yet — add one below!"}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 text-sm">
                <Star className="w-3.5 h-3.5 fill-yellow-300 text-yellow-300" /> Trust: {u.trustScore ?? 0}
              </span>
              <span className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 text-sm">
                <Sparkles className="w-3.5 h-3.5" /> {u.credits ?? 0} credits
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
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ── */}
      {activeTab === "profile" && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">

          <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
            <h2 className="font-bold text-lg">Basic Info</h2>
            <div className="space-y-1">
              <label className="text-sm font-medium">Full Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Avatar URL</label>
              <Input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://..." />
              {avatar && <img src={avatar} className="w-12 h-12 rounded-xl object-cover mt-1 border border-border" />}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Bio</label>
              <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell learners about yourself..." rows={3} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Credits per Hour</label>
              <Input type="number" min="1" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="10" />
              <p className="text-xs text-muted-foreground">How many credits you charge per teaching session</p>
            </div>
          </div>

          {/* Skills I Teach */}
          <div className="rounded-2xl border border-green-500/20 bg-card p-5 space-y-4">
            <h2 className="font-bold text-lg text-green-600 dark:text-green-400">Skills I Teach</h2>
            <div className="flex flex-wrap gap-2">
              {offered.map(s => (
                <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/25 text-sm font-medium">
                  {s}
                  <button onClick={() => setOffered(offered.filter(x => x !== s))} className="hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newOffered} onChange={e => setNewOffered(e.target.value)} placeholder="Add skill..." className="flex-1"
                onKeyDown={e => { if (e.key === "Enter" && newOffered.trim()) { setOffered([...offered, newOffered.trim()]); setNewOffered(""); } }} />
              <Button size="sm" onClick={() => { if (newOffered.trim()) { setOffered([...offered, newOffered.trim()]); setNewOffered(""); } }} className="rounded-full">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SKILLS.filter(s => !offered.includes(s)).slice(0, 12).map(s => (
                <button key={s} onClick={() => setOffered([...offered, s])}
                  className="px-2.5 py-1 rounded-full border border-border/60 text-xs text-muted-foreground hover:border-green-500/50 hover:text-green-600 hover:bg-green-500/5 transition-all">
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {/* Skills I Want */}
          <div className="rounded-2xl border border-blue-500/20 bg-card p-5 space-y-4">
            <h2 className="font-bold text-lg text-blue-600 dark:text-blue-400">Skills I Want to Learn</h2>
            <div className="flex flex-wrap gap-2">
              {wanted.map(s => (
                <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-sm font-medium">
                  {s}
                  <button onClick={() => setWanted(wanted.filter(x => x !== s))} className="hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newWanted} onChange={e => setNewWanted(e.target.value)} placeholder="Add skill..." className="flex-1"
                onKeyDown={e => { if (e.key === "Enter" && newWanted.trim()) { setWanted([...wanted, newWanted.trim()]); setNewWanted(""); } }} />
              <Button size="sm" onClick={() => { if (newWanted.trim()) { setWanted([...wanted, newWanted.trim()]); setNewWanted(""); } }} className="rounded-full">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SKILLS.filter(s => !wanted.includes(s)).slice(0, 12).map(s => (
                <button key={s} onClick={() => setWanted([...wanted, s])}
                  className="px-2.5 py-1 rounded-full border border-border/60 text-xs text-muted-foreground hover:border-blue-500/50 hover:text-blue-600 hover:bg-blue-500/5 transition-all">
                  + {s}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={updateMut.isPending} className="w-full rounded-full h-12 font-bold">
            {updateMut.isPending ? "Saving..." : <><Save className="w-4 h-4 mr-2" />Save Profile</>}
          </Button>
        </motion.div>
      )}

      {/* ── Badges Tab ── */}
      {activeTab === "badges" && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border border-border/50 bg-card p-5 space-y-6">
          <div>
            <h2 className="font-bold text-lg mb-1">Your Achievements</h2>
            <p className="text-sm text-muted-foreground">{unlockedBadges.length} of {BADGES.length} badges earned</p>
            {/* Progress bar */}
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-violet-600 transition-all duration-500"
                style={{ width: `${(unlockedBadges.length / BADGES.length) * 100}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {BADGES.map((badge, i) => {
              const unlocked = unlockedBadges.includes(i);
              return (
                <motion.div key={i} whileHover={{ scale: 1.05 }}
                  className={`p-4 rounded-2xl border text-center cursor-default transition-all ${
                    unlocked ? `bg-gradient-to-br ${badge.color}` : "bg-muted/20 border-border/30 opacity-40 grayscale"
                  }`}>
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <div className="font-bold text-sm">{badge.label}</div>
                  {unlocked
                    ? <div className="mt-2 flex justify-center"><span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" />Earned</span></div>
                    : <div className="text-xs text-muted-foreground mt-1">Keep going!</div>}
                </motion.div>
              );
            })}
          </div>
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-2">How to earn more badges:</p>
            <ul className="space-y-1.5">
              <li>• Complete a session to earn <span className="text-primary font-medium">First Session</span></li>
              <li>• Learn 7 days in a row for <span className="text-orange-500 font-medium">7-Day Streak</span></li>
              <li>• Learn 30 days in a row for <span className="text-yellow-500 font-medium">30-Day Legend</span></li>
              <li>• Pass skill test for <span className="text-green-500 font-medium">Verified Expert</span></li>
              <li>• Get 4.8+ rating for <span className="text-purple-500 font-medium">Top Mentor</span></li>
              <li>• Refer 5 friends for <span className="text-cyan-500 font-medium">Community Star</span></li>
            </ul>
          </div>
        </motion.div>
      )}

      {/* ── Portfolio Tab ── */}
      {activeTab === "portfolio" && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-violet-500/5 p-5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-xl">Auto-Generated Portfolio</h2>
              <Button size="sm" onClick={copyPortfolio} variant="outline" className="rounded-full gap-2">
                {copied ? <><Check className="w-4 h-4 text-green-500" />Copied!</> : <><Copy className="w-4 h-4" />Copy</>}
              </Button>
            </div>

            <div className="space-y-4">
              {/* Identity */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-background/60 border border-border/40">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-primary" />}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{u.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{u.bio || "SkillSwap Member"}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <span className="text-xs bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-full font-medium">Trust: {u.trustScore ?? 0}</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{u.credits ?? 0} credits</span>
                  </div>
                </div>
              </div>

              {/* Skills grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="text-xs text-muted-foreground mb-2 font-medium">Skills I Teach</div>
                  <div className="flex flex-wrap gap-1">
                    {offered.length
                      ? offered.map(s => <span key={s} className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">{s}</span>)
                      : <span className="text-xs text-muted-foreground">None added yet</span>}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="text-xs text-muted-foreground mb-2 font-medium">Skills I Learn</div>
                  <div className="flex flex-wrap gap-1">
                    {wanted.length
                      ? wanted.map(s => <span key={s} className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">{s}</span>)
                      : <span className="text-xs text-muted-foreground">None added yet</span>}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-muted/40">
                  <div className="text-xl font-extrabold text-primary">{u.trustScore ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Trust Score</div>
                </div>
                <div className="p-3 rounded-xl bg-muted/40">
                  <div className="text-xl font-extrabold text-yellow-500">{unlockedBadges.length}</div>
                  <div className="text-xs text-muted-foreground">Badges</div>
                </div>
                <div className="p-3 rounded-xl bg-muted/40">
                  <div className="text-xl font-extrabold text-green-500">{offered.length}</div>
                  <div className="text-xs text-muted-foreground">Skills Offered</div>
                </div>
              </div>

              {/* Badges strip */}
              {unlockedBadges.length > 0 && (
                <div className="p-3 rounded-xl bg-muted/40 flex flex-wrap gap-2">
                  {unlockedBadges.map(i => (
                    <span key={i} className="text-sm">{BADGES[i].icon} {BADGES[i].label}</span>
                  ))}
                </div>
              )}

              <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border/40">
                skillswap-fawn-mu.vercel.app — Exchange Skills, Not Money
              </div>
            </div>
          </div>

          <Button onClick={copyPortfolio} className="w-full rounded-full h-12 font-bold gap-2">
            <Share2 className="w-4 h-4" />
            {copied ? "Copied to Clipboard!" : "Share Portfolio"}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
'@
[System.IO.File]::WriteAllText("$pwd\src\pages\profile.tsx", $profile, [System.Text.Encoding]::UTF8)
Write-Host "profile.tsx DONE" -ForegroundColor Green

# ---- 2. Try to build now ----
Write-Host ""
Write-Host "Running build check..." -ForegroundColor Cyan
$buildOutput = npm run build 2>&1
$errors = $buildOutput | Select-String -Pattern "error TS"
if ($errors) {
  Write-Host "Remaining TS errors:" -ForegroundColor Red
  $errors | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
} else {
  Write-Host "Build PASSED - no TypeScript errors!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== fix3.ps1 complete ===" -ForegroundColor Cyan
