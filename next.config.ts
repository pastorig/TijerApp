import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

// Wrap con Sentry: en build, si SENTRY_AUTH_TOKEN está seteada, sube source
// maps al server de Sentry para que los stack traces sean legibles en prod.
// Si no está seteada (ej. local sin Sentry), el wrap sigue funcionando pero
// no sube source maps.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI, // No spam de logs en dev local
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring", // Route proxy para evitar adblockers en prod
  disableLogger: true,
  automaticVercelMonitors: true,
});

// Nota PWA: el service worker (public/sw.js) está escrito manualmente y se
// registra desde src/components/pwa/ServiceWorkerRegister.tsx. No usamos
// @serwist/next ni next-pwa porque ambos requieren webpack y este proyecto
// usa Turbopack para builds rápidos. Para un MVP de PWA con cache básico +
// offline fallback, un SW manual es más simple y sin compromisos.
