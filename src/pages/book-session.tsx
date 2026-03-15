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
import { Calendar, Clock, CreditCard, Loader2, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const bookSchema = z.object({
  skill: z.string().min(1, "Please select a skill"),
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

  const urlParams = new URLSearchParams(window.location.search);
  const prefillSkill = urlParams.get("skill") || "";

  const { data: mentor, isLoading: mentorLoading } = useGetUserById(mentorId, {
    ...options,
    query: { enabled: !!mentorId }
  });

  const { data: me } = useGetMe(options);

  const { register, handleSubmit, formState: { errors } } = useForm<BookForm>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      skill: prefillSkill
    }
  });

  const bookMutation = useBookSession({
    ...options,
    mutation: {
      onSuccess: () => {
        toast({ title: "Session Requested!", description: "Waiting for the mentor to accept." });
        setLocation("/sessions");
      },
      onError: (err) => {
        toast({ 
          variant: "destructive", 
          title: "Booking failed", 
          description: err.response?.message || "Not enough credits or invalid request." 
        });
      }
    }
  });

  const onSubmit = (data: BookForm) => {
    // Combine date and time to ISO string
    const dateTimeStr = `${data.date}T${data.time}:00`;
    const scheduledDate = new Date(dateTimeStr).toISOString();

    bookMutation.mutate({
      data: {
        mentorId,
        skill: data.skill,
        scheduledDate,
        duration: 60, // Fixed 1 hr for now
        message: data.message
      }
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

      <div className="card-premium mb-8 bg-primary/5 border-primary/20 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-background border-2 border-primary/30">
          {mentor.avatar ? (
            <img src={mentor.avatar} alt={mentor.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary">
              {mentor.name.charAt(0)}
            </div>
          )}
        </div>
        <div>
          <h3 className="font-bold text-lg">Learning with {mentor.name}</h3>
          <p className="text-sm text-muted-foreground">Session cost: <strong className="text-foreground">10 credits</strong> / hour</p>
        </div>
        <div className="ml-auto text-right hidden sm:block">
          <p className="text-xs text-muted-foreground font-medium uppercase">Your Balance</p>
          <p className={`text-xl font-bold ${me && me.credits < 10 ? 'text-destructive' : 'text-primary'}`}>
            {me?.credits || 0} cr
          </p>
        </div>
      </div>

      <div className="card-premium">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold ml-1">Which skill do you want to learn?</label>
            <select 
              className={`w-full h-12 px-4 rounded-xl bg-background border-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.skill ? 'border-destructive' : 'border-border'}`}
              {...register("skill")}
            >
              <option value="">Select a skill...</option>
              {mentor.skillsTeach.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.skill && <p className="text-sm text-destructive ml-1">{errors.skill.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input 
                  type="date" 
                  className={`pl-10 h-12 bg-background border-2 ${errors.date ? 'border-destructive' : ''}`}
                  min={new Date().toISOString().split('T')[0]}
                  {...register("date")} 
                />
              </div>
              {errors.date && <p className="text-sm text-destructive ml-1">{errors.date.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input 
                  type="time" 
                  className={`pl-10 h-12 bg-background border-2 ${errors.time ? 'border-destructive' : ''}`}
                  {...register("time")} 
                />
              </div>
              {errors.time && <p className="text-sm text-destructive ml-1">{errors.time.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold ml-1">Message to Mentor (Optional)</label>
            <Textarea 
              placeholder="Hi, I'd like to focus on..." 
              className="resize-none h-24 bg-background border-2 focus-visible:ring-primary/20"
              {...register("message")} 
            />
          </div>

          <div className="pt-4 border-t border-border/50">
            <Button 
              type="submit" 
              disabled={bookMutation.isPending || (me && me.credits < 10)}
              className="w-full h-14 rounded-xl bg-gradient-premium shadow-lg shadow-primary/20 text-lg font-bold hover:shadow-primary/40 transition-all"
            >
              {bookMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Confirm Booking - 10 Credits"}
            </Button>
            {me && me.credits < 10 && (
              <p className="text-center text-sm text-destructive font-medium mt-3 flex items-center justify-center gap-1">
                <CreditCard className="w-4 h-4" /> Not enough credits to book.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
