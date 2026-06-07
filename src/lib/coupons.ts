import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type {
  CouponInsert,
  CouponRow,
  CouponUpdate,
} from "@/lib/supabase";

/**
 * Coupons Helpers — TijerApp
 *
 * CRUD server-side de cupones por barbería. Validación de aplicación
 * (validate_coupon_for_booking) se hace via RPC pública desde el cliente.
 */

export async function listCoupons(barbershopSlug: string): Promise<CouponRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("barbershop_slug", barbershopSlug)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`[coupons] listCoupons failed: ${error.message}`);
  }
  return (data ?? []) as CouponRow[];
}

export async function createCoupon(
  input: Omit<CouponInsert, "code"> & { code: string },
): Promise<CouponRow> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("coupons")
    .insert([
      {
        ...input,
        code: input.code.trim().toUpperCase(),
      },
    ])
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un cupón con ese código en tu barbería.");
    }
    throw new Error(`[coupons] createCoupon failed: ${error.message}`);
  }
  return data as CouponRow;
}

export async function updateCoupon(
  couponId: string,
  patch: CouponUpdate,
): Promise<CouponRow> {
  const supabase = getSupabaseAdminClient();
  const updates: CouponUpdate = {
    ...patch,
    updated_at: new Date().toISOString(),
  };
  if (typeof updates.code === "string") {
    updates.code = updates.code.trim().toUpperCase();
  }

  const { data, error } = await supabase
    .from("coupons")
    .update(updates)
    .eq("id", couponId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un cupón con ese código en tu barbería.");
    }
    throw new Error(`[coupons] updateCoupon failed: ${error.message}`);
  }
  return data as CouponRow;
}

export async function deleteCoupon(couponId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("coupons").delete().eq("id", couponId);
  if (error) {
    throw new Error(`[coupons] deleteCoupon failed: ${error.message}`);
  }
}

/**
 * Incrementa usage_count cuando se confirma una reserva con cupón aplicado.
 * Idealmente se llama desde el handler que crea el appointment.
 */
export async function incrementCouponUsage(couponId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();

  // Leer + sumar + update. No es atómico pero alcanza para nuestro caso
  // (concurrencia muy baja, no es e-commerce). Si se vuelve crítico, mover
  // a RPC con update returning.
  const { data: current } = await supabase
    .from("coupons")
    .select("usage_count")
    .eq("id", couponId)
    .maybeSingle();

  const next = ((current?.usage_count ?? 0) as number) + 1;

  const { error } = await supabase
    .from("coupons")
    .update({
      usage_count: next,
      updated_at: new Date().toISOString(),
    })
    .eq("id", couponId);

  if (error) {
    throw new Error(`[coupons] incrementCouponUsage failed: ${error.message}`);
  }
}
