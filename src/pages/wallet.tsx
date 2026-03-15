import { useGetWallet, useGetTransactions } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { format } from "date-fns";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, Gift, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Wallet() {
  const options = useApiOptions();

  const { data: wallet, isLoading: walletLoading } = useGetWallet(options);
  const { data: transactions, isLoading: txLoading } = useGetTransactions(options);

  return (
    <div className="py-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <WalletIcon className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold">My Wallet</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Balance Card */}
        <div className="md:col-span-2 card-premium bg-gradient-to-br from-primary to-accent text-white p-8 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <p className="text-primary-foreground/80 font-medium uppercase tracking-wider text-sm mb-2">Available Balance</p>
            {walletLoading ? (
              <Skeleton className="h-16 w-48 bg-white/20" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-extrabold tracking-tighter">{wallet?.balance || 0}</span>
                <span className="text-xl font-medium text-white/80">cr</span>
              </div>
            )}
            <p className="mt-6 text-sm text-white/80 max-w-sm">
              Use credits to book learning sessions. Earn more by teaching others!
            </p>
          </div>
        </div>

        {/* Stats Column */}
        <div className="flex flex-col gap-6">
          <div className="card-premium flex-1 flex flex-col justify-center">
            <p className="text-sm font-bold text-muted-foreground uppercase mb-1">Total Earned</p>
            {walletLoading ? <Skeleton className="h-8 w-24" /> : (
              <p className="text-2xl font-bold text-green-600 flex items-center gap-1">
                <ArrowUpRight className="w-5 h-5" /> {wallet?.totalEarned || 0}
              </p>
            )}
          </div>
          <div className="card-premium flex-1 flex flex-col justify-center">
            <p className="text-sm font-bold text-muted-foreground uppercase mb-1">Total Spent</p>
            {walletLoading ? <Skeleton className="h-8 w-24" /> : (
              <p className="text-2xl font-bold text-destructive flex items-center gap-1">
                <ArrowDownRight className="w-5 h-5" /> {Math.abs(wallet?.totalSpent || 0)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card-premium mt-8">
        <h2 className="text-xl font-bold mb-6 pb-4 border-b border-border/50">Transaction History</h2>
        
        {txLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : transactions?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No transactions yet.
          </div>
        ) : (
          <div className="space-y-1">
            {transactions?.map(tx => {
              const isPositive = tx.amount > 0;
              const Icon = tx.type === 'bonus' ? Gift : (isPositive ? ArrowUpRight : ArrowDownRight);
              
              return (
                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-xl transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'bonus' ? 'bg-primary/10 text-primary' :
                      isPositive ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm sm:text-base">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(tx.createdAt), 'MMM d, yyyy • h:mm a')}</p>
                    </div>
                  </div>
                  <div className={`font-bold whitespace-nowrap text-right ${
                    tx.type === 'bonus' ? 'text-primary' :
                    isPositive ? 'text-green-600' : 'text-foreground'
                  }`}>
                    {isPositive ? '+' : ''}{tx.amount} cr
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}
