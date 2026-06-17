import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Zap, Star, Crown, Rocket, Check, Loader2 } from "lucide-react";

const PACKAGES = [
  { id: "starter", credits: 100, price: 99, label: "Starter", icon: Zap, color: "from-blue-500 to-blue-600", popular: false },
  { id: "popular", credits: 300, price: 249, label: "Popular", icon: Star, color: "from-purple-500 to-purple-600", popular: true },
  { id: "pro", credits: 700, price: 499, label: "Pro", icon: Rocket, color: "from-orange-500 to-orange-600", popular: false },
  { id: "elite", credits: 1500, price: 999, label: "Elite", icon: Crown, color: "from-yellow-500 to-yellow-600", popular: false },
];

declare global {
  interface Window { Razorpay: any; }
}

export default function BuyCredits() {
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user) as any;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleBuy = async (pkg: typeof PACKAGES[0]) => {
    setLoading(pkg.id);
    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const order = await res.json();
      if (!res.ok) { toast({ variant: "destructive", title: "Error", description: order.error }); setLoading(null); return; }

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "SkillSwap",
        description: `${pkg.credits} Credits - ${pkg.label} Pack`,
        order_id: order.orderId,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: "#7c3aed" },
        handler: async (response: any) => {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...response, credits: order.credits }),
          });
          const result = await verifyRes.json();
          if (result.success) {
            toast({ title: "Payment Successful!", description: `${pkg.credits} credits added to your wallet!` });
            queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
            queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
          } else {
            toast({ variant: "destructive", title: "Verification Failed", description: "Please contact support." });
          }
          setLoading(null);
        },
        modal: { ondismiss: () => setLoading(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Something went wrong" });
      setLoading(null);
    }
  };

  return (
    <div className="py-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold">Buy Credits</h1>
        <p className="text-muted-foreground text-lg">Power up your learning journey with credits</p>
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold">
          <Zap className="w-4 h-4" /> 1 Credit = 1 Rupee = 1 Hour of learning potential
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {PACKAGES.map((pkg) => {
          const Icon = pkg.icon;
          return (
            <div key={pkg.id} className={`relative card-premium p-6 flex flex-col items-center text-center gap-4 transition-all hover:scale-105 ${pkg.popular ? "ring-2 ring-primary shadow-lg shadow-primary/20" : ""}`}>
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </div>
              )}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${pkg.color} flex items-center justify-center shadow-lg`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{pkg.label}</p>
                <p className="text-4xl font-extrabold mt-1">{pkg.credits}</p>
                <p className="text-sm text-muted-foreground">credits</p>
              </div>
              <div className="text-2xl font-bold text-primary">
                Rs.{pkg.price}
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 text-left w-full">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> {pkg.credits} learning credits</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Never expires</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Instant delivery</li>
              </ul>
              <Button
                className={`w-full bg-gradient-to-r ${pkg.color} text-white font-bold rounded-xl h-11 mt-auto`}
                onClick={() => handleBuy(pkg)}
                disabled={loading === pkg.id}
              >
                {loading === pkg.id ? <Loader2 className="w-5 h-5 animate-spin" /> : `Buy for Rs.${pkg.price}`}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="card-premium p-6 bg-muted/30 text-center space-y-2">
        <p className="font-bold text-lg">100% Secure Payments</p>
        <p className="text-muted-foreground text-sm">Powered by Razorpay. Your payment info is never stored on our servers.</p>
        <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <span>UPI</span><span>Credit Card</span><span>Debit Card</span><span>Net Banking</span><span>Wallets</span>
        </div>
      </div>
    </div>
  );
}


