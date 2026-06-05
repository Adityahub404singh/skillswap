"use client";
import { useRoute, Link } from "wouter";
import { Star, CheckCircle, MapPin, Calendar, Zap, Award, Share2, Copy, Check, Globe } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

// Mock portfolio data — replace with API call using slug
const MOCK_PORTFOLIO = {
  id: 1,
  name: "Aditya Kumar",
  seoSlug: "aditya-kumar-1",
  bio: "Full-stack developer passionate about teaching React and JavaScript. Helped 25+ students land their first dev jobs.",
  location: "Ahmedabad, Gujarat",
  avatar: "",
  isVerified: true,
  isPremium: true,
  rating: 4.9,
  sessionsCompleted: 28,
  currentStreak: 30,
  skillsTeach: ["React", "JavaScript", "TypeScript", "Node.js"],
  skillsLearn: ["UI/UX", "English", "Design"],
  verifiedSkills: ["React", "JavaScript"],
  badges: [
    { icon: "🏆", label: "Top Mentor" },
    { icon: "🔥", label: "30-Day Streak" },
    { icon: "✅", label: "Verified Dev" },
    { icon: "⭐", label: "5-Star Teacher" },
  ],
  completedExchanges: 25,
  testimonials: [
    { name: "Rahul S.", skill: "React", rating: 5, text: "Aditya explained React hooks so clearly! Went from confused to building my own projects in 2 weeks." },
    { name: "Priya P.", skill: "JavaScript", rating: 5, text: "Best mentor on SkillSwap. Patient, knowledgeable, and always available for doubts." },
    { name: "Vikram M.", skill: "TypeScript", rating: 4, text: "Great at breaking down complex concepts. Highly recommend for TypeScript." },
  ],
  createdAt: "2024-01-15",
};

export default function PublicPortfolio() {
  const [, params] = useRoute("/u/:slug");
  const slug = params?.slug ?? "";
  const [copied, setCopied] = useState(false);

  // In real app: const { data: portfolio } = useGetPortfolio(slug);
  const portfolio = MOCK_PORTFOLIO;

  function copyLink() {
    navigator.clipboard.writeText(`https://skillswap.in/u/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // SEO meta — in Next.js use next/head, in Vite use react-helmet
  const title = `${portfolio.name} — Skill Exchange Profile | SkillSwap`;
  const desc  = `${portfolio.name} teaches ${portfolio.skillsTeach.join(", ")} on SkillSwap. ${portfolio.sessionsCompleted} sessions completed. Rating: ${portfolio.rating}/5. Learn without paying money.`;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hidden SEO tags — use react-helmet in your app */}
      <noscript>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={`https://skillswap.in/u/${slug}`} />
        <meta name="twitter:card" content="summary_large_image" />
      </noscript>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Profile Header */}
        <div className="bg-gray-900/60 border border-white/10 rounded-2xl overflow-hidden mb-6">
          <div className="h-24 bg-gradient-to-r from-violet-900/60 via-indigo-900/40 to-purple-900/60" />
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-8 mb-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white border-4 border-gray-900">
                  {portfolio.name.charAt(0)}
                </div>
                {portfolio.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-gray-900">
                    <CheckCircle size={11} className="text-white" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-gray-400 text-sm hover:bg-white/10 hover:text-white transition-all">
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  {copied ? "Copied!" : "Share"}
                </button>
                <Link href={`/book-session?mentor=${portfolio.id}`}>
                  <Button className="bg-violet-500 hover:bg-violet-600 text-white text-sm flex items-center gap-1.5">
                    <Zap size={13} /> Book Session
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-white">{portfolio.name}</h1>
                {portfolio.isPremium && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 border border-yellow-500/20">
                    ⭐ Premium
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 mb-2 leading-relaxed">{portfolio.bio}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                {portfolio.location && <span className="flex items-center gap-1"><MapPin size={11} /> {portfolio.location}</span>}
                <span className="flex items-center gap-1"><Calendar size={11} /> Joined {new Date(portfolio.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                <span className="flex items-center gap-1"><Globe size={11} /> skillswap.in/u/{slug}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Rating",    value: portfolio.rating,            icon: "⭐" },
                { label: "Sessions",  value: portfolio.sessionsCompleted,  icon: "📅" },
                { label: "Streak",    value: `${portfolio.currentStreak}d`, icon: "🔥" },
                { label: "Exchanges", value: portfolio.completedExchanges, icon: "🤝" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-lg font-bold text-white">{s.icon} {s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900/60 border border-white/8 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">🎓 Can Teach</h3>
            <div className="flex flex-wrap gap-2">
              {portfolio.skillsTeach.map(s => (
                <span key={s} className={`px-2.5 py-1 rounded-xl text-xs font-medium border ${
                  portfolio.verifiedSkills.includes(s)
                    ? "bg-blue-500/15 text-blue-300 border-blue-500/20"
                    : "bg-violet-500/15 text-violet-300 border-violet-500/20"
                }`}>
                  {portfolio.verifiedSkills.includes(s) && "✅ "}{s}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-gray-900/60 border border-white/8 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white mb-3">📚 Wants to Learn</h3>
            <div className="flex flex-wrap gap-2">
              {portfolio.skillsLearn.map(s => (
                <span key={s} className="px-2.5 py-1 rounded-xl text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="bg-gray-900/60 border border-white/8 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Award size={15} className="text-yellow-400" /> Achievements
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {portfolio.badges.map(b => (
              <div key={b.label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-xs">
                <span>{b.icon}</span>
                <span className="text-gray-300 truncate">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="bg-gray-900/60 border border-white/8 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Star size={15} className="text-yellow-400" /> Student Reviews ({portfolio.testimonials.length})
          </h3>
          <div className="space-y-4">
            {portfolio.testimonials.map((t, i) => (
              <div key={i} className="p-4 bg-gray-950/60 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">{t.name}</p>
                      <p className="text-xs text-gray-500">Learned {t.skill}</p>
                    </div>
                  </div>
                  <div className="flex">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={11} className={i <= t.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-700"} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed italic">"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-violet-900/40 to-indigo-900/30 border border-violet-500/25 rounded-2xl p-6 text-center">
          <p className="text-lg font-bold text-white mb-2">Want to learn from {portfolio.name.split(" ")[0]}?</p>
          <p className="text-sm text-gray-400 mb-4">Exchange your skill — no money needed. Just knowledge for knowledge.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/register">
              <Button className="bg-violet-500 hover:bg-violet-600 text-white font-semibold">
                Join SkillSwap Free
              </Button>
            </Link>
            <Link href={`/book-session?mentor=${portfolio.id}`}>
              <Button variant="outline" className="border-violet-500/30 text-violet-300">
                Book Session
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
