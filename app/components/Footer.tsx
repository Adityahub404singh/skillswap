import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <svg viewBox="0 0 32 32" className="h-8 w-8 text-primary" fill="currentColor" aria-hidden="true">
                <path d="M16 2C8.28 2 2 8.28 2 16s6.28 14 14 14 14-6.28 14-14S23.72 2 16 2zm0 26c-6.627 0-12-5.373-12-12S9.373 4 16 4s12 5.373 12 12-5.373 12-12 12z"/>
                <path d="M16 8c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zm0 14c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"/>
              </svg>
              <span className="text-lg font-bold">SkillSwap</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Learn skills by teaching what you know. Build growth through peer learning.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">Platform</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/explore" className="hover:text-foreground">Explore</Link></li>
              <li><Link to="/sessions" className="hover:text-foreground">Sessions</Link></li>
              <li><Link to="/wallet" className="hover:text-foreground">Wallet</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">Learn</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/skills/python" className="hover:text-foreground">Python</Link></li>
              <li><Link to="/skills/react" className="hover:text-foreground">React</Link></li>
              <li><Link to="/skills/english" className="hover:text-foreground">English</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">Contact</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>hello@skillswap.com</li>
              <li>LinkedIn â€¢ X â€¢ GitHub</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          Â© 2026 SkillSwap. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

