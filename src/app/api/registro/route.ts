import { NextResponse } from "next/server";
import {
  RATE_LIMIT_MESSAGE,
  checkRateLimit,
  getRequestIdentifier,
} from "@/lib/rate-limit";
import { PASSWORD_MIN_LENGTH } from "@/lib/provision-barbershop";
import { darDeAltaBarberia } from "@/lib/server/alta-self-serve";

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

// Lo que comparte con el alta por Google (slugs reservados, provisión, avisos)
// vive en `@/lib/server/alta-self-serve`.

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

    const result = await darDeAltaBarberia({
      barbershopName: payload.barbershopName!,
      ownerName: payload.ownerName!,
      whatsapp: payload.whatsapp!,
      email: payload.email!,
      password: payload.password,
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
      trialDays: result.trialDays,
    });
  } catch {
    return NextResponse.json(
      { error: "No pudimos crear tu cuenta. Probá de nuevo." },
      { status: 500 },
    );
  }
}
