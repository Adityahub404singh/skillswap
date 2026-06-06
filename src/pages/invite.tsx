import { useState } from "react";
import { useGetMe } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Copy, Share2, Gift, Users, Coins, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Invite() {
  const options = useApiOptions();
  const { data: user } = useGetMe(options);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Generate a unique referral link (using user ID or name as ref code)
  const refCode = user ? `${user.name?.replace(/\s+/g, '').toLowerCase()}${user.id}` : "wait...";
  const inviteLink = `https://skillswap.app/register?ref=${refCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({ title: "Link Copied! 🚀", description: "Share it with your friends to earn credits." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `Hey! I'm using SkillSwap to learn & teach for free. Sign up with my link and we both get 50 FREE CREDITS! 🎁👇\n\n${inviteLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white p-8 md:p-12 text-center shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
        
        <div className="relative z-10 space-y-4">
          <div className="mx-auto w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border-2 border-white/30 shadow-inner">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">Give 50, Get 50</h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-medium">
            Invite your friends to SkillSwap. They get 50 bonus credits on signup, and you get 50 credits when they complete their first session!
          </p>
        </div>
      </motion.div>

      {/* The Link Generator */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
        className="max-w-2xl mx-auto bg-background rounded-3xl p-6 md:p-8 border border-border shadow-lg -mt-10 relative z-20"
      >
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Your Unique Invite Link</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 bg-muted/50 border border-border/50 rounded-2xl px-4 py-3 flex items-center overflow-x-auto font-mono text-sm text-foreground">
            {inviteLink}
          </div>
          <Button onClick={handleCopy} size="lg" className="rounded-2xl shrink-0 gap-2 h-auto py-3">
            {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </div>
        <div className="mt-4">
          <Button onClick={handleShareWhatsApp} className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl h-12 text-md font-bold gap-2">
            <Share2 className="w-5 h-5" /> Share directly on WhatsApp
          </Button>
        </div>
      </motion.div>

      {/* How it works & Stats */}
      <div className="grid md:grid-cols-2 gap-6 pt-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="p-8 rounded-3xl bg-muted/30 border border-border/50">
          <h2 className="text-xl font-extrabold mb-6 flex items-center gap-2"><Sparkles className="text-yellow-500 w-6 h-6" /> How it works</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-black shrink-0">1</div>
              <div>
                <h4 className="font-bold text-foreground">Share your link</h4>
                <p className="text-sm text-muted-foreground mt-1">Send your unique link to friends, classmates, or on social media.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center font-black shrink-0">2</div>
              <div>
                <h4 className="font-bold text-foreground">Friend signs up</h4>
                <p className="text-sm text-muted-foreground mt-1">They instantly get 50 credits to book their first session.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center font-black shrink-0">3</div>
              <div>
                <h4 className="font-bold text-foreground">You get rewarded</h4>
                <p className="text-sm text-muted-foreground mt-1">Once they complete a session, 50 credits magically appear in your wallet!</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="p-8 rounded-3xl bg-gradient-to-b from-primary/5 to-transparent border border-primary/10 flex flex-col justify-center items-center text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Coins className="w-12 h-12 text-primary" />
          </div>
          <h3 className="text-2xl font-black text-foreground">0 Friends</h3>
          <p className="text-muted-foreground mb-6">invited so far</p>
          <div className="w-full bg-background rounded-2xl p-4 border border-border shadow-sm flex justify-between items-center">
            <span className="font-semibold text-muted-foreground">Total Earned</span>
            <span className="text-xl font-black text-primary">0 Credits</span>
          </div>
          <p className="text-xs text-muted-foreground mt-4 italic">Stats update automatically when your friends join.</p>
        </motion.div>
      </div>
    </div>
  );
}