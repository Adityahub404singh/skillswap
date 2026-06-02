import * as Sentry from "@sentry/react";

export function initSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || "",
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    enabled: import.meta.env.PROD,
  });
}

export default Sentry;

