import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * POST /api/push/client-subscribe
 *
 * Body: { token: string, subscription: PushSubscriptionJSON, userAgent?: string }
 *
 * Endpoint público (sin auth) para que un CLIENTE active push en el
 * navegador de su página /r/[token]. La sub queda linkeada al appointment
 * vía confirmation_token.
 */

type SubscribeBody = {
  token?: string;
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  userAgent?: string;
};

export async function POST(request: Request) {
  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const sub = body.subscription;
  if (!token || !sub || !sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json(
      { error: "Datos de suscripción incompletos." },
      { status: 400 },
    );
  }

  // Validación liviana de formato (UUID-ish)
  if (!/^[0-9a-f-]{30,40}$/i.test(token)) {
    return NextResponse.json({ error: "Token inválido." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  try {
    // RPC subscribe_client_push_by_token aún no está tipada en Database;
    // usamos cast para evitar errores de TS sin re-generar tipos completos.
    const { data, error } = await (
      supabase.rpc as unknown as (
        fn: string,
        args: Record<string, string | null>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>
    )("subscribe_client_push_by_token", {
      p_token: token,
      p_endpoint: sub.endpoint,
      p_p256dh: sub.keys.p256dh,
      p_auth: sub.keys.auth,
      p_user_agent: body.userAgent ?? null,
    });

    if (error) {
      Sentry.captureException(error, {
        tags: { route: "push/client-subscribe" },
      });
      return NextResponse.json(
        { error: "No pudimos guardar la suscripción." },
        { status: 500 },
      );
    }

    type RpcResult = {
      success: boolean;
      error_message: string | null;
      subscription_id: string | null;
    };
    const result = (data as RpcResult[])[0];

    if (!result?.success) {
      const code = result?.error_message ?? "unknown";
      return NextResponse.json(
        {
          error:
            code === "invalid_token"
              ? "Tu link de turno expiró o no es válido."
              : "No pudimos completar la suscripción.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, subscriptionId: result.subscription_id });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "push/client-subscribe", step: "catch" },
    });
    return NextResponse.json(
      { error: "Error inesperado." },
      { status: 500 },
    );
  }
}
