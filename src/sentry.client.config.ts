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

    // Session Replay DESACTIVADO (pre-launch, sin clientes reales aún).
    // Los rates en 0 hacen que el SDK no cargue el modulo de replay
    // (~30 KB JS adicional en el cliente). Cuando tengamos clientes y
    // necesitemos debug avanzado de sesiones con error, los volvemos a
    // activar (replaysOnErrorSampleRate: 1.0).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // En dev (`npm run dev`), Sentry NO envía nada — solo logea en consola.
    // En prod (Vercel), envía al server de Sentry.
    debug: false,
    enabled: process.env.NODE_ENV === "production",
  });
}
