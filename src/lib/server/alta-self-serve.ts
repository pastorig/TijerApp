import { after } from "next/server";
import {
  DEFAULT_SERVICES,
  DEFAULT_WORKING_HOURS,
  TRIAL_DAYS,
} from "@/lib/onboarding-defaults";
import { findAvailableSlug, provisionBarbershop } from "@/lib/provision-barbershop";
import { avisarAltaDeBarberia } from "@/lib/server/signup-notice";
import { mandarBienvenida } from "@/lib/server/activation-emails";

/**
 * Alta self-serve de una barbería: lo que comparten el registro con mail y
 * clave (`/api/registro`) y el de Google (`/api/registro/google`, feature 040).
 *
 * No valida quién llama: cada ruta hace lo suyo (honeypot y validación del
 * formulario en una, token de Google en la otra) antes de llegar acá.
 */

/** Slugs que no puede tomar una barbería porque son rutas de la plataforma. */
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "login",
  "logout",
  "owner",
  "precios",
  "privacidad",
  "producto",
  "registro",
  "recuperar",
  "nueva-password",
  "offline",
  "r",
  "rev",
  "terminos",
  "w",
]);

export type DatosDelAlta = {
  barbershopName: string;
  ownerName: string;
  whatsapp: string;
  email: string;
  /** Sin clave cuando entra con Google. */
  password?: string;
};

export type ResultadoDelAlta =
  | { ok: true; slug: string; name: string; reusedExistingUser: boolean; trialDays: number }
  | { ok: false; error: string; status: number };

export async function darDeAltaBarberia(datos: DatosDelAlta): Promise<ResultadoDelAlta> {
  const barbershopName = datos.barbershopName.trim();
  const ownerName = datos.ownerName.trim();
  const whatsapp = datos.whatsapp.trim();
  const email = datos.email.trim().toLowerCase();

  let slug = await findAvailableSlug(barbershopName);
  if (RESERVED_SLUGS.has(slug)) {
    slug = await findAvailableSlug(`${barbershopName}-barberia`);
  }

  const result = await provisionBarbershop({
    name: barbershopName,
    slug,
    whatsapp,
    adminEmail: email,
    adminPassword: datos.password,
    firstBarberName: ownerName,
    initialServices: DEFAULT_SERVICES,
    workingHoursStart: DEFAULT_WORKING_HOURS.start,
    workingHoursEnd: DEFAULT_WORKING_HOURS.end,
    slotIntervalMinutes: DEFAULT_WORKING_HOURS.intervalMinutes,
    trialDays: TRIAL_DAYS,
  });

  if (!result.ok) return result;

  // El aviso al dueño de TijerApp va DESPUÉS de la respuesta: el barbero no
  // puede quedarse mirando una pantalla de carga por un mail que ni siquiera
  // es para él. Va con `after` y no con un `void` suelto porque la promesa
  // huérfana la puede cortar la plataforma al terminar la request.
  after(() =>
    avisarAltaDeBarberia({
      slug: result.slug,
      nombre: result.name,
      dueño: ownerName,
      email,
      whatsapp,
      cuentaYaExistía: result.reusedExistingUser,
      diasDeTrial: TRIAL_DAYS,
    }),
  );

  // La bienvenida al barbero (feature 034): le deja su link y el paso que
  // falta (compartirlo), y habilita la serie de los días 1, 3 y 7.
  after(() =>
    mandarBienvenida({
      slug: result.slug,
      nombre: result.name,
      email,
      dueño: ownerName,
    }),
  );

  return {
    ok: true,
    slug: result.slug,
    name: result.name,
    reusedExistingUser: result.reusedExistingUser,
    trialDays: TRIAL_DAYS,
  };
}
