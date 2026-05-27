/**
 * Sentry — config del servidor (Node runtime).
 * Captura errores de API routes, server actions, RSC, etc.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    debug: false,
    enabled: process.env.NODE_ENV === "production",
  });
}
