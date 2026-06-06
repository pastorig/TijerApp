import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * Push Subscriptions — TijerApp
 *
 * Helpers server-side para gestionar las suscripciones de push notifications.
 * Usa admin client (service_role) para bypassear RLS — los callers (API routes)
 * son responsables de validar el `user_id` con el auth context propio antes
 * de invocar estas funciones.
 *
 * Lifecycle:
 *   - insertSubscription: cuando admin acepta browser permission y client manda payload
 *   - deleteSubscription: cuando admin desactiva desde la UI
 *   - markExpired: cuando detectamos 410 Gone del push service
 *   - listActiveByBarbershop: para el trigger / send-test endpoint
 */

export type PushSubscription = {
  id: string;
  created_at: string;
  last_used_at: string;
  expired_at: string | null;
  barbershop_slug: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
};

export type InsertSubscriptionInput = {
  barbershopSlug: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
};

/**
 * Insertar una subscription o actualizar `last_used_at` si ya existe
 * (UPSERT por unique constraint en `(user_id, endpoint)`).
 *
 * Devuelve la row resultante. Throw on error.
 */
export async function insertSubscription(
  input: InsertSubscriptionInput,
): Promise<PushSubscription> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        barbershop_slug: input.barbershopSlug,
        user_id: input.userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        user_agent: input.userAgent ?? null,
        last_used_at: new Date().toISOString(),
        expired_at: null,
      },
      {
        onConflict: "user_id,endpoint",
        ignoreDuplicates: false,
      },
    )
    .select()
    .single();

  if (error) {
    throw new Error(
      `[push/subscriptions] insertSubscription failed: ${error.message}`,
    );
  }

  return data as PushSubscription;
}

/**
 * Borra una subscription por (userId, endpoint).
 * Idempotente: si no existe, no error.
 */
export async function deleteSubscription(input: {
  userId: string;
  endpoint: string;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", input.userId)
    .eq("endpoint", input.endpoint);

  if (error) {
    throw new Error(
      `[push/subscriptions] deleteSubscription failed: ${error.message}`,
    );
  }
}

/**
 * Lista todas las subscriptions activas de una barbería.
 * Útil para el send-test endpoint y para verificar que el trigger encole bien.
 */
export async function listActiveByBarbershop(
  barbershopSlug: string,
): Promise<PushSubscription[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("barbershop_slug", barbershopSlug)
    .is("expired_at", null);

  if (error) {
    throw new Error(
      `[push/subscriptions] listActiveByBarbershop failed: ${error.message}`,
    );
  }

  return (data ?? []) as PushSubscription[];
}

/**
 * Marca una subscription como expirada (cuando recibimos 410 Gone del
 * push service). NO la borra — preserva trail para debugging / analytics.
 * El cleanup workflow borra subs con expired_at > 30 días.
 */
export async function markExpired(subscriptionId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("push_subscriptions")
    .update({ expired_at: new Date().toISOString() })
    .eq("id", subscriptionId);

  if (error) {
    throw new Error(
      `[push/subscriptions] markExpired failed: ${error.message}`,
    );
  }
}

/**
 * Update last_used_at de una subscription tras un envío exitoso.
 * El cleanup usa este timestamp como heurística para subs inactivas.
 */
export async function touchLastUsed(subscriptionId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("push_subscriptions")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", subscriptionId);

  if (error) {
    throw new Error(
      `[push/subscriptions] touchLastUsed failed: ${error.message}`,
    );
  }
}
