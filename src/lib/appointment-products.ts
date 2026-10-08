import { getSupabaseClient } from "@/lib/supabase";
import type { ProductoDeTurno } from "@/lib/productos";

/**
 * Los productos que los clientes sumaron a sus turnos, para el turnero del
 * dueño (feature 035). Agrupados por turno.
 *
 * Va en una consulta APARTE de la de los turnos, a propósito. Si se pidieran
 * anidados en el mismo `select` y la tabla no existiera (migración sin
 * correr), fallaría la consulta entera y el dueño se quedaría sin turnero.
 * Así, si esto falla, los turnos se ven igual y simplemente sin productos.
 *
 * Lee con la sesión del dueño: la tabla tiene una política de solo lectura
 * para los administradores de la barbería.
 */
export async function listAppointmentProductsByBarbershop(
  barbershopSlug: string,
): Promise<Record<string, ProductoDeTurno[]>> {
  try {
    const { data, error } = await getSupabaseClient()
      .from("appointment_products" as never)
      .select("appointment_id, product_name, unit_price, quantity")
      .eq("barbershop_slug", barbershopSlug)
      // Los más nuevos primero y con tope: el turnero muestra sobre todo lo
      // reciente y lo que viene.
      .order("created_at", { ascending: false })
      .limit(3000);
    if (error) return {};
    const porTurno: Record<string, ProductoDeTurno[]> = {};
    for (const fila of (data ?? []) as unknown as Array<
      ProductoDeTurno & { appointment_id: string }
    >) {
      (porTurno[fila.appointment_id] ??= []).push({
        product_name: fila.product_name,
        unit_price: fila.unit_price,
        quantity: fila.quantity,
      });
    }
    return porTurno;
  } catch {
    return {};
  }
}
