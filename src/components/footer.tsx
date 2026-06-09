import { Link } from "wouter";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Twitter, Linkedin, Mail, MapPin, ArrowRight, Users, BookOpen, Star, Zap, ShieldCheck, Globe, Trophy, Code2, Brain, Palette, CheckCircle } from "lucide-react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  const handleNewsletter = async (e: React.FormEvent) => { e.preventDefault(); if (!email) return; try { await fetch('/api/platform/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }); setSubscribed(true); setEmail(''); } catch (err) { console.error(err); } };

  const stats = [
    { icon: Users, value: "10,000+", label: "Active Learners", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: BookOpen, value: "500+", label: "Skills Available", color: "text-purple-500", bg: "bg-purple-500/10" },
    { icon: Star, value: "4.9/5", label: "Average Rating", color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { icon: Zap, value: "₹0 Cost", label: "Always Free", color: "text-green-500", bg: "bg-green-500/10" },
  ];

  const socials = [
    { icon: Twitter, href: "https://x.com/Aaadityapsingh", label: "Twitter/X", hoverBg: "hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] hover:border-[#1DA1F2]/50" },
    { icon: Linkedin, href: "https://linkedin.com/in/aditya-pratap-singh00", label: "LinkedIn", hoverBg: "hover:bg-[#0077b5]/10 hover:text-[#0077b5] hover:border-[#0077b5]/50" },
    { icon: Github, href: "https://github.com/Adityahub404singh", label: "GitHub", hoverBg: "hover:bg-foreground/10 hover:text-foreground hover:border-foreground/50" },
  ];

  const linkGroups = [
    {
      title: "Platform",
      links: [
        { href: "/explore", label: "Explore Mentors" },
        { href: "/flash-board", label: "Live Doubts" },
        { href: "/wallet", label: "Credit Economy" },
        { href: "/ai", label: "SkillAI Assistant" },
      ]
    },
    {
      title: "Top Skills",
      links: [
        { href: "/explore", label: "Learn Python", icon: Code2 },
        { href: "/explore", label: "Web Development", icon: Globe },
        { href: "/explore", label: "DSA & Algorithms", icon: Brain },
        { href: "/explore", label: "Graphic Design", icon: Palette },
      ]
    },
    {
      title: "Company",
      links: [
        { href: "/terms", label: "Terms of Service" },
        { href: "/privacy-policy", label: "Privacy Policy" },
        { href: "/leaderboard", label: "Global Leaderboard" },
      ]
    }
  ];

  return (
    <footer className="relative bg-[#050505] text-white overflow-hidden border-t border-white/5 pt-20">
      
      {/* 🌌 Animated Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* 📊 Top Stats Banner */}
      <div className="border-b border-white/10 relative z-10 bg-white/[0.02] backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div 
                key={s.label} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left group"
              >
                <div className={`w-14 h-14 rounded-2xl ${s.bg} flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <s.icon className={`w-7 h-7 ${s.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-black text-white tracking-tight">{s.value}</div>
                  <div className="text-sm text-gray-400 font-medium">{s.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* 🧩 Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12">

          {/* 🌟 Brand & Newsletter Section (Spans 4 cols) */}
          <div className="lg:col-span-4 space-y-8">
            <Link href="/" className="flex items-center gap-3 group inline-flex">
              <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.5 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <span className="text-white font-black text-2xl">S</span>
              </motion.div>
              <div>
                <span className="text-2xl font-black text-white tracking-tight">Skill<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Swap</span></span>
                <div className="text-[11px] text-gray-400 font-bold tracking-[0.2em] uppercase">Learn. Teach. Grow.</div>
              </div>
            </Link>
            
            <p className="text-gray-400 leading-relaxed text-sm pr-4">
              Join the revolution of peer-to-peer education. We've replaced money with skills. Teach what you know, earn credits, and master anything.
            </p>

            {/* Newsletter */}
            <div className="space-y-3 p-1">
              <p className="text-sm font-bold text-white">Join 10k+ learners receiving weekly tips</p>
              <AnimatePresence mode="wait">
                {subscribed ? (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold">
                    <CheckCircle className="w-5 h-5" /> Welcome to the club!
                  </motion.div>
                ) : (
                  <motion.form exit={{ opacity: 0 }} onSubmit={handleNewsletter} className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                    <div className="relative flex items-center bg-gray-900 border border-white/10 rounded-xl p-1 focus-within:border-primary/50 transition-colors">
                      <Mail className="w-5 h-5 text-gray-500 ml-3 mr-1" />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email..."
                        className="flex-1 bg-transparent border-none text-white text-sm focus:ring-0 placeholder:text-gray-600 h-10 px-2" required />
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" 
                        className="h-10 px-5 rounded-lg bg-white text-black font-bold text-sm flex items-center gap-2 hover:bg-gray-200 transition-colors">
                        Subscribe
                      </motion.button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* 🔗 Links Columns (Spans 8 cols) */}
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-8 pt-4">
            {linkGroups.map((group, groupIdx) => (
              <div key={group.title} className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-white">{group.title}</h3>
                <ul className="space-y-4">
                  {group.links.map((l, i) => (
                    <motion.li key={l.label} 
                      initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} 
                      viewport={{ once: true }} transition={{ delay: (groupIdx * 0.1) + (i * 0.05) }}
                      onHoverStart={() => setHoveredLink(l.label)} onHoverEnd={() => setHoveredLink(null)}
                    >
                      <Link href={l.href} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group/link w-fit">
                        <ArrowRight className={`w-3 h-3 transition-all duration-300 ${hoveredLink === l.label ? "opacity-100 text-primary translate-x-0" : "opacity-0 -translate-x-4 w-0"}`} />
                        <span className="text-sm font-medium">{l.label}</span>
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* 🌍 Bottom Bar */}
      <div className="border-t border-white/10 relative z-10 bg-[#020202]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
            <span>© 2026 SkillSwap Inc.</span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> India</span>
          </div>

          {/* Socials */}
          <div className="flex gap-3">
            {socials.map((s) => (
              <motion.a key={s.label} whileHover={{ y: -3 }} href={s.href} target="_blank" rel="noopener noreferrer" 
                className={`w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 transition-all duration-300 ${s.hoverBg}`}>
                <s.icon className="w-4 h-4" />
              </motion.a>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
            <span className="flex items-center gap-1.5 text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Systems Operational
            </span>
            <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4"/> SSL Secured</span>
          </div>

        </div>
      </div>
    </footer>
  );
}

