import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Endpoint TEMPORAL para verificar end-to-end que Sentry captura errores.
 *
 * Estrategia dual:
 * 1) Llamamos a Sentry.captureException EXPLÍCITAMENTE (esto siempre llega
 *    si el SDK está inicializado, no depende del onRequestError handler).
 * 2) Tiramos el error sin handler para verificar que el auto-capture del
 *    instrumentation también lo agarra (si está bien configurado).
 *
 * ELIMINAR este archivo después de confirmar que funciona.
 */
export async function GET() {
  const testError = new Error(
    "BarberSync · Sentry test event · " + new Date().toISOString(),
  );

  // (1) Captura explícita — failsafe.
  Sentry.captureException(testError);
  await Sentry.flush(2000); // esperá hasta 2s para que el evento se envíe

  // (2) Re-throw para que Next devuelva 500 y el auto-capture lo intente también.
  throw testError;

  // Unreachable.
  return NextResponse.json({ ok: true });
}
