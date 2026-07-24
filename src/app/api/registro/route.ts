import { NextResponse } from "next/server";
import {
  PASSWORD_MIN_LENGTH,
  findAvailableSlug,
  provisionBarbershop,
} from "@/lib/provision-barbershop";

/**
 * Registro self-serve público: el barbero se da de alta solo y arranca su
 * trial, sin que el owner intervenga.
 *
 * A diferencia de /api/owner/create-barbershop (que exige ser platform owner),
 * este endpoint es abierto. Por eso:
 *  - no acepta slug del cliente (lo derivamos del nombre; si no, cualquiera
 *    podría pisar rutas reservadas o elegir slugs de mala fe),
 *  - no acepta tier ni fechas de trial (los fija el server),
 *  - tiene honeypot anti-bots.
 *
 * El service-role solo se usa server-side, dentro de provisionBarbershop.
 */

/** Días de trial. El sitio público promete 14 en todas sus páginas. */
const TRIAL_DAYS = 14;

/** Horario base con el que arranca la barbería; se edita luego en Config. */
const DEFAULT_WORKING_HOURS = {
  start: "09:00",
  end: "20:00",
  intervalMinutes: 30,
};

/**
 * Servicio inicial para que la barbería sea usable desde el minuto cero (sin
 * al menos un servicio no se puede reservar). El barbero ajusta precio y
 * duración en su panel — se lo indicamos al terminar el registro.
 */
const DEFAULT_SERVICES = [
  { name: "Corte", price: 10000, durationMinutes: 30 },
];

/** Slugs que no puede tomar una barbería porque son rutas de la plataforma. */
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "login",
  "logout",
  "owner",
  "precios",
  "producto",
  "registro",
  "recuperar",
  "nueva-password",
  "offline",
  "r",
  "rev",
  "w",
]);

type RegistroPayload = {
  barbershopName?: string;
  ownerName?: string;
  whatsapp?: string;
  email?: string;
  password?: string;
  /** Honeypot: los humanos no lo ven, los bots lo completan. */
  website?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(payload: RegistroPayload): string {
  if (!payload.barbershopName?.trim()) {
    return "Poné el nombre de tu barbería.";
  }
  if (!payload.ownerName?.trim()) {
    return "Poné tu nombre.";
  }
  if (!payload.whatsapp?.trim()) {
    return "Poné tu WhatsApp.";
  }
  if (!payload.email?.trim() || !EMAIL_REGEX.test(payload.email.trim())) {
    return "Revisá el email.";
  }
  if (!payload.password || payload.password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña tiene que tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RegistroPayload;

    // Honeypot: respondemos ok para no darle señal al bot, pero no creamos nada.
    if (payload.website && payload.website.trim() !== "") {
      return NextResponse.json({ ok: true, slug: null });
    }

    const validationError = validate(payload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const barbershopName = payload.barbershopName!.trim();
    const email = payload.email!.trim().toLowerCase();

    let slug = await findAvailableSlug(barbershopName);
    if (RESERVED_SLUGS.has(slug)) {
      slug = await findAvailableSlug(`${barbershopName}-barberia`);
    }

    const result = await provisionBarbershop({
      name: barbershopName,
      slug,
      whatsapp: payload.whatsapp!.trim(),
      adminEmail: email,
      adminPassword: payload.password,
      firstBarberName: payload.ownerName!.trim(),
      initialServices: DEFAULT_SERVICES,
      workingHoursStart: DEFAULT_WORKING_HOURS.start,
      workingHoursEnd: DEFAULT_WORKING_HOURS.end,
      slotIntervalMinutes: DEFAULT_WORKING_HOURS.intervalMinutes,
      trialDays: TRIAL_DAYS,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    // El email ya tenía cuenta: la barbería quedó creada y vinculada, pero la
    // contraseña que acaba de tipear NO es la suya. Se lo avisamos para que
    // entre con la que ya tenía (o la recupere) en vez de trabarse.
    return NextResponse.json({
      ok: true,
      slug: result.slug,
      name: result.name,
      existingAccount: result.reusedExistingUser,
      trialDays: TRIAL_DAYS,
    });
  } catch {
    return NextResponse.json(
      { error: "No pudimos crear tu cuenta. Probá de nuevo." },
      { status: 500 },
    );
  }
}
