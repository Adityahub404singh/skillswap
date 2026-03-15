import { useRoute, Link } from "wouter";
import { useGetUserById, useGetMentorRatings } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { format } from "date-fns";
import { Star, Award, ShieldCheck, CheckCircle2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function MentorProfile() {
  const [, params] = useRoute("/mentor/:id");
  const mentorId = parseInt(params?.id || "0");
  const options = useApiOptions();

  const { data: mentor, isLoading } = useGetUserById(mentorId, {
    ...options,
    query: { queryKey: [], enabled: !!mentorId }
  });

  const { data: ratings, isLoading: ratingsLoading } = useGetMentorRatings(mentorId, {
    ...options,
    query: { queryKey: [], enabled: !!mentorId }
  });

  if (isLoading) return <div className="py-12 flex justify-center"><Skeleton className="w-full max-w-4xl h-96 rounded-3xl" /></div>;
  if (!mentor) return <div className="py-12 text-center text-xl font-bold">Mentor not found</div>;

  return (
    <div className="py-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="card-premium p-0 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary relative">
          <div className="absolute inset-0 opacity-10"></div>
        </div>

        <div className="px-6 md:px-10 pb-8 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-16 mb-6">
            <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-card shadow-xl bg-background flex-shrink-0">
              {mentor.avatar ? (
                <img src={mentor.avatar} alt={mentor.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold bg-primary/10 text-primary">
                  {mentor.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-extrabold">{mentor.name}</h1>
                {mentor.trustScore > 80 && (
                  <ShieldCheck className="w-6 h-6 text-accent" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-medium">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                  {mentor.averageRating?.toFixed(1) || 'New'} ({ratings?.length || 0} reviews)
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {mentor.sessionsCompleted} Sessions
                </span>
                <span className="flex items-center gap-1">
                  <Award className="w-4 h-4 text-primary" />
                  Trust Score: {mentor.trustScore}
                </span>
              </div>
            </div>

            <div className="w-full md:w-auto mt-4 md:mt-0 pb-2">
              <Link href={`/book/${mentor.id}`}>
                <Button size="lg" className="w-full rounded-xl bg-gradient-premium shadow-lg shadow-primary/20 h-12 px-8">
                  Book Session
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-border/50">
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-2">About Me</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {mentor.bio || "This mentor hasn't written a bio yet."}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Expertise</h3>
                <div className="flex flex-wrap gap-2">
                  {mentor.skillsTeach.map((skill: string) => (
                    <span key={skill} className="px-3 py-1.5 bg-accent/10 text-accent font-semibold text-sm rounded-lg border border-accent/20">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Also Learning</h3>
                <div className="flex flex-wrap gap-2">
                  {mentor.skillsLearn.map((skill: string) => (
                    <span key={skill} className="px-3 py-1.5 bg-secondary text-secondary-foreground font-medium text-sm rounded-lg">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" /> Student Reviews
        </h2>
        {ratingsLoading ? (
          <Skeleton className="h-32 w-full rounded-2xl" />
        ) : ratings && ratings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ratings.map((rating: any) => (
              <div key={rating.id} className="card-premium p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold">{rating.studentName}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(rating.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < rating.rating ? 'fill-orange-500 text-orange-500' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">"{rating.review || "Great session!"}"</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-premium p-8 text-center bg-muted/20 border-dashed">
            <Star className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-lg font-medium">No reviews yet</p>
            <p className="text-sm text-muted-foreground">Be the first to review this mentor after a session.</p>
          </div>
        )}
      </div>
    </div>
  );
}