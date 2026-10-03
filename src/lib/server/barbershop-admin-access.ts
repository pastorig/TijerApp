import "server-only";

import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export type BarbershopAdminAccess =
  | {
      ok: true;
      userId: string;
      /** ¿Cuenta como dueño de ESTA barbería? (invitar/quitar admins, etc.) */
      isBarbershopOwner: boolean;
      /** Entró por ser owner de TijerApp, no por tener fila en la barbería. */
      isPlatformOwner: boolean;
    }
  | { ok: false; status: number; error: string };

/**
 * Decide si quien llama puede operar el panel de una barbería, a partir del
 * header `Authorization: Bearer <access_token>`.
 *
 * Por qué existe: este chequeo estaba copiado en las 15 rutas de
 * `/api/admin/*`, cada una con su versión (`assertAdmin`, `assertOwner`,
 * `getMyRow`, inline), y todas miraban SOLO `barbershop_admins`. El guard de la
 * pantalla (`AdminAuthGuard`), en cambio, también deja pasar al owner de la
 * plataforma. Resultado: el owner de TijerApp entraba al panel de cualquier
 * barbería, lo veía entero, y cada botón que tocaba le devolvía 403. Con el
 * chequeo en un solo lugar, la pantalla y la API dicen lo mismo.
 *
 * Quién pasa:
 *  - quien tiene fila en `barbershop_admins` para ese slug. `isBarbershopOwner`
 *    es su `is_owner`. En este caso ni se consulta `platform_owners`: no hace
 *    falta y es un round-trip menos.
 *  - quien NO tiene fila pero está en `platform_owners`: entra con el alcance
 *    del dueño de la barbería (`isBarbershopOwner: true`). No es una escalada:
 *    desde `/api/owner/*` ya puede resetear contraseñas de admins y borrar
 *    barberías enteras.
 *
 * Falla cerrado. Supabase no tira excepción cuando una consulta falla: devuelve
 * `{ data: null, error }`. Varias de las copias viejas no miraban `error`, así
 * que una caída de la base se leía como "no es admin" (403); acá se contesta
 * 503 y se registra. Lo que nunca puede pasar es lo contrario: que un error de
 * base termine en acceso.
 *
 * Cada ruta sigue validando sus propios parámetros (y con sus propios mensajes)
 * antes de llamar acá. El chequeo de slug vacío de esta función es una red: sin
 * él, un owner de plataforma pasaría con `""` y la ruta operaría sin barbería.
 *
 * NO usar en `/api/staff/*` ni en `/api/owner/*`: tienen sus propias reglas.
 */
export async function resolveBarbershopAdminAccess(
  authHeader: string | null,
  barbershopSlug: string,
): Promise<BarbershopAdminAccess> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "No autorizado." };
  }

  const supabase = getSupabaseAdminClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser(
    authHeader.slice("Bearer ".length),
  );
  if (userError || !userResult.user) {
    return { ok: false, status: 401, error: "Sesión inválida." };
  }
  const userId = userResult.user.id;

  if (typeof barbershopSlug !== "string" || !barbershopSlug.trim()) {
    return { ok: false, status: 400, error: "Falta la barbería." };
  }

  const { data: adminRow, error: adminError } = await supabase
    .from("barbershop_admins")
    .select("user_id, is_owner")
    .eq("user_id", userId)
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();

  if (adminError) {
    return accessCheckFailed(adminError, "barbershop_admins");
  }
  if (adminRow) {
    return {
      ok: true,
      userId,
      isBarbershopOwner: adminRow.is_owner === true,
      isPlatformOwner: false,
    };
  }

  const { data: ownerRow, error: ownerError } = await supabase
    .from("platform_owners")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (ownerError) {
    return accessCheckFailed(ownerError, "platform_owners");
  }
  if (ownerRow) {
    // El owner de plataforma no tiene fila que lo ate a una barbería, así que
    // el slug hay que validarlo acá: con uno mal escrito, una ruta que hace
    // upsert (`barbershop-settings`) crearía una barbería nueva sin querer.
    const { data: shop, error: shopError } = await supabase
      .from("barbershops")
      .select("slug")
      .eq("slug", barbershopSlug)
      .maybeSingle();
    if (shopError) {
      return accessCheckFailed(shopError, "barbershops");
    }
    if (!shop) {
      return { ok: false, status: 404, error: "Esa barbería no existe." };
    }
    return {
      ok: true,
      userId,
      isBarbershopOwner: true,
      isPlatformOwner: true,
    };
  }

  return { ok: false, status: 403, error: "No sos admin de esta barbería." };
}

/**
 * La base no contestó: no sabemos si esta persona tiene acceso, así que no se
 * lo damos. 503 y no 403 para que el panel no le diga "no sos admin" a un
 * dueño legítimo por un problema nuestro.
 */
function accessCheckFailed(
  error: unknown,
  table: "barbershop_admins" | "platform_owners" | "barbershops",
): BarbershopAdminAccess {
  Sentry.captureException(error, {
    tags: { helper: "barbershop-admin-access", table },
  });
  return {
    ok: false,
    status: 503,
    error: "No pudimos verificar tu acceso. Probá de nuevo.",
  };
}
