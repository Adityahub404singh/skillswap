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
import { ArrowRight, User, Mail, Lock, Loader2, BookOpen, Lightbulb, Check, Sparkles, Gift } from "lucide-react";

const POPULAR_SKILLS = [
  "Python", "JavaScript", "Design", "Spanish",
  "Photography", "Marketing", "Music", "Chess"
];

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  skillsTeachStr: z.string().optional(),
  skillsLearnStr: z.string().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuthStore();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const watchTeach = watch("skillsTeachStr") || "";
  const watchLearn = watch("skillsLearnStr") || "";

  const handleToggleSkill = (skill: string, field: "skillsTeachStr" | "skillsLearnStr", currentVal: string) => {
    let skills = currentVal.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (skills.includes(skill)) {
      skills = skills.filter((s: string) => s !== skill);
    } else {
      skills.push(skill);
    }
    setValue(field, skills.join(", "), { shouldValidate: true });
  };

  const isSkillSelected = (skill: string, currentVal: string) => {
    return currentVal.split(',').map((s: string) => s.trim()).filter(Boolean).includes(skill);
  };

  const registerMutation = useRegisterUser({
    mutation: {
      onSuccess: (data: any) => {
        setToken(data.token);
        toast({ title: "Account created!", description: "Welcome to SkillSwap. You earned 200 bonus credits!" });
        setLocation("/dashboard");
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: error?.response?.data?.message || error?.message || "An error occurred."
        });
      }
    }
  });

  const onSubmit = (data: RegisterForm) => {
    const skillsTeach = data.skillsTeachStr ? data.skillsTeachStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const skillsLearn = data.skillsLearnStr ? data.skillsLearnStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    registerMutation.mutate({ data: { name: data.name, email: data.email, password: data.password, skillsTeach, skillsLearn } });
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center py-12 px-4">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-accent/6 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold text-sm mb-4">
            <Gift className="w-4 h-4" />
            <span>Get 200 free credits on signup!</span>
          </div>
          <h1 className="text-4xl font-extrabold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Join <span className="text-gradient">SkillSwap</span>
          </h1>
          <p className="text-muted-foreground">Start teaching, start learning. No money needed.</p>
        </div>

        {/* Main card */}
        <div className="glass-card border border-primary/15 shadow-2xl shadow-primary/10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Name + Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Jane Doe"
                    className={`pl-10 h-12 bg-background/50 border-2 focus-visible:ring-primary/20 ${errors.name ? 'border-destructive' : 'border-border focus:border-primary/50'}`}
                    {...register("name")}
                  />
                </div>
                {errors.name && <p className="text-sm text-destructive ml-1">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    className={`pl-10 h-12 bg-background/50 border-2 focus-visible:ring-primary/20 ${errors.email ? 'border-destructive' : 'border-border focus:border-primary/50'}`}
                    {...register("email")}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive ml-1">{errors.email.message}</p>}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="At least 6 characters"
                  className={`pl-10 h-12 bg-background/50 border-2 focus-visible:ring-primary/20 ${errors.password ? 'border-destructive' : 'border-border focus:border-primary/50'}`}
                  {...register("password")}
                />
              </div>
              {errors.password && <p className="text-sm text-destructive ml-1">{errors.password.message}</p>}
            </div>

            {/* Skills section */}
            <div className="pt-4 border-t border-border/50">
              <p className="text-sm font-bold text-center mb-4 text-muted-foreground uppercase tracking-wider text-xs">
                Customize your experience (optional)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Teach */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-400/20 flex items-center justify-center">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    Skills you can teach
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SKILLS.map(skill => {
                      const selected = isSkillSelected(skill, watchTeach);
                      return (
                        <button
                          key={`teach-${skill}`}
                          type="button"
                          onClick={() => handleToggleSkill(skill, "skillsTeachStr", watchTeach)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 flex items-center gap-1 font-medium ${
                            selected
                              ? 'bg-primary text-white border-primary shadow-md shadow-primary/25'
                              : 'bg-background hover:bg-primary/8 border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
                          }`}
                        >
                          {selected && <Check className="w-3 h-3" />}
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                  <Textarea
                    placeholder="e.g. React, UI Design, Spanish..."
                    className="resize-none h-16 bg-background/50 border-2 text-sm focus-visible:ring-primary/20"
                    {...register("skillsTeachStr")}
                  />
                </div>

                {/* Learn */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                    </div>
                    Skills you want to learn
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SKILLS.map(skill => {
                      const selected = isSkillSelected(skill, watchLearn);
                      return (
                        <button
                          key={`learn-${skill}`}
                          type="button"
                          onClick={() => handleToggleSkill(skill, "skillsLearnStr", watchLearn)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 flex items-center gap-1 font-medium ${
                            selected
                              ? 'bg-primary text-white border-primary shadow-md shadow-primary/25'
                              : 'bg-background hover:bg-primary/8 border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
                          }`}
                        >
                          {selected && <Check className="w-3 h-3" />}
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                  <Textarea
                    placeholder="e.g. Python, Piano, Copywriting..."
                    className="resize-none h-16 bg-background/50 border-2 text-sm focus-visible:ring-primary/20"
                    {...register("skillsLearnStr")}
                  />
                </div>
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full h-14 rounded-2xl bg-gradient-premium btn-glow hover:-translate-y-0.5 text-white font-bold shadow-xl shadow-primary/30 transition-all text-base mt-2"
            >
              {registerMutation.isPending
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Create Account - Get 200 Credits Free!
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )
              }
            </Button>

          </form>

          {/* Sign in link */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-primary hover:underline inline-flex items-center gap-1">
              Sign in <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
