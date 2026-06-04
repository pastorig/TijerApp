import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

// Wrap con Sentry: en build, si SENTRY_AUTH_TOKEN está seteada, sube source
// maps al server de Sentry para que los stack traces sean legibles en prod.
// Si no está seteada (ej. local sin Sentry), el wrap sigue funcionando pero
// no sube source maps.
const sentryWrapped = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI, // No spam de logs en dev local
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring", // Route proxy para evitar adblockers en prod
  disableLogger: true,
  automaticVercelMonitors: true,
});

// Wrap con serwist: registra el service worker para PWA. Disabled en dev
// para no interferir con HMR. El SW se genera desde src/app/sw.ts y se
// emite como public/sw.js que el browser registra.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
  cacheOnNavigation: true,
});

export default withSerwist(sentryWrapped);
