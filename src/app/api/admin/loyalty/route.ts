import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import {
  getLoyaltyProgram,
  listLoyaltyCustomers,
  redeemCustomerStamps,
  upsertLoyaltyProgram,
} from "@/lib/loyalty";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPlanFeature } from "@/lib/api-plan-guard";

export const runtime = "nodejs";

/**
 * /api/admin/loyalty?barbershopSlug=<slug>[&action=customers]
 *
 *   GET → { program, customers } (program siempre, customers si action=customers)
 *   PATCH body { barbershopSlug, isActive?, visitsRequired?, rewardName?, rewardDescription? }
 *        → { program } (upsert)
 *   POST body { barbershopSlug, customerPhone, count, note? }
 *        → { redeemed: number } (canjear N stamps)
 */

async function assertAdmin(
  authHeader: string | null,
  barbershopSlug: string,
): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string }
> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "No autorizado." };
  }
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: userResult, error: userError } =
    await supabaseAdmin.auth.getUser(authHeader.slice("Bearer ".length));
  if (userError || !userResult.user) {
    return { ok: false, status: 401, error: "Sesión inválida." };
  }
  const { data: adminRow } = await supabaseAdmin
    .from("barbershop_admins")
    .select("user_id")
    .eq("user_id", userResult.user.id)
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();
  if (!adminRow) {
    return { ok: false, status: 403, error: "No sos admin de esta barbería." };
  }
  return { ok: true, userId: userResult.user.id };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barbershopSlug = searchParams.get("barbershopSlug") ?? "";
  const action = searchParams.get("action") ?? "";

  if (!barbershopSlug) {
    return NextResponse.json(
      { error: "Falta barbershopSlug." },
      { status: 400 },
    );
  }

  const auth = await assertAdmin(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const gate = await assertPlanFeature(barbershopSlug, "fidelizacion");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const program = await getLoyaltyProgram(barbershopSlug);
    if (action === "customers") {
      const customers = await listLoyaltyCustomers(barbershopSlug);
      return NextResponse.json({ program, customers });
    }
    return NextResponse.json({ program });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "admin/loyalty", method: "GET", barbershopSlug },
    });
    return NextResponse.json(
      { error: "No pudimos cargar fidelización." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const barbershopSlug =
    typeof body.barbershopSlug === "string" ? body.barbershopSlug : "";
  if (!barbershopSlug) {
    return NextResponse.json(
      { error: "Falta barbershopSlug." },
      { status: 400 },
    );
  }

  const auth = await assertAdmin(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const gate = await assertPlanFeature(barbershopSlug, "fidelizacion");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const patch: {
    is_active?: boolean;
    visits_required?: number;
    reward_name?: string;
    reward_description?: string | null;
  } = {};
  if ("isActive" in body && typeof body.isActive === "boolean") {
    patch.is_active = body.isActive;
  }
  if ("visitsRequired" in body && typeof body.visitsRequired === "number") {
    if (body.visitsRequired < 1 || body.visitsRequired > 100) {
      return NextResponse.json(
        { error: "Visitas requeridas debe estar entre 1 y 100." },
        { status: 400 },
      );
    }
    patch.visits_required = Math.floor(body.visitsRequired);
  }
  if ("rewardName" in body && typeof body.rewardName === "string") {
    const name = body.rewardName.trim();
    if (name.length === 0 || name.length > 80) {
      return NextResponse.json(
        { error: "Nombre del premio inválido (1-80 caracteres)." },
        { status: 400 },
      );
    }
    patch.reward_name = name;
  }
  if ("rewardDescription" in body) {
    if (body.rewardDescription === null) {
      patch.reward_description = null;
    } else if (typeof body.rewardDescription === "string") {
      const desc = body.rewardDescription.trim();
      patch.reward_description = desc.length > 0 ? desc : null;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Nada para actualizar." },
      { status: 400 },
    );
  }

  try {
    const program = await upsertLoyaltyProgram(barbershopSlug, patch);
    return NextResponse.json({ program });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "admin/loyalty", method: "PATCH", barbershopSlug },
    });
    return NextResponse.json(
      { error: "No pudimos guardar fidelización." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const barbershopSlug =
    typeof body.barbershopSlug === "string" ? body.barbershopSlug : "";
  const customerPhone =
    typeof body.customerPhone === "string" ? body.customerPhone : "";
  const count = typeof body.count === "number" ? body.count : 0;
  const note = typeof body.note === "string" ? body.note : undefined;

  if (!barbershopSlug || !customerPhone || count <= 0) {
    return NextResponse.json(
      { error: "Faltan parámetros: barbershopSlug, customerPhone, count." },
      { status: 400 },
    );
  }

  const auth = await assertAdmin(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const gate = await assertPlanFeature(barbershopSlug, "fidelizacion");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const redeemed = await redeemCustomerStamps({
      barbershopSlug,
      customerPhone,
      count: Math.floor(count),
      note,
    });
    return NextResponse.json({ redeemed });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "admin/loyalty", method: "POST", barbershopSlug },
    });
    return NextResponse.json(
      { error: "No pudimos canjear stamps." },
      { status: 500 },
    );
  }
}
