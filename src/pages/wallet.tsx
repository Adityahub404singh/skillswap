import { useState } from "react";
import { useGetWallet, useGetTransactions } from "@/lib/api";
import { useApiOptions, API_BASE_URL } from "@/lib/api-utils";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, Gift, Loader2, Copy, Check, Users, CreditCard, Send, X } from "lucide-react";
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

  // ✅ FIXED: Removed wallet?.referralCode (doesn't exist on Wallet type)
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
      toast({ variant: "destructive", title: "Error", description: "Please fill all fields" });
      return;
    }
    const amount = parseInt(withdrawAmount);
    if (amount < 500) {
      toast({ variant: "destructive", title: "Minimum 500 credits required", description: "You need at least 500 credits to withdraw" });
      return;
    }
    if (amount > (wallet?.balance || 0)) {
      toast({ variant: "destructive", title: "Insufficient balance", description: "You don't have enough credits" });
      return;
    }
    setWithdrawLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/wallet/withdraw`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount, upiId })
      });
      if (res.ok) {
        toast({ title: "Withdrawal Requested! 🎉", description: `₹${amount} withdrawal request submitted. Will be processed in 24-48 hours.` });
        setShowWithdraw(false);
        setWithdrawAmount("");
        setUpiId("");
      } else {
        toast({ variant: "destructive", title: "Failed", description: "Withdrawal request failed. Try again." });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Something went wrong" });
    }
    setWithdrawLoading(false);
  };

  return (
    <div className="py-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <WalletIcon className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold">My Wallet</h1>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card-premium bg-gradient-premium text-white p-8 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <p className="text-white/80 font-medium uppercase tracking-wider text-sm mb-2">Available Balance</p>
            {walletLoading ? (
              <Skeleton className="h-16 w-48 bg-white/20" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-extrabold tracking-tighter">{wallet?.balance || 0}</span>
                <span className="text-xl font-medium text-white/80">cr</span>
              </div>
            )}
            <p className="mt-3 text-sm text-white/70">= ₹{wallet?.balance || 0} withdrawal value</p>
            <div className="mt-6 flex gap-3">
              <Button
                onClick={() => setShowWithdraw(true)}
                className="bg-white text-primary hover:bg-white/90 font-bold rounded-full h-10 px-5"
                disabled={(wallet?.balance || 0) < 500}
              >
                <Send className="w-4 h-4 mr-2" /> Withdraw
              </Button>
              {(wallet?.balance || 0) < 500 && (
                <p className="text-white/60 text-xs self-center">Min. 500 cr needed</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card-premium flex-1 flex flex-col justify-center">
            <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Total Earned</p>
            {walletLoading ? <Skeleton className="h-8 w-24" /> : (
              <p className="text-2xl font-bold text-green-600 flex items-center gap-1">
                <ArrowUpRight className="w-5 h-5" /> {wallet?.totalEarned || 0} cr
              </p>
            )}
          </div>
          <div className="card-premium flex-1 flex flex-col justify-center">
            <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Total Spent</p>
            {walletLoading ? <Skeleton className="h-8 w-24" /> : (
              <p className="text-2xl font-bold text-destructive flex items-center gap-1">
                <ArrowDownRight className="w-5 h-5" /> {Math.abs(wallet?.totalSpent || 0)} cr
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Referral Section */}
      <div className="card-premium border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Refer & Earn</h2>
            <p className="text-sm text-muted-foreground">Earn 50 credits for first referral, 25 for each after</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Your Bonus", value: "50 cr", sub: "first referral" },
            { label: "Friend Gets", value: "200 cr", sub: "signup bonus" },
            { label: "Next Referrals", value: "25 cr", sub: "each" },
          ].map(s => (
            <div key={s.label} className="bg-background/60 rounded-xl p-3 text-center border border-primary/10">
              <p className="text-lg font-extrabold text-primary">{s.value}</p>
              <p className="text-xs font-semibold text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="flex-1 bg-background border-2 border-primary/20 rounded-xl px-4 py-3 text-sm font-mono text-primary truncate">
            {referralLink}
          </div>
          <Button onClick={copyReferral} className="bg-primary text-white rounded-xl px-4 font-bold">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 ml-1">Share this link — when friends sign up, you both get credits!</p>
      </div>

      {/* Transaction History */}
      <div className="card-premium">
        <h2 className="text-xl font-bold mb-6 pb-4 border-b border-border/50">Transaction History</h2>
        {txLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : !transactions?.length ? (
          <div className="text-center py-12 text-muted-foreground">No transactions yet.</div>
        ) : (
          <div className="space-y-1">
            {transactions?.map((tx: any) => {
              const isPositive = tx.amount > 0;
              const Icon = tx.type === 'bonus' || tx.type === 'referral' ? Gift : (isPositive ? ArrowUpRight : ArrowDownRight);
              return (
                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-xl transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'bonus' || tx.type === 'referral' ? 'bg-primary/10 text-primary' :
                      isPositive ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), 'MMM d, yyyy • h:mm a')}</p>
                    </div>
                  </div>
                  <div className={`font-bold text-right ${
                    tx.type === 'bonus' || tx.type === 'referral' ? 'text-primary' :
                    isPositive ? 'text-green-600' : 'text-foreground'
                  }`}>
                    {isPositive ? '+' : ''}{tx.amount} cr
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-premium w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> Withdraw Credits
              </h3>
              <button onClick={() => setShowWithdraw(false)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Balance: <span className="font-bold text-primary">{wallet?.balance} cr</span> • Min: 500 cr • 1 cr = ₹1
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold mb-1 block">Amount (credits)</label>
                <Input
                  type="number"
                  placeholder="e.g. 500"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  min="500"
                  max={wallet?.balance}
                />
                {withdrawAmount && parseInt(withdrawAmount) >= 500 && (
                  <p className="text-xs text-green-600 mt-1">= ₹{withdrawAmount} will be transferred</p>
                )}
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">UPI ID</label>
                <Input
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={e => setUpiId(e.target.value)}
                />
              </div>
              <Button
                className="w-full bg-gradient-premium text-white font-bold rounded-xl h-12"
                onClick={handleWithdraw}
                disabled={withdrawLoading}
              >
                {withdrawLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Withdraw ₹${withdrawAmount || 0}`}
              </Button>
              <p className="text-xs text-muted-foreground text-center">Processed within 24-48 hours via UPI</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
