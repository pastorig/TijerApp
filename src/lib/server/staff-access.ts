import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertTierIncludesFeature } from "@/lib/api-plan-guard";
import {
  normalizarPermisos,
  type StaffPermissions,
} from "@/lib/staff-permissions";

/**
 * Quién es el empleado que está haciendo este request.
 *
 * **Server-only y única fuente del `barber_id`.** Si el barbero al que
 * pertenece la agenda viniera del cliente, el empleado podría pedir la agenda
 * de un compañero cambiando un id en el request. Acá sale de su fila de acceso.
 *
 * ── Por qué el acceso NO vive en `barbershop_admins` ────────────────────────
 * Toda la protección de la base cuelga de `current_user_has_barbershop_access()`,
 * que consulta esa tabla. Un empleado que no está ahí no pasa el chequeo y no
 * puede leer nada por el cliente de Supabase. Su información llega SOLO por
 * estos endpoints, ya filtrada. El default es "no ve nada".
 *
 * No confundir con dos columnas `role` que ya existen y no tienen que ver:
 * `barbershop_admins.role` dice "admin" en todas y hoy no decide nada, y
 * `barbers.role` es la etiqueta que se muestra en la landing pública
 * ("Barbero"), no un permiso.
 */

export type StaffAccess = {
  userId: string;
  barbershopSlug: string;
  /** El barbero cuya agenda maneja. uuid. */
  barberId: string;
  barberName: string;
  /** Porcentaje de comisión. `null` = sin configurar, distinto de 0%. */
  commissionPercent: number | null;
  /**
   * Qué puede ver y tocar (feature 019). Viene de la misma fila que el
   * barbero: resolver el acceso y resolver los permisos son la misma consulta,
   * así no existe el estado intermedio de "sé quién es pero no qué puede".
   */
  permisos: StaffPermissions;
};

export type StaffAccessResult =
  | { ok: true; access: StaffAccess }
  | { ok: false; status: number; error: string };

/**
 * Resuelve el acceso a partir del token del request.
 *
 * Se chequea en CADA request, no solo al entrar: revocarle el acceso a alguien
 * tiene que cortarle el paso en el momento, no cuando se le venza la sesión.
 *
 * ── Y también se chequea el plan (feature 020) ──────────────────────────────
 * Las cuentas de empleados son de Esencial para arriba. Antes eso se validaba
 * SOLO al invitar, así que una barbería que bajaba a Solo se quedaba con sus
 * empleados entrando a una función que ya no pagaba. Va acá y no en cada
 * endpoint porque los cuatro pasan por esta función: un lugar, sin olvidos.
 *
 * Mira el TIER y no el vencimiento, a propósito — ver
 * `assertTierIncludesFeature`. Y no revoca nada: si el dueño vuelve a
 * Esencial, el empleado entra como antes sin que haya que re-invitarlo.
 */
export async function resolveStaffAccess(
  authHeader: string | null,
  barbershopSlug: string,
): Promise<StaffAccessResult> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "No autorizado." };
  }
  if (!barbershopSlug) {
    return { ok: false, status: 400, error: "Falta la barbería." };
  }

  const supabase = getSupabaseAdminClient();

  const { data: userResult, error: userError } = await supabase.auth.getUser(
    authHeader.slice("Bearer ".length),
  );
  if (userError || !userResult.user) {
    return { ok: false, status: 401, error: "Sesión inválida." };
  }

  const { data, error } = await supabase
    .from("barber_staff_access")
    .select(
      "barber_id, can_see_earnings, can_confirm, can_cancel, can_contact_client, can_create_appointment, barbers(id, name, commission_percent, is_active, deleted_at)",
    )
    .eq("user_id", userResult.user.id)
    .eq("barbershop_slug", barbershopSlug)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: "No pudimos validar el acceso." };
  }
  if (!data) {
    // Puede ser que nunca tuvo acceso o que se lo revocaron. Al empleado se le
    // dice lo mismo en los dos casos: no es asunto suyo cuál de las dos.
    return { ok: false, status: 403, error: "No tenés acceso a esta barbería." };
  }

  const row = data as unknown as Record<string, unknown> & {
    barber_id: string;
    barbers: {
      id: string;
      name: string;
      commission_percent: number | null;
      is_active: boolean | null;
      deleted_at: string | null;
    } | null;
  };

  // Sin barbero no hay agenda, y un barbero pausado o borrado no debería
  // seguir entrando (feature 021). Pausar a alguien es la acción que el dueño
  // hace pensando "que no trabaje más por ahora": que igual pudiera entrar era
  // una sorpresa fea esperando a pasar.
  //
  // Es un CORTE, no una baja: el acceso no se toca. Cuando el dueño lo
  // reactiva, entra como antes sin que haya que re-invitarlo.
  if (
    !row.barbers ||
    row.barbers.deleted_at !== null ||
    row.barbers.is_active === false
  ) {
    return { ok: false, status: 403, error: "Tu acceso ya no está activo." };
  }

  const tier = await assertTierIncludesFeature(
    barbershopSlug,
    "cuentas_empleados",
  );
  if (!tier.ok) {
    return {
      ok: false,
      status: 403,
      error:
        "La barbería ya no tiene un plan que incluya cuentas para empleados. Hablalo con el dueño.",
    };
  }

  return {
    ok: true,
    access: {
      userId: userResult.user.id,
      barbershopSlug,
      barberId: row.barber_id,
      barberName: row.barbers.name,
      commissionPercent:
        row.barbers.commission_percent === null
          ? null
          : Number(row.barbers.commission_percent),
      permisos: normalizarPermisos(row),
    },
  };
}

/**
 * El id del barbero, como TEXTO, para cruzar contra `appointments`.
 *
 * `barbers.id` es uuid y `appointments.barber_id` es text. Comparar uno contra
 * otro sin convertir no da error: devuelve cero turnos, que es peor. Esta
 * función existe para que ese detalle esté en un solo lugar y con nombre.
 */
export function barberIdForAppointments(access: StaffAccess): string {
  return String(access.barberId);
}
