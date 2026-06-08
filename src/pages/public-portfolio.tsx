"use client";
import { useRoute, Link } from "wouter";
import { Star, CheckCircle, MapPin, Calendar, Zap, Award, Copy, Check, Globe, Loader2, ShieldCheck, Flame } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function PublicPortfolio() {
  const [, params] = useRoute("/u/:slug");
  const slug = params?.slug ?? "";
  const [copied, setCopied] = useState(false);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetch(`/api/users/portfolio/${slug}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => { setPortfolio(data); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [slug]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (!portfolio) return <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white"><h1 className="text-3xl font-black mb-2">Profile Not Found</h1><p className="text-gray-400 mb-6">This user does not exist or is private.</p><Link href="/explore"><Button className="bg-primary hover:bg-primary/90 rounded-full h-12 px-8 font-bold">Explore Mentors</Button></Link></div>;

  // 🚨 UNICORN LOGIC: Premium UI for Verified Experts
  const isVerified = portfolio.trustScore >= 80 || portfolio.isPremium;
  const rating = portfolio.averageRating > 0 ? portfolio.averageRating : 5.0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-12 px-4 relative overflow-hidden">
      {/* Background glow for verified users */}
      {isVerified && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      )}

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Banner */}
        <div className={`w-full h-32 md:h-48 rounded-t-3xl ${isVerified ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600' : 'bg-gray-800'} relative`}>
          {isVerified && (
            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xl">
              <ShieldCheck className="w-4 h-4 text-blue-200" /> PLATFORM VERIFIED
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-b-3xl p-6 md:p-10 shadow-2xl -mt-12 md:-mt-16 relative">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start text-center md:text-left">
            
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gray-800 flex items-center justify-center text-5xl font-bold border-4 border-gray-900 shadow-2xl overflow-hidden">
                {portfolio.avatar ? <img src={portfolio.avatar} className="w-full h-full object-cover" alt="" /> : portfolio.name.charAt(0)}
              </div>
              {isVerified && (
                <div className="absolute bottom-2 right-2 bg-blue-500 text-white p-1.5 rounded-full border-4 border-gray-900 shadow-lg" title="Verified Expert">
                  <CheckCircle className="w-6 h-6" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 pt-2 md:pt-16">
              <h1 className="text-3xl md:text-4xl font-black mb-2 flex items-center justify-center md:justify-start gap-2">
                {portfolio.name}
              </h1>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-xl mb-6">
                {portfolio.bio || "Passionate learner and mentor on SkillSwap."}
              </p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                 <Link href={`/book/${portfolio.id}`}>
                   <Button className="bg-primary hover:bg-primary/90 text-white rounded-full h-12 px-8 font-extrabold shadow-lg shadow-primary/25 transition-all hover:scale-105">
                     Book Session
                   </Button>
                 </Link>
                 <Button onClick={copyLink} variant="outline" className="rounded-full h-12 px-6 border-white/10 hover:bg-white/5 font-bold gap-2">
                   {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />} {copied ? "Copied" : "Share"}
                 </Button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/10 pt-8">
            <div className="bg-gray-950/50 p-5 rounded-2xl border border-white/5 text-center transition-transform hover:-translate-y-1">
              <div className="text-3xl mb-2 flex justify-center"><Star className="w-8 h-8 text-yellow-400 fill-yellow-400" /></div>
              <div className="text-2xl font-black text-white">{rating}</div>
              <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Rating</div>
            </div>
            <div className="bg-gray-950/50 p-5 rounded-2xl border border-white/5 text-center transition-transform hover:-translate-y-1">
              <div className="text-3xl mb-2 flex justify-center"><ShieldCheck className="w-8 h-8 text-blue-400" /></div>
              <div className="text-2xl font-black text-white">{portfolio.trustScore}<span className="text-sm text-gray-500">/100</span></div>
              <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Trust Score</div>
            </div>
            <div className="bg-gray-950/50 p-5 rounded-2xl border border-white/5 text-center transition-transform hover:-translate-y-1">
              <div className="text-3xl mb-2 flex justify-center"><Award className="w-8 h-8 text-green-400" /></div>
              <div className="text-2xl font-black text-white">{portfolio.sessionsCompleted}</div>
              <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Sessions Taught</div>
            </div>
            <div className="bg-gray-950/50 p-5 rounded-2xl border border-white/5 text-center transition-transform hover:-translate-y-1">
              <div className="text-3xl mb-2 flex justify-center"><Flame className="w-8 h-8 text-orange-400" /></div>
              <div className="text-2xl font-black text-white">{portfolio.currentStreak} <span className="text-sm text-gray-500">days</span></div>
              <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">Active Streak</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
