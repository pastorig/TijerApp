import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPlanActive } from "@/lib/api-plan-guard";
import { resolveBarbershopAdminAccess } from "@/lib/server/barbershop-admin-access";

export const runtime = "nodejs";

const waitlistSelect =
  "id, created_at, barbershop_slug, barber_id, service_name, service_duration_minutes, customer_name, customer_phone, customer_email, preferred_date, preferred_time_from, preferred_time_to, notes, status, resolved_at, deleted_at, confirmation_token";

export async function PATCH(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const entryId =
    typeof payload.entryId === "string" ? payload.entryId : "";
  const barbershopSlug =
    typeof payload.barbershopSlug === "string" ? payload.barbershopSlug : "";
  if (!entryId || !barbershopSlug) {
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

  const updateValues: {
    status?: "pending" | "contacted" | "fulfilled" | "cancelled";
    notes?: string | null;
    deleted_at?: string | null;
    resolved_at?: string | null;
  } = {};

  if (typeof payload.status === "string") {
    if (
      ["pending", "contacted", "fulfilled", "cancelled"].includes(
        payload.status,
      )
    ) {
      updateValues.status = payload.status as
        | "pending"
        | "contacted"
        | "fulfilled"
        | "cancelled";
      if (payload.status !== "pending") {
        updateValues.resolved_at = new Date().toISOString();
      } else {
        updateValues.resolved_at = null;
      }
    }
  }
  if (payload.softDelete === true) {
    updateValues.deleted_at = new Date().toISOString();
  }
  if ("notes" in payload) {
    updateValues.notes =
      typeof payload.notes === "string" && payload.notes.trim()
        ? payload.notes.trim()
        : null;
  }

  if (Object.keys(updateValues).length === 0) {
    return NextResponse.json(
      { error: "Nada para actualizar." },
      { status: 400 },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("waitlist_entries")
    .update(updateValues)
    .eq("id", entryId)
    .eq("barbershop_slug", barbershopSlug)
    .select(waitlistSelect)
    .single();

  if (error || !data) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "No pudimos actualizar la entrada." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, entry: data });
}
