import { createHash } from "node:crypto";

/**
 * Cómo se identifica a quien hace un pedido, para contarlo en el rate limit.
 *
 * Vive separado de `rate-limit.ts` porque eso importa el cliente de Supabase
 * (y con él `server-only`), que no se puede cargar fuera de Next: acá la
 * lógica es pura y por lo tanto testeable.
 *
 * **Nunca se guarda el dato original** — ni la IP ni el teléfono. Se guarda un
 * hash con sal (`RATE_LIMIT_SALT`): alcanza para contar repeticiones del mismo
 * origen y no permite reconstruir el dato.
 */

/** Hash con sal de cualquier dato. */
function hashed(value: string): string {
  const salt = process.env.RATE_LIMIT_SALT ?? "tijerapp-sin-sal";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 32);
}

/**
 * Identificador derivado de un dato del propio pedido (un teléfono, por
 * ejemplo). El `scope` separa contadores del mismo dato en usos distintos.
 */
export function getValueIdentifier(value: string, scope?: string): string {
  return hashed(scope ? `${scope}:${value}` : value);
}

/**
 * Origen del request. En Vercel la IP real viene en `x-forwarded-for` (el
 * primero de la lista; los siguientes son proxies).
 *
 * El `scope` separa el contador por recurso: con `scope` = slug de la
 * barbería, una IP compartida (CGNAT) que reserva en dos barberías distintas
 * no se bloquea a sí misma, y el tope sigue valiendo para cada barbería.
 */
export function getRequestIdentifier(request: Request, scope?: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "desconocida";

  return getValueIdentifier(ip, scope);
}
