import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import {
  Download,
  X,
  Smartphone,
  MonitorDown,
  Share,
  Info,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

type Platform = "android" | "ios" | "desktop" | "native";

const DISMISS_KEY = "skillswap_install_dismissed_at";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// Place the signed release APK in:
// public/downloads/skillswap.apk
//
// It will then be available at:
// https://your-domain.com/downloads/skillswap.apk
//
// Optional override in .env.production:
// VITE_ANDROID_APK_URL=https://your-domain.com/downloads/skillswap.apk
const APK_URL =
  (import.meta.env.VITE_ANDROID_APK_URL as string | undefined)?.trim() ||
  `${import.meta.env.BASE_URL}downloads/skillswap.apk`;

function safeStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable in private browsing.
  }
}

function safeStorageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function wasDismissedRecently(): boolean {
  const dismissedAt = Number(safeStorageGet(DISMISS_KEY));
  return (
    Number.isFinite(dismissedAt) &&
    dismissedAt > 0 &&
    Date.now() - dismissedAt < COOLDOWN_MS
  );
}

function detectPlatform(): Platform {
  if (Capacitor.isNativePlatform()) return "native";

  const userAgent = navigator.userAgent || "";

  if (/android/i.test(userAgent)) return "android";

  if (
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }

  return "desktop";
}

export function InstallButton() {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const currentPlatform = detectPlatform();
    setPlatform(currentPlatform);

    // Do not show install prompts inside the native app or installed PWA.
    if (currentPlatform === "native" || isStandalone()) return;

    if (wasDismissedRecently()) {
      setDismissed(true);
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      setIosHelp(false);
      setDismissed(true);
      safeStorageRemove(DISMISS_KEY);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt,
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    // Android gets the APK option; iOS gets Add to Home Screen instructions.
    if (currentPlatform === "android" || currentPlatform === "ios") {
      setVisible(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const dismiss = () => {
    safeStorageSet(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
    setVisible(false);
    setIosHelp(false);
  };

  const installPwa = async () => {
    if (!deferredPrompt) return;

    try {
      const promptEvent = deferredPrompt;
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;

      setDeferredPrompt(null);

      if (choice.outcome === "accepted") {
        setVisible(false);
        setDismissed(true);
      }
    } catch (error) {
      console.error("[SkillSwap] PWA installation failed:", error);
      setDeferredPrompt(null);
    }
  };

  const heading =
    platform === "android"
      ? "Get SkillSwap on Android"
      : platform === "ios"
        ? "Add SkillSwap to your iPhone"
        : "Install SkillSwap";

  if (
    platform === "native" ||
    (typeof window !== "undefined" && isStandalone())
  ) {
    return null;
  }

  const showPwaButton = Boolean(deferredPrompt);
  const showInstallPill =
    !visible &&
    !dismissed &&
    (platform === "android" || platform === "ios" || showPwaButton);

  return (
    <>
      <AnimatePresence>
        {visible && !dismissed && (
          <motion.aside
            role="dialog"
            aria-label="Install SkillSwap"
            aria-modal="false"
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 25 }}
            className="fixed bottom-5 right-4 z-[100] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-border bg-background p-4 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-500 text-white">
                <Smartphone className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-foreground">{heading}</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Install SkillSwap for quicker access to mentors, sessions
                  and your wallet.
                </p>
              </div>

              <button
                type="button"
                onClick={dismiss}
                aria-label="Close install panel"
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {platform === "android" && (
                <a
                  href={APK_URL}
                  download="skillswap-android.apk"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-bold text-white shadow-lg"
                >
                  <Download className="h-4 w-4" />
                  Download Android APK
                </a>
              )}

              {showPwaButton && (
                <button
                  type="button"
                  onClick={installPwa}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 text-sm font-semibold text-primary hover:bg-primary/10"
                >
                  <MonitorDown className="h-4 w-4" />
                  Install web app
                </button>
              )}

              {platform === "android" && (
                <p className="rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
                  Download the APK, open the downloaded file, allow
                  installation from this source if Android asks, then tap
                  Install. Android will always ask you to confirm installation.
                </p>
              )}

              {platform === "ios" && (
                <>
                  <button
                    type="button"
                    onClick={() => setIosHelp((value) => !value)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted"
                  >
                    <Share className="h-4 w-4" />
                    How to add to Home Screen
                  </button>

                  {iosHelp && (
                    <div className="rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
                      <p className="mb-2 flex items-center gap-1 font-bold text-foreground">
                        <Info className="h-3.5 w-3.5" />
                        Safari instructions
                      </p>
                      <ol className="list-inside list-decimal space-y-1">
                        <li>Open SkillSwap in Safari.</li>
                        <li>Tap the Share icon.</li>
                        <li>Choose Add to Home Screen.</li>
                        <li>Tap Add.</li>
                      </ol>
                    </div>
                  )}
                </>
              )}

              {platform === "desktop" && !showPwaButton && (
                <p className="rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
                  Use your browser address-bar install icon or browser menu,
                  then choose Install SkillSwap when available.
                </p>
              )}
            </div>

            <p className="mt-3 text-[10px] text-muted-foreground">
              APK installation requires Android permission to install apps
              from your browser. Only install APKs from your trusted SkillSwap
              website.
            </p>

            <button
              type="button"
              onClick={dismiss}
              className="mt-2 w-full py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Not now
            </button>
          </motion.aside>
        )}
      </AnimatePresence>

      {showInstallPill && (
        <button
          type="button"
          onClick={() => setVisible(true)}
          aria-label="Show SkillSwap install options"
          className="fixed bottom-5 right-4 z-[99] inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-bold text-white shadow-xl"
        >
          <Download className="h-4 w-4" />
          Install App
        </button>
      )}
    </>
  );
}

export default InstallButton;
