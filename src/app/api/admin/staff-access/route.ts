import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPlanFeature } from "@/lib/api-plan-guard";

export const runtime = "nodejs";

/**
 * Dar y quitar acceso a un empleado. **Solo el dueño.**
 *
 * GET    ?bs=<slug>            → qué barberos tienen acceso hoy
 * POST   { bs, barberId, email } → invita
 * DELETE { bs, barberId }        → revoca
 *
 * Cuidados que valen la pena nombrar:
 *
 * - **El dueño le pone una contraseña inicial** y se la dice en persona. Se
 *   eligió esto sobre la invitación por mail porque para un barbero el mail es
 *   fricción real: buscarlo, mirar spam, tenerlo en el celular.
 *
 *   La contrapartida, que está asumida: el dueño sabe esa clave y puede entrar
 *   como el empleado, así que el registro de "quién canceló" no sirve como
 *   prueba contra el dueño. Por eso el empleado **puede cambiarla** desde su
 *   propia pantalla, y se le avisa que puede.
 *
 *   Si la persona YA tenía cuenta, no se le toca la contraseña: entra con la
 *   que ya usa. Cambiársela sería que un dueño le pise la credencial a alguien
 *   que quizá la usa en otra barbería.
 * - Revocar escribe `revoked_at`, no borra: el empleado se va y la barbería
 *   conserva turnos, clientes y comisiones.
 * - El barbero tiene que ser de ESTA barbería. Sin ese chequeo, un dueño podría
 *   darle a alguien acceso a la agenda de otro local.
 */

async function assertOwner(
  authHeader: string | null,
  barbershopSlug: string,
): Promise<
  { ok: true; userId: string } | { ok: false; status: number; error: string }
> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "No autorizado." };
  }
  const supabase = getSupabaseAdminClient();
  const { data: userResult } = await supabase.auth.getUser(
    authHeader.slice("Bearer ".length),
  );
  if (!userResult.user) {
    return { ok: false, status: 401, error: "Sesión inválida." };
  }
  const { data: admin } = await supabase
    .from("barbershop_admins")
    .select("user_id")
    .eq("user_id", userResult.user.id)
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();
  if (!admin) {
    return { ok: false, status: 403, error: "No administrás esta barbería." };
  }
  return { ok: true, userId: userResult.user.id };
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("bs") ?? "";
  const owner = await assertOwner(request.headers.get("authorization"), slug);
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error }, { status: owner.status });
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("barber_staff_access")
    .select("barber_id, granted_at")
    .eq("barbershop_slug", slug)
    .is("revoked_at", null);

  if (error) {
    Sentry.captureException(error, { tags: { route: "admin/staff-access" } });
    return NextResponse.json(
      { error: "No pudimos leer los accesos." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, accesos: data ?? [] });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const slug = typeof body.bs === "string" ? body.bs : "";
  const barberId = typeof body.barberId === "string" ? body.barberId : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const owner = await assertOwner(request.headers.get("authorization"), slug);
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error }, { status: owner.status });
  }

  // Disponible desde Esencial: en Solo el tope es de un barbero, así que no hay
  // empleado a quien invitar.
  const feature = await assertPlanFeature(slug, "cuentas_empleados");
  if (!feature.ok) {
    return NextResponse.json(
      { error: feature.error },
      { status: feature.status },
    );
  }

  if (!barberId || !email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Falta el barbero o el email." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña tiene que tener al menos 8 caracteres." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  // El barbero tiene que ser de ESTA barbería.
  const { data: barbero } = await supabase
    .from("barbers")
    .select("id, name")
    .eq("id", barberId)
    .eq("barbershop_slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (!barbero) {
    return NextResponse.json(
      { error: "Ese barbero no es de tu barbería." },
      { status: 400 },
    );
  }

  // Se crea la cuenta con la contraseña que puso el dueño, ya confirmada: sin
  // mail de por medio, el barbero entra en el momento.
  let userId = "";
  const { data: creado, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (creado?.user) {
    userId = creado.user.id;
  } else {
    // Ya tenía cuenta. NO se le pisa la contraseña: puede estar usándola en
    // otra barbería, o ser el mail personal de alguien. Entra con la suya.
    const { data: lista } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const existente = lista?.users.find(
      (u) => (u.email ?? "").toLowerCase() === email,
    );
    if (!existente) {
      Sentry.captureException(createError, {
        tags: { route: "admin/staff-access", step: "create-user" },
      });
      return NextResponse.json(
        { error: "No pudimos crear la cuenta de esa persona." },
        { status: 500 },
      );
    }
    userId = existente.id;
  }

  // No tiene sentido que el dueño se dé acceso de empleado a sí mismo: ya ve
  // todo, y quedaría con dos accesos que compiten en el ruteo del login.
  if (userId === owner.userId) {
    return NextResponse.json(
      { error: "Ya administrás esta barbería." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("barber_staff_access").insert({
    user_id: userId,
    barbershop_slug: slug,
    barber_id: barberId,
    granted_by: owner.userId,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ese barbero ya tiene acceso." },
        { status: 409 },
      );
    }
    Sentry.captureException(error, { tags: { route: "admin/staff-access" } });
    return NextResponse.json(
      { error: "No pudimos dar el acceso." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    barbero: barbero.name,
    // El dueño tiene que saber si la clave que escribió sirve o si esa persona
    // ya tenía cuenta y entra con la suya. Sin esto le diría una clave
    // equivocada al barbero y parecería que la app no anda.
    usaContrasenaNueva: Boolean(creado?.user),
  });
}

export async function DELETE(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const slug = typeof body.bs === "string" ? body.bs : "";
  const barberId = typeof body.barberId === "string" ? body.barberId : "";

  const owner = await assertOwner(request.headers.get("authorization"), slug);
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error }, { status: owner.status });
  }

  const supabase = getSupabaseAdminClient();
  // Se marca revocado, no se borra: el historial de la barbería queda intacto.
  const { error } = await supabase
    .from("barber_staff_access")
    .update({ revoked_at: new Date().toISOString() })
    .eq("barbershop_slug", slug)
    .eq("barber_id", barberId)
    .is("revoked_at", null);

  if (error) {
    Sentry.captureException(error, { tags: { route: "admin/staff-access" } });
    return NextResponse.json(
      { error: "No pudimos quitar el acceso." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
