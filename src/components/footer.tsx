import { Link } from "wouter";
import { useState } from "react";
import { Github, Twitter, Linkedin, Mail, MapPin, ArrowRight, Users, BookOpen, Star, Zap } from "lucide-react";

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
    { icon: Twitter, href: "https://x.com/Aaadityapsingh", label: "X / Twitter" },
    { icon: Linkedin, href: "https://linkedin.com/in/aditya-pratap-singh00", label: "LinkedIn" },
    { icon: Github, href: "https://github.com/Adityahub404singh", label: "GitHub" },
  ];

  const Logo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect width="48" height="48" rx="12" fill="#5B5BF6"/>
      <path d="M13 18 C13 13 18 11 22 11 C26 11 31 13 31 18 C31 23 26 25 22 25"
            stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round"/>
      <polyline points="27,14 31,18 27,22" stroke="#ffffff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M35 30 C35 35 30 37 26 37 C22 37 17 35 17 30 C17 25 22 23 26 23"
            stroke="#a5a5ff" strokeWidth="3.5" strokeLinecap="round"/>
      <polyline points="21,34 17,30 21,26" stroke="#a5a5ff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <footer className="border-t border-border/50 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      {/* Stats bar */}
      <div className="border-b border-border/30 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-base font-bold text-foreground">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">

          {/* Brand - 2 cols */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex-shrink-0"><Logo /></div>
              <div>
                <div className="text-xl font-black">Skill<span className="text-primary">Swap</span></div>
                <div className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">Learn. Teach. Grow.</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The world's first peer-to-peer skill exchange economy. Teach what you know, learn what you need — completely free.
            </p>

            {/* Newsletter */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Get weekly learning tips 🚀</p>
              {subscribed ? (
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                  <span>✓</span> Subscribed! Check your inbox.
                </div>
              ) : (
                <form onSubmit={handleNewsletter} className="flex gap-2">
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com" required
                    className="flex-1 h-9 px-3 text-sm rounded-lg border border-border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            {/* Real social links */}
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
                  <Link href={l.href} className="hover:text-primary transition-colors flex items-center gap-1.5 group">
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
                  <Link href={l.href} className="hover:text-primary transition-colors flex items-center gap-1.5 group">
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
              ].map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-primary transition-colors flex items-center gap-1.5 group">
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
                <a href="mailto:singhaditya4560@gmail.com" className="hover:text-primary transition-colors flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" /> singhaditya4560@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Greater Lucknow, India</span>
              </li>
            </ul>
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">🔒 SSL Secured</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">🇮🇳 Made with ❤️ in India</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">⚡ 99.9% Uptime SLA</div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border/40">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5"><Logo /></div>
              <span>© 2026 SkillSwap by Aditya Pratap Singh. All rights reserved.</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              <span>|</span>
              <span>🌍 Available Worldwide</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}