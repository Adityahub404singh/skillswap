import { useState } from "react";
import { Sparkles, ExternalLink, X } from "lucide-react";

interface SponsorCardProps {
  title?: string;
  badge?: string;
  affiliateUrl?: string;
}

export function SponsorCard({
  title = "Try Notta AI: Instant AI Notes & Transcriptions for Lectures",
  badge = "Featured Tool",
  affiliateUrl = "https://ypetp.com/g/7gbdp8tygu97d3572b24f50bb56640/",
}: SponsorCardProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative group bg-gradient-to-r from-violet-900/90 via-indigo-900/90 to-slate-900 text-white rounded-2xl px-4 py-3 border border-indigo-500/20 shadow-sm transition-all duration-300 hover:border-indigo-500/40">
      <div className="flex items-center justify-between gap-3">
        
        {/* Left Side: Badge + Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 inline-flex items-center gap-1 bg-amber-400/10 text-amber-300 border border-amber-400/20 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
            <Sparkles className="w-2.5 h-2.5" />
            {badge}
          </span>
          <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
            {title}
          </p>
        </div>

        {/* Right Side: Action Link & Close Button */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl backdrop-blur-sm transition-all active:scale-95"
          >
            <span>Free Try</span>
            <ExternalLink className="w-3 h-3 text-indigo-300" />
          </a>

          {/* User Control: Close Banner Option */}
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}