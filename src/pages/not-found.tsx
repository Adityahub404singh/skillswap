import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, Compass, ArrowLeft, Sparkles } from "lucide-react";
import { SEO } from "@/components/seo";
export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <SEO title="Page Not Found" description="This page does not exist on SkillSwap." />
      <div className="text-center max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative mb-8">
          <div className="text-[9rem] font-black leading-none select-none" style={{ background: "linear-gradient(135deg,#5B5BF6,#7c3aed,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            404
          </div>
          <motion.div animate={{ rotate: [0,15,-15,0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-4 right-4">
            <Sparkles className="w-10 h-10 text-primary/30" />
          </motion.div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3 mb-10">
          <h1 className="text-3xl font-black">Page Not Found</h1>
          <p className="text-muted-foreground text-lg">Looks like this skill has not been listed yet. Head back and explore what is available!</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link href="/"><Button className="w-full sm:w-auto rounded-full h-12 px-8 font-bold"><Home className="w-4 h-4 mr-2" /> Go Home</Button></Link>
          <Link href="/explore"><Button variant="outline" className="w-full sm:w-auto rounded-full h-12 px-8 font-bold"><Compass className="w-4 h-4 mr-2" /> Explore Skills</Button></Link>
        </motion.div>
        <a href="javascript:history.back()" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Go back
        </a>
      </div>
    </div>
  );
}
