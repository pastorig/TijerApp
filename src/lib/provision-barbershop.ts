import { demoBarbershops } from "@/data/demo-barbershops";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * Motor de alta de una barbería. Crea, en orden: usuario admin en Auth (si no
 * existe), barbería, vínculo admin, primer barbero, horarios semanales,
 * servicios iniciales y —opcionalmente— la suscripción de trial.
 *
 * Vive acá y no dentro de una route porque lo usan DOS entradas distintas:
 *  - /api/owner/create-barbershop → alta manual del owner (con su gate).
 *  - /api/registro                → alta self-serve pública (con trial).
 *
 * No sabe nada de autenticación ni de permisos: quien lo llama decide si el
 * pedido está autorizado. Así el gate de owner no se filtra al registro
 * público ni viceversa.
 */

export type InitialServiceInput = {
  name: string;
  price: number;
  durationMinutes: number;
};

export type ProvisionBarbershopInput = {
  name: string;
  slug: string;
  description?: string;
  whatsapp?: string;
  instagram?: string;
  adminEmail: string;
  /** Si no viene, se genera una temporal y se devuelve en el resultado. */
  adminPassword?: string;
  firstBarberName: string;
  initialServices: InitialServiceInput[];
  workingHoursStart: string;
  workingHoursEnd: string;
  slotIntervalMinutes: number;
  /**
   * Si viene, crea la suscripción de trial por esa cantidad de días (tier Pro).
   * El alta del owner no lo usa — asigna el plan a mano desde /owner/planes.
   */
  trialDays?: number;
};

export type ProvisionBarbershopResult =
  | {
      ok: true;
      slug: string;
      name: string;
      adminEmail: string;
      adminUserId: string;
      /** Solo si la generamos nosotros (el owner no eligió una). */
      temporaryPassword: string | null;
      /** true si el email ya tenía cuenta y la reutilizamos. */
      reusedExistingUser: boolean;
    }
  | { ok: false; error: string; status: number };

export const PASSWORD_MIN_LENGTH = 8;

/** Ventana de gracia después de que vence el trial, antes del paywall. */
const GRACE_DAYS = 7;

function createTemporaryPassword() {
  return `TijerApp${Math.random().toString(36).slice(-8)}!9`;
}

/** Normaliza un texto a slug URL-safe. Quita tildes y ñ. */
export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    // Combining diacritics: "Peluquería Ñandú" → "peluqueria-nandu".
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Devuelve un slug libre a partir del nombre. Si está ocupado prueba con
 * sufijos (-2, -3…). Chequea contra la DB y contra las barberías demo.
 */
export async function findAvailableSlug(baseName: string): Promise<string> {
  const supabaseAdmin = getSupabaseAdminClient();
  const base = normalizeSlug(baseName) || "barberia";

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;

    if (demoBarbershops.some((shop) => shop.slug === candidate)) continue;

    const { data: existing } = await supabaseAdmin
      .from("barbershops")
      .select("slug")
      .eq("slug", candidate)
      .maybeSingle();

    if (!existing) return candidate;
  }

  // Fallback prácticamente imposible: sufijo aleatorio.
  return `${base}-${Math.random().toString(36).slice(-5)}`;
}

export async function provisionBarbershop(
  input: ProvisionBarbershopInput,
): Promise<ProvisionBarbershopResult> {
  const supabaseAdmin = getSupabaseAdminClient();
  const slug = normalizeSlug(input.slug);

  if (!slug) {
    return { ok: false, error: "El slug no es válido.", status: 400 };
  }

  if (demoBarbershops.some((barbershop) => barbershop.slug === slug)) {
    return { ok: false, error: "Ese slug ya está ocupado.", status: 400 };
  }

  const { data: existingBarbershop } = await supabaseAdmin
    .from("barbershops")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (existingBarbershop) {
    return { ok: false, error: "Ese slug ya está registrado.", status: 400 };
  }

  // ── Usuario admin ────────────────────────────────────────────────────────
  const normalizedEmail = input.adminEmail.trim().toLowerCase();
  const usersResult = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  let adminUser = usersResult.data.users.find(
    (currentUser) => currentUser.email?.toLowerCase() === normalizedEmail,
  );
  const reusedExistingUser = Boolean(adminUser);
  let temporaryPassword: string | null = null;

  if (!adminUser) {
    const chosenPassword = input.adminPassword?.trim();
    const finalPassword =
      chosenPassword && chosenPassword.length >= PASSWORD_MIN_LENGTH
        ? chosenPassword
        : createTemporaryPassword();

    // Solo exponemos la password si la generamos nosotros; si la eligió quien
    // llama, ya la conoce.
    if (!chosenPassword) temporaryPassword = finalPassword;

    const { data: createdUser, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: finalPassword,
        email_confirm: true,
      });

    if (createUserError || !createdUser.user) {
      return {
        ok: false,
        error: "No pudimos crear el usuario admin.",
        status: 500,
      };
    }

    adminUser = createdUser.user;
  }

  // ── Barbería ─────────────────────────────────────────────────────────────
  const { data: barbershop, error: barbershopError } = await supabaseAdmin
    .from("barbershops")
    .insert({
      slug,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      whatsapp: input.whatsapp?.trim() || null,
      instagram: input.instagram?.trim() || null,
      working_hours_start: input.workingHoursStart,
      working_hours_end: input.workingHoursEnd,
      slot_interval_minutes: input.slotIntervalMinutes,
      is_active: true,
    })
    .select("id, slug, name")
    .single();

  if (barbershopError || !barbershop) {
    return { ok: false, error: "No pudimos crear la barbería.", status: 500 };
  }

  const { error: adminAccessError } = await supabaseAdmin
    .from("barbershop_admins")
    .insert({
      user_id: adminUser.id,
      barbershop_slug: slug,
      role: "admin",
      is_owner: true,
    });

  if (adminAccessError) {
    return {
      ok: false,
      error: "La barbería se creó, pero falló la asignación del admin.",
      status: 500,
    };
  }

  // ── Primer barbero ───────────────────────────────────────────────────────
  const { data: barber, error: barberError } = await supabaseAdmin
    .from("barbers")
    .insert({
      barbershop_slug: slug,
      name: input.firstBarberName.trim(),
      display_name: input.firstBarberName.trim(),
      role: "Barbero",
      whatsapp: null,
      is_active: true,
      is_owner: true,
      deleted_at: null,
    })
    .select("id")
    .single();

  if (barberError || !barber) {
    return {
      ok: false,
      error: "La barbería se creó, pero falló el primer barbero.",
      status: 500,
    };
  }

  // Lunes a sábado trabajando con el horario de la barbería; domingo no.
  const weeklySchedulesPayload = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    barbershop_slug: slug,
    barber_id: barber.id,
    day_of_week: dayOfWeek,
    start_time: input.workingHoursStart,
    end_time: input.workingHoursEnd,
    is_working: dayOfWeek !== 0,
  }));

  const { error: schedulesError } = await supabaseAdmin
    .from("barber_weekly_schedules")
    .insert(weeklySchedulesPayload);

  if (schedulesError) {
    // No bloqueante: se puede configurar después desde el panel.
    console.warn(
      `[provision-barbershop] weekly_schedules falló para ${slug}:`,
      schedulesError,
    );
  }

  const { error: servicesError } = await supabaseAdmin
    .from("barber_services")
    .insert(
      input.initialServices.map((service) => ({
        barbershop_slug: slug,
        barber_id: barber.id,
        name: service.name.trim(),
        price: service.price,
        duration_minutes: service.durationMinutes,
        is_active: true,
        deleted_at: null,
      })),
    );

  if (servicesError) {
    return {
      ok: false,
      error: "La barbería se creó, pero fallaron los servicios iniciales.",
      status: 500,
    };
  }

  // ── Trial (solo self-serve) ──────────────────────────────────────────────
  if (input.trialDays && input.trialDays > 0) {
    const now = new Date();
    const trialEnds = new Date(now);
    trialEnds.setDate(trialEnds.getDate() + input.trialDays);
    const graceEnds = new Date(trialEnds);
    graceEnds.setDate(graceEnds.getDate() + GRACE_DAYS);

    const { error: subscriptionError } = await supabaseAdmin
      .from("barbershop_subscriptions")
      .insert({
        barbershop_slug: slug,
        plan_tier: "pro",
        status: "trial",
        trial_started_at: now.toISOString(),
        trial_expires_at: trialEnds.toISOString(),
        grace_expires_at: graceEnds.toISOString(),
      });

    if (subscriptionError) {
      // No bloqueante: la barbería ya existe y es usable. Lo logueamos para
      // poder asignar el plan a mano desde /owner/planes si hiciera falta.
      console.warn(
        `[provision-barbershop] no se pudo crear el trial de ${slug}:`,
        subscriptionError,
      );
    }
  }

  return {
    ok: true,
    slug,
    name: barbershop.name,
    adminEmail: adminUser.email ?? normalizedEmail,
    adminUserId: adminUser.id,
    temporaryPassword,
    reusedExistingUser,
  };
}
