import { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetUserById, useBookSession, useGetMe } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, CreditCard, Loader2, ArrowLeft, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const SKILL_PRICING: Record<string, { min: number; max: number; level: string; color: string }> = {
  "English":     { min: 10, max: 30,  level: "Basic",    color: "text-green-600" },
  "Maths":       { min: 15, max: 40,  level: "Basic",    color: "text-green-600" },
  "Music":       { min: 15, max: 40,  level: "Basic",    color: "text-green-600" },
  "Chess":       { min: 10, max: 30,  level: "Basic",    color: "text-green-600" },
  "Spanish":     { min: 15, max: 40,  level: "Basic",    color: "text-green-600" },
  "Photography": { min: 20, max: 50,  level: "Basic",    color: "text-green-600" },
  "Marketing":   { min: 20, max: 60,  level: "Basic",    color: "text-green-600" },
  "Design":      { min: 30, max: 80,  level: "Medium",   color: "text-blue-600" },
  "Coding":      { min: 30, max: 80,  level: "Medium",   color: "text-blue-600" },
  "Web Dev":     { min: 40, max: 100, level: "Medium",   color: "text-blue-600" },
  "JavaScript":  { min: 40, max: 100, level: "Medium",   color: "text-blue-600" },
  "Python":      { min: 40, max: 100, level: "Medium",   color: "text-blue-600" },
  "DSA":         { min: 80, max: 180, level: "Advanced", color: "text-purple-600" },
  "AI/ML":       { min: 100,max: 220, level: "Advanced", color: "text-purple-600" },
};

const DEFAULT_PRICING = { min: 10, max: 150, level: "Basic", color: "text-green-600" };

const bookSchema = z.object({
  skill: z.string().min(1, "Please select a skill"),
  credits: z.number().min(10, "Minimum 10 credits").max(250, "Maximum 250 credits"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  message: z.string().optional(),
});

type BookForm = z.infer<typeof bookSchema>;

export default function BookSession() {
  const [, params] = useRoute("/book/:mentorId");
  const mentorId = parseInt(params?.mentorId || "0");
  const [, setLocation] = useLocation();
  const options = useApiOptions();
  const { toast } = useToast();
  const [selectedCredits, setSelectedCredits] = useState(10);
  const [selectedSkill, setSelectedSkill] = useState("");

  const urlParams = new URLSearchParams(window.location.search);
  const prefillSkill = urlParams.get("skill") || "";

  const { data: mentor, isLoading: mentorLoading } = useGetUserById(mentorId, { ...options, enabled: !!mentorId } as any);
  const { data: me } = useGetMe(options);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<BookForm>({
    resolver: zodResolver(bookSchema),
    defaultValues: { skill: prefillSkill, credits: 10 }
  });

  const watchSkill = watch("skill") || selectedSkill;
  const pricing = SKILL_PRICING[watchSkill] || DEFAULT_PRICING;
  const platformFee = Math.floor(selectedCredits * 0.10);
  const mentorEarns = selectedCredits - platformFee;

  const handleSkillChange = (skill: string) => {
    setSelectedSkill(skill);
    setValue("skill", skill);
    const p = SKILL_PRICING[skill] || DEFAULT_PRICING;
    setSelectedCredits(p.min);
    setValue("credits", p.min);
  };

  const bookMutation = useBookSession({
    ...options,
    mutation: {
      onSuccess: () => {
        toast({ title: "Session Requested!", description: "Waiting for the mentor to accept. Check your email for Meet link!" });
        setLocation("/sessions");
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Booking failed", description: err?.response?.data?.message || "Not enough credits or invalid request." });
      }
    }
  });

  const onSubmit = (data: BookForm) => {
    const dateTimeStr = `${data.date}T${data.time}:00`;
    const scheduledDate = new Date(dateTimeStr).toISOString();
    bookMutation.mutate({
      data: { mentorId, skill: data.skill, scheduledDate, duration: 45, message: data.message, creditsAmount: selectedCredits }
    });
  };

  if (mentorLoading) return <div className="py-12 max-w-xl mx-auto"><Skeleton className="h-96 w-full rounded-2xl" /></div>;
  if (!mentor) return <div className="py-12 text-center font-bold">Mentor not found</div>;

  return (
    <div className="py-6 max-w-2xl mx-auto">
      <Link href={`/mentor/${mentorId}`} className="text-sm font-semibold text-muted-foreground hover:text-foreground mb-6 flex items-center transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Profile
      </Link>

      <h1 className="text-3xl font-extrabold mb-8">Book a Session</h1>

      {/* Mentor card */}
      <div className="card-premium mb-6 bg-primary/5 border-primary/20 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-background border-2 border-primary/30">
          {mentor.avatar ? (
            <img src={mentor.avatar} alt={mentor.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary">{mentor.name.charAt(0)}</div>
          )}
        </div>
        <div>
          <h3 className="font-bold text-lg">Learning with {mentor.name}</h3>
          <p className="text-sm text-muted-foreground">Session: <strong className="text-foreground">45 minutes</strong> · You set the price</p>
        </div>
        <div className="ml-auto text-right hidden sm:block">
          <p className="text-xs text-muted-foreground font-medium uppercase">Your Balance</p>
          <p className={`text-xl font-bold ${me && me.credits < selectedCredits ? 'text-destructive' : 'text-primary'}`}>{me?.credits || 0} cr</p>
        </div>
      </div>

      {/* Pricing guide */}
      <div className="card-premium mb-6 bg-muted/30">
        <p className="text-sm font-bold mb-3 flex items-center gap-2"><Info className="w-4 h-4 text-blue-500" /> Session Pricing Guide</p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-200 dark:border-green-800">
            <p className="font-bold text-green-600 mb-1">Basic</p>
            <p className="text-muted-foreground">English, Maths, Music</p>
            <p className="font-bold text-green-600 mt-1">10–40 cr</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="font-bold text-blue-600 mb-1">Medium</p>
            <p className="text-muted-foreground">Coding, Web Dev, Design</p>
            <p className="font-bold text-blue-600 mt-1">30–100 cr</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-200 dark:border-purple-800">
            <p className="font-bold text-purple-600 mb-1">Advanced</p>
            <p className="text-muted-foreground">DSA, AI/ML</p>
            <p className="font-bold text-purple-600 mt-1">80–220 cr</p>
          </div>
        </div>
      </div>

      <div className="card-premium">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* Skill select */}
          <div className="space-y-2">
            <label className="text-sm font-semibold ml-1">Which skill do you want to learn?</label>
            <select
              className={`w-full h-12 px-4 rounded-xl bg-background border-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.skill ? 'border-destructive' : 'border-border'}`}
              {...register("skill")}
              onChange={(e) => handleSkillChange(e.target.value)}
            >
              <option value="">Select a skill...</option>
              {mentor.skillsTeach.map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.skill && <p className="text-sm text-destructive ml-1">{errors.skill.message}</p>}
            {watchSkill && (
              <p className={`text-xs ml-1 font-medium ${pricing.color}`}>
                {pricing.level} skill · Suggested range: {pricing.min}–{pricing.max} credits/session
              </p>
            )}
          </div>

          {/* Credits slider */}
          <div className="space-y-3">
            <label className="text-sm font-semibold ml-1">
              Credits for this session
              <span className="text-xs text-muted-foreground font-normal ml-2">(you decide, within range)</span>
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={pricing.min}
                max={pricing.max}
                step={5}
                value={selectedCredits}
                onChange={(e) => { setSelectedCredits(parseInt(e.target.value)); setValue("credits", parseInt(e.target.value)); }}
                className="flex-1 h-2 accent-primary"
              />
              <div className="text-2xl font-bold text-primary min-w-[60px] text-right">{selectedCredits} cr</div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{pricing.min} cr (min)</span>
              <span>{pricing.max} cr (max)</span>
            </div>
            {/* Breakdown */}
            <div className="bg-muted/40 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between"><span>You pay:</span><span className="font-bold text-foreground">{selectedCredits} credits</span></div>
              <div className="flex justify-between"><span>Platform fee (10%):</span><span className="text-orange-500 font-medium">-{platformFee} credits</span></div>
              <div className="flex justify-between border-t border-border/50 pt-1 mt-1"><span className="font-bold">Mentor earns:</span><span className="font-bold text-green-600">{mentorEarns} credits</span></div>
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input type="date" className={`pl-10 h-12 bg-background border-2 ${errors.date ? 'border-destructive' : ''}`} min={new Date().toISOString().split('T')[0]} {...register("date")} />
              </div>
              {errors.date && <p className="text-sm text-destructive ml-1">{errors.date.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input type="time" className={`pl-10 h-12 bg-background border-2 ${errors.time ? 'border-destructive' : ''}`} {...register("time")} />
              </div>
              {errors.time && <p className="text-sm text-destructive ml-1">{errors.time.message}</p>}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-semibold ml-1">Message to Mentor (Optional)</label>
            <Textarea placeholder="Hi, I'd like to focus on..." className="resize-none h-24 bg-background border-2 focus-visible:ring-primary/20" {...register("message")} />
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-border/50">
            <Button
              type="submit"
              disabled={bookMutation.isPending || (me && me.credits < selectedCredits)}
              className="w-full h-14 rounded-xl bg-gradient-premium shadow-lg shadow-primary/20 text-lg font-bold hover:shadow-primary/40 transition-all"
            >
              {bookMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : `Confirm Booking – ${selectedCredits} Credits`}
            </Button>
            {me && me.credits < selectedCredits && (
              <p className="text-center text-sm text-destructive font-medium mt-3 flex items-center justify-center gap-1">
                <CreditCard className="w-4 h-4" /> Not enough credits. Need {selectedCredits}, have {me.credits}.
              </p>
            )}
            <p className="text-center text-xs text-muted-foreground mt-2">
              📧 Google Meet link will be sent to your email after booking
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
