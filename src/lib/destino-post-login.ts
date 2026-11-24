/**
 * A dónde va alguien después de entrar por `/login`, con mail y clave o con
 * Google (feature 040). Antes vivía adentro de `GlobalLoginForm`; se sacó para
 * que las dos formas de entrar usen exactamente la misma regla.
 *
 * `decidirDestino` es puro (testeable); `resolverDestinoTrasIngresar` consulta
 * los accesos con la sesión recién abierta.
 */
import { resolvePostLoginDestination } from "@/lib/staff-routing";

export type DecisionDeDestino =
  | { kind: "ir"; path: string }
  | { kind: "elegir" }
  | { kind: "sin-barberia" };

export function barberiaPedidaEnNext(nextPath?: string): string {
  if (!nextPath) return "";
  const match = nextPath.match(/^\/([^/]+)\/admin(?:\/.*)?$/);
  return match?.[1] ?? "";
}

export function decidirDestino({
  nextPath,
  barberiasQueAdministra,
  barberiasDondeTrabaja,
}: {
  nextPath?: string;
  barberiasQueAdministra: string[];
  barberiasDondeTrabaja: string[];
}): DecisionDeDestino {
  // Venía de una URL puntual del panel y tiene acceso: se respeta ese destino
  // (ej. /mi-barberia/admin/turnero, no el inicio del panel).
  const pedida = barberiaPedidaEnNext(nextPath);
  if (nextPath && pedida && barberiasQueAdministra.includes(pedida)) {
    return { kind: "ir", path: nextPath };
  }

  if (barberiasQueAdministra.length === 1) {
    return { kind: "ir", path: `/${barberiasQueAdministra[0]}/admin` };
  }

  if (barberiasQueAdministra.length > 1) {
    return { kind: "elegir" };
  }

  // No administra ninguna: puede ser empleado.
  if (barberiasDondeTrabaja.length > 0) {
    const destino = resolvePostLoginDestination({
      barbershopSlug: barberiasDondeTrabaja[0],
      isAdmin: false,
      isStaff: true,
    });
    if (destino.kind === "staff") return { kind: "ir", path: destino.path };
  }

  return { kind: "sin-barberia" };
}

/** Barbería que administra el usuario, ya con su nombre real para mostrar. */
export type OpcionDeBarberia = {
  slug: string;
  name: string;
  role: string;
};

export type ResultadoDeIngreso =
  | { kind: "ir"; path: string }
  | { kind: "elegir"; opciones: OpcionDeBarberia[] }
  | { kind: "sin-barberia" }
  | { kind: "error"; mensaje: string };

export async function resolverDestinoTrasIngresar(
  nextPath?: string,
): Promise<ResultadoDeIngreso> {
  // Imports dinámicos: este módulo lo importan los tests (sin cliente de
  // Supabase) y las pantallas de ingreso.
  const { getCurrentUserAdminBarbershops } = await import("@/lib/barbershop-access");
  const { data: admins, error } = await getCurrentUserAdminBarbershops();
  if (error) {
    return { kind: "error", mensaje: "No pudimos cargar tus barberías." };
  }

  const slugsAdmin = admins.map((a) => a.barbershop_slug);

  // Los accesos de empleado se consultan solo si hace falta: el caso frecuente
  // es el dueño, y así su ingreso no suma una consulta.
  let slugsStaff: string[] = [];
  if (slugsAdmin.length === 0) {
    const { getCurrentUserStaffBarbershops } = await import("@/lib/staff-access-client");
    const { data: staff } = await getCurrentUserStaffBarbershops();
    slugsStaff = staff.map((s) => s.barbershopSlug);
  }

  const decision = decidirDestino({
    nextPath,
    barberiasQueAdministra: slugsAdmin,
    barberiasDondeTrabaja: slugsStaff,
  });

  if (decision.kind !== "elegir") return decision;

  // Administra varias: se buscan los nombres reales (antes salían de los datos
  // demo y a un cliente real le mostraba "leocuts" en vez de "Leo Cuts").
  const { getSupabaseClient } = await import("@/lib/supabase");
  const { data: shops } = await getSupabaseClient()
    .from("barbershops")
    .select("slug, name")
    .in("slug", slugsAdmin);
  const nombre = new Map((shops ?? []).map((s) => [s.slug, s.name]));

  return {
    kind: "elegir",
    opciones: admins.map((a) => ({
      slug: a.barbershop_slug,
      name: nombre.get(a.barbershop_slug) ?? a.barbershop_slug,
      role: a.role,
    })),
  };
}
