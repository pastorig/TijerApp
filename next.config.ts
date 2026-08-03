import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Security headers aplicados a TODAS las respuestas. Endurecen el sitio
// contra clickjacking (X-Frame-Options), MIME sniffing (nosniff), fugas de
// referrer y fuerzan HTTPS (HSTS). Permissions-Policy desactiva APIs
// sensibles que la app no usa (cámara/micro/geo).
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

/**
 * Slugs que cambiaron de nombre. La clave es el slug viejo, el valor el nuevo.
 *
 * Cuando una barbería se renombra, su link viejo ya está repartido: en la bio
 * de Instagram, en WhatsApp, en los mensajes que le mandó a cada cliente y en
 * el celular de todos los que lo guardaron. Sin esto, todo eso pasa a dar 404
 * de un día para el otro.
 *
 * También cubre a la PWA: el ícono del barbero abre el último contexto
 * guardado, que puede seguir siendo el slug viejo hasta que navegue de nuevo.
 *
 * Se usa 307 (temporal) a propósito: un 308 lo cachea el browser para siempre y
 * volver atrás se vuelve un dolor de cabeza. Cuando el cambio esté asentado se
 * puede pasar a permanente.
 */
const RENAMED_BARBERSHOP_SLUGS: Record<string, string> = {
  // SV Barber sumó un empleado y no quería sus iniciales en el link (2026-07-30).
  "sv-barber": "barber",
};

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return Object.entries(RENAMED_BARBERSHOP_SLUGS).flatMap(([from, to]) => [
      { source: `/${from}`, destination: `/${to}`, permanent: false },
      {
        // Cubre /reservar, /admin, /admin/login y todo lo que cuelgue.
        source: `/${from}/:path*`,
        destination: `/${to}/:path*`,
        permanent: false,
      },
    ]);
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
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
