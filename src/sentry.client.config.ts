/**
 * Sentry — config del cliente (browser).
 * Si NEXT_PUBLIC_SENTRY_DSN no está definido, no se inicializa.
 * Esto permite trabajar en local sin tener Sentry configurado.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,

    // 10% de transacciones reportadas. Subir si querés más visibilidad,
    // bajar si te preocupa el costo cuando crezca el tráfico.
    tracesSampleRate: 0.1,

    // Captura sesiones de usuario solo cuando hay error (más eficiente).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    // En dev (`npm run dev`), Sentry NO envía nada — solo logea en consola.
    // En prod (Vercel), envía al server de Sentry.
    debug: false,
    enabled: process.env.NODE_ENV === "production",
  });
}
