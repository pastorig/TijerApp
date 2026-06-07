import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type {
  LoyaltyProgramRow,
  LoyaltyProgramUpdate,
  LoyaltyStampRow,
} from "@/lib/supabase";

/**
 * Loyalty Program Helpers — TijerApp
 *
 * Helpers server-side para CRUD del programa de fidelización y stamps.
 * Usan service_role (bypass RLS) — los API routes son responsables de
 * validar admin auth antes de llamar.
 */

export async function getLoyaltyProgram(
  barbershopSlug: string,
): Promise<LoyaltyProgramRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("loyalty_programs")
    .select("*")
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();

  if (error) {
    throw new Error(`[loyalty] getLoyaltyProgram failed: ${error.message}`);
  }
  return data as LoyaltyProgramRow | null;
}

/**
 * Upsert del programa. Si existe lo actualiza; si no, lo crea con defaults
 * razonables (visits_required=10, reward_name="Corte gratis", is_active=true).
 */
export async function upsertLoyaltyProgram(
  barbershopSlug: string,
  patch: Omit<LoyaltyProgramUpdate, "barbershop_slug">,
): Promise<LoyaltyProgramRow> {
  const supabase = getSupabaseAdminClient();
  const existing = await getLoyaltyProgram(barbershopSlug);

  if (existing) {
    const { data, error } = await supabase
      .from("loyalty_programs")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq("barbershop_slug", barbershopSlug)
      .select()
      .single();

    if (error) {
      throw new Error(`[loyalty] update failed: ${error.message}`);
    }
    return data as LoyaltyProgramRow;
  }

  const { data, error } = await supabase
    .from("loyalty_programs")
    .insert([
      {
        barbershop_slug: barbershopSlug,
        ...patch,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`[loyalty] insert failed: ${error.message}`);
  }
  return data as LoyaltyProgramRow;
}

export type LoyaltyCustomerSummary = {
  customer_phone: string;
  customer_name: string | null;
  active_stamps: number;
  total_stamps: number;
  last_visit_at: string | null;
  can_redeem: boolean;
};

/**
 * Listado de clientes con stamps en una barbería, ordenado por más activos.
 * Junta phone + name de appointments (último known name).
 */
export async function listLoyaltyCustomers(
  barbershopSlug: string,
): Promise<LoyaltyCustomerSummary[]> {
  const supabase = getSupabaseAdminClient();

  const program = await getLoyaltyProgram(barbershopSlug);
  const required = program?.visits_required ?? 10;

  // Cargar todos los stamps de la barbería + cliente name desde appointments
  const { data: stamps, error } = await supabase
    .from("loyalty_stamps")
    .select("customer_phone, earned_at, redeemed_at")
    .eq("barbershop_slug", barbershopSlug);

  if (error) {
    throw new Error(`[loyalty] listLoyaltyCustomers failed: ${error.message}`);
  }

  // Agrupar por phone
  type Accumulator = {
    [phone: string]: {
      active: number;
      total: number;
      last: string | null;
    };
  };
  const grouped: Accumulator = {};
  for (const s of (stamps ?? []) as Array<{
    customer_phone: string;
    earned_at: string;
    redeemed_at: string | null;
  }>) {
    const entry = grouped[s.customer_phone] ?? {
      active: 0,
      total: 0,
      last: null,
    };
    entry.total += 1;
    if (!s.redeemed_at) entry.active += 1;
    if (!entry.last || s.earned_at > entry.last) entry.last = s.earned_at;
    grouped[s.customer_phone] = entry;
  }

  const phones = Object.keys(grouped);
  if (phones.length === 0) return [];

  // Buscar el nombre más reciente conocido para cada teléfono
  const { data: lastNames } = await supabase
    .from("appointments")
    .select("customer_phone, customer_name, created_at")
    .eq("barbershop_slug", barbershopSlug)
    .in("customer_phone", phones)
    .order("created_at", { ascending: false });

  const nameByPhone = new Map<string, string>();
  for (const a of (lastNames ?? []) as Array<{
    customer_phone: string;
    customer_name: string;
  }>) {
    if (!nameByPhone.has(a.customer_phone)) {
      nameByPhone.set(a.customer_phone, a.customer_name);
    }
  }

  return phones
    .map((phone) => {
      const entry = grouped[phone];
      return {
        customer_phone: phone,
        customer_name: nameByPhone.get(phone) ?? null,
        active_stamps: entry.active,
        total_stamps: entry.total,
        last_visit_at: entry.last,
        can_redeem: entry.active >= required,
      };
    })
    .sort((a, b) => {
      // Primero los que pueden canjear, después por más active stamps
      if (a.can_redeem !== b.can_redeem) return a.can_redeem ? -1 : 1;
      return b.active_stamps - a.active_stamps;
    });
}

/**
 * Canjea N stamps de un cliente (marca redeemed_at en los N más antiguos
 * sin redimir). Devuelve cuántos quedaron canjeados realmente.
 */
export async function redeemCustomerStamps(input: {
  barbershopSlug: string;
  customerPhone: string;
  count: number;
  note?: string;
}): Promise<number> {
  const supabase = getSupabaseAdminClient();

  // Tomar los N stamps más viejos sin redeem
  const { data: toRedeem, error: selectError } = await supabase
    .from("loyalty_stamps")
    .select("id")
    .eq("barbershop_slug", input.barbershopSlug)
    .eq("customer_phone", input.customerPhone)
    .is("redeemed_at", null)
    .order("earned_at", { ascending: true })
    .limit(input.count);

  if (selectError) {
    throw new Error(`[loyalty] select to redeem failed: ${selectError.message}`);
  }

  const ids = (toRedeem ?? []).map((s) => (s as Pick<LoyaltyStampRow, "id">).id);
  if (ids.length === 0) return 0;

  const { error: updateError } = await supabase
    .from("loyalty_stamps")
    .update({
      redeemed_at: new Date().toISOString(),
      redemption_note: input.note ?? null,
    })
    .in("id", ids);

  if (updateError) {
    throw new Error(`[loyalty] update redeemed failed: ${updateError.message}`);
  }

  return ids.length;
}
