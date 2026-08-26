import { getUserFromLocalSession } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabase";
import {
  normalizarPermisos,
  type StaffPermissions,
} from "@/lib/staff-permissions";

/**
 * "¿Soy empleado, y de qué barbería?" — desde el navegador.
 *
 * Lo único que el empleado puede leer directo de la base es **su propia fila**
 * de acceso: la política de RLS de `barber_staff_access` filtra por
 * `user_id = auth.uid()`. Alcanza para que el login sepa a dónde mandarlo y no
 * expone absolutamente nada más.
 *
 * Sus turnos y su comisión NO se piden desde acá: van por `/api/staff/*`, que
 * resuelve el barbero en el servidor. Este archivo responde una sola pregunta:
 * quién es.
 */

export type StaffBarbershop = {
  barbershopSlug: string;
  barberId: string;
  /**
   * Qué le habilitó el dueño (feature 019). Viene de la misma fila que ya se
   * leía para saber quién es, así que saberlo no cuesta un pedido más.
   *
   * Sirve para **dibujar**: qué pestañas y qué botones mostrar. Lo que de
   * verdad frena una acción es el chequeo del servidor, no esto.
   */
  permisos: StaffPermissions;
};

export async function getCurrentUserStaffBarbershops(): Promise<{
  data: StaffBarbershop[];
  error: unknown;
}> {
  // Sesión local, sin pegarle a la red: con `getUser()` cualquier hipo de
  // conexión se lee como "no logueado" y patea al login con la sesión intacta.
  // Misma razón que en barbershop-access.ts.
  const { user, error: userError } = await getUserFromLocalSession();

  if (userError || !user) {
    return { data: [], error: userError };
  }

  const { data, error } = await getSupabaseClient()
    .from("barber_staff_access")
    .select(
      "barbershop_slug, barber_id, can_see_earnings, can_confirm, can_cancel, can_contact_client",
    )
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("barbershop_slug", { ascending: true });

  return {
    data: (data ?? []).map((row) => ({
      barbershopSlug: row.barbershop_slug,
      barberId: row.barber_id,
      permisos: normalizarPermisos(row as unknown as Record<string, unknown>),
    })),
    error,
  };
}

/** ¿Es empleado de esta barbería en particular? */
export async function isStaffOfBarbershop(
  barbershopSlug: string,
): Promise<boolean> {
  const { data } = await getCurrentUserStaffBarbershops();
  return data.some((acceso) => acceso.barbershopSlug === barbershopSlug);
}
