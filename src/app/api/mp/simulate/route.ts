import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * POST /api/mp/simulate  body { token }
 *
 * SOLO PARA TESTING. Marca la seña de un turno como pagada y confirma el turno,
 * sin pasar por MercadoPago. Replica el camino "pago aprobado" del webhook para
 * poder comprobar el flujo completo (turno → "seña pagada" → confirmado) sin
 * credenciales de MP.
 *
 * Gateado por NEXT_PUBLIC_ALLOW_DEPOSIT_SIMULATION === "true". Si no está
 * activa, responde 403. En producción real debe quedar SIN setear.
 */
export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_ALLOW_DEPOSIT_SIMULATION !== "true") {
    return NextResponse.json(
      { error: "Simulación de pago deshabilitada." },
      { status: 403 },
    );
  }

  let token = "";
  try {
    const body = (await request.json()) as { token?: string };
    token = typeof body.token === "string" ? body.token : "";
  } catch {
    /* noop */
  }
  if (!token) {
    return NextResponse.json({ error: "Falta token." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: appt, error } = await supabase
    .from("appointments")
    .select("id, status, deposit_status, deposit_amount, mp_payment_id")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (error) {
    Sentry.captureException(error, { tags: { route: "mp/simulate" } });
    return NextResponse.json({ error: "Error de lectura." }, { status: 500 });
  }

  const row = appt as {
    id: string;
    status: string;
    deposit_status: string | null;
    deposit_amount: number | null;
    mp_payment_id: string | null;
  } | null;

  if (!row) {
    return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
  }
  if (!row.deposit_status) {
    return NextResponse.json(
      { error: "Este turno no tiene seña." },
      { status: 400 },
    );
  }
  // Idempotente: si ya está pagada, no hacemos nada.
  if (row.deposit_status === "paid" || row.mp_payment_id) {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }
  if (row.deposit_status !== "pending" || row.status === "cancelled") {
    return NextResponse.json(
      { error: "La seña ya no está pendiente (expiró o se canceló)." },
      { status: 409 },
    );
  }

  const simPaymentId = `SIM-${Date.now()}`;
  await supabase
    .from("appointments")
    .update({
      status: "confirmed",
      deposit_status: "paid",
      deposit_paid_at: new Date().toISOString(),
      mp_payment_id: simPaymentId,
    })
    .eq("id", row.id)
    .eq("deposit_status", "pending");

  await supabase.from("payment_events").insert({
    appointment_id: row.id,
    event_type: "payment_approved",
    amount: row.deposit_amount,
    mp_payment_id: simPaymentId,
    raw_payload: { simulated: true },
  });

  return NextResponse.json({ ok: true, confirmed: true });
}
