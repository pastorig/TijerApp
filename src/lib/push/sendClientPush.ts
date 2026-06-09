import "server-only";

import webpush from "web-push";
import * as Sentry from "@sentry/nextjs";
import { getVapidDetails } from "@/lib/push/vapid";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * Sender de push para CLIENTES (no admins).
 *
 * Lee client_push_subscriptions del appointment_id dado, manda push a cada
 * sub activa (expired_at IS NULL), maneja 410 Gone marcando expired_at, y
 * devuelve cuántas se enviaron exitosamente.
 *
 * Pensado para llamar desde el cron de reminders después de enviar el
 * email correspondiente. El cliente que opt-in en /r/[token] recibe push
 * además del email — útil cuando el cliente cierra el mail o tarda en
 * verlo, el push aparece en el lockscreen.
 */

let vapidConfigured = false;

function ensureVapidConfigured(): void {
  if (vapidConfigured) return;
  try {
    const { subject, publicKey, privateKey } = getVapidDetails();
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  } catch (err) {
    // Si no hay VAPID config, no podemos enviar pushes. Falla silenciosa
    // — el caller decide qué hacer.
    Sentry.captureException(err, {
      tags: { module: "sendClientPush", step: "vapid" },
    });
    throw err;
  }
}

export type ClientPushPayload = {
  /** Título corto que aparece en la lockscreen. */
  title: string;
  /** Cuerpo del push (1-2 líneas). */
  body: string;
  /** URL a abrir al tocar la notificación (ej. /r/[token]). */
  url?: string;
  /** Icon a mostrar — default a logo TijerApp. */
  icon?: string;
};

export type SendClientPushResult = {
  sent: number;
  expired: number;
  failed: number;
  errors: string[];
};

export async function sendClientPushForAppointment(
  appointmentId: string,
  payload: ClientPushPayload,
): Promise<SendClientPushResult> {
  const result: SendClientPushResult = {
    sent: 0,
    expired: 0,
    failed: 0,
    errors: [],
  };

  try {
    ensureVapidConfigured();
  } catch {
    return { ...result, errors: ["VAPID not configured"] };
  }

  const supabase = getSupabaseAdminClient();

  const { data: subs, error } = await supabase
    .from("client_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("appointment_id", appointmentId)
    .is("expired_at", null);

  if (error) {
    Sentry.captureException(error, {
      tags: { module: "sendClientPush", step: "select" },
    });
    return { ...result, errors: [error.message] };
  }

  if (!subs || subs.length === 0) {
    return result;
  }

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
    icon: payload.icon ?? "/brand/icons/icon-192.png",
  });

  for (const sub of subs as Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        message,
        { TTL: 60 },
      );
      result.sent += 1;
    } catch (err) {
      const code = (err as { statusCode?: number } | null)?.statusCode;
      if (code === 410 || code === 404) {
        // Subscription dead — marcar expired
        await supabase
          .from("client_push_subscriptions")
          .update({ expired_at: new Date().toISOString() })
          .eq("id", sub.id);
        result.expired += 1;
      } else {
        result.failed += 1;
        result.errors.push(
          err instanceof Error ? err.message : String(err),
        );
        Sentry.captureException(err, {
          tags: { module: "sendClientPush", step: "send", code: String(code) },
        });
      }
    }
  }

  return result;
}
