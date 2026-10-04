import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { ahoraEnArgentina, hoyEnArgentina } from "@/lib/hora-argentina";
import {
  avisarAlFundador,
  diasEntre,
  enVentanaDeActivacion,
  pasoQueToca,
} from "@/lib/activacion";
import {
  armarAvisoAlFundador,
  armarMailDeActivacion,
  reclamarYMandar,
} from "@/lib/server/activation-emails";
import { linkDeWhatsApp } from "@/lib/server/signup-notice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/activacion — la serie de mails a barberías recién registradas
 * que todavía no recibieron un turno (feature 034).
 *
 * Lo llama GitHub Actions cada hora; manda solo entre las 10 y las 13
 * (Argentina). Por barbería, como mucho un mail al dueño por pasada (día 1, 3
 * o 7) y, una sola vez, un aviso al fundador desde el día 3.
 *
 * A quién NO le escribe, y por qué no hace falta ningún interruptor:
 * - a quien no recibió la bienvenida (barberías viejas o creadas desde /owner);
 * - a quien ya tiene un turno, o la prueba vencida, o más de 14 días.
 *
 * `?dryRun=true`  informa a quién le mandaría qué, sin mandar ni anotar nada.
 * `?force=true`   ignora la ventana horaria (para probar).
 *
 * Ojo: correr esto en local pega contra la base de producción. Para mirar,
 * SIEMPRE con `dryRun=true`.
 *
 * Autenticado con Bearer CRON_SECRET.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "true";
  const force = url.searchParams.get("force") === "true";

  const hoy = hoyEnArgentina();
  const hora = ahoraEnArgentina().getHours();
  if (!force && !enVentanaDeActivacion(hora)) {
    return NextResponse.json({ ok: true, fueraDeVentana: true, horaArgentina: hora });
  }

  const supabase = getSupabaseAdminClient();

  // El registro de lo ya mandado. Si esta lectura falla (o la tabla no existe
  // porque falta la migración) no se manda nada: sin saber qué salió, mandar es
  // arriesgarse a repetir.
  const { data: logData, error: logError } = await supabase
    .from("barbershop_activation_log" as never)
    .select("barbershop_slug, kind, status");
  if (logError) {
    Sentry.captureException(logError, { tags: { cron: "activacion", paso: "registro" } });
    return NextResponse.json({
      ok: true,
      sinRegistro: true,
      detalle:
        "No se pudo leer barbershop_activation_log (¿falta correr la migración?). No se mandó nada.",
    });
  }
  const filas = (logData ?? []) as unknown as Array<{
    barbershop_slug: string;
    kind: string;
    status: string;
  }>;

  // Por barbería: lo enviado. La bienvenida cuenta aunque haya FALLADO: lo que
  // habilita la serie es haberse registrado por el formulario, y un fallo de
  // Resend en el alta no puede dejar a esa barbería sin los mails siguientes.
  const enviadosPor = new Map<string, Set<string>>();
  for (const f of filas) {
    if (f.status !== "sent" && f.kind !== "bienvenida") continue;
    const set = enviadosPor.get(f.barbershop_slug) ?? new Set<string>();
    set.add(f.kind);
    enviadosPor.set(f.barbershop_slug, set);
  }
  const slugs = [...enviadosPor.entries()]
    .filter(([, set]) => set.has("bienvenida"))
    .map(([slug]) => slug);
  if (slugs.length === 0) {
    return NextResponse.json({ ok: true, dryRun, hoy, barberias: 0, acciones: [] });
  }

  const [shopsRes, subsRes, ownersRes] = await Promise.all([
    supabase
      .from("barbershops")
      .select("slug, name, whatsapp, created_at")
      .in("slug", slugs),
    supabase
      .from("barbershop_subscriptions")
      .select("barbershop_slug, status, trial_expires_at")
      .in("barbershop_slug", slugs),
    supabase
      .from("barbershop_admins")
      .select("barbershop_slug, user_id, is_owner")
      .in("barbershop_slug", slugs),
  ]);
  for (const res of [shopsRes, subsRes, ownersRes]) {
    if (res.error) {
      Sentry.captureException(res.error, { tags: { cron: "activacion", paso: "leer" } });
      return NextResponse.json({ error: "No pudimos leer las barberías." }, { status: 500 });
    }
  }

  const acciones: Array<Record<string, unknown>> = [];
  const ahoraMs = Date.now();

  for (const shop of shopsRes.data ?? []) {
    const enviados = enviadosPor.get(shop.slug) ?? new Set<string>();
    const sub = (subsRes.data ?? []).find((s) => s.barbershop_slug === shop.slug);
    const venceMs = sub?.trial_expires_at ? new Date(sub.trial_expires_at).getTime() : 0;
    const pruebaVigente = sub?.status === "trial" && venceMs > ahoraMs;
    const dias = diasEntre(hoyEnArgentina(new Date(shop.created_at)), hoy);

    // Con un error al contar NO se asume cero: cero es justo lo que dispara el
    // mail, y mandarle "todavía no tenés turnos" a quien sí tiene es peor que
    // saltearlo una hora.
    const { count, error: countError } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("barbershop_slug", shop.slug)
      .neq("status", "deleted");
    if (countError || count === null) {
      acciones.push({ barberia: shop.slug, salteada: "no se pudo contar los turnos" });
      continue;
    }

    const estado = { dias, turnos: count, pruebaVigente, enviados };
    const paso = pasoQueToca(estado);
    const avisar = avisarAlFundador(estado);
    if (!paso && !avisar) continue;

    if (paso) {
      const admins = (ownersRes.data ?? []).filter((a) => a.barbershop_slug === shop.slug);
      const owner = admins.find((a) => a.is_owner) ?? admins[0];
      const { data: userData } = owner
        ? await supabase.auth.admin.getUserById(owner.user_id)
        : { data: null };
      const email = userData?.user?.email ?? null;

      if (!email) {
        acciones.push({ barberia: shop.slug, paso, resultado: "sin mail del dueño" });
      } else if (dryRun) {
        acciones.push({ barberia: shop.slug, paso, dias, resultado: "se mandaría" });
      } else {
        const mail = armarMailDeActivacion(paso, {
          slug: shop.slug,
          nombre: shop.name,
          email,
          diasDePruebaRestantes: Math.max(0, Math.ceil((venceMs - ahoraMs) / 86_400_000)),
        });
        const resultado = await reclamarYMandar(supabase, shop.slug, paso, {
          to: email,
          ...mail,
        });
        acciones.push({ barberia: shop.slug, paso, dias, resultado });
      }
    }

    if (avisar) {
      const destino = process.env.OWNER_NOTIFICATION_EMAIL;
      if (!destino) {
        acciones.push({ barberia: shop.slug, aviso: "falta OWNER_NOTIFICATION_EMAIL" });
      } else if (dryRun) {
        acciones.push({ barberia: shop.slug, aviso: "se avisaría al fundador", dias });
      } else {
        const aviso = armarAvisoAlFundador({
          nombre: shop.name,
          slug: shop.slug,
          dias,
          whatsapp: shop.whatsapp ?? null,
          whatsappLink: shop.whatsapp ? linkDeWhatsApp(shop.whatsapp) : null,
        });
        const resultado = await reclamarYMandar(supabase, shop.slug, "aviso_fundador", {
          to: destino,
          ...aviso,
        });
        acciones.push({ barberia: shop.slug, aviso: resultado, dias });
      }
    }
  }

  return NextResponse.json({ ok: true, dryRun, hoy, barberias: slugs.length, acciones });
}
