import { NextResponse, after } from "next/server";
import {
  DEFAULT_SERVICES,
  DEFAULT_WORKING_HOURS,
  TRIAL_DAYS,
} from "@/lib/onboarding-defaults";
import {
  RATE_LIMIT_MESSAGE,
  checkRateLimit,
  getRequestIdentifier,
} from "@/lib/rate-limit";
import {
  PASSWORD_MIN_LENGTH,
  findAvailableSlug,
  provisionBarbershop,
} from "@/lib/provision-barbershop";
import { avisarAltaDeBarberia } from "@/lib/server/signup-notice";

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

// TRIAL_DAYS, DEFAULT_WORKING_HOURS y DEFAULT_SERVICES viven en
// `@/lib/onboarding-defaults`: la guía de primeros pasos del panel necesita los
// mismos valores para saber si el barbero ya los revisó, y duplicarlos haría que
// se desincronicen sin que nadie se dé cuenta.

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
    // El honeypot solo para a los bots torpes. Sin esto, uno que no lo complete
    // puede crear barberías en masa (cada alta provisiona ~30 filas + un usuario
    // en Auth).
    const limit = await checkRateLimit("registro", getRequestIdentifier(request));
    if (!limit.allowed) {
      return NextResponse.json(
        { error: RATE_LIMIT_MESSAGE },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }

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

    // El aviso al dueño de TijerApp va DESPUÉS de la respuesta: el barbero no
    // puede quedarse mirando una pantalla de carga por un mail que ni siquiera
    // es para él. Va con `after` y no con un `void` suelto porque la promesa
    // huérfana la puede cortar la plataforma al terminar la request — el aviso
    // llegaría o no según cuánto tardara Resend.
    after(() =>
      avisarAltaDeBarberia({
        slug: result.slug,
        nombre: result.name,
        dueño: payload.ownerName!.trim(),
        email,
        whatsapp: payload.whatsapp!.trim(),
        cuentaYaExistía: result.reusedExistingUser,
        diasDeTrial: TRIAL_DAYS,
      }),
    );

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
