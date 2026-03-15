import { useState } from "react";
import { useGetMySessions, useAcceptSession, useCompleteSession, useCancelSession, useCreateRating } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Clock, CheckCircle2, XCircle, Star, CalendarDays, Loader2 } from "lucide-react";
import { Session } from "@/lib/api";

export default function Sessions() {
  const options = useApiOptions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [tab, setTab] = useState<"learning" | "teaching">("learning");
  const [ratingSessionId, setRatingSessionId] = useState<number | null>(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [reviewText, setReviewText] = useState("");

  const { data: sessions, isLoading } = useGetMySessions(
    { role: tab === "learning" ? "student" : "mentor" },
    options
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
  };

  const acceptMut = useAcceptSession({ ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session Accepted" }); } } });
  const completeMut = useCompleteSession({ ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session Completed", description: "Credits have been transferred." }); } } });
  const cancelMut = useCancelSession({ ...options, mutation: { onSuccess: () => { invalidate(); toast({ title: "Session Cancelled" }); } } });
  const rateMut = useCreateRating({ ...options, mutation: { 
    onSuccess: () => { 
      invalidate(); 
      setRatingSessionId(null); 
      setReviewText("");
      toast({ title: "Review Submitted", description: "Thank you for your feedback!" }); 
    } 
  }});

  const handleRate = () => {
    if(!ratingSessionId) return;
    rateMut.mutate({ data: { sessionId: ratingSessionId, rating: ratingVal, review: reviewText }});
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'requested': return <span className="px-2 py-1 text-xs font-bold rounded-md bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 flex items-center gap-1"><Clock className="w-3 h-3"/> Requested</span>;
      case 'accepted': return <span className="px-2 py-1 text-xs font-bold rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1"><CalendarDays className="w-3 h-3"/> Upcoming</span>;
      case 'completed': return <span className="px-2 py-1 text-xs font-bold rounded-md bg-green-500/10 text-green-600 border border-green-500/20 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Completed</span>;
      case 'cancelled': return <span className="px-2 py-1 text-xs font-bold rounded-md bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-1"><XCircle className="w-3 h-3"/> Cancelled</span>;
      default: return null;
    }
  };

  return (
    <div className="py-6 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold mb-1">My Sessions</h1>
          <p className="text-muted-foreground">Manage your teaching and learning appointments.</p>
        </div>
      </div>

      <div className="flex p-1 bg-muted/50 rounded-xl w-full sm:w-fit border border-border/50">
        <button 
          className={`flex-1 sm:px-8 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === 'learning' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setTab('learning')}
        >
          Learning (Student)
        </button>
        <button 
          className={`flex-1 sm:px-8 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === 'teaching' ? 'bg-background shadow-sm text-accent' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setTab('teaching')}
        >
          Teaching (Mentor)
        </button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
        ) : sessions?.length === 0 ? (
          <div className="card-premium py-16 text-center bg-muted/20 border-dashed">
            <CalendarDays className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No sessions found</h3>
            <p className="text-muted-foreground">You don't have any {tab} sessions yet.</p>
          </div>
        ) : (
          sessions?.sort((a,b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()).map(session => {
            const otherUser = tab === 'learning' ? session.mentor : session.student;
            
            return (
              <div key={session.id} className="card-premium p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between group">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 ${tab === 'learning' ? 'bg-gradient-to-br from-primary/80 to-primary' : 'bg-gradient-to-br from-accent/80 to-accent'} shadow-inner`}>
                    {otherUser.avatar ? <img src={otherUser.avatar} className="w-full h-full rounded-full object-cover" /> : otherUser.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-lg leading-none">{session.skill}</h3>
                      {getStatusBadge(session.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      with <span className="font-medium text-foreground">{otherUser.name}</span>
                    </p>
                    <div className="text-sm font-medium bg-background border border-border inline-flex px-3 py-1.5 rounded-lg shadow-sm">
                      {format(new Date(session.scheduledDate), 'EEEE, MMMM d, yyyy • h:mm a')}
                    </div>
                    {session.message && (
                      <p className="text-sm text-muted-foreground mt-3 italic border-l-2 border-border pl-3">
                        "{session.message}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-border/50">
                  {/* Teaching Actions */}
                  {tab === 'teaching' && session.status === 'requested' && (
                    <>
                      <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => cancelMut.mutate({ sessionId: session.id })}>Decline</Button>
                      <Button className="bg-accent hover:bg-accent/90" onClick={() => acceptMut.mutate({ sessionId: session.id })}>Accept Request</Button>
                    </>
                  )}
                  {tab === 'teaching' && session.status === 'accepted' && (
                    <Button variant="outline" className="text-destructive" onClick={() => cancelMut.mutate({ sessionId: session.id })}>Cancel</Button>
                  )}

                  {/* Learning Actions */}
                  {tab === 'learning' && (session.status === 'requested' || session.status === 'accepted') && (
                    <Button variant="outline" className="text-destructive" onClick={() => cancelMut.mutate({ sessionId: session.id })}>Cancel Booking</Button>
                  )}
                  {tab === 'learning' && session.status === 'accepted' && (
                    <Button className="bg-primary hover:bg-primary/90" onClick={() => completeMut.mutate({ sessionId: session.id })}>Mark Completed</Button>
                  )}
                  {tab === 'learning' && session.status === 'completed' && !session.rating && (
                    <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50" onClick={() => setRatingSessionId(session.id)}>
                      <Star className="w-4 h-4 mr-2" /> Rate Mentor
                    </Button>
                  )}
                  
                  {session.status === 'completed' && session.rating && (
                    <div className="px-3 py-1.5 bg-muted rounded-lg text-sm font-medium flex items-center gap-1">
                      <Star className="w-4 h-4 fill-orange-500 text-orange-500" /> Rated {session.rating.rating}/5
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Rating Dialog */}
      <Dialog open={!!ratingSessionId} onOpenChange={(open) => !open && setRatingSessionId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate your session</DialogTitle>
            <DialogDescription>
              Help the community by sharing your experience with this mentor.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRatingVal(star)} className="focus:outline-none transition-transform hover:scale-110 active:scale-95">
                  <Star className={`w-10 h-10 ${star <= ratingVal ? 'fill-orange-500 text-orange-500' : 'text-muted-foreground/30'}`} />
                </button>
              ))}
            </div>
            <Textarea 
              placeholder="Leave a review (optional)" 
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              className="resize-none h-24"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingSessionId(null)}>Cancel</Button>
            <Button onClick={handleRate} disabled={rateMut.isPending} className="bg-primary hover:bg-primary/90">
              {rateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
