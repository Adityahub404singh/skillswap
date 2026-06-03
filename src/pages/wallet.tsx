import { useState } from "react";
import { useGetWallet, useGetTransactions } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, Gift, Loader2, Copy, Check, Users, CreditCard, Send, X, TrendingUp } from "lucide-react";
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

  const referralCode = "SKILL" + (token?.slice(-6) || "SWAP01").toUpperCase();
  const referralLink = `https://skillswap-fawn-mu.vercel.app/register?ref=${referralCode}`;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Referral link copied!" });
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !upiId) { toast({ variant: "destructive", title: "Fill all fields" }); return; }
    const amount = parseInt(withdrawAmount);
    if (amount < 500) { toast({ variant: "destructive", title: "Minimum 500 credits required" }); return; }
    if (amount > (wallet?.balance || 0)) { toast({ variant: "destructive", title: "Insufficient balance" }); return; }
    setWithdrawLoading(true);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount, upiId })
      });
      if (res.ok) {
        toast({ title: "Withdrawal Requested!", description: `Rs.${amount} will be processed in 24-48 hours.` });
        setShowWithdraw(false); setWithdrawAmount(""); setUpiId("");
      } else { toast({ variant: "destructive", title: "Failed. Try again." }); }
    } catch { toast({ variant: "destructive", title: "Something went wrong" }); }
    setWithdrawLoading(false);
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="py-6 max-w-4xl mx-auto space-y-6">
      <motion.div variants={item} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
          <WalletIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">My Wallet</h1>
          <p className="text-sm text-muted-foreground">Manage your credits and earnings</p>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl p-6 sm:p-8 relative overflow-hidden text-white" style={{background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)"}}>
          <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-4 bottom-0 w-32 h-32 bg-black/10 rounded-full blur-xl pointer-events-none" />
          <div className="relative z-10">
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-2">Available Balance</p>
            {walletLoading ? <Skeleton className="h-14 w-40 bg-white/20 mb-2" /> : (
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-5xl sm:text-6xl font-extrabold tracking-tight">{wallet?.balance ?? 0}</span>
                <span className="text-lg text-white/70 font-medium">cr</span>
              </div>
            )}
            <p className="text-white/60 text-sm mb-6">= Rs.{wallet?.balance ?? 0} withdrawal value</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setShowWithdraw(true)} disabled={(wallet?.balance || 0) < 500}
                className="bg-white text-primary hover:bg-white/90 font-bold rounded-full h-10 px-5 shadow-lg">
                <Send className="w-4 h-4 mr-2" /> Withdraw
              </Button>
              <Link href="/buy-credits">
                <Button className="bg-white/15 hover:bg-white/25 text-white font-bold rounded-full h-10 px-5 border border-white/30 backdrop-blur-sm">
                  + Buy Credits
                </Button>
              </Link>
            </div>
            {(wallet?.balance || 0) < 500 && <p className="text-white/50 text-xs mt-3">Min. 500 cr to withdraw</p>}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {[
            { label: "Total Earned", value: wallet?.totalEarned ?? 0, color: "text-green-600", bg: "bg-green-500/10", Icon: ArrowUpRight },
            { label: "Total Spent", value: Math.abs(wallet?.totalSpent ?? 0), color: "text-red-500", bg: "bg-red-500/10", Icon: ArrowDownRight },
          ].map(s => (
            <motion.div key={s.label} whileHover={{ scale: 1.02 }} className="card-premium flex-1 flex items-center gap-4">
              <div className={"w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 " + s.bg}>
                <s.Icon className={"w-5 h-5 " + s.color} />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">{s.label}</p>
                {walletLoading ? <Skeleton className="h-7 w-20 mt-1" /> : <p className={"text-2xl font-bold " + s.color}>{s.value} cr</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item} className="card-premium border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Refer and Earn</h2>
            <p className="text-sm text-muted-foreground">Invite friends, earn credits together</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "You Get", value: "50 cr", sub: "per referral" },
            { label: "Friend Gets", value: "200 cr", sub: "welcome bonus" },
            { label: "Unlimited", value: "Earn", sub: "no cap" },
          ].map(s => (
            <div key={s.label} className="bg-background/60 rounded-xl p-3 text-center border border-primary/10">
              <p className="text-base font-extrabold text-primary">{s.value}</p>
              <p className="text-xs font-semibold">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-background border-2 border-primary/20 rounded-xl px-4 py-3 text-sm font-mono text-primary truncate">{referralLink}</div>
          <Button onClick={copyReferral} className="bg-primary text-white rounded-xl px-4 font-bold flex-shrink-0">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Share this link. When friends join, you both earn credits!</p>
      </motion.div>

      <motion.div variants={item} className="card-premium">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/50">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Transaction History</h2>
        </div>
        {txLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : !transactions?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <WalletIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions?.map((tx: any) => {
              const isPositive = tx.amount > 0;
              const Icon = tx.type === "bonus" || tx.type === "referral" ? Gift : (isPositive ? ArrowUpRight : ArrowDownRight);
              return (
                <div key={tx.id} className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={"w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 " + (tx.type === "bonus" || tx.type === "referral" ? "bg-primary/10 text-primary" : isPositive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500")}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), "MMM d, yyyy · h:mm a")}</p>
                    </div>
                  </div>
                  <p className={"font-bold text-sm flex-shrink-0 ml-3 " + (tx.type === "bonus" || tx.type === "referral" ? "text-primary" : isPositive ? "text-green-600" : "text-foreground")}>
                    {isPositive ? "+" : ""}{tx.amount} cr
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {showWithdraw && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="card-premium w-full max-w-sm">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Withdraw Credits</h3>
              <button onClick={() => setShowWithdraw(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 text-sm">
              Balance: <span className="font-bold text-primary">{wallet?.balance} cr</span> &nbsp;·&nbsp; Min: 500 cr &nbsp;·&nbsp; 1 cr = Rs.1
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-1 block">Amount (credits)</label>
                <Input type="number" placeholder="e.g. 500" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} min="500" max={wallet?.balance} className="h-11" />
                {withdrawAmount && parseInt(withdrawAmount) >= 500 && <p className="text-xs text-green-600 mt-1">= Rs.{withdrawAmount} will be transferred</p>}
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">UPI ID</label>
                <Input placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} className="h-11" />
              </div>
              <Button className="w-full bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl h-12" onClick={handleWithdraw} disabled={withdrawLoading}>
                {withdrawLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Withdraw Rs.${withdrawAmount || 0}`}
              </Button>
              <p className="text-xs text-muted-foreground text-center">Processed within 24-48 hours via UPI</p>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}