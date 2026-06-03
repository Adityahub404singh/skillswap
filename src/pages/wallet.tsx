import { useState } from "react";
import { useGetWallet, useGetTransactions } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, Gift, Loader2, Copy, Check, Users, CreditCard, Send, X, Coins, TrendingUp, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Wallet() {
  const options = useApiOptions();
  const token = useAuthStore(s => s.token);
  const { toast } = useToast();

  const { data: wallet, isLoading: walletLoading } = useGetWallet(options);
  const { data: transactions, isLoading: txLoading } = useGetTransactions(options);

  const [copied, setCopied] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const referralCode = "SKILL" + (token?.slice(-6) || Math.random().toString(36).slice(2, 8)).toUpperCase();
  const referralLink = `https://skillswap-fawn-mu.vercel.app/register?ref=${referralCode}`;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !upiId) {
      toast({ variant: "destructive", title: "Please fill all fields" });
      return;
    }
    const amount = parseInt(withdrawAmount);
    if (amount < 500) {
      toast({ variant: "destructive", title: "Minimum 500 credits required" });
      return;
    }
    if (amount > (wallet?.balance || 0)) {
      toast({ variant: "destructive", title: "Insufficient balance" });
      return;
    }
    setWithdrawLoading(true);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount, upiId }),
      });
      if (res.ok) {
        toast({ title: "🎉 Withdrawal Requested!", description: `Rs.${amount} will be processed in 24-48 hours.` });
        setShowWithdraw(false);
        setWithdrawAmount("");
        setUpiId("");
      } else {
        toast({ variant: "destructive", title: "Withdrawal failed. Try again." });
      }
    } catch {
      toast({ variant: "destructive", title: "Something went wrong" });
    }
    setWithdrawLoading(false);
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="py-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-black mb-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <WalletIcon className="w-5 h-5 text-primary" />
          </div>
          My Wallet
        </h1>
        <p className="text-muted-foreground text-sm ml-1">Manage your credits, earnings and transactions.</p>
      </motion.div>

      {/* Balance cards */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Main balance */}
        <div
          className="md:col-span-2 p-8 rounded-3xl text-white relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #5B5BF6 0%, #7c3aed 60%, #06b6d4 100%)" }}
        >
          <div className="absolute -right-10 -top-10 w-52 h-52 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 left-20 w-40 h-40 bg-black/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-2">Available Balance</p>
            {walletLoading ? (
              <Skeleton className="h-16 w-48 bg-white/20 mb-3" />
            ) : (
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-6xl font-black tracking-tighter">{wallet?.balance ?? 0}</span>
                <span className="text-xl font-medium text-white/70">credits</span>
              </div>
            )}
            <p className="text-white/60 text-sm mb-6">≈ Rs.{wallet?.balance ?? 0} withdrawal value · 1 cr = Rs.1</p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setShowWithdraw(true)}
                disabled={(wallet?.balance || 0) < 500}
                className="bg-white text-primary hover:bg-white/90 font-bold rounded-full h-10 px-5 shadow-lg"
              >
                <Send className="w-4 h-4 mr-2" /> Withdraw
              </Button>
              <Link href="/buy-credits">
                <Button className="bg-white/15 hover:bg-white/25 text-white font-bold rounded-full h-10 px-5 border border-white/25 backdrop-blur-sm">
                  + Buy Credits
                </Button>
              </Link>
              {(wallet?.balance || 0) < 500 && (
                <p className="text-white/50 text-xs self-center">Min. 500 cr to withdraw</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 p-5 rounded-2xl bg-background border border-green-500/20 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Total Earned</p>
            </div>
            {walletLoading ? <Skeleton className="h-8 w-24" /> : (
              <p className="text-2xl font-black text-green-600">{wallet?.totalEarned ?? 0} <span className="text-sm font-normal text-muted-foreground">cr</span></p>
            )}
          </div>
          <div className="flex-1 p-5 rounded-2xl bg-background border border-red-500/20 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Total Spent</p>
            </div>
            {walletLoading ? <Skeleton className="h-8 w-24" /> : (
              <p className="text-2xl font-black text-red-500">{Math.abs(wallet?.totalSpent ?? 0)} <span className="text-sm font-normal text-muted-foreground">cr</span></p>
            )}
          </div>
        </div>
      </motion.div>

      {/* How credits work */}
      <motion.div variants={item} className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-violet-500/5 border border-primary/15">
        <h2 className="font-bold text-base mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> How Credits Work
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Gift, color: "text-green-500", bg: "bg-green-500/10 border-green-500/20", title: "Get Free Credits", desc: "200 credits on signup. Earn 50 more per referral. No money needed." },
            { icon: TrendingUp, color: "text-primary", bg: "bg-primary/10 border-primary/20", title: "Earn by Teaching", desc: "Teach any skill and earn credits per session. The more you teach, the more you earn." },
            { icon: Coins, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20", title: "Learn with Credits", desc: "Spend credits to book sessions. 1 credit = Rs.1. Withdraw anytime (min 500 cr)." },
          ].map(c => (
            <div key={c.title} className={`p-4 rounded-xl border ${c.bg}`}>
              <div className={`w-8 h-8 rounded-lg bg-background flex items-center justify-center mb-3`}>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <p className="font-bold text-sm mb-1">{c.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Referral */}
      <motion.div variants={item} className="p-6 rounded-2xl bg-background border border-border">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-base">Refer & Earn</h2>
            <p className="text-xs text-muted-foreground">Earn 50 credits for first referral, 25 for each after</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "You Earn", value: "50 cr", sub: "first referral" },
            { label: "Friend Gets", value: "200 cr", sub: "signup bonus" },
            { label: "Next Referrals", value: "25 cr", sub: "each" },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
              <p className="text-lg font-black text-primary">{s.value}</p>
              <p className="text-xs font-semibold">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-xs font-mono text-primary truncate">
            {referralLink}
          </div>
          <Button onClick={copyReferral} className="rounded-xl px-4 shrink-0">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Share this link — when friends sign up, you both get credits!</p>
      </motion.div>

      {/* Transactions */}
      <motion.div variants={item} className="p-6 rounded-2xl bg-background border border-border">
        <h2 className="font-bold text-base mb-5">Transaction History</h2>
        {txLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !transactions?.length ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No transactions yet.</div>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx: any) => {
              const isPositive = tx.amount > 0;
              const isBonus = tx.type === "bonus" || tx.type === "referral";
              const Icon = isBonus ? Gift : (isPositive ? ArrowUpRight : ArrowDownRight);
              return (
                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-muted/40 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isBonus ? "bg-primary/10 text-primary" :
                      isPositive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-tight">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), "MMM d, yyyy · h:mm a")}</p>
                    </div>
                  </div>
                  <span className={`font-black text-sm tabular-nums ${
                    isBonus ? "text-primary" : isPositive ? "text-green-600" : "text-foreground"
                  }`}>
                    {isPositive ? "+" : ""}{tx.amount} cr
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Withdraw modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-background border border-border rounded-3xl p-6 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-black text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> Withdraw Credits
              </h3>
              <button onClick={() => setShowWithdraw(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-sm mb-5">
              Balance: <span className="font-black text-primary">{wallet?.balance} cr</span>
              <span className="text-muted-foreground"> · Min 500 cr · 1 cr = Rs.1</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Amount (credits)</label>
                <Input type="number" placeholder="e.g. 500" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} min="500" max={wallet?.balance} className="h-12" />
                {withdrawAmount && parseInt(withdrawAmount) >= 500 && (
                  <p className="text-xs text-green-600 mt-1">= Rs.{withdrawAmount} will be transferred</p>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">UPI ID</label>
                <Input placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} className="h-12" />
              </div>
              <Button
                className="w-full h-12 rounded-2xl font-bold"
                onClick={handleWithdraw}
                disabled={withdrawLoading}
              >
                {withdrawLoading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : `Withdraw Rs.${withdrawAmount || 0}`
                }
              </Button>
              <p className="text-xs text-muted-foreground text-center">Processed within 24-48 hours via UPI</p>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
