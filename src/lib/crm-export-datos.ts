import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { BarbershopRow, PaymentRow, SubscriptionRow } from "@/lib/crm-export";

/**
 * Única lectura de base de la exportación al CRM.
 *
 * Vive separada de `crm-export.ts` para que el mapeo se pueda testear sin base
 * y sin Next, y para que se vea de un vistazo **qué tablas toca la
 * exportación**: `barbershops`, `barbershop_subscriptions` y
 * `barbershop_payments`. Ninguna de turnos, clientes, reseñas ni notas.
 *
 * Paginación por keyset sobre el id: el `range` por offset se saltea o repite
 * filas cuando alguien da de alta una barbería en el medio de la sincronización.
 */

const COLUMNAS_BARBERIA =
  "id, slug, name, whatsapp, instagram, is_active, created_at, " +
  "barbershop_subscriptions(plan_tier, status, trial_started_at, trial_expires_at, " +
  "grace_expires_at, current_period_started_at, current_period_ends_at, updated_at)";

type FilaCruda = Omit<BarbershopRow, "subscription"> & {
  barbershop_subscriptions: SubscriptionRow[] | SubscriptionRow | null;
};

/** La suscripción es una por barbería (unique), pero PostgREST la trae en lista. */
function primeraSuscripcion(valor: FilaCruda["barbershop_subscriptions"]): SubscriptionRow | null {
  if (!valor) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

export async function fetchBarbershopPage(
  cursor: string | null,
  limit: number,
): Promise<BarbershopRow[]> {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("barbershops")
    .select(COLUMNAS_BARBERIA)
    .order("id", { ascending: true })
    .limit(limit);
  if (cursor) query = query.gt("id", cursor);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as FilaCruda[]).map((fila) => ({
    id: fila.id,
    slug: fila.slug,
    name: fila.name,
    whatsapp: fila.whatsapp,
    instagram: fila.instagram,
    is_active: fila.is_active,
    created_at: fila.created_at,
    subscription: primeraSuscripcion(fila.barbershop_subscriptions),
  }));
}

export async function fetchPaymentPage(
  cursor: string | null,
  limit: number,
): Promise<PaymentRow[]> {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("barbershop_payments")
    .select("id, barbershop_slug, amount, method, period_start, period_end, created_at")
    .order("id", { ascending: true })
    .limit(limit);
  if (cursor) query = query.gt("id", cursor);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PaymentRow[];
}

/**
 * Traduce los slugs de una página de cobros a los id de barbería.
 *
 * `barbershop_payments` referencia la barbería por slug y no tiene clave
 * foránea, así que no se puede embeber: hay que resolverlo. Un cobro cuyo slug
 * ya no existe no se exporta —`toPaymentRecord` devuelve null— en vez de
 * colgarse de una cuenta equivocada.
 */
export async function fetchIdsPorSlug(slugs: string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(slugs.filter(Boolean))];
  if (unicos.length === 0) return new Map();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("barbershops").select("id, slug").in("slug", unicos);
  if (error) throw new Error(error.message);

  return new Map(((data ?? []) as { id: string; slug: string }[]).map((f) => [f.slug, f.id]));
}
