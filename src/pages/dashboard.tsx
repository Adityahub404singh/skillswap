import { Link } from "wouter";
import { useGetMe, useGetMySessions } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Wallet, Star, CheckCircle, Clock, BookOpen, Compass, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const options = useApiOptions();
  
  const { data: user, isLoading: userLoading } = useGetMe(options);
  
  const { data: sessions, isLoading: sessionsLoading } = useGetMySessions(
    { status: "accepted" },
    options
  );

  const upcomingSessions = sessions?.filter(s => new Date(s.scheduledDate) > new Date()).slice(0, 3) || [];

  if (userLoading) {
    return <div className="py-8 space-y-8">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /></div>
    </div>;
  }

  if (!user) return null;

  return (
    <div className="py-6 space-y-8">
      {/* Welcome Hero */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="absolute bottom-0 right-32 w-48 h-48 bg-black/10 rounded-full blur-2xl -mb-16" />
        
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Welcome back, {user.name.split(' ')[0]}!</h1>
          <p className="text-white/80 text-lg max-w-xl mb-8">
            You have <strong className="text-white">{user.credits} credits</strong> available. That's {Math.floor(user.credits / 10)} hours of learning you can book right now.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/explore">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-full font-bold h-12 px-6">
                Find a Mentor
              </Button>
            </Link>
            <Link href="/wallet">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full font-bold h-12 px-6 backdrop-blur-sm">
                View Wallet
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Balance</p>
            <p className="text-2xl font-bold">{user.credits} <span className="text-sm text-muted-foreground font-normal">cr</span></p>
          </div>
        </div>
        
        <div className="card-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
            <Star className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Trust Score</p>
            <p className="text-2xl font-bold">{user.trustScore} <span className="text-sm text-muted-foreground font-normal">/ 100</span></p>
          </div>
        </div>
        
        <div className="card-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Completed</p>
            <p className="text-2xl font-bold">{user.sessionsCompleted}</p>
          </div>
        </div>
        
        <div className="card-premium flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Star className="w-6 h-6 text-orange-500 fill-orange-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Rating</p>
            <p className="text-2xl font-bold">{user.averageRating?.toFixed(1) || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col - Upcoming Sessions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" /> Upcoming Sessions
            </h2>
            <Link href="/sessions" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          
          <div className="space-y-4">
            {sessionsLoading ? (
              [...Array(2)].map((_,i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
            ) : upcomingSessions.length > 0 ? (
              upcomingSessions.map((session) => {
                const isMentor = session.mentorId === user.id;
                const otherPerson = isMentor ? session.student : session.mentor;
                
                return (
                  <div key={session.id} className="card-premium flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-5">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0 border border-border">
                        {otherPerson.avatar ? (
                          <img src={otherPerson.avatar} alt={otherPerson.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-bold">
                            {otherPerson.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${isMentor ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                            {isMentor ? 'Teaching' : 'Learning'}
                          </span>
                          <span className="font-bold">{session.skill}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          with <span className="font-medium text-foreground">{otherPerson.name}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="text-sm font-medium text-right flex-1 sm:flex-none">
                        <p>{format(new Date(session.scheduledDate), 'MMM d, yyyy')}</p>
                        <p className="text-muted-foreground">{format(new Date(session.scheduledDate), 'h:mm a')}</p>
                      </div>
                      <Link href="/sessions">
                        <Button variant="outline" size="sm" className="rounded-full">Details</Button>
                      </Link>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="card-premium p-8 text-center bg-muted/30 border-dashed">
                <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-lg font-medium mb-1">No upcoming sessions</p>
                <p className="text-muted-foreground mb-4">Book a session to learn something new!</p>
                <Link href="/explore">
                  <Button size="sm" className="rounded-full">Explore Skills</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Col - My Skills overview */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Compass className="w-6 h-6 text-accent" /> My Skills
          </h2>
          
          <div className="card-premium space-y-6">
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Teaching</h3>
              {user.skillsTeach.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.skillsTeach.map(skill => (
                    <span key={skill} className="px-3 py-1.5 bg-accent/10 border border-accent/20 text-accent-foreground font-medium text-sm rounded-lg">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">You haven't listed any skills to teach.</p>
              )}
            </div>
            
            <div className="w-full h-px bg-border/50" />
            
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Learning</h3>
              {user.skillsLearn.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.skillsLearn.map(skill => (
                    <span key={skill} className="px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary-foreground font-medium text-sm rounded-lg">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">You haven't listed any skills to learn.</p>
              )}
            </div>
            
            <Button variant="ghost" className="w-full justify-between mt-2 text-muted-foreground">
              Edit Profile <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
