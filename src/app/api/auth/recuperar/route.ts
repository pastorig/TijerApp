import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  checkRateLimit,
  getRequestIdentifier,
  getValueIdentifier,
  RATE_LIMIT_MESSAGE,
} from "@/lib/rate-limit";
import { sendRecoveryEmail } from "@/lib/server/recovery-email";

export const runtime = "nodejs";

/**
 * POST /api/auth/recuperar
 * Body: { email }
 *
 * Paso 1 de "olvidé mi contraseña": arma el link de recuperación y lo manda
 * por mail. Antes lo hacía Supabase solo (`resetPasswordForEmail`); pasó acá
 * por dos motivos, los dos reportados por Bautista el 03/10/2026:
 *
 * 1. **El mail llegaba "vacío"** al pedirlo dos veces (Gmail colapsaba el
 *    contenido repetido). Ver `recovery-email.ts`.
 * 2. **El link volvía al dominio desde donde se pedía.** Pedido desde una
 *    preview de Vercel, Supabase descartaba ese destino y mandaba a la home.
 *    Acá el destino es SIEMPRE el sitio canónico.
 *
 * ── Cuidados ────────────────────────────────────────────────────────────────
 * - **Nunca dice si el email tiene cuenta.** Responde `ok` igual: si no, sirve
 *   para averiguar qué direcciones son clientes.
 * - **Límite por origen y por dirección.** El de Supabase ya no protege este
 *   camino (el link se genera con el service role), así que el freno es este:
 *   sin él, cualquiera podría hacerle llegar cientos de mails a un tercero.
 *   Pasado el límite por dirección se responde `ok` sin mandar nada, por lo
 *   mismo de arriba: no avisarle a un atacante que esa dirección existe.
 * - El link de Supabase vale una hora y un solo uso; pedir otro no invalida la
 *   contraseña actual.
 */

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tijerapp.com").replace(
    /\/$/,
    "",
  );
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  const porOrigen = await checkRateLimit(
    "recuperar",
    getRequestIdentifier(request),
  );
  if (!porOrigen.allowed) {
    return NextResponse.json(
      { error: RATE_LIMIT_MESSAGE },
      {
        status: 429,
        headers: { "Retry-After": String(porOrigen.retryAfterSeconds) },
      },
    );
  }

  const porDireccion = await checkRateLimit(
    "recuperar-email",
    getValueIdentifier(email),
  );
  if (!porDireccion.allowed) {
    // Sin mail y sin pista: ya tiene links recientes en la casilla.
    return NextResponse.json({ ok: true });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${siteUrl()}/nueva-password` },
  });

  const actionLink = data?.properties?.action_link;
  if (error || !actionLink) {
    // Lo normal acá es "no hay cuenta con ese email": no es un error nuestro
    // y no se le cuenta a quien pregunta. Cualquier otra cosa va a Sentry.
    const sinCuenta =
      error?.status === 404 || /not found/i.test(error?.message ?? "");
    if (error && !sinCuenta) {
      Sentry.captureException(error, {
        tags: { route: "auth/recuperar", step: "generateLink" },
      });
    }
    return NextResponse.json({ ok: true });
  }

  await sendRecoveryEmail({ toEmail: email, actionLink });
  return NextResponse.json({ ok: true });
}
