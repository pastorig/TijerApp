import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { demoBarbershops } from "@/data/demo-barbershops";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type InitialServiceInput = {
  name: string;
  price: number;
  durationMinutes: number;
};

type CreateBarbershopPayload = {
  name: string;
  slug: string;
  description: string;
  whatsapp: string;
  instagram: string;
  adminEmail: string;
  /** Opcional. Si viene, se usa. Si no, se genera una temporal. */
  adminPassword?: string;
  firstBarberName: string;
  initialServices: InitialServiceInput[];
  /** Horarios laborales de la barbería. Defaults: 09:00 - 20:00 / 30min. */
  workingHoursStart: string;
  workingHoursEnd: string;
  slotIntervalMinutes: number;
};

function createTemporaryPassword() {
  return `TijerApp${Math.random().toString(36).slice(-8)}!9`;
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const PASSWORD_MIN_LENGTH = 8;
const ALLOWED_INTERVALS = [15, 20, 30, 45, 60] as const;

function validatePayload(payload: CreateBarbershopPayload) {
  if (!payload.name.trim()) {
    return "El nombre de la barberia es obligatorio.";
  }
  if (!payload.slug.trim()) {
    return "El slug es obligatorio.";
  }
  if (!payload.adminEmail.trim()) {
    return "El email admin es obligatorio.";
  }
  if (!payload.firstBarberName.trim()) {
    return "El primer barbero es obligatorio.";
  }
  if (payload.initialServices.length === 0) {
    return "Agrega al menos un servicio inicial.";
  }

  const invalidService = payload.initialServices.find(
    (service) =>
      !service.name.trim() ||
      !Number.isFinite(service.price) ||
      service.price <= 0 ||
      !Number.isFinite(service.durationMinutes) ||
      service.durationMinutes <= 0,
  );
  if (invalidService) {
    return "Revisa nombre, precio y duracion de los servicios iniciales.";
  }

  if (!TIME_REGEX.test(payload.workingHoursStart)) {
    return "Hora de apertura invalida (formato HH:MM).";
  }
  if (!TIME_REGEX.test(payload.workingHoursEnd)) {
    return "Hora de cierre invalida (formato HH:MM).";
  }
  if (payload.workingHoursStart >= payload.workingHoursEnd) {
    return "La hora de cierre debe ser mayor a la apertura.";
  }
  if (!ALLOWED_INTERVALS.includes(payload.slotIntervalMinutes as never)) {
    return `Intervalo invalido. Valores permitidos: ${ALLOWED_INTERVALS.join(", ")} minutos.`;
  }

  if (payload.adminPassword !== undefined && payload.adminPassword !== "") {
    if (payload.adminPassword.length < PASSWORD_MIN_LENGTH) {
      return `La contrasena admin debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
    }
  }

  return "";
}

export async function POST(request: Request) {
  try {
    const authorizationHeader = request.headers.get("authorization");
    const accessToken = authorizationHeader?.replace("Bearer ", "").trim();

    if (!accessToken) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !publishableKey) {
      return NextResponse.json(
        { error: "Falta configuracion de Supabase." },
        { status: 500 },
      );
    }

    const sessionClient = createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const {
      data: { user },
      error: sessionError,
    } = await sessionClient.auth.getUser();

    if (sessionError || !user) {
      return NextResponse.json({ error: "Sesion invalida." }, { status: 401 });
    }

    const payload = (await request.json()) as CreateBarbershopPayload;
    const validationError = validatePayload(payload);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const slug = normalizeSlug(payload.slug);

    if (!slug) {
      return NextResponse.json(
        { error: "El slug no es valido." },
        { status: 400 },
      );
    }

    if (demoBarbershops.some((barbershop) => barbershop.slug === slug)) {
      return NextResponse.json(
        { error: "Ese slug ya existe entre las barberias demo." },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { data: ownerAccess } = await supabaseAdmin
      .from("platform_owners")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!ownerAccess) {
      return NextResponse.json(
        { error: "Solo un owner de TijerApp puede crear barberias." },
        { status: 403 },
      );
    }

    const { data: existingBarbershop } = await supabaseAdmin
      .from("barbershops")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    if (existingBarbershop) {
      return NextResponse.json(
        { error: "Ese slug ya esta registrado." },
        { status: 400 },
      );
    }

    const usersResult = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    let adminUser = usersResult.data.users.find(
      (currentUser) =>
        currentUser.email?.toLowerCase() ===
        payload.adminEmail.trim().toLowerCase(),
    );
    let temporaryPassword: string | null = null;

    if (!adminUser) {
      const chosenPassword = payload.adminPassword?.trim();
      const finalPassword =
        chosenPassword && chosenPassword.length >= PASSWORD_MIN_LENGTH
          ? chosenPassword
          : createTemporaryPassword();

      // Solo exponemos la password al cliente si fue generada automáticamente.
      // Si el owner la eligió, ya la conoce y no la mostramos en la respuesta.
      if (!chosenPassword) {
        temporaryPassword = finalPassword;
      }

      const { data: createdUser, error: createUserError } =
        await supabaseAdmin.auth.admin.createUser({
          email: payload.adminEmail.trim().toLowerCase(),
          password: finalPassword,
          email_confirm: true,
        });

      if (createUserError || !createdUser.user) {
        return NextResponse.json(
          { error: "No pudimos crear el usuario admin en Auth." },
          { status: 500 },
        );
      }

      adminUser = createdUser.user;
    }

    const { data: barbershop, error: barbershopError } = await supabaseAdmin
      .from("barbershops")
      .insert({
        slug,
        name: payload.name.trim(),
        description: payload.description.trim() || null,
        whatsapp: payload.whatsapp.trim() || null,
        instagram: payload.instagram.trim() || null,
        working_hours_start: payload.workingHoursStart,
        working_hours_end: payload.workingHoursEnd,
        slot_interval_minutes: payload.slotIntervalMinutes,
        is_active: true,
      })
      .select("id, slug, name")
      .single();

    if (barbershopError || !barbershop) {
      return NextResponse.json(
        { error: "No pudimos crear la barberia." },
        { status: 500 },
      );
    }

    const { error: adminAccessError } = await supabaseAdmin
      .from("barbershop_admins")
      .insert({
        user_id: adminUser.id,
        barbershop_slug: slug,
        role: "admin",
      });

    if (adminAccessError) {
      return NextResponse.json(
        { error: "La barberia se creo, pero fallo la asignacion del admin." },
        { status: 500 },
      );
    }

    const { data: barber, error: barberError } = await supabaseAdmin
      .from("barbers")
      .insert({
        barbershop_slug: slug,
        name: payload.firstBarberName.trim(),
        display_name: payload.firstBarberName.trim(),
        role: "Barbero",
        whatsapp: null,
        is_active: true,
        is_owner: true,
        deleted_at: null,
      })
      .select("id")
      .single();

    if (barberError || !barber) {
      return NextResponse.json(
        { error: "La barberia se creo, pero fallo el primer barbero." },
        { status: 500 },
      );
    }

    // Inicializar weekly_schedules del primer barbero con un default razonable:
    // - Lunes a sábado working con los horarios de la barbería.
    // - Domingo no working (típico de barberías).
    // El admin puede modificar después desde BarberAvailabilityManager.
    const weeklySchedulesPayload = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      barbershop_slug: slug,
      barber_id: barber.id,
      day_of_week: dayOfWeek,
      start_time: payload.workingHoursStart,
      end_time: payload.workingHoursEnd,
      // 0 = domingo (no trabaja por default); 1-6 = lun-sáb (trabaja).
      is_working: dayOfWeek !== 0,
    }));

    const { error: schedulesError } = await supabaseAdmin
      .from("barber_weekly_schedules")
      .insert(weeklySchedulesPayload);

    if (schedulesError) {
      // No es bloqueante — el admin puede setear los schedules desde el panel.
      // Pero loggeamos para tracking.
      console.warn(
        `[create-barbershop] Falla al inicializar weekly_schedules para ${slug}:`,
        schedulesError,
      );
    }

    const { error: servicesError } = await supabaseAdmin
      .from("barber_services")
      .insert(
        payload.initialServices.map((service) => ({
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
      return NextResponse.json(
        { error: "La barberia se creo, pero fallaron los servicios iniciales." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      slug,
      name: barbershop.name,
      message: "Barberia creada correctamente.",
      adminEmail: adminUser.email ?? payload.adminEmail.trim().toLowerCase(),
      temporaryPassword,
    });
  } catch {
    return NextResponse.json(
      { error: "No pudimos crear la barberia." },
      { status: 500 },
    );
  }
}
