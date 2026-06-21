import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import * as Sentry from "@sentry/react";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

// 1. 🔥 FORCE UNREGISTER SERVICE WORKER
// Android app mein Service Worker ki zarurat nahi hoti, yeh API calls ko hijack kar sakta hai.
// Yeh ensure karta hai ki purana cache load na ho.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then(() => {
        console.log("Service Worker unregistered.");
      });
    }
  });
}

// 2. 🔥 GLOBAL FETCH OVERRIDE — ONLY for native Android/Capacitor builds
// Web (dev ya Vercel prod) mein relative '/api' paths already kaam karte hain:
//   - Dev: vite.config.ts ka proxy → localhost:3001
//   - Prod web: vercel.json ka rewrite → Render backend
// Sirf Capacitor WebView mein '/api' relative path fail hota hai kyuki wahan
// koi dev-server proxy nahi hota — isliye sirf wahi absolute URL force karte hain.
const isNativeApp = !!(window as any).Capacitor?.isNativePlatform?.();

if (isNativeApp) {
  const originalFetch = window.fetch;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    let url = input;

    if (typeof url === 'string' && url.startsWith('/api')) {
      const backendUrl = "https://skillswap-b59w.onrender.com";
      url = backendUrl + url;
    }

    // 'mode: cors' ensure karta hai ki Android WebView requests ko block na kare
    return originalFetch(url, {
      ...init,
      mode: 'cors',
    });
  };

  // 🔥 GoogleAuth native plugin ko explicitly initialize karna ZAROORI hai —
  // bina iske GoogleAuth.signIn() call karte waqt native crash hota hai
  // ("keeps stopping"). capacitor.config.ts ke plugin config se yeh alag
  // hai — woh sirf strings.xml generate karta hai, runtime init nahi karta.
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
  enabled: import.meta.env.PROD, // Sirf production mein enabled rahega
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);