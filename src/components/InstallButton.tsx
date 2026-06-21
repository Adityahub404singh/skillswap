import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Download, X } from "lucide-react";

// beforeinstallprompt ka official type definition browser APIs mein nahi hai,
// isliye khud declare karna padta hai
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = "skillswap_install_dismissed_at";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 din

function isAlreadyInstalled(): boolean {
  const isStandaloneDisplay = window.matchMedia("(display-mode: standalone)").matches;
  const isIosStandalone = (window.navigator as any).standalone === true; // iOS Safari ka apna flag
  return isStandaloneDisplay || isIosStandalone;
}

function wasRecentlyDismissed(): boolean {
  const dismissedAt = localStorage.getItem(DISMISS_KEY);
  if (!dismissedAt) return false;
  return Date.now() - parseInt(dismissedAt, 10) < DISMISS_COOLDOWN_MS;
}

export const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Native Android APK ke andar PWA install prompt bilkul irrelevant hai —
    // app already installed hai, koi prompt dikhane ki zaroorat nahi
    if (Capacitor.isNativePlatform()) return;
    if (isAlreadyInstalled()) return;
    if (wasRecentlyDismissed()) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    // Accept ho ya dismiss, prompt object ek hi baar use ho sakta hai —
    // dono cases mein clear karna zaroori hai
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      setVisible(false);
    } else {
      // Dismiss kiya toh cooldown set karo, turant dobara mat dikhao
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && deferredPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="fixed bottom-20 right-5 z-50 flex items-center gap-1"
        >
          <button
            onClick={handleInstall}
            aria-label="Install SkillSwap app"
            className="flex items-center gap-2 h-12 pl-5 pr-4 rounded-full font-bold text-white text-sm shadow-2xl transition-transform hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              boxShadow: "0 8px 24px rgba(99,102,241,0.45)",
            }}
          >
            <Download className="w-4 h-4" />
            Install App
          </button>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shadow-md flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};