"use client";
import { useRoute, Link } from "wouter";
import { Star, CheckCircle, MapPin, Calendar, Zap, Award, Copy, Check, Globe, Loader2 } from "lucide-react";
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;
  if (!portfolio) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white"><h1 className="text-2xl font-bold mb-2">Profile Not Found</h1><p className="text-gray-400 mb-6">This user may have set their profile to private.</p><Link href="/explore"><Button className="bg-violet-600">Explore Mentors</Button></Link></div>;

  const isVerified = portfolio.trustScore > 80;
  const rating = portfolio.averageRating > 0 ? portfolio.averageRating : 5.0;

  return (
    <div className="min-h-screen bg-gray-950 text-white py-10 px-4">
      <div className="max-w-3xl mx-auto bg-gray-900/60 border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-4xl font-bold mb-4 border-4 border-gray-800">
            {portfolio.avatar ? <img src={portfolio.avatar} className="w-full h-full object-cover rounded-full" alt="" /> : portfolio.name.charAt(0)}
          </div>
          <h1 className="text-3xl font-black mb-2">{portfolio.name}</h1>
          <p className="text-gray-400 mb-6 max-w-md">{portfolio.bio || "No bio available."}</p>
          <div className="flex gap-3">
             <Button onClick={copyLink} variant="outline" className="rounded-xl border-white/10">{copied ? "Copied!" : "Share Profile"}</Button>
             <Link href={`/book/${portfolio.id}`}>
               <Button className="bg-violet-600 hover:bg-violet-700 rounded-xl">Book Session</Button>
             </Link>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="bg-gray-950 p-4 rounded-xl text-center"><div className="text-xl font-bold text-blue-400">{portfolio.trustScore}</div><div className="text-xs text-gray-500">Trust</div></div>
           <div className="bg-gray-950 p-4 rounded-xl text-center"><div className="text-xl font-bold text-yellow-400">{rating}</div><div className="text-xs text-gray-500">Rating</div></div>
           <div className="bg-gray-950 p-4 rounded-xl text-center"><div className="text-xl font-bold text-green-400">{portfolio.sessionsCompleted}</div><div className="text-xs text-gray-500">Sessions</div></div>
           <div className="bg-gray-950 p-4 rounded-xl text-center"><div className="text-xl font-bold text-orange-400">{portfolio.currentStreak}d</div><div className="text-xs text-gray-500">Streak</div></div>
        </div>
      </div>
    </div>
  );
}