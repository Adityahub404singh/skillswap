import { useState } from "react";
import { useGetMe, useUpdateMe } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, Save, Plus, X, DollarSign } from "lucide-react";

const ALL_SKILLS = ["Python", "JavaScript", "React", "DSA", "Web Dev", "AI/ML", "Design", "English", "Maths", "Coding", "Node.js", "TypeScript", "Java", "C++", "Chess", "Music", "Spanish", "Photography", "Marketing"];

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
        toast({ title: "Profile Updated! ✅" });
      }
    }
  });

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [pricePerHour, setPricePerHour] = useState(50);
  const [skillsTeach, setSkillsTeach] = useState<string[]>([]);
  const [skillsLearn, setSkillsLearn] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (user && !initialized) {
    setName(user.name || "");
    setBio((user as any).bio || "");
    setAvatar((user as any).avatar || "");
    setPricePerHour((user as any).pricePerHour || 50);
    setSkillsTeach((user as any).skillsTeach || []);
    setSkillsLearn((user as any).skillsLearn || []);
    setInitialized(true);
  }

  const toggleSkill = (skill: string, type: "teach" | "learn") => {
    if (type === "teach") {
      setSkillsTeach(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
    } else {
      setSkillsLearn(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
    }
  };

  const handleSave = () => {
    updateMut.mutate({ data: { name, bio, avatar, skillsTeach, skillsLearn, pricePerHour } as any });
  };

  if (isLoading) return <div className="py-12 text-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="py-6 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold">Edit Profile</h1>
          <p className="text-muted-foreground">Update your info, skills and pricing</p>
        </div>
      </div>

      <div className="card-premium space-y-6 p-6">
        <h2 className="font-bold text-lg">Basic Info</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Bio</label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell students about yourself..." className="resize-none h-24" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Avatar URL</label>
            <Input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://..." />
          </div>
        </div>
      </div>

      <div className="card-premium space-y-4 p-6">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" /> Session Price
        </h2>
        <p className="text-sm text-muted-foreground">Set your price per session (credits). Students will see this when booking.</p>
        <div className="flex items-center gap-4">
          <Input type="number" min={10} max={250} value={pricePerHour} onChange={e => setPricePerHour(parseInt(e.target.value))} className="w-32" />
          <span className="text-sm text-muted-foreground">credits per session</span>
          <span className={`px-2 py-1 text-xs font-bold rounded-md ${pricePerHour <= 40 ? 'bg-green-500/10 text-green-600' : pricePerHour <= 100 ? 'bg-blue-500/10 text-blue-600' : 'bg-purple-500/10 text-purple-600'}`}>
            {pricePerHour <= 40 ? 'Basic' : pricePerHour <= 100 ? 'Medium' : 'Advanced'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="bg-green-500/5 p-2 rounded-lg">Basic: 10-40 cr</div>
          <div className="bg-blue-500/5 p-2 rounded-lg">Medium: 40-100 cr</div>
          <div className="bg-purple-500/5 p-2 rounded-lg">Advanced: 100-250 cr</div>
        </div>
      </div>

      <div className="card-premium space-y-4 p-6">
        <h2 className="font-bold text-lg">Skills I Can Teach</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_SKILLS.map(skill => (
            <button key={skill} onClick={() => toggleSkill(skill, "teach")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${skillsTeach.includes(skill) ? 'bg-accent text-white border-accent' : 'border-border hover:border-accent/50'}`}>
              {skillsTeach.includes(skill) ? <span className="flex items-center gap-1"><X className="w-3 h-3" />{skill}</span> : <span className="flex items-center gap-1"><Plus className="w-3 h-3" />{skill}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="card-premium space-y-4 p-6">
        <h2 className="font-bold text-lg">Skills I Want to Learn</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_SKILLS.map(skill => (
            <button key={skill} onClick={() => toggleSkill(skill, "learn")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${skillsLearn.includes(skill) ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/50'}`}>
              {skillsLearn.includes(skill) ? <span className="flex items-center gap-1"><X className="w-3 h-3" />{skill}</span> : <span className="flex items-center gap-1"><Plus className="w-3 h-3" />{skill}</span>}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={updateMut.isPending} className="w-full h-12 text-lg font-bold rounded-xl">
        {updateMut.isPending ? "Saving..." : <><Save className="w-5 h-5 mr-2" /> Save Profile</>}
      </Button>
    </div>
  );
}