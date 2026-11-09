
import { Capacitor } from "@capacitor/core";

let registrationStarted = false;

export function registerPwa(): void {
  // Native Android/iOS apps do not need browser PWA registration.
  if (Capacitor.isNativePlatform()) return;

  // Check browser support.
  if (!("serviceWorker" in navigator)) {
    console.warn("[SkillSwap] Service workers are not supported.");
    return;
  }

  // Prevent duplicate registration.
  if (registrationStarted) return;

  registrationStarted = true;

  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        "/sw.js",
        { scope: "/" }
      );

      console.log(
        "[SkillSwap] Service worker registered:",
        registration.scope
      );

      // Check for updates when the app starts.
      await registration.update();
    } catch (error) {
      registrationStarted = false;

      console.error(
        "[SkillSwap] Service worker registration failed:",
        error
      );
    }
  };

  // Handle both early and late script execution.
  if (document.readyState === "complete") {
    void register();
  } else {
    window.addEventListener(
      "load",
      () => void register(),
      { once: true }
    );
  }
}
