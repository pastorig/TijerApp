import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import {
  createCoupon,
  deleteCoupon,
  listCoupons,
  updateCoupon,
} from "@/lib/coupons";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPlanFeature } from "@/lib/api-plan-guard";
import type { CouponDiscountType } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * /api/admin/coupons?barbershopSlug=<slug>
 *
 *   GET → { coupons: CouponRow[] }
 *   POST body { barbershopSlug, code, discount_type, discount_value,
 *               description?, valid_from?, valid_until?, usage_limit?, is_active? }
 *         → { coupon }
 *   PATCH body { id, barbershopSlug, ...fields } → { coupon }
 *   DELETE body { id, barbershopSlug } → { ok }
 */

async function assertAdmin(
  authHeader: string | null,
  barbershopSlug: string,
) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false as const, status: 401, error: "No autorizado." };
  }
  const supabase = getSupabaseAdminClient();
  const { data: userResult } = await supabase.auth.getUser(
    authHeader.slice("Bearer ".length),
  );
  if (!userResult.user) {
    return { ok: false as const, status: 401, error: "Sesión inválida." };
  }
  const { data: adminRow } = await supabase
    .from("barbershop_admins")
    .select("user_id")
    .eq("user_id", userResult.user.id)
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();
  if (!adminRow) {
    return {
      ok: false as const,
      status: 403,
      error: "No sos admin de esta barbería.",
    };
  }
  return { ok: true as const, userId: userResult.user.id };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barbershopSlug = searchParams.get("barbershopSlug") ?? "";
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

  const gate = await assertPlanFeature(barbershopSlug, "cupones");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    const coupons = await listCoupons(barbershopSlug);
    return NextResponse.json({ coupons });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "admin/coupons", method: "GET" },
    });
    return NextResponse.json(
      { error: "No pudimos cargar cupones." },
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

  const gate = await assertPlanFeature(barbershopSlug, "cupones");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const discountType =
    typeof body.discount_type === "string" ? body.discount_type : "";
  const discountValue =
    typeof body.discount_value === "number" ? body.discount_value : 0;

  if (!code || code.length < 3 || code.length > 30) {
    return NextResponse.json(
      { error: "Código inválido (3-30 caracteres)." },
      { status: 400 },
    );
  }
  if (discountType !== "percent" && discountType !== "fixed") {
    return NextResponse.json(
      { error: "Tipo de descuento debe ser 'percent' o 'fixed'." },
      { status: 400 },
    );
  }
  if (discountValue <= 0) {
    return NextResponse.json(
      { error: "Valor del descuento debe ser mayor a 0." },
      { status: 400 },
    );
  }
  if (discountType === "percent" && discountValue > 100) {
    return NextResponse.json(
      { error: "Descuento porcentual no puede ser mayor a 100." },
      { status: 400 },
    );
  }

  try {
    const coupon = await createCoupon({
      barbershop_slug: barbershopSlug,
      code,
      discount_type: discountType as CouponDiscountType,
      discount_value: discountValue,
      description:
        typeof body.description === "string"
          ? body.description.trim() || null
          : null,
      valid_from:
        typeof body.valid_from === "string" && body.valid_from
          ? body.valid_from
          : null,
      valid_until:
        typeof body.valid_until === "string" && body.valid_until
          ? body.valid_until
          : null,
      usage_limit:
        typeof body.usage_limit === "number" && body.usage_limit > 0
          ? Math.floor(body.usage_limit)
          : null,
      is_active: typeof body.is_active === "boolean" ? body.is_active : true,
    });
    return NextResponse.json({ coupon });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error.";
    Sentry.captureException(error, {
      tags: { route: "admin/coupons", method: "POST" },
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const barbershopSlug =
    typeof body.barbershopSlug === "string" ? body.barbershopSlug : "";
  if (!id || !barbershopSlug) {
    return NextResponse.json(
      { error: "Faltan parámetros." },
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

  const gate = await assertPlanFeature(barbershopSlug, "cupones");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.code === "string") patch.code = body.code.trim();
  if (typeof body.description === "string" || body.description === null) {
    patch.description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;
  }
  if (typeof body.discount_type === "string") {
    if (body.discount_type !== "percent" && body.discount_type !== "fixed") {
      return NextResponse.json(
        { error: "Tipo de descuento inválido." },
        { status: 400 },
      );
    }
    patch.discount_type = body.discount_type;
  }
  if (typeof body.discount_value === "number" && body.discount_value > 0) {
    patch.discount_value = body.discount_value;
  }
  if (typeof body.valid_from === "string" || body.valid_from === null) {
    patch.valid_from = body.valid_from || null;
  }
  if (typeof body.valid_until === "string" || body.valid_until === null) {
    patch.valid_until = body.valid_until || null;
  }
  if (typeof body.usage_limit === "number" || body.usage_limit === null) {
    patch.usage_limit =
      typeof body.usage_limit === "number" && body.usage_limit > 0
        ? Math.floor(body.usage_limit)
        : null;
  }
  if (typeof body.is_active === "boolean") {
    patch.is_active = body.is_active;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Nada para actualizar." },
      { status: 400 },
    );
  }

  try {
    const coupon = await updateCoupon(id, patch);
    return NextResponse.json({ coupon });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const barbershopSlug =
    typeof body.barbershopSlug === "string" ? body.barbershopSlug : "";
  if (!id || !barbershopSlug) {
    return NextResponse.json(
      { error: "Faltan parámetros." },
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

  const gate = await assertPlanFeature(barbershopSlug, "cupones");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  try {
    await deleteCoupon(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
