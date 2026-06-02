import { Link } from "wouter";
import { useState } from "react";
import { Github, Twitter, Linkedin, Instagram, Youtube, Mail, MapPin, Phone, ArrowRight, Users, BookOpen, Star, Zap } from "lucide-react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) { setSubscribed(true); setEmail(""); }
  };

  const stats = [
    { icon: Users, value: "10,000+", label: "Active Learners" },
    { icon: BookOpen, value: "500+", label: "Skills Available" },
    { icon: Star, value: "4.9/5", label: "Average Rating" },
    { icon: Zap, value: "Free", label: "Always Free" },
  ];

  const socials = [
    { icon: Twitter, href: "https://twitter.com/skillswap", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com/company/skillswap", label: "LinkedIn" },
    { icon: Github, href: "https://github.com/skillswap", label: "GitHub" },
    { icon: Instagram, href: "https://instagram.com/skillswap", label: "Instagram" },
    { icon: Youtube, href: "https://youtube.com/@skillswap", label: "YouTube" },
  ];

  return (
    <footer className="border-t border-border/50 bg-background relative overflow-hidden">
      {/* Gradient top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* Stats bar */}
      <div className="border-b border-border/30 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">

          {/* Brand column - spans 2 */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary/25">S</div>
              <div>
                <span className="text-xl font-black text-foreground">Skill<span className="text-primary">Swap</span></span>
                <div className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">Learn. Teach. Grow.</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The world&apos;s first peer-to-peer skill exchange economy. Teach what you know, learn what you need — completely free.
            </p>

            {/* Newsletter */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Get learning tips weekly 🚀</p>
              {subscribed ? (
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                  <span>✓</span> You&apos;re subscribed! Check your inbox.
                </div>
              ) : (
                <form onSubmit={handleNewsletter} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 h-9 px-3 text-sm rounded-lg border border-border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    required
                  />
                  <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-1 text-sm font-medium">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            {/* Social links */}
            <div className="flex gap-2">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                  className="w-9 h-9 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-200">
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Platform</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                { href: "/explore", label: "Explore Skills" },
                { href: "/sessions", label: "My Sessions" },
                { href: "/wallet", label: "Wallet & Credits" },
                { href: "/dashboard", label: "Dashboard" },
                { href: "/ai", label: "SkillAI Assistant" },
                { href: "/register", label: "Get Started Free" },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-primary transition-colors duration-150 flex items-center gap-1.5 group">
                    <span className="w-1 h-1 rounded-full bg-primary/30 group-hover:bg-primary transition-colors" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Learn */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Learn Free</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                { href: "/skills/python", label: "Learn Python" },
                { href: "/skills/javascript", label: "Learn JavaScript" },
                { href: "/skills/web-development", label: "Web Development" },
                { href: "/skills/english", label: "Learn English" },
                { href: "/skills/dsa", label: "DSA & Algorithms" },
                { href: "/skills/graphic-design", label: "Graphic Design" },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-primary transition-colors duration-150 flex items-center gap-1.5 group">
                    <span className="w-1 h-1 rounded-full bg-primary/30 group-hover:bg-primary transition-colors" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Company</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                { href: "/terms", label: "Terms of Service" },
                { href: "/privacy", label: "Privacy Policy" },
                { href: "/terms", label: "Cookie Policy" },
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-primary transition-colors duration-150 flex items-center gap-1.5 group">
                    <span className="w-1 h-1 rounded-full bg-primary/30 group-hover:bg-primary transition-colors" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Contact</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a href="mailto:hello@skillswap.com" className="hover:text-primary transition-colors flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" /> hello@skillswap.com
                </a>
              </li>
              <li>
                <a href="mailto:support@skillswap.com" className="hover:text-primary transition-colors flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" /> support@skillswap.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>India &amp; Worldwide<br />Remote-first company</span>
              </li>
            </ul>

            {/* Trust badges */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-green-500">🔒</span> SSL Secured
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>🇮🇳</span> Made with ❤️ in India
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>⚡</span> 99.9% Uptime SLA
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border/40">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-[10px]">S</div>
              <span>© 2026 SkillSwap Technologies. All rights reserved.</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              <span className="text-border">|</span>
              <span>🌍 Available Worldwide</span>
              <span>•</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" /> All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}