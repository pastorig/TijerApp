import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { processStuckPendingItems } from "@/lib/push/sender";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * GET /api/push/cleanup
 *
 * Housekeeping del sistema de push notifications. Llamado por GitHub
 * Actions cron hourly.
 *
 * Operaciones:
 *  1. Procesar pending stuck (>30 min sin enviar) — rescata items que
 *     no fueron procesados por el webhook (webhook fail, timeout, etc.)
 *  2. Marcar como failed los pending > 24h (dead-letter)
 *  3. Borrar rows con status='sent' o 'failed' > 7 días (retention)
 *  4. Borrar subscriptions con expired_at > 30 días
 *
 * Headers:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Returns:
 *   200 { reprocessed, deadLettered, deletedItems, deletedSubs }
 */
export async function GET(request: Request) {
  // 1. Validar CRON_SECRET
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured." },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ") ||
    authHeader.slice("Bearer ".length) !== expectedSecret
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const now = Date.now();

  try {
    // 1. Procesar pending stuck (>30 min)
    const reprocessed = await processStuckPendingItems();

    // 2. Marcar como failed los pending > 24h (los que ni el cleanup pudo)
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const { data: deadLettered, error: deadError } = await supabase
      .from("push_notification_queue")
      .update({
        status: "failed",
        last_error: "Marked failed after 24h pending",
      })
      .eq("status", "pending")
      .lt("created_at", twentyFourHoursAgo)
      .select("id");

    if (deadError) {
      Sentry.captureException(deadError, {
        tags: { feature: "push-cleanup", step: "dead-letter" },
      });
    }

    // 3. Borrar rows >7 días con status sent/failed/invalid
    const sevenDaysAgo = new Date(
      now - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: deletedItems, error: deleteItemsError } = await supabase
      .from("push_notification_queue")
      .delete()
      .in("status", ["sent", "failed", "invalid"])
      .lt("created_at", sevenDaysAgo)
      .select("id");

    if (deleteItemsError) {
      Sentry.captureException(deleteItemsError, {
        tags: { feature: "push-cleanup", step: "delete-old-items" },
      });
    }

    // 4. Borrar subscriptions con expired_at > 30 días
    const thirtyDaysAgo = new Date(
      now - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: deletedSubs, error: deleteSubsError } = await supabase
      .from("push_subscriptions")
      .delete()
      .not("expired_at", "is", null)
      .lt("expired_at", thirtyDaysAgo)
      .select("id");

    if (deleteSubsError) {
      Sentry.captureException(deleteSubsError, {
        tags: { feature: "push-cleanup", step: "delete-old-subs" },
      });
    }

    return NextResponse.json({
      reprocessed,
      deadLettered: deadLettered?.length ?? 0,
      deletedItems: deletedItems?.length ?? 0,
      deletedSubs: deletedSubs?.length ?? 0,
      ts: new Date().toISOString(),
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "push/cleanup" },
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
