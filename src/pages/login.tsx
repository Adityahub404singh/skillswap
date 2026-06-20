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
import { Preferences } from '@capacitor/preferences';
import {
  ArrowRight, Mail, Lock, Loader2, Zap,
  Star, Gift, Sparkles
} from "lucide-react";

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
      onSuccess: async (data: any) => {
        // Handle successful login
        await Preferences.set({ key: 'skillswap_token', value: data.token });
        localStorage.setItem("skillswap_token", data.token);
        setToken(data.token);
        toast({ title: "Welcome back! 👋", description: "Successfully logged in." });
        setLocation("/dashboard");
      },
      onError: (error: any, variables: any) => {
        console.error("Login Error:", error);

        // Backend ka 403 response — axios style aur fetch-wrapper style dono handle karo
        const errData = error?.response?.data ?? error?.data ?? error;
        const submittedEmail = variables?.data?.email;

        // 🔥 Agar email verified nahi hai, toh Verify page pe bhejo
        if (errData?.requiresVerification) {
          toast({
            title: "Email not verified",
            description: "We've sent a new OTP to your email.",
          });
          setLocation(`/verify-email?email=${encodeURIComponent(errData.email || submittedEmail || "")}`);
          return;
        }

        toast({
          variant: "destructive",
          title: "Login failed",
          description: errData?.message || "Invalid email or password. Please try again.",
        });
      },
    },
  });

  const onSubmit = (data: LoginForm) => loginMutation.mutate({ data });

  const handleGoogleSignIn = () => {
    toast({
      title: "Coming Soon 🚀",
      description: "Google Sign-In is in progress. Please use email for now.",
    });
  };

  return (
    <div className="min-h-screen flex items-stretch">

      {/* ── LEFT PANEL (desktop only - Matches Register UI) ── */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>

        {/* Ambient glow */}
        <div className="absolute top-[-80px] left-[-80px] w-[340px] h-[340px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-[280px] h-[280px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-16">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/10">
              <Zap className="w-5 h-5 text-indigo-300" />
            </div>
            <span className="text-white font-black text-xl tracking-tight">SkillSwap</span>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-indigo-300 text-xs font-bold uppercase tracking-[0.2em] mb-3">Welcome Back</p>
              <h2 className="text-white text-4xl font-black leading-[1.1] tracking-tight">
                Resume learning.<br />
                <span style={{ color: "#a5b4fc" }}>Keep teaching.</span>
              </h2>
            </div>

            <p className="text-white/50 text-sm leading-relaxed max-w-[280px]">
              Access your personalized dashboard, upcoming sessions, and messages.
            </p>
          </div>
        </div>

        {/* Stats / Features */}
        <div className="relative z-10 space-y-4">
          {[
            { icon: Gift, label: "Earn by teaching", value: "Grow your wallet" },
            { icon: Star, label: "Learn from experts", value: "1-on-1 Sessions" },
            { icon: Zap, label: "Community powered", value: "No real money" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 p-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(99,102,241,0.2)" }}>
                <Icon className="w-4 h-4 text-indigo-300" />
              </div>
              <div>
                <p className="text-white/40 text-[11px] leading-none mb-1">{label}</p>
                <p className="text-white font-black text-sm">{value}</p>
              </div>
            </div>
          ))}

          <p className="text-white/20 text-xs pt-2">
            Don't have an account?{" "}
            <Link href="/register" className="text-indigo-300 hover:text-indigo-200 font-semibold underline underline-offset-2">
              Create one free
            </Link>
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL (Form Area) ── */}
      <div className="flex-1 flex flex-col justify-center py-10 px-6 sm:px-10 lg:px-16 bg-background overflow-y-auto">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="font-black text-lg tracking-tight">SkillSwap</span>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[420px] mx-auto"
        >
          {/* Heading */}
          <div className="mb-7 text-center lg:text-left">
            <h1 className="text-3xl font-black tracking-tight mb-2">Sign in</h1>
            <p className="text-muted-foreground text-sm">
              Welcome back! Please enter your details.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {/* Google Sign-In Button */}
            <button type="button" onClick={handleGoogleSignIn}
              className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors text-sm font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">
                  or sign in with email
                </span>
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="email" 
                  placeholder="you@email.com" 
                  className={`pl-9 h-12 text-sm bg-background/50 focus-visible:ring-primary/20 ${errors.email ? "border-destructive" : ""}`} 
                  {...register("email")} 
                />
              </div>
              {errors.email && <p className="text-[11px] text-destructive">{errors.email.message}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Password</label>
                <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className={`pl-9 h-12 text-sm bg-background/50 focus-visible:ring-primary/20 ${errors.password ? "border-destructive" : ""}`} 
                  {...register("password")} 
                />
              </div>
              {errors.password && <p className="text-[11px] text-destructive">{errors.password.message}</p>}
            </div>

            {/* Submit Button */}
            <button type="submit" disabled={loginMutation.isPending}
              className="w-full h-12 mt-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:translate-y-0"
              style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", boxShadow: "0 8px 24px rgba(99,102,241,0.35)" }}>
              {loginMutation.isPending
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <>
                    <Sparkles className="w-4 h-4" />
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
              }
            </button>
          </form>

          {/* Mobile Register Link */}
          <p className="text-center text-sm text-muted-foreground mt-8 lg:hidden">
            Don't have an account?{" "}
            <Link href="/register" className="font-bold text-primary hover:underline">Create one free</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}