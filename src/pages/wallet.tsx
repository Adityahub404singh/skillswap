import { useState } from "react";
import {
  useGetWallet,
  useGetTransactions,
  useGetMySessions,
} from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  Loader2,
  Copy,
  Check,
  Users,
  Send,
  X,
  Coins,
  TrendingUp,
  Sparkles,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays,
  Star,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
const MIN_WITHDRAWAL = 1000;
const WITHDRAWAL_FEE = 0.15;
const FIRST_WITHDRAWAL_RESERVE = 200;
const RESERVE_RELEASE_DAYS = 30;

type WalletWithWithdrawalInfo = NonNullable<ReturnType<typeof useGetWallet>["data"]> & {
  withdrawableBalance?: number;
  pendingClearance?: number;
  reservedBalance?: number;
  reserveAmount?: number;
  reserveReleaseAt?: string | null;
  reserveStatus?: string | null;
  hasCompletedWithdrawal?: boolean;
  hasWithdrawnBefore?: boolean;
  isFirstWithdrawal?: boolean;
};
const statusMeta: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  requested: {
    label: "Pending",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    icon: Clock,
  },
  accepted: {
    label: "Accepted",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: CalendarDays,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-primary/10 text-primary border-primary/20",
    icon: Sparkles,
  },
  completed: {
    label: "Completed",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-500/10 text-red-500 border-red-500/20",
    icon: XCircle,
  },
  disputed: {
    label: "Disputed",
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    icon: XCircle,
  },
  processing: {
    label: "Processing payout",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: Clock,
  },
  paid: {
    label: "Paid",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: CheckCircle2,
  },
  failed_review: {
    label: "Under admin review",
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    icon: XCircle,
  },
};
export default function Wallet() {
  const options = useApiOptions();
  const token = useAuthStore((s) => s.token);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    data: wallet,
    isLoading: walletLoading,
  } = useGetWallet(options);
  // Type the extra withdrawal fields returned by GET /api/wallet.
  const walletData = wallet as WalletWithWithdrawalInfo | undefined;
  const {
    data: transactions,
    isLoading: txLoading,
  } = useGetTransactions(options);
  const {
    data: sessions,
    isLoading: sessLoading,
  } = useGetMySessions(undefined, {
    request: options.request,
  });
  const [copied, setCopied] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [historyTab, setHistoryTab] = useState<
    "transactions" | "sessions"
  >("transactions");
  const [txFilter, setTxFilter] = useState("all");
  const [sessFilter, setSessFilter] = useState("all");
  const referralCode =
    "SKILL" +
    (token?.slice(-6) ||
      Math.random().toString(36).slice(2, 8)).toUpperCase();
  const referralLink =
    `https://skillswap.app/register?ref=${referralCode}`;
  // Backend must return this value after calculating cleared earned credits.
  const withdrawableBalance = Number(
    walletData?.withdrawableBalance ?? 0
  );
  const pendingClearance = Number(
    walletData?.pendingClearance ?? 0
  );
  const totalBalance = Number(wallet?.balance ?? 0);
  const amountNumber = Number(withdrawAmount);
  // This is a display-only estimate. The backend must calculate and
  // persist the actual fee, reserve and payout atomically.
  const firstWithdrawalKnown =
    walletData?.isFirstWithdrawal === true ||
    walletData?.hasCompletedWithdrawal === false ||
    walletData?.hasWithdrawnBefore === false;
  const firstWithdrawalAlreadyDone =
    walletData?.hasCompletedWithdrawal === true ||
    walletData?.hasWithdrawnBefore === true;
  // If the API has not yet supplied first-withdrawal metadata, show the
  // conservative first-withdrawal estimate and explain that the server
  // confirms the final amount. Once the backend says a withdrawal already
  // happened, do not estimate the reserve again.
  const shouldEstimateReserve = !firstWithdrawalAlreadyDone;
  const estimatedFee = Number.isFinite(amountNumber) && amountNumber > 0
    ? Math.round(amountNumber * WITHDRAWAL_FEE)
    : 0;
  const estimatedReserve = amountNumber > 0 && shouldEstimateReserve
    ? FIRST_WITHDRAWAL_RESERVE
    : 0;
  const estimatedPayout = amountNumber > 0
    ? Math.max(0, amountNumber - estimatedFee - estimatedReserve)
    : 0;
  const reservedBalance = Number(
    walletData?.reservedBalance ?? walletData?.reserveAmount ?? 0
  );
  const reserveReleaseAt = walletData?.reserveReleaseAt;
  const reserveStatus = String(walletData?.reserveStatus ?? "").toLowerCase();
  const copyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Please copy the referral link manually.",
      });
    }
  };
  const refreshWallet = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["/api/wallet"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["/api/wallet/transactions"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["/api/wallet/history"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["/api/users/me"],
      }),
    ]);
  };
  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    const normalizedUpi = upiId.trim();
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Enter a valid whole number of credits.",
      });
      return;
    }
    if (amount < MIN_WITHDRAWAL) {
      toast({
        variant: "destructive",
        title: "Minimum 1,000 credits required",
        description: "You can request a withdrawal once your cleared earnings reach 1,000 credits.",
      });
      return;
    }
    if (amount > withdrawableBalance) {
      toast({
        variant: "destructive",
        title: "Insufficient cleared earnings",
        description: `Your withdrawable balance is ${withdrawableBalance} credits.`,
      });
      return;
    }
    if (
      !/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(
        normalizedUpi
      )
    ) {
      toast({
        variant: "destructive",
        title: "Invalid UPI ID",
        description: "Enter a valid UPI ID.",
      });
      return;
    }
    if (!token) {
      toast({
        variant: "destructive",
        title: "Please login again",
      });
      return;
    }
    setWithdrawLoading(true);
    try {
      const apiBase = (
        import.meta.env.VITE_API_URL || ""
      ).replace(/\/$/, "");
      const response = await fetch(
        `${apiBase}/api/wallet/withdraw`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            upiId: normalizedUpi,
          }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data.error || "Withdrawal request failed."
        );
      }
      toast({
        title: "Withdrawal request submitted",
        description:
          `Request recorded. Estimated payout: ₹${Number(
            data.payoutAmount ?? estimatedPayout
          )}. ${Number(data.reserveAmount ?? estimatedReserve) > 0 ? `₹${Number(data.reserveAmount ?? estimatedReserve)} reserve is being held from this withdrawal.` : ""} Payment is pending confirmation.`,
      });
      setShowWithdraw(false);
      setWithdrawAmount("");
      setUpiId("");
      await refreshWallet();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Withdrawal failed",
        description:
          error?.message || "Something went wrong.",
      });
    } finally {
      setWithdrawLoading(false);
    }
  };
  const filteredTx = (transactions ?? []).filter(
    (tx: any) =>
      txFilter === "all" || tx.type === txFilter
  );
  const filteredSessions = (sessions ?? []).filter(
    (session: any) => {
      if (sessFilter === "all") return true;
      if (sessFilter === "upcoming") {
        return ["requested", "accepted"].includes(
          session.status
        );
      }
      if (sessFilter === "completed") {
        return session.status === "completed";
      }
      if (sessFilter === "cancelled") {
        return ["cancelled", "disputed"].includes(
          session.status
        );
      }
      return true;
    }
  );
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={container}
      className="py-6 max-w-4xl mx-auto space-y-6"
    >
      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdraw && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <button
                onClick={() => setShowWithdraw(false)}
                disabled={withdrawLoading}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-black mb-1 flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                Withdraw Credits
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Withdraw your cleared teaching earnings through UPI. 1 credit = ₹1.
              </p>
              <div className="rounded-xl bg-muted/50 border border-border p-3 mb-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Cleared earnings
                  </span>
                  <strong>{withdrawableBalance} cr</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Minimum withdrawal
                  </span>
                  <strong>{MIN_WITHDRAWAL} cr</strong>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Amount (Credits)
                  </label>
                  <Input
                    type="number"
                    min={MIN_WITHDRAWAL}
                    step={1}
                    placeholder="e.g. 1000"
                    value={withdrawAmount}
                    onChange={(e) =>
                      setWithdrawAmount(e.target.value)
                    }
                    className="mt-1 font-black text-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    UPI ID
                  </label>
                  <Input
                    type="text"
                    placeholder="yourname@upi"
                    value={upiId}
                    onChange={(e) =>
                      setUpiId(e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
                <div className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Withdrawal amount
                    </span>
                    <span>{amountNumber > 0 ? amountNumber : 0} cr</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Platform fee (15%)
                    </span>
                    <span>- ₹{estimatedFee}</span>
                  </div>
                  {shouldEstimateReserve && amountNumber >= MIN_WITHDRAWAL && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        One-time first withdrawal reserve
                      </span>
                      <span>- ₹{estimatedReserve}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t border-border pt-2">
                    <span>Estimated payout</span>
                    <span className="text-green-600">₹{estimatedPayout}</span>
                  </div>
                  {shouldEstimateReserve && amountNumber >= MIN_WITHDRAWAL && (
                    <p className="text-xs text-muted-foreground">
                      The ₹{FIRST_WITHDRAWAL_RESERVE} reserve is not an extra payment. It is held from this withdrawal and is scheduled for release {RESERVE_RELEASE_DAYS} days after successful payout, subject to review.
                    </p>
                  )}
                  {!firstWithdrawalKnown && !firstWithdrawalAlreadyDone && amountNumber >= MIN_WITHDRAWAL && (
                    <p className="text-xs text-muted-foreground">
                      Estimate assumes this is your first withdrawal. The server checks your withdrawal history and confirms the final breakdown before processing.
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Submitting a request does not mean the UPI
                  transfer has completed. Payment status will
                  update after payout confirmation.
                </p>
                <Button
                  onClick={handleWithdraw}
                  disabled={
                    withdrawLoading ||
                    withdrawableBalance < MIN_WITHDRAWAL
                  }
                  className="w-full h-12 text-lg font-bold rounded-xl mt-2"
                >
                  {withdrawLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Request Withdrawal"
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Page Header */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-black mb-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <WalletIcon className="w-5 h-5 text-primary" />
          </div>
          My Wallet
        </h1>
        <p className="text-muted-foreground text-sm ml-1">
          Manage your credits, earnings and transactions.
        </p>
      </motion.div>
      {/* Balance Card */}
      <motion.div
        variants={item}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div
          className="md:col-span-2 p-8 rounded-3xl text-white relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #5B5BF6 0%, #7c3aed 60%, #06b6d4 100%)",
          }}
        >
          <div className="absolute -right-10 -top-10 w-52 h-52 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 left-20 w-40 h-40 bg-black/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-2">
              Total Available Credits
            </p>
            {walletLoading ? (
              <Skeleton className="h-16 w-48 bg-white/20 mb-3" />
            ) : (
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-6xl font-black tracking-tighter">
                  {totalBalance}
                </span>
                <span className="text-xl font-medium text-white/70">
                  credits
                </span>
              </div>
            )}
            <p className="text-white/60 text-sm mb-6">
              1 Credit = ₹1
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setShowWithdraw(true)}
                disabled={
                  walletLoading ||
                  withdrawableBalance < MIN_WITHDRAWAL
                }
                className="bg-white text-primary hover:bg-white/90 font-bold rounded-full h-10 px-5 shadow-lg disabled:opacity-50"
              >
                <Send className="w-4 h-4 mr-2" />
                Withdraw
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
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Total Earned
              </p>
            </div>
            {walletLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-black text-green-600">
                {wallet?.totalEarned ?? 0}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}cr
                </span>
              </p>
            )}
          </div>
          <div className="flex-1 p-5 rounded-2xl bg-background border border-primary/20 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Pending Clearance
              </p>
            </div>
            {walletLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-black">
                {pendingClearance}
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}cr
                </span>
              </p>
            )}
          </div>
        </div>
      </motion.div>
      {/* Withdrawable Balance */}
      <motion.div
        variants={item}
        className="p-5 rounded-2xl bg-background border border-green-500/20"
      >
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Cleared Earnings Available for Withdrawal
            </p>
            <p className="text-3xl font-black text-green-600 mt-1">
              {walletLoading ? "..." : `${withdrawableBalance} cr`}
            </p>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs">
            Only cleared teaching earnings are eligible.
            Recent earnings remain pending for 7 days.
          </p>
        </div>
      </motion.div>
      {/* First-withdrawal reserve status */}
      <motion.div
        variants={item}
        className="p-5 rounded-2xl bg-background border border-amber-500/20"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              First withdrawal reserve
            </p>
            <p className="text-2xl font-black mt-1">
              {walletLoading ? "..." : `₹${reservedBalance}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              A one-time ₹200 amount is held from your first withdrawal only. You do not pay it separately. It is scheduled to be released 30 days after successful payout, subject to policy checks.
            </p>
          </div>
          <div className="text-sm text-right">
            <span className="inline-flex rounded-full border px-3 py-1 font-semibold capitalize">
              {reserveStatus ? reserveStatus.replace("_", " ") : reservedBalance > 0 ? "Locked" : "No reserve recorded"}
            </span>
            {reserveReleaseAt && !Number.isNaN(new Date(reserveReleaseAt).getTime()) && (
              <p className="text-xs text-muted-foreground mt-2">
                Expected release: {format(new Date(reserveReleaseAt), "MMM d, yyyy")}
              </p>
            )}
          </div>
        </div>
      </motion.div>
      {/* Platform Rules */}
      <motion.div
        variants={item}
        className="p-6 rounded-2xl bg-background border border-orange-500/20"
      >
        <h2 className="font-bold text-base mb-4 flex items-center gap-2 text-orange-600">
          ⚖️ Platform Rules & Fees
        </h2>
        <div className="space-y-3">
          {[
            {
              n: "1",
              title: "Minimum Withdrawal: 1,000 Cleared Credits",
              desc: "At least 1,000 cleared teaching-earnings credits are required. Purchased or promotional credits are not withdrawable.",
            },
            {
              n: "2",
              title: "15% Withdrawal Fee",
              desc: "A 15% fee applies to every withdrawal. For example, ₹1,000 has a ₹150 fee before any first-withdrawal reserve.",
            },
            {
              n: "3",
              title: "One-time ₹200 First Withdrawal Reserve",
              desc: "₹200 is held from your first withdrawal amount only—not charged separately. It is scheduled for release 30 days after successful payout, subject to review. It is never deducted again on later withdrawals.",
            },
            {
              n: "4",
              title: "15% Session Commission",
              desc: "A 15% platform commission is deducted from mentor earnings during session settlement.",
            },
            {
              n: "5",
              title: "7-Day Clearance",
              desc: "Session earnings become eligible for withdrawal after 7 days, provided there is no dispute or hold.",
            },
          ].map((rule) => (
            <div
              key={rule.n}
              className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl"
            >
              <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-orange-600 text-xs font-bold">
                  {rule.n}
                </span>
              </div>
              <div>
                <p className="font-bold text-sm">{rule.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {rule.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
      {/* How Credits Work */}
      <motion.div
        variants={item}
        className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-violet-500/5 border border-primary/15"
      >
        <h2 className="font-bold text-base mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          How Credits Work
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: Gift,
              color: "text-green-500",
              bg: "bg-green-500/10 border-green-500/20",
              title: "Get Free Credits",
              desc: "200 credits on signup. Earn 50 more per referral.",
            },
            {
              icon: TrendingUp,
              color: "text-primary",
              bg: "bg-primary/10 border-primary/20",
              title: "Earn by Teaching",
              desc: "Teach any skill and earn credits per session.",
            },
            {
              icon: Coins,
              color: "text-orange-500",
              bg: "bg-orange-500/10 border-orange-500/20",
              title: "Learn with Credits",
              desc: "Spend credits to book sessions. 1 credit = ₹1.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className={`p-4 rounded-xl border ${card.bg}`}
            >
              <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center mb-3">
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="font-bold text-sm mb-1">{card.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
      {/* Refer & Earn */}
      <motion.div
        variants={item}
        className="p-6 rounded-2xl bg-background border border-border"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-base">Refer & Earn</h2>
            <p className="text-xs text-muted-foreground">
              Earn 50 credits for first referral, 25 for each after
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-xs font-mono text-primary truncate">
            {referralLink}
          </div>
          <Button
            onClick={copyReferral}
            className="rounded-xl px-4 shrink-0"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Share this link when friends sign up and earn credits!
        </p>
      </motion.div>
      {/* History */}
      <motion.div
        variants={item}
        className="rounded-2xl bg-background border border-border overflow-hidden"
      >
        <div className="flex border-b border-border">
          {(["transactions", "sessions"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setHistoryTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all ${
                historyTab === tab
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "transactions" ? (
                <>
                  <Coins className="w-4 h-4" />
                  Transactions
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  Sessions
                </>
              )}
            </button>
          ))}
        </div>
        <div className="p-6">
          {/* Transactions */}
          {historyTab === "transactions" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "All" },
                  { key: "earned", label: "💰 Earned" },
                  { key: "spent", label: "💸 Spent" },
                  { key: "bonus", label: "🎁 Bonus" },
                  { key: "referral", label: "👥 Referral" },
                  { key: "refund", label: "↩️ Refund" },
                  { key: "withdrawal_pending", label: "🏦 Withdrawal pending" },
                  { key: "withdrawal_paid", label: "✅ Withdrawal paid" },
                  { key: "withdrawal_reserve", label: "🔒 Reserve" },
                  { key: "reserve_released", label: "↩️ Reserve released" },
                  { key: "withdrawal_review", label: "⚠️ Under review" },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setTxFilter(filter.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      txFilter === filter.key
                        ? "bg-primary text-white border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              {txLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : !filteredTx.length ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No transactions found.
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTx.map((tx: any) => {
                    const isExpense =
                      tx.type === "spent" ||
                      tx.type === "withdrawal_pending" ||
                      tx.type === "withdrawal_paid" ||
                      tx.type === "withdrawal_reserve" ||
                      tx.type === "withdrawal_review" ||
                      Number(tx.amount) < 0;
                    const isPositive = !isExpense;
                    const isBonus =
                      tx.type === "bonus" ||
                      tx.type === "referral";
                    const Icon = isBonus
                      ? Gift
                      : isPositive
                        ? ArrowUpRight
                        : ArrowDownRight;
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between gap-3 p-3 hover:bg-muted/40 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isBonus
                                ? "bg-primary/10 text-primary"
                                : isPositive
                                  ? "bg-green-500/10 text-green-600"
                                  : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm leading-tight break-words">
                              {tx.description || tx.type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tx.createdAt
                                ? format(
                                    new Date(tx.createdAt),
                                    "MMM d, yyyy • h:mm a"
                                  )
                                : ""}
                            </p>
                            {tx.status && (
                              <p className="text-xs text-muted-foreground capitalize">
                                Status: {tx.status.replaceAll("_", " ")}
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`font-black text-sm tabular-nums whitespace-nowrap ${
                            isBonus
                              ? "text-primary"
                              : isPositive
                                ? "text-green-600"
                                : "text-red-500"
                          }`}
                        >
                          {isPositive ? "+" : "-"}
                          {Math.abs(Number(tx.amount) || 0)} cr
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {/* Sessions */}
          {historyTab === "sessions" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "All" },
                  { key: "upcoming", label: "📅 Upcoming" },
                  { key: "completed", label: "✅ Completed" },
                  { key: "cancelled", label: "❌ Cancelled" },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setSessFilter(filter.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      sessFilter === filter.key
                        ? "bg-primary text-white border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              {sessLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : !filteredSessions.length ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No sessions found.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSessions.map((session: any) => {
                    const meta =
                      statusMeta[session.status] ??
                      statusMeta.requested;
                    const StatusIcon = meta.icon;
                    const dateStr =
                      session.scheduledDate ||
                      session.scheduledAt;
                    return (
                      <div
                        key={session.id}
                        className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm">
                              {session.skill}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.color}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {meta.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {session.mentor && (
                              <p className="text-xs text-muted-foreground">
                                👨‍🏫 {session.mentor.name}
                              </p>
                            )}
                            {dateStr && (
                              <p className="text-xs text-muted-foreground">
                                📅{" "}
                                {format(
                                  new Date(dateStr),
                                  "MMM d, yyyy"
                                )}
                              </p>
                            )}
                            {session.teacherRating && (
                              <p className="text-xs text-yellow-600 flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {session.teacherRating}/5
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p
                            className={`font-black text-sm tabular-nums ${
                              session.status === "completed"
                                ? "text-green-600"
                                : session.status === "cancelled"
                                  ? "text-red-500"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {session.status === "completed"
                              ? "+"
                              : session.status === "cancelled"
                                ? "↩"
                                : "-"}
                            {session.creditsAmount} cr
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {session.sessionType?.replace("_", " ")}
                          </p>
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
