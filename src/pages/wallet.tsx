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
import { useQueryClient } from "@tanstack/react-query";

export default function Wallet() {
  const options = useApiOptions();
  const token = useAuthStore(s => s.token);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wallet, isLoading: walletLoading } = useGetWallet(options);
  const { data: transactions, isLoading: txLoading } = useGetTransactions(options);

  const [copied, setCopied] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // CRASH FIX: Removed process.env, using a direct safe string
  const referralCode = "SKILL" + (token?.slice(-6) || Math.random().toString(36).slice(2, 8)).toUpperCase();
  const referralLink = `https://skillswap.app/register?ref=${referralCode}`;

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
        toast({ title: "Withdrawal Requested!", description: `₹${amount} will be processed in 24-48 hours` });
        setShowWithdraw(false);
        setWithdrawAmount("");
        queryClient.invalidateQueries({ queryKey: ['/api/wallet/history'] } as any);
        queryClient.invalidateQueries({ queryKey: ['/api/users/me'] } as any);
        setUpiId("");
      } else {
        toast({ variant: "destructive", title: "Withdrawal failed. Try again." });
      }
    } catch {
      toast({ variant: "destructive", title: "Something went wrong" });
    }
    setWithdrawLoading(false);
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="py-6 max-w-4xl mx-auto space-y-6">
      <motion.div variants={item}>
        <h1 className="text-3xl font-black mb-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <WalletIcon className="w-5 h-5 text-primary" />
          </div>
          My Wallet
        </h1>
        <p className="text-muted-foreground text-sm ml-1">Manage your credits, earnings and transactions.</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 p-8 rounded-3xl text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #5B5BF6 0%, #7c3aed 60%, #06b6d4 100%)" }}>
          <div className="absolute -right-10 -top-10 w-52 h-52 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 left-20 w-40 h-40 bg-black/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-2">Available Balance</p>
            {walletLoading ? <Skeleton className="h-16 w-48 bg-white/20 mb-3" /> : (
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-6xl font-black tracking-tighter">{wallet?.balance ?? 0}</span>
                <span className="text-xl font-medium text-white/70">credits</span>
              </div>
            )}
            <p className="text-white/60 text-sm mb-6">≈ ₹{wallet?.balance ?? 0} withdrawal value • 1 cr = ₹1</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setShowWithdraw(true)} disabled={(wallet?.balance || 0) < 500} className="bg-white text-primary hover:bg-white/90 font-bold rounded-full h-10 px-5 shadow-lg">
                <Send className="w-4 h-4 mr-2" /> Withdraw
              </Button>
              <Link href="/buy-credits">
                <Button className="bg-white/15 hover:bg-white/25 text-white font-bold rounded-full h-10 px-5 border border-white/25 backdrop-blur-sm">
                  + Buy Credits
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex-1 p-5 rounded-2xl bg-background border border-green-500/20 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1"><ArrowUpRight className="w-4 h-4 text-green-500" /><p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Total Earned</p></div>
            {walletLoading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-black text-green-600">{wallet?.totalEarned ?? 0} <span className="text-sm font-normal text-muted-foreground">cr</span></p>}
          </div>
          <div className="flex-1 p-5 rounded-2xl bg-background border border-red-500/20 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1"><ArrowDownRight className="w-4 h-4 text-red-500" /><p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Total Spent</p></div>
            {walletLoading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-black text-red-500">{Math.abs(wallet?.totalSpent ?? 0)} <span className="text-sm font-normal text-muted-foreground">cr</span></p>}
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-violet-500/5 border border-primary/15">
        <h2 className="font-bold text-base mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> How Credits Work</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Gift, color: "text-green-500", bg: "bg-green-500/10 border-green-500/20", title: "Get Free Credits", desc: "200 credits on signup. Earn 50 more per referral." },
            { icon: TrendingUp, color: "text-primary", bg: "bg-primary/10 border-primary/20", title: "Earn by Teaching", desc: "Teach any skill and earn credits per session." },
            { icon: Coins, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20", title: "Learn with Credits", desc: "Spend credits to book sessions. 1 credit = ₹1." }
          ].map(c => (
            <div key={c.title} className={`p-4 rounded-xl border ${c.bg}`}>
              <div className={`w-8 h-8 rounded-lg bg-background flex items-center justify-center mb-3`}><c.icon className={`w-4 h-4 ${c.color}`} /></div>
              <p className="font-bold text-sm mb-1">{c.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item} className="p-6 rounded-2xl bg-background border border-border">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
          <div><h2 className="font-bold text-base">Refer & Earn</h2><p className="text-xs text-muted-foreground">Earn 50 credits for first referral, 25 for each after</p></div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-xs font-mono text-primary truncate">{referralLink}</div>
          <Button onClick={copyReferral} className="rounded-xl px-4 shrink-0">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Share this link — when friends sign up, you both get credits!</p>
      </motion.div>

      <motion.div variants={item} className="p-6 rounded-2xl bg-background border border-border">
        <h2 className="font-bold text-base mb-5">Transaction History</h2>
        {txLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !transactions?.length ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No transactions yet.</div>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx: any) => {
              const isExpense = tx.type === "spent" || tx.type === "withdrawal" || tx.amount < 0 || tx.description.toLowerCase().includes("booked");
              const isPositive = !isExpense;
              const isBonus = tx.type === "bonus" || tx.type === "referral";
              const Icon = isBonus ? Gift : (isPositive ? ArrowUpRight : ArrowDownRight);
              const displayAmount = Math.abs(tx.amount);
              
              return (
                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-muted/40 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isBonus ? "bg-primary/10 text-primary" : isPositive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-tight">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), "MMM d, yyyy • h:mm a")}</p>
                    </div>
                  </div>
                  <span className={`font-black text-sm tabular-nums ${isBonus ? "text-primary" : isPositive ? "text-green-600" : "text-red-500"}`}>
                    {isPositive ? "+" : "-"}{displayAmount} cr
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}