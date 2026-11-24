import { NextResponse } from "next/server";
import {
  RATE_LIMIT_MESSAGE,
  checkRateLimit,
  getRequestIdentifier,
} from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { darDeAltaBarberia } from "@/lib/server/alta-self-serve";

/**
 * Alta de la barbería de alguien que entró con Google y todavía no tiene
 * ninguna (feature 040; contrato en specs/040-ingreso-con-google/contracts).
 *
 * Diferencias con `/api/registro`:
 *  - el mail sale del token de la sesión, nunca del formulario: si no, con un
 *    token propio alguien podría crear una barbería a nombre del mail de otro;
 *  - no hay clave: la cuenta ya existe (la creó Supabase al entrar con Google)
 *    y la provisión la encuentra por mail sin tocarle nada;
 *  - es idempotente: si ya administra una barbería, devuelve esa.
 */

type Payload = {
  barbershopName?: string;
  ownerName?: string;
  whatsapp?: string;
};

function validar(payload: Payload): string {
  if (!payload.barbershopName?.trim()) return "Poné el nombre de tu barbería.";
  if (!payload.ownerName?.trim()) return "Poné tu nombre.";
  if (!payload.whatsapp?.trim()) return "Poné tu WhatsApp.";
  return "";
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Tu sesión venció. Volvé a entrar con Google." },
        { status: 401 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data: userResult, error: userError } = await supabase.auth.getUser(
      authHeader.slice("Bearer ".length),
    );
    const user = userResult?.user;
    if (userError || !user?.email) {
      return NextResponse.json(
        { ok: false, error: "Tu sesión venció. Volvé a entrar con Google." },
        { status: 401 },
      );
    }

    // Solo para cuentas que entraron con Google y con el mail verificado por
    // Google. El resto se registra por /registro con mail y clave.
    const identidadGoogle = user.identities?.find((i) => i.provider === "google");
    if (!identidadGoogle || identidadGoogle.identity_data?.email_verified === false) {
      return NextResponse.json(
        { ok: false, error: "Entrá con Google para crear tu barbería desde acá." },
        { status: 403 },
      );
    }

    const limit = await checkRateLimit("registro", getRequestIdentifier(request));
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: RATE_LIMIT_MESSAGE },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const payload = (await request.json()) as Payload;
    const errorDeValidacion = validar(payload);
    if (errorDeValidacion) {
      return NextResponse.json({ ok: false, error: errorDeValidacion }, { status: 400 });
    }

    // Doble toque o volver atrás: si ya tiene barbería, no se crea otra.
    const { data: yaAdministra, error: adminError } = await supabase
      .from("barbershop_admins")
      .select("barbershop_slug")
      .eq("user_id", user.id)
      .order("barbershop_slug", { ascending: true })
      .limit(1);
    if (adminError) {
      return NextResponse.json(
        { ok: false, error: "No pudimos crear tu barbería. Probá de nuevo." },
        { status: 503 },
      );
    }
    if (yaAdministra && yaAdministra.length > 0) {
      return NextResponse.json({ ok: true, slug: yaAdministra[0].barbershop_slug });
    }

    const result = await darDeAltaBarberia({
      barbershopName: payload.barbershopName!,
      ownerName: payload.ownerName!,
      whatsapp: payload.whatsapp!,
      email: user.email,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true, slug: result.slug });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No pudimos crear tu barbería. Probá de nuevo." },
      { status: 500 },
    );
  }
}
