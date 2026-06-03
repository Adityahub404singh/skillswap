import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLoginUser } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { ArrowRight, Mail, Lock, Loader2, Sparkles, BookOpen, Zap, Shield } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuthStore();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useLoginUser({
    mutation: {
      onSuccess: (data: any) => {
        setToken(data.token);
        toast({ title: "Welcome back! 👋", description: "Successfully logged in." });
        setLocation("/dashboard");
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error?.response?.message || error?.message || "Invalid credentials. Please try again.",
        });
      },
    },
  });

  const onSubmit = (data: LoginForm) => loginMutation.mutate({ data });

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-12 px-4">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-violet-500/6 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

        {/* Left — branding */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden md:flex flex-col gap-6"
        >
          <div>
            <div className="flex items-center gap-2 mb-6">
              <img src="/logo.svg" alt="SkillSwap" className="w-10 h-10 rounded-xl" />
              <span className="font-black text-2xl">Skill<span className="text-primary">Swap</span></span>
            </div>
            <h2 className="text-4xl font-black leading-tight mb-3">
              Learn anything.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">
                Teach everything.
              </span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Sign in to access your sessions, credits, and personalized learning dashboard.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: Zap, text: "200 free credits on signup", color: "text-primary" },
              { icon: BookOpen, text: "Learn from real experts", color: "text-cyan-500" },
              { icon: Shield, text: "100% secure platform", color: "text-green-500" },
              { icon: Sparkles, text: "No real money needed", color: "text-violet-500" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-sm">
                <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center`}>
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <span className="text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right — form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="text-center mb-6 md:hidden">
            <div className="flex items-center justify-center gap-2 mb-3">
              <img src="/logo.svg" alt="SkillSwap" className="w-9 h-9 rounded-xl" />
              <span className="font-black text-xl">Skill<span className="text-primary">Swap</span></span>
            </div>
          </div>

          <div className="p-7 rounded-3xl bg-background border border-border shadow-xl shadow-black/5">
            <h1 className="text-2xl font-black mb-1">Welcome back</h1>
            <p className="text-muted-foreground text-sm mb-6">Sign in to your account</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    className={`pl-10 h-12 border-2 focus-visible:ring-primary/20 ${errors.email ? "border-destructive" : "border-border focus:border-primary/50"}`}
                    {...register("email")}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold">Password</label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className={`pl-10 h-12 border-2 focus-visible:ring-primary/20 ${errors.password ? "border-destructive" : "border-border focus:border-primary/50"}`}
                    {...register("password")}
                  />
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full h-12 rounded-2xl font-bold text-base shadow-lg shadow-primary/20 mt-2"
              >
                {loginMutation.isPending
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <span className="flex items-center gap-2">Sign In <ArrowRight className="w-4 h-4" /></span>
                }
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-border text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="font-bold text-primary hover:underline inline-flex items-center gap-1">
                Create one free <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
