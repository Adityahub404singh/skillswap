import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import * as Sentry from "@sentry/react";
import { Capacitor } from "@capacitor/core"; // ✅ FIX: Direct import — window.Capacitor pe depend mat karo
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

// 1. FORCE UNREGISTER SERVICE WORKER
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// 2. ✅ FIX: Capacitor.isNativePlatform() — reliable, no race condition
const isNativeApp = Capacitor.isNativePlatform();

console.log("[SkillSwap] isNativeApp:", isNativeApp); // Debug ke liye

if (isNativeApp) {
  const BACKEND = "https://skillswap-b59w.onrender.com";
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    let url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    // ✅ Sirf /api calls ko redirect karo
    if (typeof url === "string" && url.startsWith("/api")) {
      url = BACKEND + url;
    }

    const finalInput = typeof input === "string" ? url
      : input instanceof URL ? new URL(url)
      : { ...input, url };

    return originalFetch(finalInput as RequestInfo, {
      ...init,
      mode: "cors",
    });
  };

  // GoogleAuth native initialize
  GoogleAuth.initialize({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scopes: ["profile", "email"],
    grantOfflineAccess: true,
  }).catch((err) => {
    console.error("GoogleAuth initialize failed:", err);
  });
}

// 3. SENTRY INIT
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "",
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.1,
  enabled: import.meta.env.PROD,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
