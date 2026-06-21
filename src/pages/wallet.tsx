import { useState } from "react";
import { useGetWallet, useGetTransactions, useGetMySessions } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, Gift, Loader2,
  Copy, Check, Users, Send, X, Coins, TrendingUp, Sparkles,
  BookOpen, CheckCircle2, XCircle, Clock, CalendarDays, Star
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

// ─── helpers ────────────────────────────────────────────────────────────────
const statusMeta: Record<string, { label: string; color: string; icon: any }> = {
  requested:   { label: "Pending",     color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",  icon: Clock },
  accepted:    { label: "Accepted",    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",        icon: CalendarDays },
  in_progress: { label: "In Progress", color: "bg-primary/10 text-primary border-primary/20",           icon: Sparkles },
  completed:   { label: "Completed",   color: "bg-green-500/10 text-green-600 border-green-500/20",     icon: CheckCircle2 },
  cancelled:   { label: "Cancelled",   color: "bg-red-500/10 text-red-500 border-red-500/20",           icon: XCircle },
  disputed:    { label: "Disputed",    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",  icon: XCircle },
};

export default function Wallet() {
  const options     = useApiOptions();
  const token       = useAuthStore(s => s.token);
  const { toast }   = useToast();
  const queryClient = useQueryClient();

  const { data: wallet,       isLoading: walletLoading } = useGetWallet(options);
  const { data: transactions, isLoading: txLoading }     = useGetTransactions(options);
  const { data: sessions,     isLoading: sessLoading }   = useGetMySessions(undefined, { request: options.request });

  const [copied,         setCopied]         = useState(false);
  const [showWithdraw,   setShowWithdraw]   = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [upiId,          setUpiId]          = useState("");
  const [withdrawLoading,setWithdrawLoading]= useState(false);

  // ── history tabs state ──────────────────────────────────────────────────
  const [historyTab,   setHistoryTab]   = useState<"transactions" | "sessions">("transactions");
  const [txFilter,     setTxFilter]     = useState<string>("all");
  const [sessFilter,   setSessFilter]   = useState<string>("all");

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
      toast({ variant: "destructive", title: "Please fill all fields" }); return;
    }
    const amount = parseInt(withdrawAmount);
    if (amount < 500)                      { toast({ variant: "destructive", title: "Minimum 500 credits required" }); return; }
    if (amount > (wallet?.balance || 0))   { toast({ variant: "destructive", title: "Insufficient balance" }); return; }

    setWithdrawLoading(true);
    try {
      const res  = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount, upiId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Withdrawal Requested!", description: `Rs ${(amount * 0.85).toFixed(0)} will be credited to your UPI within 24–48 hrs.` });
        setShowWithdraw(false); setWithdrawAmount(""); setUpiId("");
        queryClient.invalidateQueries({ queryKey: ["/api/wallet/history"] } as any);
        queryClient.invalidateQueries({ queryKey: ["/api/users/me"] } as any);
      } else {
        toast({ variant: "destructive", title: "Failed", description: data.error || "Cannot withdraw promotional credits." });
      }
    } catch { toast({ variant: "destructive", title: "Something went wrong" }); }
    setWithdrawLoading(false);
  };

  // ── filtered lists ──────────────────────────────────────────────────────
  const filteredTx = (transactions ?? []).filter((tx: any) =>
    txFilter === "all" ? true : tx.type === txFilter
  );

  const filteredSessions = (sessions ?? []).filter((s: any) => {
    if (sessFilter === "all")       return true;
    if (sessFilter === "upcoming")  return ["requested", "accepted"].includes(s.status);
    if (sessFilter === "completed") return s.status === "completed";
    if (sessFilter === "cancelled") return ["cancelled", "disputed"].includes(s.status);
    return true;
  });

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item      = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="py-6 max-w-4xl mx-auto space-y-6">

      {/* ── Withdraw Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showWithdraw && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <button onClick={() => setShowWithdraw(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-black mb-1 flex items-center gap-2"><Send className="w-5 h-5 text-primary" /> Withdraw Credits</h2>
              <p className="text-sm text-muted-foreground mb-6">Withdraw earned credits to your bank account via UPI. (Min 500 cr)</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Amount (Credits)</label>
                  <Input type="number" placeholder="e.g. 500" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="mt-1 font-black text-lg" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">UPI ID</label>
                  <Input type="text" placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} className="mt-1" />
                </div>
                <Button onClick={handleWithdraw} disabled={withdrawLoading} className="w-full h-12 text-lg font-bold rounded-xl mt-2">
                  {withdrawLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Request Withdrawal"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-black mb-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <WalletIcon className="w-5 h-5 text-primary" />
          </div>
          My Wallet
        </h1>
        <p className="text-muted-foreground text-sm ml-1">Manage your credits, earnings and transactions.</p>
      </motion.div>

      {/* ── Balance Card ───────────────────────────────────────────────── */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 p-8 rounded-3xl text-white relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #5B5BF6 0%, #7c3aed 60%, #06b6d4 100%)" }}>
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
              <Button onClick={() => setShowWithdraw(true)} disabled={(wallet?.balance || 0) < 500}
                className="bg-white text-primary hover:bg-white/90 font-bold rounded-full h-10 px-5 shadow-lg">
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
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Total Earned</p>
            </div>
            {walletLoading ? <Skeleton className="h-8 w-24" /> :
              <p className="text-2xl font-black text-green-600">{wallet?.totalEarned ?? 0} <span className="text-sm font-normal text-muted-foreground">cr</span></p>}
          </div>
          <div className="flex-1 p-5 rounded-2xl bg-background border border-red-500/20 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Total Spent</p>
            </div>
            {walletLoading ? <Skeleton className="h-8 w-24" /> :
              <p className="text-2xl font-black text-red-500">{Math.abs(wallet?.totalSpent ?? 0)} <span className="text-sm font-normal text-muted-foreground">cr</span></p>}
          </div>
        </div>
      </motion.div>

      {/* ── How Credits Work ───────────────────────────────────────────── */}
      <motion.div variants={item} className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-violet-500/5 border border-primary/15">
        <h2 className="font-bold text-base mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> How Credits Work</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Gift,       color: "text-green-500", bg: "bg-green-500/10 border-green-500/20", title: "Get Free Credits",  desc: "200 credits on signup. Earn 50 more per referral." },
            { icon: TrendingUp, color: "text-primary",   bg: "bg-primary/10 border-primary/20",     title: "Earn by Teaching", desc: "Teach any skill and earn credits per session." },
            { icon: Coins,      color: "text-orange-500",bg: "bg-orange-500/10 border-orange-500/20",title: "Learn with Credits",desc: "Spend credits to book sessions. 1 credit = ₹1." },
          ].map(c => (
            <div key={c.title} className={`p-4 rounded-xl border ${c.bg}`}>
              <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center mb-3"><c.icon className={`w-4 h-4 ${c.color}`} /></div>
              <p className="font-bold text-sm mb-1">{c.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Platform Fees ──────────────────────────────────────────────── */}
      <motion.div variants={item} className="p-6 rounded-2xl bg-background border border-orange-500/20">
        <h2 className="font-bold text-base mb-4 flex items-center gap-2 text-orange-600">⚖️ Platform Fees & Rules</h2>
        <div className="space-y-3">
          {[
            { n: "1", title: "20% Withdrawal Fee",    desc: "When you withdraw money to your bank account, a 20% platform processing fee is applied. (e.g., Withdraw 1000 cr, get ₹800)." },
            { n: "2", title: "15% Session Commission", desc: "To maintain the platform, a 15% fee is deducted from the mentor's earnings per completed session." },
            { n: "3", title: "7-Day Security Policy",  desc: "For security and anti-fraud purposes, all withdrawal requests take 24–48 hours to process, and up to 7 days for new users." },
          ].map(r => (
            <div key={r.n} className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
              <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-orange-600 text-xs font-bold">{r.n}</span>
              </div>
              <div>
                <p className="font-bold text-sm">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Refer & Earn ───────────────────────────────────────────────── */}
      <motion.div variants={item} className="p-6 rounded-2xl bg-background border border-border">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
          <div>
            <h2 className="font-bold text-base">Refer & Earn</h2>
            <p className="text-xs text-muted-foreground">Earn 50 credits for first referral, 25 for each after</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-xs font-mono text-primary truncate">{referralLink}</div>
          <Button onClick={copyReferral} className="rounded-xl px-4 shrink-0">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Share this link 🔗 when friends sign up, you both get credits!</p>
      </motion.div>

      {/* ── History Section (Transactions + Sessions tabs) ─────────────── */}
      <motion.div variants={item} className="rounded-2xl bg-background border border-border overflow-hidden">

        {/* Tab Header */}
        <div className="flex border-b border-border">
          {(["transactions", "sessions"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setHistoryTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all ${
                historyTab === tab
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "transactions"
                ? <><Coins className="w-4 h-4" /> Transactions</>
                : <><BookOpen className="w-4 h-4" /> Sessions</>
              }
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── Transactions Tab ─────────────────────────────────────── */}
          {historyTab === "transactions" && (
            <div className="space-y-4">
              {/* Filter chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all",                 label: "All" },
                  { key: "earned",              label: "💰 Earned" },
                  { key: "spent",               label: "💸 Spent" },
                  { key: "bonus",               label: "🎁 Bonus" },
                  { key: "referral",            label: "👥 Referral" },
                  { key: "refund",              label: "↩️ Refund" },
                  { key: "withdrawal_pending",  label: "🏦 Withdrawal" },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setTxFilter(f.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      txFilter === f.key
                        ? "bg-primary text-white border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* List */}
              {txLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : !filteredTx.length ? (
                <div className="text-center py-10 text-muted-foreground text-sm">No transactions found.</div>
              ) : (
                <div className="space-y-1">
                  {filteredTx.map((tx: any) => {
                    const isExpense = tx.type === "spent" || tx.type === "withdrawal_pending" || tx.amount < 0;
                    const isPositive = !isExpense;
                    const isBonus = tx.type === "bonus" || tx.type === "referral";
                    const Icon = isBonus ? Gift : (isPositive ? ArrowUpRight : ArrowDownRight);
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-muted/40 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isBonus ? "bg-primary/10 text-primary" : isPositive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm leading-tight">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), "MMM d, yyyy • h:mm a")}</p>
                          </div>
                        </div>
                        <span className={`font-black text-sm tabular-nums ${
                          isBonus ? "text-primary" : isPositive ? "text-green-600" : "text-red-500"
                        }`}>
                          {isPositive ? "+" : "-"}{Math.abs(tx.amount)} cr
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Sessions Tab ─────────────────────────────────────────── */}
          {historyTab === "sessions" && (
            <div className="space-y-4">
              {/* Filter chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all",       label: "All" },
                  { key: "upcoming",  label: "📅 Upcoming" },
                  { key: "completed", label: "✅ Completed" },
                  { key: "cancelled", label: "❌ Cancelled" },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setSessFilter(f.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      sessFilter === f.key
                        ? "bg-primary text-white border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* List */}
              {sessLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : !filteredSessions.length ? (
                <div className="text-center py-10 text-muted-foreground text-sm">No sessions found.</div>
              ) : (
                <div className="space-y-2">
                  {filteredSessions.map((s: any) => {
                    const meta     = statusMeta[s.status] ?? statusMeta.requested;
                    const StatusIcon = meta.icon;
                    const isStudent = s.student?.id !== undefined; // both sides shown
                    const dateStr   = s.scheduledDate || s.scheduledAt;

                    return (
                      <div key={s.id} className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                        {/* Skill icon */}
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm">{s.skill}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.color}`}>
                              <StatusIcon className="w-3 h-3" /> {meta.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {/* Mentor name */}
                            {s.mentor && (
                              <p className="text-xs text-muted-foreground">
                                👨‍🏫 {s.mentor.name}
                              </p>
                            )}
                            {/* Date */}
                            {dateStr && (
                              <p className="text-xs text-muted-foreground">
                                📅 {format(new Date(dateStr), "MMM d, yyyy")}
                              </p>
                            )}
                            {/* Rating */}
                            {s.teacherRating && (
                              <p className="text-xs text-yellow-600 flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {s.teacherRating}/5
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Credits */}
                        <div className="text-right flex-shrink-0">
                          <p className={`font-black text-sm tabular-nums ${
                            s.status === "completed" ? "text-green-600" :
                            s.status === "cancelled" ? "text-red-500" : "text-muted-foreground"
                          }`}>
                            {s.status === "completed" ? "+" : s.status === "cancelled" ? "↩" : "-"}{s.creditsAmount} cr
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{s.sessionType?.replace("_", " ")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

    </motion.div>
  );
}
