import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * GET /api/cron/deposits
 *
 * Auto-cancela las reservas cuya seña sigue pendiente y ya venció el plazo:
 * el turno pasa a `cancelled` + `deposit_status='expired'`, lo que libera el
 * horario (sale del índice único de slots activos). Registra cada caso en
 * `payment_events`.
 *
 * Autenticado con Bearer CRON_SECRET (igual que /api/cron/reminders).
 * Scheduleado por GitHub Actions.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured." },
      { status: 500 },
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  // Reservas con seña pendiente y plazo vencido.
  const { data: pending, error } = await supabase
    .from("appointments")
    .select("id")
    .eq("deposit_status", "pending")
    .eq("status", "pending")
    .lt("deposit_expires_at", nowIso);

  if (error) {
    Sentry.captureException(error, { tags: { route: "cron/deposits" } });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (pending ?? []).map((row) => (row as { id: string }).id);
  let expired = 0;

  for (const id of ids) {
    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
        deposit_status: "expired",
        cancellation_reason: "Seña no pagada a tiempo",
      })
      .eq("id", id)
      // Guard de concurrencia: solo si sigue pendiente (no pisar un pago que
      // entró entre el select y el update).
      .eq("deposit_status", "pending");

    if (updateError) {
      Sentry.captureException(updateError, {
        tags: { route: "cron/deposits", step: "expire" },
      });
      continue;
    }

    await supabase.from("payment_events").insert({
      appointment_id: id,
      event_type: "auto_expired",
    });
    expired += 1;
  }

  return NextResponse.json({ ok: true, expired });
}
