
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Star,
  Crown,
  Rocket,
  Check,
  Loader2,
  ShieldCheck,
  CreditCard,
  Lock,
  Sparkles,
  TrendingUp,
  Coins,
  ArrowRight,
  BadgeCheck,
  Wallet,
  Gift,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api-utils";
import { motion, Variants } from "framer-motion";

const PACKAGES = [
  {
    id: "starter",
    credits: 100,
    price: 99,
    label: "Starter",
    subtitle: "Try SkillSwap",
    icon: Zap,
    color: "from-blue-500 to-cyan-500",
    popular: false,
    save: null,
  },
  {
    id: "popular",
    credits: 300,
    price: 249,
    label: "Popular",
    subtitle: "Best for regular learners",
    icon: Star,
    color: "from-violet-500 to-purple-600",
    popular: true,
    save: "17% OFF",
  },
  {
    id: "pro",
    credits: 700,
    price: 499,
    label: "Pro Learner",
    subtitle: "For serious learning",
    icon: Rocket,
    color: "from-rose-500 to-red-600",
    popular: false,
    save: "28% OFF",
  },
  {
    id: "elite",
    credits: 1500,
    price: 999,
    label: "Elite Master",
    subtitle: "Maximum value",
    icon: Crown,
    color: "from-amber-400 to-orange-500",
    popular: false,
    save: "33% OFF",
  },
];

declare global {
  interface Window {
    Razorpay: any;
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();

  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    ) as HTMLScriptElement | null;

    const script = existing || document.createElement("script");

    const cleanup = () => {
      razorpayScriptPromise = null;
    };

    script.onload = () => {
      if (window.Razorpay) {
        resolve();
      } else {
        cleanup();
        reject(new Error("Razorpay checkout could not initialize."));
      }
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Unable to load Razorpay. Check your connection."));
    };

    if (!existing) {
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    } else if (window.Razorpay) {
      resolve();
    }
  });

  return razorpayScriptPromise;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 280,
      damping: 24,
    },
  },
};

export default function BuyCredits() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user) as any;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [loading, setLoading] = useState<string | null>(null);

  const handleBuy = async (pkg: (typeof PACKAGES)[number]) => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Login required",
        description: "Please log in before purchasing credits.",
      });
      return;
    }

    if (loading) return;

    setLoading(pkg.id);

    try {
      // Step 1: Create order from backend.
      const orderResponse = await fetch(
        `${API_BASE_URL}/api/payment/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ packageId: pkg.id }),
        }
      );

      const order = await orderResponse.json().catch(() => ({}));

      if (!orderResponse.ok || !order.success || !order.orderId) {
        throw new Error(
          order.error || "Unable to create payment order. Please try again."
        );
      }

      // Use backend order values as the source of truth.
      if (
        !order.keyId ||
        !Number.isSafeInteger(Number(order.amount)) ||
        Number(order.amount) <= 0 ||
        !order.currency
      ) {
        throw new Error("Invalid payment order received from server.");
      }

      // Step 2: Load Razorpay checkout.
      await loadRazorpay();

      let verificationStarted = false;

      const checkoutOptions = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "SkillSwap",
        description: `Purchase ${order.credits ?? pkg.credits} Learning Credits`,
        order_id: order.orderId,

        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },

        theme: {
          color: pkg.id === "popular" ? "#8b5cf6" : "#4f46e5",
        },

        modal: {
          ondismiss: () => {
            if (!verificationStarted) {
              setLoading(null);
              toast({
                title: "Payment cancelled",
                description: "You can try again whenever you're ready.",
              });
            }
          },
        },

        handler: async (paymentResponse: any) => {
          verificationStarted = true;

          try {
            // Step 3: Verify payment on backend.
            const verifyResponse = await fetch(
              `${API_BASE_URL}/api/payment/verify`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(paymentResponse),
              }
            );

            const result = await verifyResponse.json().catch(() => ({}));

            if (!verifyResponse.ok || !result.success) {
              throw new Error(
                result.error ||
                  "Payment verification could not be completed."
              );
            }

            toast({
              title: "🎉 Payment Successful!",
              description: `${result.credits ?? order.credits ?? pkg.credits} credits have been added to your wallet.`,
            });

            // Refresh wallet and user data.
            await Promise.all([
              queryClient.invalidateQueries({
                queryKey: ["/api/wallet"],
              }),
              queryClient.invalidateQueries({
                queryKey: ["/api/users/me"],
              }),
            ]);
          } catch (error: any) {
            console.error("Payment verification error:", error);

            toast({
              variant: "destructive",
              title: "Payment received, verification pending",
              description:
                "Do not pay again immediately. Save your payment ID and contact support if your wallet is not updated.",
            });
          } finally {
            setLoading(null);
          }
        },
      };

      // Step 4: Open checkout.
      const razorpay = new window.Razorpay(checkoutOptions);

      razorpay.on("payment.failed", (response: any) => {
        console.error("Razorpay payment failed:", response?.error);

        toast({
          variant: "destructive",
          title: "Payment failed",
          description:
            response?.error?.description ||
            "Your payment could not be completed. Please try again.",
        });

        setLoading(null);
      });

      razorpay.open();
    } catch (error: any) {
      console.error("Credit purchase error:", error);

      toast({
        variant: "destructive",
        title: "Unable to start payment",
        description: error.message || "Something went wrong. Please try again.",
      });

      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10 md:py-14 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative text-center mb-14"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-60 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-xs md:text-sm font-extrabold uppercase tracking-widest border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4" />
              Invest In Yourself
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground leading-tight">
              Unlock Your
              <br className="sm:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-500 to-primary">
                {" "}Learning Potential
              </span>
            </h1>

            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mt-5 leading-relaxed">
              Get learning credits and connect with mentors.
              Book personalized one-on-one sessions and grow your skills.
            </p>

            <div className="flex flex-wrap justify-center gap-3 mt-7">
              <div className="flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-sm font-semibold">
                <Zap className="w-4 h-4 text-yellow-500" />
                Instant wallet credit
              </div>

              <div className="flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-sm font-semibold">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                Secure checkout
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pricing heading */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-foreground">
            Choose Your Credit Pack
          </h2>
          <p className="text-muted-foreground text-sm mt-2">
            Pick the package that matches your learning goals.
          </p>
        </div>

        {/* Pricing cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 items-stretch"
        >
          {PACKAGES.map((pkg) => {
            const Icon = pkg.icon;
            const isPopular = pkg.popular;
            const perCredit = (pkg.price / pkg.credits).toFixed(2);

            return (
              <motion.div
                key={pkg.id}
                variants={itemVariants}
                whileHover={{ y: -6 }}
                className={`relative flex flex-col rounded-[28px] p-6 transition-all duration-300 ${
                  isPopular
                    ? "bg-card border-2 border-violet-500 shadow-xl shadow-violet-500/10 lg:scale-[1.04] z-10"
                    : "bg-card border border-border shadow-sm hover:shadow-xl"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-widest shadow-lg">
                    <Star className="w-3 h-3 inline mr-1 fill-white" />
                    Best Value
                  </div>
                )}

                {pkg.save && (
                  <div className="absolute top-5 right-5 text-[10px] font-black bg-green-500/10 text-green-600 border border-green-500/20 px-2.5 py-1 rounded-lg">
                    {pkg.save}
                  </div>
                )}

                <div className="flex flex-col items-center text-center flex-1 pt-3">

                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${pkg.color} flex items-center justify-center shadow-lg mb-5`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-lg font-black text-foreground">
                    {pkg.label}
                  </h3>

                  <p className="text-xs text-muted-foreground mt-1 mb-6">
                    {pkg.subtitle}
                  </p>

                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black tracking-tighter text-foreground">
                      {pkg.credits.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground mt-2">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    Learning Credits
                  </div>

                  <div className="w-full border-t border-border my-6" />

                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-xl text-muted-foreground font-semibold">
                      ₹
                    </span>
                    <span className="text-4xl font-black text-foreground">
                      {pkg.price.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2 mb-6">
                    Approximately ₹{perCredit} per credit
                  </p>

                  <div className="w-full space-y-4 text-left mb-8">
                    {[
                      `Exactly ${pkg.credits} credits`,
                      "No expiry on purchased credits*",
                      "Use credits to book sessions",
                      "Secure Razorpay checkout",
                    ].map((feature) => (
                      <div key={feature} className="flex gap-3 items-start">
                        <div className="w-5 h-5 shrink-0 rounded-full bg-green-500/10 flex items-center justify-center">
                          <Check className="w-3 h-3 text-green-600" />
                        </div>

                        <span className="text-sm text-muted-foreground font-medium">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  className={`w-full h-13 rounded-2xl text-white font-extrabold text-base transition-all ${
                    isPopular
                      ? `bg-gradient-to-r ${pkg.color} hover:opacity-90 shadow-lg`
                      : "bg-foreground text-background hover:opacity-90"
                  }`}
                  onClick={() => handleBuy(pkg)}
                  disabled={loading !== null}
                >
                  {loading === pkg.id ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Buy Credits
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

              </motion.div>
            );
          })}
        </motion.div>

        <p className="text-xs text-muted-foreground text-center mt-5">
          *Credit validity and usage are subject to SkillSwap's platform terms.
        </p>

        {/* Payment security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-16 rounded-[28px] border border-border bg-card p-6 md:p-9"
        >
          <div className="grid md:grid-cols-[1fr_auto] gap-7 items-center">

            <div className="flex gap-4 items-start">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-7 h-7 text-green-600" />
              </div>

              <div>
                <h3 className="text-xl font-black text-foreground">
                  Secure Payments, Peace of Mind
                </h3>

                <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
                  Payments are processed through Razorpay's secure checkout.
                  SkillSwap does not directly collect or store your card details.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5 text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <Lock className="w-7 h-7 text-green-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Secure
                </span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <CreditCard className="w-7 h-7 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Checkout
                </span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <BadgeCheck className="w-7 h-7 text-blue-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Verified
                </span>
              </div>
            </div>

          </div>
        </motion.div>

        {/* Bottom information */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="w-4 h-4" />
            Your purchased credits are added after server-side payment verification.
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            SkillSwap · Learn. Teach. Grow.
          </p>
        </div>

      </div>
    </div>
  );
}
