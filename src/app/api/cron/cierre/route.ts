import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { ahoraEnArgentina, hoyEnArgentina } from "@/lib/hora-argentina";
import { getBarbershopPlan } from "@/lib/plan-access";
import {
  AUTOR_CIERRE,
  DIAS_ENTRE_PEDIDOS,
  claveCliente,
  debeCerrarse,
  diaAnterior,
  elegirPedidosDeResena,
  enVentanaDeResena,
  type TurnoParaResena,
} from "@/lib/cierre-del-dia";
import { sendReviewRequestEmail } from "@/lib/server/review-request-email";

export const runtime = "nodejs";
// Nunca cacheado: cada llamada tiene que mirar la base de ese momento.
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/cierre — cierre automático del día y pedido de reseña (033).
 *
 * Lo llama GitHub Actions cada hora. Dos pasos, independientes entre sí:
 *
 * 1. **Cerrar.** Los turnos pendientes con fecha anterior a hoy (Argentina)
 *    pasan a confirmado. Antes dependía de que el barbero tocara "Confirmar"
 *    turno por turno, y la barbería con más turnos tenía más de la mitad de su
 *    trabajo sin contar.
 * 2. **Pedir reseña.** Entre las 10 y las 21, a los turnos de AYER confirmados
 *    que dejaron mail.
 *
 * ── Por qué el cierre no le avisa a nadie ───────────────────────────────────
 * Es un `update` directo. Los avisos al cliente ("tu turno fue confirmado") los
 * manda el código del panel cuando confirma una persona, no un trigger; acá no
 * se llama a nada de eso, a propósito. En la base, el único trigger de UPDATE
 * sobre `appointments` es el de fidelización — que es justo lo que se quiere:
 * un turno cerrado por el sistema suma su sello igual que uno confirmado a mano.
 *
 * ── Parámetros ──────────────────────────────────────────────────────────────
 * `?dryRun=true`  informa qué haría, sin escribir ni mandar nada.
 * `?force=true`   ignora la ventana horaria de las reseñas (para probar).
 *
 * Ojo: correr esto en local pega contra la base de producción. Para mirar,
 * SIEMPRE con `dryRun=true`.
 *
 * Autenticado con Bearer CRON_SECRET.
 */

const TANDA = 200;

type TurnoPendiente = {
  id: string;
  barbershop_slug: string;
  status: string;
  appointment_date: string;
  deposit_required: boolean | null;
  deposit_status: string | null;
};

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured." },
      { status: 500 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "true";
  const force = url.searchParams.get("force") === "true";

  const hoy = hoyEnArgentina();
  const hora = ahoraEnArgentina().getHours();
  const supabase = getSupabaseAdminClient();

  // ── 1. Cerrar ────────────────────────────────────────────────────────────
  const cierre = await cerrarDiasPasados(supabase, hoy, dryRun);
  if ("error" in cierre) {
    return NextResponse.json({ error: cierre.error }, { status: 500 });
  }

  // ── 2. Pedir reseñas ─────────────────────────────────────────────────────
  const resenas =
    force || enVentanaDeResena(hora)
      ? await pedirResenas(supabase, hoy, dryRun)
      : { fueraDeVentana: true as const, horaArgentina: hora };

  return NextResponse.json({
    ok: true,
    dryRun,
    hoy,
    cierre,
    resenas,
  });
}

type Supabase = ReturnType<typeof getSupabaseAdminClient>;

async function cerrarDiasPasados(supabase: Supabase, hoy: string, dryRun: boolean) {
  // Se traen los candidatos y decide `debeCerrarse`: la regla vive en un solo
  // lugar, con tests, y no repartida entre filtros de la consulta.
  const candidatos: TurnoPendiente[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, barbershop_slug, status, appointment_date, deposit_required, deposit_status",
      )
      .eq("status", "pending")
      .lt("appointment_date", hoy)
      .order("appointment_date", { ascending: true })
      .range(desde, desde + 999);
    if (error) {
      Sentry.captureException(error, { tags: { cron: "cierre", paso: "leer" } });
      return { error: "No pudimos leer los turnos a cerrar." };
    }
    const filas = (data ?? []) as unknown as TurnoPendiente[];
    candidatos.push(...filas);
    if (filas.length < 1000) break;
  }

  const aCerrar = candidatos.filter((t) => debeCerrarse(t, hoy));
  const porBarberia: Record<string, number> = {};
  for (const t of aCerrar) {
    porBarberia[t.barbershop_slug] = (porBarberia[t.barbershop_slug] ?? 0) + 1;
  }
  const resumen = {
    encontrados: candidatos.length,
    conSenaImpaga: candidatos.length - aCerrar.length,
    aCerrar: aCerrar.length,
    porBarberia,
  };

  if (dryRun || aCerrar.length === 0) {
    return { ...resumen, cerrados: 0 };
  }

  const ahora = new Date().toISOString();
  let cerrados = 0;
  for (let i = 0; i < aCerrar.length; i += TANDA) {
    const ids = aCerrar.slice(i, i + TANDA).map((t) => t.id);
    const { data, error } = await supabase
      .from("appointments")
      .update({
        status: "confirmed",
        // Sin persona detrás: `status_changed_by` queda en null y el nombre
        // dice quién fue, para que en el panel se lea "Confirmado por Cierre
        // automático" y no parezca que lo tocó alguien.
        status_changed_by: null,
        status_changed_by_name: AUTOR_CIERRE,
        status_changed_at: ahora,
      })
      .in("id", ids)
      // Si entre la lectura y la escritura el barbero lo canceló ("no vino") o
      // lo confirmó, ya no está pendiente y no se pisa.
      .eq("status", "pending")
      .select("id");
    if (error) {
      Sentry.captureException(error, { tags: { cron: "cierre", paso: "cerrar" } });
      return { error: "No pudimos cerrar los turnos." };
    }
    cerrados += data?.length ?? 0;
  }

  return { ...resumen, cerrados };
}

async function pedirResenas(supabase: Supabase, hoy: string, dryRun: boolean) {
  const ayer = diaAnterior(hoy);

  const { data: turnosData, error: turnosError } = await supabase
    .from("appointments")
    .select(
      "id, barbershop_slug, status, customer_name, customer_email, confirmation_token",
    )
    .eq("appointment_date", ayer)
    .eq("status", "confirmed")
    .not("customer_email", "is", null);
  if (turnosError) {
    Sentry.captureException(turnosError, { tags: { cron: "cierre", paso: "resenas" } });
    return { error: "No pudimos leer los turnos de ayer." };
  }
  const turnos = (turnosData ?? []) as unknown as Array<
    TurnoParaResena & { customer_name: string }
  >;
  if (turnos.length === 0) {
    return { ayer, candidatos: 0, enviados: 0, descartados: [] };
  }
  const ids = turnos.map((t) => t.id);

  // Cada lectura que falla corta: sin saber a quién ya se le pidió, o quién ya
  // dejó reseña, no se manda nada. Mejor un día sin pedidos que un mail de más.
  const [resenasRes, pedidosRes, recientesRes] = await Promise.all([
    supabase.from("appointment_reviews").select("appointment_id").in("appointment_id", ids),
    supabase
      .from("reminder_log")
      .select("appointment_id")
      .eq("kind", "review_request")
      .eq("status", "sent")
      .in("appointment_id", ids),
    supabase
      .from("reminder_log")
      .select("appointment_id")
      .eq("kind", "review_request")
      .eq("status", "sent")
      .gte(
        "sent_at",
        new Date(Date.now() - DIAS_ENTRE_PEDIDOS * 86_400_000).toISOString(),
      ),
  ]);
  for (const res of [resenasRes, pedidosRes, recientesRes]) {
    if (res.error) {
      Sentry.captureException(res.error, { tags: { cron: "cierre", paso: "resenas" } });
      return { error: "No pudimos verificar a quién ya se le pidió reseña." };
    }
  }

  // De los pedidos de los últimos 90 días, de qué cliente y barbería eran.
  const pedidosRecientes = new Set<string>();
  const idsRecientes = (recientesRes.data ?? []).map((r) => r.appointment_id as string);
  for (let i = 0; i < idsRecientes.length; i += TANDA) {
    const { data, error } = await supabase
      .from("appointments")
      .select("barbershop_slug, customer_email")
      .in("id", idsRecientes.slice(i, i + TANDA));
    if (error) {
      Sentry.captureException(error, { tags: { cron: "cierre", paso: "resenas" } });
      return { error: "No pudimos verificar a quién ya se le pidió reseña." };
    }
    for (const fila of data ?? []) {
      if (fila.customer_email) {
        pedidosRecientes.add(claveCliente(fila.barbershop_slug, fila.customer_email));
      }
    }
  }

  // Barberías con el plan vencido: no se les mandan pedidos.
  const barberiasEnLectura = new Set<string>();
  const nombres = new Map<string, string>();
  for (const slug of new Set(turnos.map((t) => t.barbershop_slug))) {
    const plan = await getBarbershopPlan(slug);
    if (plan.isReadOnly) barberiasEnLectura.add(slug);
    const { data } = await supabase
      .from("barbershops")
      .select("name")
      .eq("slug", slug)
      .maybeSingle();
    nombres.set(slug, data?.name ?? slug);
  }

  const { pedir, descartados } = elegirPedidosDeResena({
    turnos,
    conResena: new Set((resenasRes.data ?? []).map((r) => r.appointment_id as string)),
    yaPedidos: new Set((pedidosRes.data ?? []).map((r) => r.appointment_id as string)),
    pedidosRecientes,
    barberiasEnLectura,
  });

  if (dryRun) {
    return {
      ayer,
      candidatos: turnos.length,
      pedirian: pedir.map((t) => ({ id: t.id, barberia: t.barbershop_slug })),
      enviados: 0,
      descartados,
    };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tijerapp.com").replace(
    /\/$/,
    "",
  );
  let enviados = 0;
  const fallidos: Array<{ id: string; motivo: string }> = [];

  for (const turno of pedir) {
    // RECLAMAR ANTES DE MANDAR. Primero se anota el envío; solo si entra se
    // manda el mail. El índice único (turno, tipo, canal) hace imposible el
    // doble envío aunque dos pasadas corran a la vez — y si la migración que
    // agrega 'review_request' no se corrió, el insert falla y NO sale ningún
    // mail, en vez de salir uno por hora para siempre.
    const { error: reclamoError } = await supabase.from("reminder_log").insert({
      appointment_id: turno.id,
      kind: "review_request",
      channel: "email",
      status: "sent",
    } as never);
    if (reclamoError) {
      // 23505 = otra pasada llegó antes: está bien, no es un fallo.
      if (reclamoError.code !== "23505") {
        fallidos.push({
          id: turno.id,
          motivo:
            reclamoError.code === "23514"
              ? "falta correr la migración de reminder_log (review_request)"
              : reclamoError.message,
        });
        // Sin poder anotar, no tiene sentido seguir intentando con el resto.
        if (reclamoError.code === "23514") break;
      }
      continue;
    }

    const conNombre = turno as TurnoParaResena & { customer_name: string };
    const resultado = await sendReviewRequestEmail({
      toEmail: turno.customer_email as string,
      customerName: conNombre.customer_name ?? "",
      barbershopName: nombres.get(turno.barbershop_slug) ?? turno.barbershop_slug,
      reviewUrl: `${siteUrl}/rev/${turno.confirmation_token}`,
    });

    if (resultado.sent) {
      enviados++;
    } else {
      // El mail no salió: el renglón pasa a "failed" para que la próxima pasada
      // dentro de la ventana pueda reintentar (el índice único mira solo "sent").
      await supabase
        .from("reminder_log")
        .update({ status: "failed", error_message: resultado.error ?? null } as never)
        .eq("appointment_id", turno.id)
        .eq("kind", "review_request")
        .eq("channel", "email");
      fallidos.push({ id: turno.id, motivo: resultado.error ?? "no se pudo enviar" });
    }
  }

  return {
    ayer,
    candidatos: turnos.length,
    enviados,
    fallidos,
    descartados,
  };
}
