import { motion } from "framer-motion";
import { Layers } from "lucide-react"; // 🔥 Import Layers icon

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-accent/8 blur-3xl" />
      </div>
      
      {/* 🔥 FIX: Used Lucide Icon instead of broken Image file */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-24 h-24 flex items-center justify-center shadow-2xl shadow-primary/20 mb-6 rounded-3xl bg-gradient-to-br from-indigo-500 via-primary to-violet-600 overflow-hidden"
      >
        <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
            <Layers className="w-12 h-12 text-white" />
        </motion.div>
      </motion.div>
      
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center">
        <h1 className="text-2xl font-black mb-1">Skill<span className="text-primary">Swap</span></h1>
        <p className="text-muted-foreground text-sm">Exchange Skills, Not Money.</p>
      </motion.div>
      
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <motion.div key={i} animate={{ scale: [1,1.5,1], opacity: [0.4,1,0.4] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
              className="w-2 h-2 rounded-full bg-primary" />
          ))}
        </div>
      </motion.div>
    </div>
  );
}