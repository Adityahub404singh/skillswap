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
import { ArrowRight, User, Mail, Lock, Loader2, BookOpen, Lightbulb, Check } from "lucide-react";

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
    const skills = currentVal.split(',').map((s: string) => s.trim()).filter(Boolean);
    return skills.includes(skill);
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
          description: error?.response?.message || error?.message || "An error occurred during registration."
        });
      }
    }
  });

  const onSubmit = (data: RegisterForm) => {
    const skillsTeach = data.skillsTeachStr ? data.skillsTeachStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const skillsLearn = data.skillsLearnStr ? data.skillsLearnStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    registerMutation.mutate({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        skillsTeach,
        skillsLearn
      }
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold mb-2">Join SkillSwap</h1>
          <p className="text-muted-foreground">Create an account and get 200 free credits to start learning</p>
        </div>

        <div className="card-premium">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Jane Doe"
                    className={`pl-10 h-12 bg-background border-2 focus-visible:ring-primary/20 ${errors.name ? 'border-destructive' : ''}`}
                    {...register("name")}
                  />
                </div>
                {errors.name && <p className="text-sm text-destructive ml-1">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    className={`pl-10 h-12 bg-background border-2 focus-visible:ring-primary/20 ${errors.email ? 'border-destructive' : ''}`}
                    {...register("email")}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive ml-1">{errors.email.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="At least 6 characters"
                  className={`pl-10 h-12 bg-background border-2 focus-visible:ring-primary/20 ${errors.password ? 'border-destructive' : ''}`}
                  {...register("password")}
                />
              </div>
              {errors.password && <p className="text-sm text-destructive ml-1">{errors.password.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
              <div className="space-y-3">
                <label className="text-sm font-semibold ml-1 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-accent" />
                  Skills you can teach
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {POPULAR_SKILLS.map(skill => {
                    const selected = isSkillSelected(skill, watchTeach);
                    return (
                      <button
                        key={`teach-${skill}`}
                        type="button"
                        onClick={() => handleToggleSkill(skill, "skillsTeachStr", watchTeach)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 ${
                          selected
                            ? 'bg-primary/20 border-primary text-primary font-medium'
                            : 'bg-background hover:bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        {skill}
                        {selected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
                <Textarea
                  placeholder="e.g. React, UI Design, Spanish (comma separated)"
                  className="resize-none h-20 bg-background border-2 focus-visible:ring-primary/20"
                  {...register("skillsTeachStr")}
                />
                <p className="text-xs text-muted-foreground ml-1">Or type your own separated by commas</p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold ml-1 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Skills you want to learn
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {POPULAR_SKILLS.map(skill => {
                    const selected = isSkillSelected(skill, watchLearn);
                    return (
                      <button
                        key={`learn-${skill}`}
                        type="button"
                        onClick={() => handleToggleSkill(skill, "skillsLearnStr", watchLearn)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 ${
                          selected
                            ? 'bg-primary/20 border-primary text-primary font-medium'
                            : 'bg-background hover:bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        {skill}
                        {selected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
                <Textarea
                  placeholder="e.g. Python, Piano, Copywriting (comma separated)"
                  className="resize-none h-20 bg-background border-2 focus-visible:ring-primary/20"
                  {...register("skillsLearnStr")}
                />
                <p className="text-xs text-muted-foreground ml-1">Or type your own separated by commas</p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full h-12 rounded-xl bg-gradient-premium hover:opacity-90 text-white font-bold shadow-lg shadow-primary/25 transition-all text-base mt-6"
            >
              {registerMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account — Get 200 Credits Free!"}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-primary hover:underline inline-flex items-center">
              Sign in <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
