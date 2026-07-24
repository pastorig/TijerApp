import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { demoBarbershops } from "@/data/demo-barbershops";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  PASSWORD_MIN_LENGTH,
  normalizeSlug,
  provisionBarbershop,
} from "@/lib/provision-barbershop";

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

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
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

    // El alta en sí la hace el motor compartido con /api/registro. Acá arriba
    // solo validamos el pedido y que quien llama sea owner de la plataforma.
    const result = await provisionBarbershop({
      name: payload.name,
      slug,
      description: payload.description,
      whatsapp: payload.whatsapp,
      instagram: payload.instagram,
      adminEmail: payload.adminEmail,
      adminPassword: payload.adminPassword,
      firstBarberName: payload.firstBarberName,
      initialServices: payload.initialServices,
      workingHoursStart: payload.workingHoursStart,
      workingHoursEnd: payload.workingHoursEnd,
      slotIntervalMinutes: payload.slotIntervalMinutes,
      // Sin trial: el owner asigna el plan a mano desde /owner/planes.
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({
      slug: result.slug,
      name: result.name,
      message: "Barberia creada correctamente.",
      adminEmail: result.adminEmail,
      temporaryPassword: result.temporaryPassword,
    });
  } catch {
    return NextResponse.json(
      { error: "No pudimos crear la barberia." },
      { status: 500 },
    );
  }
}
