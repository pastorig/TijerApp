import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { processQueueItem } from "@/lib/push/sender";

export const runtime = "nodejs";

/**
 * POST /api/push/send-from-queue
 *
 * Webhook handler para Supabase Database Webhooks. Se dispara cada vez
 * que se inserta una row en push_notification_queue (configurado en T010).
 *
 * Body shape (Supabase webhook format):
 *   {
 *     type: "INSERT",
 *     table: "push_notification_queue",
 *     schema: "public",
 *     record: { id, ... }
 *   }
 *
 * Headers:
 *   Authorization: Bearer <SUPABASE_WEBHOOK_SECRET>
 *
 * SIEMPRE devuelve 200 a Supabase (incluso en errores internos) —
 * el retry está manejado por el cleanup endpoint, no por Supabase webhook.
 * Devolver 4xx/5xx haría que Supabase deje de mandar nuevos eventos.
 */
export async function POST(request: Request) {
  // 1. Validar auth
  const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET;
  if (!expectedSecret) {
    Sentry.captureMessage("SUPABASE_WEBHOOK_SECRET not configured", "error");
    return NextResponse.json(
      { error: "Server misconfigured." },
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

  // 2. Parsear body
  let body: {
    type?: string;
    table?: string;
    record?: { id?: string };
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid body" });
  }

  if (
    body.type !== "INSERT" ||
    body.table !== "push_notification_queue" ||
    typeof body.record?.id !== "string"
  ) {
    return NextResponse.json({ ok: false, reason: "ignored event" });
  }

  const itemId = body.record.id;

  // 3. Procesar item
  try {
    const result = await processQueueItem(itemId);
    return NextResponse.json({ ok: true, itemId, result });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "push/send-from-queue" },
      extra: { itemId },
    });
    // Aun en error: devolver 200 para que Supabase no retry desde su lado
    return NextResponse.json({
      ok: false,
      itemId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
