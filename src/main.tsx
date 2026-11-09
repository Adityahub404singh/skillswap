
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

import * as Sentry from "@sentry/react";
import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

import { registerPwa } from "./registerPwa";

// 1. Detect Native Capacitor App
const isNativeApp = Capacitor.isNativePlatform();

console.log("[SkillSwap] isNativeApp:", isNativeApp);

// 2. Register PWA only for web browsers
if (!isNativeApp) {
  registerPwa();
}

// 3. Native Android / iOS configuration
if (isNativeApp) {
  const BACKEND = "https://skillswap-b59w.onrender.com";

  const originalFetch = window.fetch.bind(window);

  window.fetch = (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => {
    let url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    // Redirect only API requests
    if (
      typeof url === "string" &&
      url.startsWith("/api")
    ) {
      url = BACKEND + url;
    }

    const finalInput =
      typeof input === "string"
        ? url
        : input instanceof URL
          ? new URL(url)
          : { ...input, url };

    return originalFetch(finalInput as RequestInfo, {
      ...init,
      mode: "cors",
    });
  };

  // Native Google Authentication
  GoogleAuth.initialize({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    scopes: ["profile", "email"],
    grantOfflineAccess: true,
  }).catch((err) => {
    console.error(
      "GoogleAuth initialize failed:",
      err
    );
  });
}

// 4. Sentry Initialization
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "",

  integrations: [
    Sentry.browserTracingIntegration(),
  ],

  tracesSampleRate: 0.1,
  enabled: import.meta.env.PROD,
});

// 5. Render React Application
createRoot(
  document.getElementById("root")!
).render(
  <StrictMode>
    <App />
  </StrictMode>
);
