import { NextResponse } from "next/server";

/**
 * Endpoint TEMPORAL para verificar end-to-end que Sentry captura errores.
 *
 * Uso: visitar /api/sentry-test desde el browser → tira 500 + el error
 * debería aparecer en Sentry → pastorig.sentry.io en segundos.
 *
 * ELIMINAR este archivo después de confirmar que funciona.
 */
export async function GET() {
  throw new Error(
    "BarberSync · Sentry test event · " + new Date().toISOString(),
  );

  // Unreachable, pero satisface el type checker.
  return NextResponse.json({ ok: true });
}
