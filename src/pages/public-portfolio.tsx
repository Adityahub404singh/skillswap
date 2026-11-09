
"use client";

import { useRoute, Link } from "wouter";
import {
  Star,
  CheckCircle,
  MapPin,
  Calendar,
  Award,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  Flame,
  ArrowUpRight,
  GraduationCap,
  Sparkles,
  Globe,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface PortfolioData {
  id: number;
  name: string;
  bio?: string | null;
  avatar?: string | null;
  trustScore: number;
  averageRating: number;
  sessionsCompleted: number;
  currentStreak: number;
  isPremium?: boolean;
  location?: string | null;
  skillsTeachV2?: any[];
  isPortfolioPublic?: boolean;
}

export default function PublicPortfolio() {
  const [, params] = useRoute("/u/:slug");
  const slug = params?.slug ?? "";

  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) {
      setPortfolio(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchPortfolio() {
      setLoading(true);
      setError("");
      setPortfolio(null);

      try {
        const response = await fetch(
          `/api/users/portfolio/${encodeURIComponent(slug)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          if (response.status === 404) {
            setPortfolio(null);
            return;
          }
          throw new Error("Unable to load this profile.");
        }

        const data = await response.json();

        if (!data || !data.id || !data.name) {
          setPortfolio(null);
          return;
        }

        setPortfolio(data);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message || "Something went wrong.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchPortfolio();

    return () => controller.abort();
  }, [slug]);

  async function copyLink() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const input = document.createElement("textarea");
        input.value = window.location.href;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();

        const success = document.execCommand("copy");
        input.remove();

        if (!success) throw new Error("Copy failed");
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Unable to copy the profile link. Please copy the URL manually.");
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center text-white gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl" />
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin relative" />
        </div>
        <p className="text-sm text-gray-400 font-medium">
          Loading mentor profile...
        </p>
      </div>
    );
  }

  // Error
  if (error && !portfolio) {
    return (
      <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center text-white px-4">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-gray-400 text-center mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  // Profile not found
  if (!portfolio) {
    return (
      <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center text-white px-4">
        <div className="w-20 h-20 rounded-3xl bg-gray-800 flex items-center justify-center mb-6">
          <GraduationCap className="w-10 h-10 text-gray-400" />
        </div>

        <h1 className="text-3xl font-black mb-3">
          Profile Not Found
        </h1>

        <p className="text-gray-400 text-center max-w-md mb-7">
          This profile doesn't exist or is not publicly available.
        </p>

        <Link href="/explore">
          <Button className="rounded-full px-8 h-12 font-bold">
            Explore Mentors <ArrowUpRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
      </div>
    );
  }

  const trustScore = Math.min(
    100,
    Math.max(0, Number(portfolio.trustScore) || 0)
  );

  const rating = Number(portfolio.averageRating) || 0;
  const sessions = Number(portfolio.sessionsCompleted) || 0;
  const streak = Number(portfolio.currentStreak) || 0;

  // A high trust score is not the same as an official platform verification.
  const isTrusted = trustScore >= 80;
  const isPremium = portfolio.isPremium === true;

  const initials = portfolio.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#080b14] text-white relative overflow-hidden">

      {/* Background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-purple-600/10 blur-[140px] rounded-full pointer-events-none" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-16 relative z-10">

        {/* Top navigation */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/">
            <span className="text-xl font-black tracking-tight cursor-pointer">
              Skill<span className="text-blue-400">Swap</span>
            </span>
          </Link>

          <Link href="/explore">
            <span className="text-sm text-gray-400 hover:text-white transition cursor-pointer">
              Explore Mentors →
            </span>
          </Link>
        </div>

        {/* Main profile */}
        <div className="rounded-[28px] overflow-hidden border border-white/10 bg-[#101522]/90 shadow-2xl shadow-black/30">

          {/* Banner */}
          <div className="h-36 sm:h-48 md:h-60 relative overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800">

            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "25px 25px",
              }}
            />

            <div className="absolute -right-10 -top-20 w-72 h-72 rounded-full border border-white/10" />
            <div className="absolute -right-2 -top-12 w-56 h-56 rounded-full border border-white/10" />

            <div className="absolute top-5 right-5 flex gap-2 flex-wrap justify-end">
              {isTrusted && (
                <span className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-2 text-xs font-bold tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-blue-200" />
                  HIGH TRUST
                </span>
              )}

              {isPremium && (
                <span className="flex items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-400/15 backdrop-blur-xl px-4 py-2 text-xs font-bold text-yellow-200">
                  <Sparkles className="w-4 h-4" />
                  PREMIUM
                </span>
              )}
            </div>

            <div className="absolute bottom-5 left-6 md:left-10">
              <p className="text-white/60 text-xs uppercase tracking-[0.25em] font-bold">
                Public Mentor Profile
              </p>
            </div>
          </div>

          {/* Profile details */}
          <div className="px-6 pb-8 md:px-10 md:pb-10">

            <div className="flex flex-col md:flex-row gap-6 md:gap-8">

              {/* Avatar */}
              <div className="relative -mt-16 md:-mt-20 shrink-0 mx-auto md:mx-0">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-[30px] p-1 bg-[#101522] border border-white/10 shadow-2xl">
                  <div className="w-full h-full rounded-[26px] overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    {portfolio.avatar ? (
                      <img
                        src={portfolio.avatar}
                        alt={`${portfolio.name}'s profile`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-4xl md:text-5xl font-black text-white">
                        {initials}
                      </span>
                    )}
                  </div>
                </div>

                {isTrusted && (
                  <div
                    className="absolute -bottom-2 -right-2 bg-blue-500 p-2 rounded-full border-4 border-[#101522]"
                    title="High trust score"
                  >
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              {/* Name and bio */}
              <div className="flex-1 pt-3 md:pt-5 text-center md:text-left min-w-0">

                <div className="flex flex-wrap gap-2 items-center justify-center md:justify-start mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                    Mentor Profile
                  </span>

                  {isPremium && (
                    <span className="text-xs text-yellow-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Premium Member
                    </span>
                  )}
                </div>

                <h1 className="text-3xl md:text-5xl font-black tracking-tight break-words">
                  {portfolio.name}
                </h1>

                <p className="text-gray-400 mt-4 max-w-2xl leading-7">
                  {portfolio.bio ||
                    "Passionate learner and mentor on SkillSwap. Connect, learn and grow together."}
                </p>

                {portfolio.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-4 justify-center md:justify-start">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    {portfolio.location}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 mt-7 justify-center md:justify-start">

                  <Link href={`/book/${portfolio.id}`}>
                    <Button className="h-12 rounded-full px-8 font-bold bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5">
                      <Calendar className="w-4 h-4 mr-2" />
                      Book a Session
                      <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>

                  <Button
                    onClick={copyLink}
                    variant="outline"
                    className="h-12 rounded-full px-6 border-white/10 bg-white/5 hover:bg-white/10 font-bold"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 mr-2 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {copied ? "Copied!" : "Share Profile"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mt-12 pt-8 border-t border-white/10">

              {/* Rating */}
              <StatCard
                icon={<Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />}
                value={rating > 0 ? rating.toFixed(1) : "New"}
                label="Average Rating"
                description={rating > 0 ? "Mentor rating" : "No ratings yet"}
              />

              {/* Trust */}
              <StatCard
                icon={<ShieldCheck className="w-5 h-5 text-blue-400" />}
                value={`${trustScore}/100`}
                label="Trust Score"
                description="Community trust"
              />

              {/* Sessions */}
              <StatCard
                icon={<Award className="w-5 h-5 text-green-400" />}
                value={sessions}
                label="Sessions Taught"
                description="Learning connections"
              />

              {/* Streak */}
              <StatCard
                icon={<Flame className="w-5 h-5 text-orange-400" />}
                value={streak}
                label="Active Streak"
                description="Consecutive days"
              />
            </div>

            {/* Trust progress */}
            <div className="mt-8 rounded-2xl bg-[#080d18] border border-white/5 p-5 md:p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    Trust Score
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Mentor reputation on SkillSwap
                  </p>
                </div>

                <span className="text-xl font-black text-blue-400">
                  {trustScore}%
                </span>
              </div>

              <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
                  style={{ width: `${trustScore}%` }}
                />
              </div>

              <p className="text-xs text-gray-500 mt-3">
                {isTrusted
                  ? "This mentor has achieved a high community trust score."
                  : "Trust score can grow through successful learning sessions and community participation."}
              </p>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-8 text-xs text-gray-600">
          <p>Powered by SkillSwap</p>
          <p className="flex items-center gap-2">
            <Globe className="w-3 h-3" />
            Learn. Teach. Grow.
          </p>
        </div>
      </main>
    </div>
  );
}

// Reusable stat component
function StatCard({
  icon,
  value,
  label,
  description,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl bg-[#080d18] border border-white/5 p-5 text-center transition-all duration-300 hover:border-blue-500/30 hover:-translate-y-1">
      <div className="w-11 h-11 mx-auto rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-blue-500/10 transition">
        {icon}
      </div>

      <div className="text-2xl md:text-3xl font-black text-white">
        {value}
      </div>

      <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mt-2">
        {label}
      </p>

      <p className="text-[10px] text-gray-600 mt-1">
        {description}
      </p>
    </div>
  );
}
