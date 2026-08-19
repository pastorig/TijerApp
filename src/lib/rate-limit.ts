import { createHash } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * Rate limiting para los endpoints públicos que escriben.
 *
 * Se apoya en la tabla `rate_limit_hits` y no en un contador en memoria: en
 * Vercel cada request puede caer en una instancia distinta, así que un contador
 * de proceso contaría mal y daría una sensación falsa de protección.
 *
 * **No guarda la IP.** Guarda un hash con sal (`RATE_LIMIT_SALT`): alcanza para
 * contar repeticiones del mismo origen y no permite reconstruir la IP.
 *
 * **Falla abierto a propósito.** Si la consulta se cae, se deja pasar el
 * request. Un problema de infra no puede impedirle a una barbería real darse de
 * alta o a un cliente reservar; el costo de dejar pasar algún bot es menor.
 */

export type RateLimitBucket = "registro" | "contacto" | "waitlist" | "reserva";

type RateLimitResult = {
  allowed: boolean;
  /** Segundos que faltan para que se libere, para el header `Retry-After`. */
  retryAfterSeconds: number;
};

/** Límites por bucket: cuántos intentos y en cuánto tiempo. */
const LIMITS: Record<RateLimitBucket, { max: number; windowMinutes: number }> = {
  // Un barbero se da de alta una vez. Tres por hora deja lugar a reintentos por
  // error de tipeo sin habilitar el alta masiva.
  registro: { max: 3, windowMinutes: 60 },
  contacto: { max: 5, windowMinutes: 60 },
  waitlist: { max: 10, windowMinutes: 60 },
  // Reservar es la acción pública más frecuente y la que más duele si se
  // automatiza: llenar la agenda de una barbería con turnos basura. 8 por hora
  // por IP deja pasar a una familia reservando desde el mismo wifi.
  reserva: { max: 8, windowMinutes: 60 },
};

/**
 * Origen del request. En Vercel la IP real viene en `x-forwarded-for` (el
 * primero de la lista; los siguientes son proxies).
 */
export function getRequestIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "desconocida";

  const salt = process.env.RATE_LIMIT_SALT ?? "tijerapp-sin-sal";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export async function checkRateLimit(
  bucket: RateLimitBucket,
  identifier: string,
): Promise<RateLimitResult> {
  const { max, windowMinutes } = LIMITS[bucket];
  const windowStart = new Date(
    Date.now() - windowMinutes * 60 * 1000,
  ).toISOString();

  try {
    const supabase = getSupabaseAdminClient();

    const { count, error } = await supabase
      .from("rate_limit_hits")
      .select("*", { count: "exact", head: true })
      .eq("bucket", bucket)
      .eq("identifier", identifier)
      .gte("created_at", windowStart);

    if (error) {
      Sentry.captureException(error);
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if ((count ?? 0) >= max) {
      return { allowed: false, retryAfterSeconds: windowMinutes * 60 };
    }

    // Recién acá se registra el intento: si está bloqueado no se suma, para que
    // insistir no estire el castigo para siempre.
    await supabase.from("rate_limit_hits").insert({ bucket, identifier });

    // Limpieza oportunista: de vez en cuando se borran los registros viejos, así
    // la tabla no crece sin control y no hace falta un cron propio.
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("rate_limit_hits").delete().lt("created_at", cutoff);
    }

    return { allowed: true, retryAfterSeconds: 0 };
  } catch (error) {
    Sentry.captureException(error);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/** Mensaje único, para no repetirlo en cada endpoint. */
export const RATE_LIMIT_MESSAGE =
  "Demasiados intentos. Esperá un rato y probá de nuevo.";
