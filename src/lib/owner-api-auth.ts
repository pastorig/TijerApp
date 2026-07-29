import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export type OwnerAuthResult =
  | { ok: true; ownerId: string }
  | { ok: false; status: number; error: string };

/**
 * Valida que quien llama sea platform owner de TijerApp, a partir del header
 * `Authorization: Bearer <access_token>`.
 *
 * Este chequeo estaba copiado literal en cada ruta de `/api/owner/*`. Vive acá
 * para que haya un solo lugar donde se decide quién es owner — si mañana cambia
 * la regla, cambia una vez. Las rutas viejas todavía tienen su copia local:
 * migrarlas es una limpieza aparte, no se toca en el mismo cambio que agrega
 * una feature.
 *
 * Devuelve el `ownerId` para poder registrar quién hizo la acción.
 */
export async function assertPlatformOwner(
  authHeader: string | null,
): Promise<OwnerAuthResult> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "No autorizado." };
  }

  const supabase = getSupabaseAdminClient();
  const { data: userResult } = await supabase.auth.getUser(
    authHeader.slice("Bearer ".length),
  );
  if (!userResult.user) {
    return { ok: false, status: 401, error: "Sesión inválida." };
  }

  const { data: ownerRow } = await supabase
    .from("platform_owners")
    .select("user_id")
    .eq("user_id", userResult.user.id)
    .maybeSingle();
  if (!ownerRow) {
    return {
      ok: false,
      status: 403,
      error: "Solo el owner de TijerApp puede acceder.",
    };
  }

  return { ok: true, ownerId: userResult.user.id };
}
