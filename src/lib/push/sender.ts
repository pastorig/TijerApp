import "server-only";

import webpush from "web-push";
import * as Sentry from "@sentry/nextjs";
import { getVapidDetails } from "@/lib/push/vapid";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * Push Sender — TijerApp
 *
 * Helper compartido entre /api/push/send-from-queue (T018) y
 * /api/push/cleanup (T019) para procesar un item de la cola: leer su
 * subscription, llamar web-push, y actualizar el status según el resultado.
 *
 * Manejo de errores siguiendo el spec:
 *   - 410 Gone:    subscription dead → expired_at = now() + item 'invalid'
 *   - 4xx (no 410): item 'failed' (no reintentar — error de payload)
 *   - 5xx / network: retry hasta 3 veces, después 'failed'
 *   - Success:     item 'sent' + touch last_used_at de subscription
 *
 * web-push setVapidDetails se llama de forma lazy una sola vez por
 * proceso (cold start de la function de Vercel).
 */

let vapidConfigured = false;

function ensureVapidConfigured(): void {
  if (vapidConfigured) return;
  const { subject, publicKey, privateKey } = getVapidDetails();
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export type ProcessResult =
  | { kind: "sent" }
  | { kind: "skipped"; reason: string }
  | { kind: "invalid"; reason: string }
  | { kind: "failed"; retry: boolean; error: string };

const MAX_RETRIES = 3;

/**
 * Procesa un item de la cola por id.
 *
 * Lee el item + la subscription asociada, intenta enviar la notif, y
 * actualiza los rows según el resultado. Siempre completa sin throw
 * (excepto por errores internos imposibles de manejar) — el caller usa
 * el ProcessResult para reporting.
 */
export async function processQueueItem(itemId: string): Promise<ProcessResult> {
  ensureVapidConfigured();
  const supabase = getSupabaseAdminClient();

  // Leer item + subscription en una sola query (join)
  const { data: item, error: itemError } = await supabase
    .from("push_notification_queue")
    .select("id, status, retry_count, payload, subscription_id")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError || !item) {
    return {
      kind: "skipped",
      reason: itemError?.message ?? "item not found",
    };
  }

  if (item.status !== "pending") {
    return { kind: "skipped", reason: `status=${item.status}` };
  }

  const { data: subscription, error: subError } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, expired_at")
    .eq("id", item.subscription_id)
    .maybeSingle();

  if (subError || !subscription) {
    // Subscription borrada — marcamos item como invalid
    await supabase
      .from("push_notification_queue")
      .update({
        status: "invalid",
        last_error: subError?.message ?? "subscription not found",
      })
      .eq("id", itemId);
    return {
      kind: "invalid",
      reason: subError?.message ?? "subscription not found",
    };
  }

  if (subscription.expired_at) {
    // Subscription expirada antes de procesar este item
    await supabase
      .from("push_notification_queue")
      .update({ status: "invalid", last_error: "subscription expired" })
      .eq("id", itemId);
    return { kind: "invalid", reason: "subscription already expired" };
  }

  // Intentar enviar
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(item.payload),
      {
        TTL: 60, // segundos que el push service guarda el mensaje si el device está offline
      },
    );

    // Success → mark sent + touch last_used_at
    const now = new Date().toISOString();
    await Promise.all([
      supabase
        .from("push_notification_queue")
        .update({ status: "sent", sent_at: now })
        .eq("id", itemId),
      supabase
        .from("push_subscriptions")
        .update({ last_used_at: now })
        .eq("id", subscription.id),
    ]);

    return { kind: "sent" };
  } catch (err: unknown) {
    const error = err as {
      statusCode?: number;
      body?: string;
      message?: string;
    };
    const statusCode = error.statusCode ?? 0;
    const errorMsg = `HTTP ${statusCode}: ${error.body ?? error.message ?? "unknown"}`;

    // 410 Gone — subscription dead
    if (statusCode === 410) {
      await Promise.all([
        supabase
          .from("push_subscriptions")
          .update({ expired_at: new Date().toISOString() })
          .eq("id", subscription.id),
        supabase
          .from("push_notification_queue")
          .update({ status: "invalid", last_error: errorMsg })
          .eq("id", itemId),
      ]);
      return { kind: "invalid", reason: "410 gone" };
    }

    // 4xx (non-410) → failed permanent
    if (statusCode >= 400 && statusCode < 500) {
      await supabase
        .from("push_notification_queue")
        .update({ status: "failed", last_error: errorMsg })
        .eq("id", itemId);
      Sentry.captureException(err, {
        tags: { feature: "push-sender", statusCode: String(statusCode) },
        extra: { itemId, subscriptionId: subscription.id },
      });
      return { kind: "failed", retry: false, error: errorMsg };
    }

    // 5xx / network / other → retry up to MAX_RETRIES
    const newRetryCount = item.retry_count + 1;
    if (newRetryCount >= MAX_RETRIES) {
      await supabase
        .from("push_notification_queue")
        .update({
          status: "failed",
          retry_count: newRetryCount,
          last_error: errorMsg,
        })
        .eq("id", itemId);
      Sentry.captureException(err, {
        tags: { feature: "push-sender", statusCode: String(statusCode) },
        extra: { itemId, finalRetry: true },
      });
      return { kind: "failed", retry: false, error: errorMsg };
    }

    // Sigue pending — cleanup intentará de nuevo
    await supabase
      .from("push_notification_queue")
      .update({
        retry_count: newRetryCount,
        last_error: errorMsg,
      })
      .eq("id", itemId);
    return { kind: "failed", retry: true, error: errorMsg };
  }
}

/**
 * Procesa todos los items pendientes que ya pasaron 30 min sin envío.
 * Usado por el cleanup endpoint para rescatar items stuck.
 */
export async function processStuckPendingItems(): Promise<{
  total: number;
  sent: number;
  failed: number;
  invalid: number;
  skipped: number;
}> {
  const supabase = getSupabaseAdminClient();
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: items, error } = await supabase
    .from("push_notification_queue")
    .select("id")
    .eq("status", "pending")
    .lt("created_at", thirtyMinAgo)
    .limit(100); // Safeguard contra runaways

  if (error || !items) {
    Sentry.captureException(error, { tags: { feature: "push-cleanup" } });
    return { total: 0, sent: 0, failed: 0, invalid: 0, skipped: 0 };
  }

  const counts = { total: items.length, sent: 0, failed: 0, invalid: 0, skipped: 0 };
  for (const item of items) {
    const result = await processQueueItem(item.id);
    if (result.kind === "sent") counts.sent++;
    else if (result.kind === "invalid") counts.invalid++;
    else if (result.kind === "failed") counts.failed++;
    else counts.skipped++;
  }

  return counts;
}
