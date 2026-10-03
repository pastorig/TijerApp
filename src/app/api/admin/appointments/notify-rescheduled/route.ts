import { NextResponse } from "next/server";
import { assertPlanActive } from "@/lib/api-plan-guard";
import { resolveBarbershopAdminAccess } from "@/lib/server/barbershop-admin-access";
import { enviarAvisoDeReprogramacion } from "@/lib/server/reschedule-email";

export const runtime = "nodejs";

/**
 * POST /api/admin/appointments/notify-rescheduled
 *
 * Envía un email al cliente avisándole que su turno fue movido. Llamado
 * automáticamente desde el frontend después de un drag&drop exitoso, si
 * el cliente tiene email registrado.
 *
 * Body:
 *   {
 *     appointmentId: string,
 *     barbershopSlug: string,
 *     oldDate: string (YYYY-MM-DD),
 *     oldTime: string (HH:MM)
 *   }
 *
 * Headers:
 *   Authorization: Bearer <supabase access token del admin>
 *
 * Returns:
 *   200 { sent: true } — email enviado OK
 *   200 { sent: false, skipped: "..." } — no se envió (no email, no Resend, etc.)
 *   401/403 — auth
 *   404 — appointment no encontrado
 *   500 — error inesperado
 *
 * Nota: aunque el email no se envíe (skipped), devolvemos 200 para que
 * el frontend no muestre error al user. El admin igual puede usar el
 * botón WhatsApp del modal como fallback.
 *
 * El mail en sí vive en `@/lib/server/reschedule-email` desde la feature 024:
 * lo manda también la agenda del empleado cuando reprograma, y dos copias de
 * una plantilla de 150 líneas se habrían separado.
 */

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const appointmentId =
    typeof payload.appointmentId === "string" ? payload.appointmentId : "";
  const barbershopSlug =
    typeof payload.barbershopSlug === "string" ? payload.barbershopSlug : "";
  const oldDate =
    typeof payload.oldDate === "string" ? payload.oldDate : "";
  const oldTime =
    typeof payload.oldTime === "string" ? payload.oldTime : "";

  if (!appointmentId || !barbershopSlug || !oldDate || !oldTime) {
    return NextResponse.json(
      { error: "Faltan parámetros." },
      { status: 400 },
    );
  }

  const auth = await resolveBarbershopAdminAccess(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Plan vencido => modo lectura: la barbería se puede leer, no escribir.
  const planGate = await assertPlanActive(barbershopSlug);
  if (!planGate.ok) {
    return NextResponse.json(
      { error: planGate.error },
      { status: planGate.status },
    );
  }

  const aviso = await enviarAvisoDeReprogramacion({
    appointmentId,
    barbershopSlug,
    oldDate,
    oldTime,
  });

  // Siempre 200, incluso cuando no se mandó: el turno ya se movió, y un error
  // acá le haría creer al panel que el movimiento falló.
  return NextResponse.json(aviso);
}
