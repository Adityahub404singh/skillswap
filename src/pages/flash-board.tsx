import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Clock, MessageSquare, Play, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FlashBoard() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user) as any;
  const { toast } = useToast();

  const [doubts, setDoubts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [skill, setSkill] = useState("");
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [claiming, setClaiming] = useState<number | null>(null);

  const fetchDoubts = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/sessions/flash/board`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setDoubts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoubts();
    const interval = setInterval(() => { if (document.visibilityState === "visible") fetchDoubts(); }, 15000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const handlePostDoubt = async () => {
    if (!skill || !message) {
      toast({ variant: "destructive", title: "Please fill all fields" });
      return;
    }
    setPosting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/sessions/flash/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ skill, message, creditsAmount: 10 }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Live Doubt Posted!", description: "-10 credits. Waiting for a mentor..." });
        setSkill("");
        setMessage("");
        fetchDoubts();
      } else {
        toast({ variant: "destructive", title: "Error", description: data.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Network error" });
    }
    setPosting(false);
  };

  const handleClaim = async (id: number) => {
    setClaiming(id);
    try {
      const res = await fetch(`/api/sessions/${id}/claim-flash`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Doubt Claimed!", description: "Session is now live. Help the student out!" });
        fetchDoubts();
      } else {
        toast({ variant: "destructive", title: "Error", description: data.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Network error" });
    }
    setClaiming(null);
  };

  return (
    <div className="py-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-500 fill-yellow-500" /> Live Doubt Board
          </h1>
          <p className="text-muted-foreground text-lg mt-2">Instant 15-min sessions. Post a doubt or solve one to earn!</p>
        </div>

        <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl w-full md:w-96 shrink-0">
          <h3 className="font-bold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Ask a Quick Doubt</h3>
          <div className="space-y-3">
            <Input placeholder="E.g. React Router Issue" value={skill} onChange={(e) => setSkill(e.target.value)} className="bg-background" />
            <Input placeholder="Describe your error briefly..." value={message} onChange={(e) => setMessage(e.target.value)} className="bg-background" />
            <Button onClick={handlePostDoubt} disabled={posting} className="w-full font-bold">
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post Doubt (10 cr)"}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" /> Waiting for Mentors
        </h2>
        
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : doubts.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-2xl">
            <p className="text-muted-foreground">No active doubts right now. The board is clear!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {doubts.map((doubt) => (
                <motion.div
                  key={doubt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="card-premium p-5 flex flex-col gap-4 border-l-4 border-l-yellow-500"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-yellow-600 bg-yellow-500/10 px-2 py-1 rounded-md">
                        {doubt.skill}
                      </span>
                      <h3 className="font-bold mt-2 text-lg line-clamp-2">{doubt.message}</h3>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">{doubt.creditsAmount} cr</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-foreground">
                        {doubt.student?.name?.charAt(0) || "U"}
                      </div>
                      <span className="truncate max-w-[120px]">{doubt.student?.name}</span>
                    </div>
                    
                    {user?.id !== doubt.studentId && (
                      <Button 
                        size="sm" 
                        onClick={() => handleClaim(doubt.id)} 
                        disabled={claiming === doubt.id}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold gap-1"
                      >
                        {claiming === doubt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-3.5 h-3.5" /> Claim & Start</>}
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}





