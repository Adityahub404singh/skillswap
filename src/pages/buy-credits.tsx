import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Zap, Star, Crown, Rocket, Check, Loader2, ShieldCheck, CreditCard, Lock, Sparkles, TrendingUp } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-utils";
import { motion } from "framer-motion";

// ?? Added "save" percentages to attract users to bigger packs!
const PACKAGES = [
  { id: "starter", credits: 100, price: 99, label: "Starter", icon: Zap, color: "from-blue-400 to-blue-600", popular: false, save: null },
  { id: "popular", credits: 300, price: 249, label: "Most Popular", icon: Star, color: "from-violet-500 to-purple-600", popular: true, save: "17% OFF" },
  { id: "pro", credits: 700, price: 499, label: "Pro Learner", icon: Rocket, color: "from-rose-400 to-red-600", popular: false, save: "28% OFF" },
  { id: "elite", credits: 1500, price: 999, label: "Elite Master", icon: Crown, color: "from-amber-400 to-orange-500", popular: false, save: "33% OFF" },
];

declare global { interface Window { Razorpay: any; } }

function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay failed to load"));
    document.body.appendChild(script);
  });
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
      const res = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
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
        name: "SkillSwap Premium",
        description: `Unlock ${pkg.credits} Learning Credits`,
        image: "https://skillswap.app/logo.png",
        order_id: order.orderId,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: pkg.id === 'popular' ? "#8b5cf6" : "#0f172a" },
        handler: async (response: any) => {
          const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...response, credits: order.credits }),
          });
          const result = await verifyRes.json();
          if (result.success) {
            toast({ title: "?? Payment Successful!", description: `${pkg.credits} credits have been added to your wallet!` });
            queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
            queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
          } else {
            toast({ variant: "destructive", title: "Verification Failed", description: "Please contact support." });
          }
          setLoading(null);
        },
        modal: { ondismiss: () => setLoading(null) },
      };

      await loadRazorpay();
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Something went wrong" });
      setLoading(null);
    }
  };

  // ?? FIX: "spring" ke aage 'as const' laga diya taaki TypeScript error na de
  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } } };

  return (
    <div className="py-10 px-4 max-w-6xl mx-auto overflow-hidden">
      
      {/* ?? HERO SECTION */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-extrabold uppercase tracking-widest border border-primary/20 mb-2">
          <Sparkles className="w-4 h-4" /> Invest in Yourself
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
          Unlock Unlimited <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-primary">Learning Power</span>
        </h1>
        <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto font-medium">
          Get credits instantly to book 1-on-1 sessions with top mentors. <br className="hidden md:block"/> 
          <span className="text-slate-700 font-bold">1 Credit = 1 Rupee = Unlimited Possibilities.</span>
        </p>
      </motion.div>

      {/* ?? PRICING CARDS */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-5xl mx-auto items-center">
        {PACKAGES.map((pkg) => {
          const Icon = pkg.icon;
          const isPopular = pkg.popular;
          
          return (
            <motion.div key={pkg.id} variants={item} 
              className={`relative bg-white rounded-3xl p-6 flex flex-col h-full transition-all duration-300 ${
                isPopular 
                  ? "border-2 border-violet-500 shadow-[0_0_40px_-10px_rgba(139,92,246,0.3)] md:-translate-y-4 scale-105 z-10" 
                  : "border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1"
              }`}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1">
                  <Star className="w-3 h-3 fill-white" /> BEST VALUE
                </div>
              )}

              {/* Save Badge */}
              {pkg.save && (
                <div className="absolute top-4 right-4 bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded-md border border-green-200">
                  {pkg.save}
                </div>
              )}

              <div className="flex flex-col items-center text-center mt-2 flex-grow">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${pkg.color} flex items-center justify-center shadow-lg shadow-current/30 mb-6 transform transition-transform hover:scale-110 duration-300`}>
                  <Icon className="w-8 h-8 text-white drop-shadow-md" />
                </div>
                
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">{pkg.label}</h3>
                
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className="text-5xl font-black text-slate-900 tracking-tighter">{pkg.credits}</span>
                </div>
                <p className="text-sm font-semibold text-slate-500 mb-6">Learning Credits</p>

                <div className="text-3xl font-extrabold text-slate-900 mb-8 flex items-center justify-center gap-1">
                  <span className="text-lg text-slate-400 font-medium">?</span>{pkg.price}
                </div>

                <ul className="text-sm text-slate-600 space-y-3 text-left w-full mb-8 font-medium">
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-green-100 p-0.5"><Check className="w-3 h-3 text-green-600" /></div>
                    <span>Get exactly <b>{pkg.credits}</b> credits</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-green-100 p-0.5"><Check className="w-3 h-3 text-green-600" /></div>
                    <span>Never expires (Lifetime validity)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-green-100 p-0.5"><Check className="w-3 h-3 text-green-600" /></div>
                    <span>Instant wallet top-up</span>
                  </li>
                </ul>
              </div>

              <Button
                className={`w-full text-white font-extrabold text-base rounded-xl h-14 shadow-lg transition-all ${
                  isPopular 
                    ? `bg-gradient-to-r ${pkg.color} hover:shadow-purple-500/25 hover:scale-[1.02]` 
                    : "bg-slate-900 hover:bg-slate-800 hover:shadow-slate-900/20 hover:scale-[1.02]"
                }`}
                onClick={() => handleBuy(pkg)}
                disabled={loading === pkg.id}
              >
                {loading === pkg.id ? <Loader2 className="w-6 h-6 animate-spin" /> : `Pay ?${pkg.price}`}
              </Button>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ??? TRUST & SECURITY BANNER */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-16 max-w-3xl mx-auto">
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">100% Secure Payments</h4>
              <p className="text-sm text-slate-500 font-medium">Bank-grade 256-bit SSL encryption. We never store your card details.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <CreditCard className="w-8 h-8" />
            <Lock className="w-7 h-7" />
            <TrendingUp className="w-8 h-8" />
          </div>
        </div>
      </motion.div>

    </div>
  );
}

