import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const USUARIOS_POR_PAGINA = 200;
/** Tope de páginas a recorrer: 50 × 200 = 10.000 cuentas. */
const MAX_PAGINAS_DE_USUARIOS = 50;

export type ResultadoBusquedaDeUsuario =
  | { ok: true; user: { id: string; email?: string } | null }
  | { ok: false };

/**
 * Busca una cuenta por email recorriendo TODAS las páginas de Auth.
 *
 * Antes se miraba solo la primera página: con más cuentas que eso, un email
 * existente "no aparecía", se intentaba crear de nuevo y fallaba. Y si la
 * consulta falla se devuelve `ok: false` en vez de "no existe": confundir un
 * error con una cuenta nueva es lo que no puede pasar acá.
 *
 * Vive acá, y no en cada ruta, porque el mismo recorte a la primera página
 * estaba copiado en tres lugares: Equipo, accesos de empleado y el registro.
 */
export async function buscarUsuarioPorEmail(
  email: string,
): Promise<ResultadoBusquedaDeUsuario> {
  const buscado = email.trim().toLowerCase();
  const supabase = getSupabaseAdminClient();
  for (let page = 1; page <= MAX_PAGINAS_DE_USUARIOS; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: USUARIOS_POR_PAGINA,
    });
    if (error) return { ok: false };
    const users = data?.users ?? [];
    const encontrado = users.find((u) => (u.email ?? "").toLowerCase() === buscado);
    if (encontrado) return { ok: true, user: encontrado };
    if (users.length < USUARIOS_POR_PAGINA) return { ok: true, user: null };
  }
  return { ok: false };
}
