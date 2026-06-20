import { useRoute, Link } from "wouter";
import { useGetUserById, useGetMentorRatings, useGetMe } from "@/lib/api";
import { useApiOptions } from "@/lib/api-utils";
import { format } from "date-fns";
import { Star, Award, ShieldCheck, CheckCircle2, MessageSquare, Edit, Coins, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function MentorProfile() {
  const [, params] = useRoute("/mentor/:id");
  const mentorId = parseInt(params?.id || "0");
  const options = useApiOptions();

  const { data: mentor, isLoading } = useGetUserById(mentorId, {
    ...options,
    query: { queryKey: ["mentor", mentorId], enabled: !!mentorId }
  });

  const { data: currentUser } = useGetMe({
    ...options,
    query: { queryKey: ["me"], enabled: true }
  });

  const { data: ratings, isLoading: ratingsLoading } = useGetMentorRatings(mentorId, {
    ...options,
    query: { queryKey: ["ratings", mentorId], enabled: !!mentorId }
  });

  const isOwnProfile = currentUser?.id === mentorId;

  if (isLoading) return (
    <div className="py-8 max-w-4xl mx-auto space-y-6 px-4">
      <Skeleton className="w-full h-48 rounded-[24px]" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="md:col-span-2 h-40 rounded-[24px]" />
        <Skeleton className="h-40 rounded-[24px]" />
      </div>
    </div>
  );

  if (!mentor) return (
    <div className="py-20 text-center flex flex-col items-center">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <User className="w-10 h-10 text-slate-300" />
      </div>
      <h2 className="text-xl font-black text-slate-800">Mentor not found</h2>
      <p className="text-sm text-slate-500 mt-1">The profile you're looking for doesn't exist.</p>
      <Link href="/explore">
        <Button className="mt-6 rounded-full bg-[#6C3BFF] text-white font-bold px-8">Back to Explore</Button>
      </Link>
    </div>
  );

  return (
    <div className="py-6 px-4 sm:px-6 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-8">
      
      {/* 🌟 PREMIUM HERO CARD */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        
        {/* Cover Banner */}
        <div className="h-32 sm:h-40 bg-gradient-to-br from-[#6C3BFF] to-[#8B5CF6] relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>
        </div>

        <div className="px-5 sm:px-8 pb-8 relative">
          {/* Avatar & Header Section */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-end -mt-12 sm:-mt-16 mb-6">
            
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[24px] overflow-hidden border-4 border-white shadow-md bg-indigo-50 flex-shrink-0 flex items-center justify-center z-10">
              {mentor.avatar ? (
                <img src={mentor.avatar} alt={mentor.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black text-[#6C3BFF]">{mentor.name.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="flex-1 pb-1 sm:pb-2">
              <div className="flex items-center gap-2 mb-1.5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">{mentor.name}</h1>
                
                {/* 🔥 FIX APPLIED HERE: title prop is on the span, NOT on the icon 🔥 */}
                {mentor.trustScore > 80 && (
                  <span title="Verified Expert" className="flex items-center">
                    <ShieldCheck className="w-6 h-6 text-blue-500 fill-blue-50" />
                  </span>
                )}
              </div>
              
              {/* Trust Markers (Pills) */}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-md text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  {mentor.averageRating?.toFixed(1) || 'New'} ({ratings?.length || 0})
                </span>
                <span className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-md text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {mentor.sessionsCompleted} Sessions
                </span>
                <span className="flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-md text-xs">
                  <Award className="w-3.5 h-3.5" />
                  Trust {mentor.trustScore}
                </span>
                <span className="flex items-center gap-1 bg-purple-50 border border-purple-100 text-[#6C3BFF] font-black px-2.5 py-1 rounded-md text-xs">
                  <Coins className="w-3.5 h-3.5" />
                  {(mentor as any).pricePerHour || 50} cr / session
                </span>
              </div>
            </div>

            <div className="w-full sm:w-auto mt-2 sm:mt-0 sm:pb-2 flex flex-col shrink-0">
              {isOwnProfile ? (
                <Link href="/profile">
                  <Button className="w-full rounded-full h-11 px-8 font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 shadow-sm border border-slate-200">
                    <Edit className="w-4 h-4 mr-2" /> Edit Profile
                  </Button>
                </Link>
              ) : (
                <Link href={`/book/${mentor.id}`}>
                  <Button className="w-full rounded-full bg-[#6C3BFF] hover:bg-[#5b32d6] text-white shadow-md h-11 px-8 font-bold text-sm">
                    Book Session
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-gray-100">
            
            {/* About Me */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-slate-400" /> About Me
              </h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed whitespace-pre-line bg-slate-50 p-5 rounded-[20px] border border-gray-100">
                {mentor.bio || "This user prefers to let their skills do the talking. No bio added yet!"}
              </p>
            </div>

            {/* Skills Container */}
            <div className="space-y-6">
              <div>
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Expertise (Teaches)</h3>
                <div className="flex flex-wrap gap-2">
                  {mentor.skillsTeach?.length > 0 ? mentor.skillsTeach.map((skill: string) => (
                    <span key={skill} className="px-3 py-1.5 bg-green-50 text-green-700 font-bold text-xs rounded-full border border-green-100">
                      {skill}
                    </span>
                  )) : (
                    <span className="text-xs text-slate-400 font-medium">No skills added</span>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Learning Journey</h3>
                <div className="flex flex-wrap gap-2">
                  {mentor.skillsLearn?.length > 0 ? mentor.skillsLearn.map((skill: string) => (
                    <span key={skill} className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-full border border-blue-100">
                      {skill}
                    </span>
                  )) : (
                    <span className="text-xs text-slate-400 font-medium">No skills added</span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 🌟 REVIEWS SECTION */}
      <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6 sm:p-8">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-6">
          <MessageSquare className="w-6 h-6 text-[#6C3BFF]" /> Student Reviews
        </h2>
        
        {ratingsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-[20px]" />)}
          </div>
        ) : ratings && ratings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ratings.map((rating: any) => (
              <motion.div key={rating.id} whileHover={{ y: -2 }} className="bg-slate-50 p-5 rounded-[20px] border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{rating.studentName}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{format(new Date(rating.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex gap-0.5 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < rating.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-200'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">"{rating.review || "Great session, highly recommended!"}"</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center bg-slate-50/50 rounded-[20px] border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Star className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-base font-bold text-slate-700">No reviews yet</p>
            <p className="text-xs font-medium text-slate-500 mt-1">Be the first to review after completing a session.</p>
          </div>
        )}
      </div>

    </div>
  );
}