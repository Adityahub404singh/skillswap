
"use client";

import { useState, useEffect } from "react";
import { useGetMe } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Copy,
  Share2,
  Gift,
  Users,
  Coins,
  Sparkles,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Trophy,
  Zap,
  Link2,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReferralData {
  referralCode: string;
  referralLink: string;
  referredCount: number;
  totalEarned: number;
}

export default function Invite() {
  const options = useApiOptions();
  const { data: user } = useGetMe(options);
  const { token } = useAuthStore();
  const { toast } = useToast();

  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchReferral() {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/auth/referral`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Unable to load referral information.");
        }

        const data = await response.json();

        if (!data.referralLink || !data.referralCode) {
          throw new Error("Invalid referral response.");
        }

        setReferral(data);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Referral fetch failed:", err);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchReferral();

    return () => controller.abort();
  }, [token]);

  const inviteLink = referral?.referralLink || "";

  async function handleCopy() {
    if (!inviteLink) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = inviteLink;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.select();

        const success = document.execCommand("copy");
        textarea.remove();

        if (!success) throw new Error("Copy failed");
      }

      setCopied(true);

      toast({
        title: "Link Copied! 🚀",
        description: "Share it with your friends to earn credits.",
      });

      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Unable to copy",
        description: "Please copy the referral link manually.",
        variant: "destructive",
      });
    }
  }

  function handleShareWhatsApp() {
    if (!inviteLink) return;

    const text = `Hey! I'm using SkillSwap to learn and teach new skills. Join using my referral link and get 50 FREE CREDITS! 🎁\n\n${inviteLink}`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const referredCount = referral?.referredCount ?? 0;
  const totalEarned = referral?.totalEarned ?? 0;

  return (
    <div className="min-h-screen w-full py-8 md:py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Page heading */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 text-primary text-sm font-bold mb-2">
              <Sparkles className="w-4 h-4" />
              REWARDS & REFERRALS
            </div>

            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              Invite & Earn
            </h1>

            <p className="text-muted-foreground mt-2">
              Grow your learning community and earn rewards together.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm bg-muted/50 border border-border rounded-full px-4 py-2 w-fit">
            <Gift className="w-4 h-4 text-primary" />
            <span className="font-semibold">Referral Rewards</span>
          </div>
        </motion.div>

        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 text-white shadow-2xl"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 -right-20 w-96 h-96 rounded-full border border-white/10" />
            <div className="absolute -top-20 -right-8 w-72 h-72 rounded-full border border-white/10" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-400/20 blur-[100px] rounded-full" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-400/20 blur-[100px] rounded-full" />
          </div>

          <div className="relative z-10 grid md:grid-cols-[1fr_auto] gap-8 items-center p-7 md:p-12">

            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/20 backdrop-blur-md text-xs font-bold tracking-wider mb-6">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                FRIENDS HELP FRIENDS GROW
              </div>

              <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-tight">
                Give 50.
                <br />
                <span className="text-yellow-300">Get 50.</span>
              </h2>

              <p className="text-white/85 text-base md:text-lg mt-5 leading-relaxed max-w-xl">
                Invite your friends to SkillSwap. They receive 50 bonus
                credits on signup, and you receive 50 credits when they
                complete their first session.
              </p>

              <div className="flex flex-wrap gap-3 mt-7">
                <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-3 border border-white/10">
                  <Gift className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm font-bold">50 Credits for Friends</span>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-3 border border-white/10">
                  <Coins className="w-5 h-5 text-yellow-300" />
                  <span className="text-sm font-bold">50 Credits for You</span>
                </div>
              </div>
            </div>

            {/* Hero icon */}
            <div className="hidden md:flex items-center justify-center">
              <div className="relative w-52 h-52 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center">
                <div className="absolute inset-4 rounded-full border border-dashed border-white/30 animate-[spin_25s_linear_infinite]" />
                <div className="w-36 h-36 rounded-full bg-white/15 flex items-center justify-center shadow-2xl">
                  <Gift className="w-20 h-20 text-yellow-300" />
                </div>

                <div className="absolute -top-2 right-5 bg-yellow-300 text-purple-950 rounded-full p-3 shadow-xl">
                  <Sparkles className="w-5 h-5" />
                </div>

                <div className="absolute -bottom-2 left-2 bg-white text-purple-700 rounded-full p-3 shadow-xl">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Referral link card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative z-10 max-w-4xl mx-auto -mt-14 px-2"
        >
          <div className="rounded-3xl bg-card border border-border shadow-xl p-5 md:p-8">

            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-primary" />
              </div>

              <div>
                <h3 className="font-extrabold text-foreground">
                  Your Unique Invite Link
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Share this link with friends to get rewarded.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="h-14 rounded-2xl bg-muted flex items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating your referral link...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-destructive">
                  Unable to load your referral link.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="min-w-0 flex-1 bg-muted/60 border border-border rounded-2xl px-4 py-4 flex items-center gap-3">
                    <Link2 className="w-5 h-5 text-primary shrink-0" />
                    <span className="font-mono text-sm text-foreground break-all">
                      {inviteLink}
                    </span>
                  </div>

                  <Button
                    onClick={handleCopy}
                    disabled={!inviteLink}
                    size="lg"
                    className="rounded-2xl h-14 px-7 gap-2 font-bold shrink-0"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                    {copied ? "Copied!" : "Copy Link"}
                  </Button>
                </div>

                <Button
                  onClick={handleShareWhatsApp}
                  disabled={!inviteLink}
                  className="w-full mt-4 h-13 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Share on WhatsApp
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">

          <StatCard
            icon={<Users className="w-6 h-6 text-blue-500" />}
            label="Friends Invited"
            value={loading ? "—" : referredCount}
            description="People who joined through your referral"
            color="bg-blue-500/10"
          />

          <StatCard
            icon={<Coins className="w-6 h-6 text-yellow-500" />}
            label="Total Rewards Earned"
            value={loading ? "—" : `${totalEarned} Credits`}
            description="Credits earned from successful referrals"
            color="bg-yellow-500/10"
          />
        </div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-border bg-card p-6 md:p-9"
        >
          <div className="text-center mb-9">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-foreground">
              How It Works
            </h2>

            <p className="text-muted-foreground text-sm mt-2">
              Three simple steps to start earning rewards.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">

            <StepCard
              number="01"
              icon={<Share2 className="w-6 h-6 text-blue-500" />}
              title="Share Your Link"
              description="Send your unique referral link to friends, classmates, or on social media."
              color="bg-blue-500/10"
            />

            <StepCard
              number="02"
              icon={<Users className="w-6 h-6 text-purple-500" />}
              title="Friend Joins"
              description="Your friend signs up using your link and receives 50 bonus credits."
              color="bg-purple-500/10"
            />

            <StepCard
              number="03"
              icon={<Trophy className="w-6 h-6 text-green-500" />}
              title="Earn Rewards"
              description="When your friend completes their first session, you receive 50 credits."
              color="bg-green-500/10"
            />

          </div>
        </motion.div>

        {/* Bottom CTA */}
        <div className="rounded-3xl border border-primary/15 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>

            <div>
              <h3 className="font-black text-lg text-foreground">
                Your next reward is one invite away.
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Help your friends discover a better way to learn.
              </p>
            </div>
          </div>

          <Button
            onClick={handleShareWhatsApp}
            disabled={!inviteLink || loading}
            className="rounded-full px-7 h-12 font-bold gap-2 shrink-0"
          >
            Invite Friends
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Powered by SkillSwap · Learn. Teach. Grow.
        </p>

      </div>
    </div>
  );
}

// Reusable statistic card
function StatCard({
  icon,
  label,
  value,
  description,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-3xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            {label}
          </p>

          <h3 className="text-3xl font-black text-foreground mt-3">
            {value}
          </h3>
        </div>

        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        {description}
      </p>
    </motion.div>
  );
}

// Reusable referral step
function StepCard({
  number,
  icon,
  title,
  description,
  color,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="relative text-center md:text-left">
      <div className="flex flex-col items-center md:items-start">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} mb-5`}>
          {icon}
        </div>

        <span className="text-xs font-black tracking-widest text-primary mb-2">
          STEP {number}
        </span>

        <h3 className="text-lg font-extrabold text-foreground">
          {title}
        </h3>

        <p className="text-sm leading-6 text-muted-foreground mt-2 max-w-xs">
          {description}
        </p>
      </div>
    </div>
  );
}
