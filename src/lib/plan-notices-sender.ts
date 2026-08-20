import type { SupabaseClient } from "@supabase/supabase-js";
import {
  daysUntil,
  planNoticeDue,
  planNoticeMessage,
  toArgYmd,
  type PlanNoticeKind,
} from "@/lib/plan-notices";
import { billedMonthlyArs, formatArs, type PlanTier } from "@/lib/plans";
import { isFounder } from "@/data/founders";

/**
 * Envío de los avisos de vencimiento de plan.
 *
 * Lo llama el cron horario (`/api/cron/reminders`). Por cada barbería con
 * plan pago decide si le toca un aviso (ver `plan-notices.ts`), lo registra
 * y encola un push por cada dispositivo de quien administra.
 *
 * ── El insert es el candado ─────────────────────────────────────────────────
 * No se pregunta "¿ya avisé?" y después se inserta: se intenta insertar y la
 * violación de unicidad (23505) se lee como "ya estaba avisado". Preguntar
 * primero deja una ventana en la que dos corridas superpuestas del cron
 * mandan el push dos veces.
 *
 * Si después de tomar el candado falla el encolado, se borra la fila para que
 * la corrida siguiente lo reintente. Vale más un aviso repetido que un aviso
 * que nunca sale.
 */

export type PlanNoticeResult = {
  slug: string;
  kind: PlanNoticeKind;
  devices: number;
  /** `true` cuando ya se había avisado y no se hizo nada. */
  alreadySent?: boolean;
  error?: string;
};

type Subscription = {
  barbershop_slug: string;
  current_period_ends_at: string | null;
  status: string;
  plan_tier: PlanTier | null;
};

export async function sendPlanNotices({
  supabase,
  todayYmd,
  dryRun = false,
}: {
  supabase: SupabaseClient;
  todayYmd: string;
  dryRun?: boolean;
}): Promise<PlanNoticeResult[]> {
  const results: PlanNoticeResult[] = [];

  const { data: subs, error } = await supabase
    .from("barbershop_subscriptions")
    .select("barbershop_slug, current_period_ends_at, status, plan_tier")
    .eq("status", "active")
    .not("current_period_ends_at", "is", null);

  if (error) throw new Error(`no pudimos leer las suscripciones: ${error.message}`);

  for (const sub of (subs ?? []) as Subscription[]) {
    const periodEndsAt = sub.current_period_ends_at;
    if (!periodEndsAt) continue;

    const kind = planNoticeDue({ periodEndsAt, todayYmd });
    if (!kind) continue;

    const slug = sub.barbershop_slug;
    // La fecha del vencimiento en calendario argentino: es parte de la clave,
    // así que tiene que ser la misma cada vez que se calcula.
    const periodYmd = toArgYmd(new Date(periodEndsAt));

    if (dryRun) {
      results.push({ slug, kind, devices: 0 });
      continue;
    }

    // 1. Tomar el candado.
    const { data: logRow, error: logError } = await supabase
      .from("plan_notice_log")
      .insert({
        barbershop_slug: slug,
        kind,
        period_ends_at: periodYmd,
      })
      .select("id")
      .single();

    if (logError) {
      if (logError.code === "23505") {
        results.push({ slug, kind, devices: 0, alreadySent: true });
      } else {
        results.push({ slug, kind, devices: 0, error: logError.message });
      }
      continue;
    }

    // 2. Encolar. Si algo falla, se suelta el candado.
    try {
      const devices = await enqueueForAdmins({
        supabase,
        slug,
        kind,
        daysLeft: daysUntil(periodEndsAt, todayYmd),
        // Lo que paga, no el precio del tier asignado.
        priceLabel: sub.plan_tier
          ? formatArs(billedMonthlyArs(sub.plan_tier, isFounder(slug)))
          : undefined,
      });

      await supabase
        .from("plan_notice_log")
        .update({ devices })
        .eq("id", (logRow as { id: string }).id);

      results.push({ slug, kind, devices });
    } catch (err) {
      await supabase
        .from("plan_notice_log")
        .delete()
        .eq("id", (logRow as { id: string }).id);
      results.push({
        slug,
        kind,
        devices: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

/**
 * Encola el push para cada dispositivo de quien administra la barbería.
 *
 * Solo administradores: `push_subscriptions` guarda el `user_id`, así que se
 * cruza con `barbershop_admins`. Un barbero empleado no tiene por qué recibir
 * "pagá el plan".
 *
 * Devuelve a cuántos dispositivos se encoló. Cero es un resultado válido: el
 * admin no tiene notificaciones activas y se va a enterar por el cartel del
 * panel.
 */
async function enqueueForAdmins({
  supabase,
  slug,
  kind,
  daysLeft,
  priceLabel,
}: {
  supabase: SupabaseClient;
  slug: string;
  kind: PlanNoticeKind;
  daysLeft: number;
  priceLabel?: string;
}): Promise<number> {
  const { data: admins, error: adminsError } = await supabase
    .from("barbershop_admins")
    .select("user_id")
    .eq("barbershop_slug", slug);

  if (adminsError) throw new Error(`admins: ${adminsError.message}`);

  const adminIds = (admins ?? []).map((a) => (a as { user_id: string }).user_id);
  if (adminIds.length === 0) return 0;

  const { data: devices, error: devicesError } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("barbershop_slug", slug)
    .in("user_id", adminIds)
    .is("expired_at", null);

  if (devicesError) throw new Error(`dispositivos: ${devicesError.message}`);

  const rows = (devices ?? []) as Array<{ id: string }>;
  if (rows.length === 0) return 0;

  const { title, body } = planNoticeMessage(kind, daysLeft, priceLabel);
  const payload = {
    title,
    body,
    url: `/${slug}/admin`,
    // Un aviso reemplaza al anterior en la bandeja en vez de apilarse.
    tag: `plan-vence-${slug}`,
  };

  const { error: queueError } = await supabase
    .from("push_notification_queue")
    .insert(rows.map((row) => ({ subscription_id: row.id, payload })));

  if (queueError) throw new Error(`cola: ${queueError.message}`);

  return rows.length;
}
