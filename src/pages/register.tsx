import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegisterUser } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import {
  ArrowRight, User, Mail, Lock, Loader2, BookOpen,
  Lightbulb, Check, Sparkles, Gift, Tag, Zap, Star
} from "lucide-react";

const POPULAR_SKILLS = [
  "Python", "JavaScript", "Design", "Spanish",
  "Photography", "Marketing", "Music", "Chess",
  "Web Dev", "DSA", "AI/ML", "English", "Maths", "Coding"
];

const STEPS = ["Account", "Skills", "Done"];

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  skillsTeachStr: z.string().optional(),
  skillsLearnStr: z.string().optional(),
  referralCode: z.string().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuthStore();
  const { toast } = useToast();
  const [step, setStep] = useState(0); // 0 = account, 1 = skills

  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get("ref") || "";

  const {
    register, handleSubmit, formState: { errors },
    watch, setValue, trigger, getValues
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { referralCode: refCode }
  });

  const watchTeach = watch("skillsTeachStr") || "";
  const watchLearn = watch("skillsLearnStr") || "";

  const handleToggleSkill = (
    skill: string,
    field: "skillsTeachStr" | "skillsLearnStr",
    currentVal: string
  ) => {
    let skills = currentVal.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (skills.includes(skill)) {
      skills = skills.filter((s: string) => s !== skill);
    } else {
      skills.push(skill);
    }
    setValue(field, skills.join(", "), { shouldValidate: true });
  };

  const isSelected = (skill: string, val: string) =>
    val.split(",").map((s: string) => s.trim()).filter(Boolean).includes(skill);

  const goNext = async () => {
    const valid = await trigger(["name", "email", "password"]);
    if (valid) setStep(1);
  };

  const registerMutation = useRegisterUser({
    mutation: {
      onSuccess: (resData: any, variables: any) => {
        // 🔥 ULTIMATE FIX: Jab register success ho, directly OTP page pe bhej do!
        toast({ 
          title: "Check your email! ✉️", 
          description: "We've sent a 6-digit OTP to verify your account." 
        });
        
        // Form mein jo email dala tha, usko URL mein attach karke verify page pe bhej rahe hain
        const registeredEmail = variables?.data?.email || "";
        setLocation(`/verify-email?email=${encodeURIComponent(registeredEmail)}`);
      },
      onError: (error: any) => {
        const err = error?.response?.data ?? error?.data ?? error;
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: err?.message || err?.error || "Something went wrong.",
        });
      },
    },
  });

  const onSubmit = (data: RegisterForm) => {
    const skillsTeach = data.skillsTeachStr
      ? data.skillsTeachStr.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];
    const skillsLearn = data.skillsLearnStr
      ? data.skillsLearnStr.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];
    registerMutation.mutate({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        skillsTeach,
        skillsLearn,
        referralCode: data.referralCode || undefined,
      },
    });
  };

  const handleGoogleSignIn = () => {
    toast({
      title: "Coming Soon 🚀",
      description: "Google Sign-In is in progress. Use email for now.",
    });
  };

  return (
    <div className="min-h-screen flex items-stretch">

      {/* ── LEFT PANEL (desktop only) ── */}
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
              <p className="text-indigo-300 text-xs font-bold uppercase tracking-[0.2em] mb-3">Why join?</p>
              <h2 className="text-white text-4xl font-black leading-[1.1] tracking-tight">
                Teach what<br />you know.<br />
                <span style={{ color: "#a5b4fc" }}>Learn what<br />you don't.</span>
              </h2>
            </div>

            <p className="text-white/50 text-sm leading-relaxed max-w-[280px]">
              A credit-based platform where skills are the currency. No subscriptions, no gatekeeping.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 space-y-4">
          {[
            { icon: Gift, label: "Free credits on signup", value: "200 cr" },
            { icon: Star, label: "Per referral bonus", value: "50 cr" },
            { icon: Zap, label: "Avg session price", value: "30–100 cr" },
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
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-300 hover:text-indigo-200 font-semibold underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col justify-center py-10 px-6 sm:px-10 lg:px-16 bg-background overflow-y-auto">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="font-black text-lg tracking-tight">SkillSwap</span>
        </div>

        <div className="w-full max-w-[480px] mx-auto">

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center transition-all duration-300 ${
                  i < step ? "bg-green-500 text-white" :
                  i === step ? "bg-primary text-white shadow-lg shadow-primary/30" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-semibold ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                {i < STEPS.length - 1 && (
                  <div className={`h-px w-6 transition-all duration-500 ${i < step ? "bg-green-400" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-3xl font-black tracking-tight mb-1">
              {step === 0 ? "Create your account" : "What do you know?"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {step === 0
                ? "Free forever. No credit card needed."
                : "Pick skills to teach and learn — you can change these later."}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* ── STEP 0: Account ── */}
            {step === 0 && (
              <>
                {/* Google */}
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

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-3 text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">
                      or with email
                    </span>
                  </div>
                </div>

                {/* Name + Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Jane Doe" className={`pl-9 h-11 text-sm ${errors.name ? "border-destructive" : ""}`} {...register("name")} />
                    </div>
                    {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="email" placeholder="you@email.com" className={`pl-9 h-11 text-sm ${errors.email ? "border-destructive" : ""}`} {...register("email")} />
                    </div>
                    {errors.email && <p className="text-[11px] text-destructive">{errors.email.message}</p>}
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="password" placeholder="Min 6 characters" className={`pl-9 h-11 text-sm ${errors.password ? "border-destructive" : ""}`} {...register("password")} />
                  </div>
                  {errors.password && <p className="text-[11px] text-destructive">{errors.password.message}</p>}
                </div>

                {/* Referral */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-green-500" /> Referral Code
                    <span className="font-normal normal-case text-muted-foreground/70">(optional)</span>
                  </label>
                  <Input placeholder="e.g. jane42" className="h-11 text-sm border-green-500/25 focus:border-green-500/50" {...register("referralCode")} />
                  {refCode && (
                    <p className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Referral code applied!
                    </p>
                  )}
                </div>

                {/* Bonus pill */}
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                  style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.07) 0%, rgba(139,92,246,0.07) 100%)", border: "1px solid rgba(99,102,241,0.15)" }}>
                  <Gift className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="text-xs font-semibold text-foreground/80">
                    You'll get <span className="text-primary font-black">200 free credits</span> the moment you create your account.
                  </p>
                </div>

                <button type="button" onClick={goNext}
                  className="w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", boxShadow: "0 8px 24px rgba(99,102,241,0.35)" }}>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* ── STEP 1: Skills ── */}
            {step === 1 && (
              <>
                {/* Teach */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-400/15 flex items-center justify-center">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <label className="text-sm font-bold">I can teach</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SKILLS.map(skill => {
                      const sel = isSelected(skill, watchTeach);
                      return (
                        <button key={`t-${skill}`} type="button"
                          onClick={() => handleToggleSkill(skill, "skillsTeachStr", watchTeach)}
                          className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all flex items-center gap-1 ${
                            sel
                              ? "bg-amber-400 text-white border-amber-400 shadow-md shadow-amber-400/25"
                              : "bg-muted/50 border-border text-muted-foreground hover:border-amber-300 hover:text-amber-600"
                          }`}>
                          {sel && <Check className="w-3 h-3" />}
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                  <Textarea placeholder="Add more skills, comma separated..." className="resize-none h-14 text-sm" {...register("skillsTeachStr")} />
                </div>

                <div className="h-px bg-border" />

                {/* Learn */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <label className="text-sm font-bold">I want to learn</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SKILLS.map(skill => {
                      const sel = isSelected(skill, watchLearn);
                      return (
                        <button key={`l-${skill}`} type="button"
                          onClick={() => handleToggleSkill(skill, "skillsLearnStr", watchLearn)}
                          className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all flex items-center gap-1 ${
                            sel
                              ? "bg-primary text-white border-primary shadow-md shadow-primary/25"
                              : "bg-muted/50 border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                          }`}>
                          {sel && <Check className="w-3 h-3" />}
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                  <Textarea placeholder="Add more skills, comma separated..." className="resize-none h-14 text-sm" {...register("skillsLearnStr")} />
                </div>

                {/* Pricing hint */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/40 border border-border/60">
                  {[
                    { tier: "Basic", examples: "English, Maths", range: "10–40 cr", color: "text-green-500" },
                    { tier: "Medium", examples: "Coding, Web Dev", range: "30–100 cr", color: "text-blue-500" },
                    { tier: "Advanced", examples: "DSA, AI/ML", range: "80–220 cr", color: "text-purple-500" },
                  ].map(t => (
                    <div key={t.tier} className="text-center">
                      <p className={`text-xs font-black ${t.color} mb-0.5`}>{t.tier}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{t.examples}</p>
                      <p className="text-[10px] font-bold text-foreground/70 mt-1">{t.range}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setStep(0)}
                    className="h-12 px-5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50 transition-colors">
                    Back
                  </button>
                  <button type="submit" disabled={registerMutation.isPending}
                    className="flex-1 h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:translate-y-0"
                    style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", boxShadow: "0 8px 24px rgba(99,102,241,0.35)" }}>
                    {registerMutation.isPending
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : <>
                          <Sparkles className="w-4 h-4" />
                          Create Account
                          <ArrowRight className="w-4 h-4" />
                        </>
                    }
                  </button>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  You can skip skills and set them later from your profile.
                </p>
              </>
            )}
          </form>

          {/* Mobile sign in link */}
          <p className="text-center text-sm text-muted-foreground mt-6 lg:hidden">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}