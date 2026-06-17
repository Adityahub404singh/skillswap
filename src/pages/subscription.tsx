import { motion } from "framer-motion";
import { Link } from "wouter";
import { Check, Zap, Crown, Star, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/logo";

const PLANS = [
  {
    name: "Free",
    price: 0,
    color: "from-slate-500 to-slate-600",
    icon: Zap,
    features: [
      "200 welcome credits",
      "5 sessions per month",
      "Basic AI matching",
      "Community access",
      "1 skill verification",
    ],
    cta: "Get Started Free",
    href: "/register",
    popular: false,
  },
  {
    name: "Pro",
    price: 199,
    color: "from-primary to-accent",
    icon: Star,
    features: [
      "500 bonus credits/month",
      "Unlimited sessions",
      "Priority AI matching",
      "Verified badge",
      "5 skill verifications",
      "Portfolio share link",
      "Priority support",
    ],
    cta: "Go Pro",
    href: "/buy-credits",
    popular: true,
  },
  {
    name: "Elite",
    price: 499,
    color: "from-yellow-500 to-orange-500",
    icon: Crown,
    features: [
      "2000 bonus credits/month",
      "Unlimited sessions",
      "Top of search results",
      "Elite badge + crown",
      "Unlimited verifications",
      "Custom portfolio page",
      "Dedicated support",
      "Revenue share program",
    ],
    cta: "Go Elite",
    href: "/buy-credits",
    popular: false,
  },
];

export default function Subscription() {
  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.15 } } };
  const item = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" /> Choose your plan
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
            Supercharge Your <span className="text-primary">Learning</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Start free. Upgrade when you need more power. Cancel anytime.
          </p>
        </motion.div>

        <motion.div variants={container} initial="hidden" animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <motion.div key={plan.name} variants={item} whileHover={{ y: -8 }}
                className={"relative card-premium flex flex-col " + (plan.popular ? "ring-2 ring-primary shadow-xl shadow-primary/20" : "")}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-lg">
                    MOST POPULAR
                  </div>
                )}
                <div className={"w-12 h-12 rounded-2xl bg-gradient-to-br " + plan.color + " flex items-center justify-center mb-4 shadow-lg"}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-extrabold">Free</span>
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold">Rs.{plan.price}</span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </>
                  )}
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href={plan.href}>
                  <Button className={"w-full font-bold rounded-xl h-12 " + (plan.popular ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25" : "")}>
                    {plan.cta} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-12 text-center text-sm text-muted-foreground">
          <p>All plans include SSL security · No hidden fees · Cancel anytime</p>
          <p className="mt-2 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            10,000+ learners already on SkillSwap
          </p>
        </motion.div>
      </div>
    </div>
  );
}
