/**
 * Cuántos turnos tiene el empleado cada día, para los puntitos del calendario.
 *
 * Está separado del endpoint por una sola razón: es la clase de cuenta que se
 * rompe callada. Si un cancelado se colara, el barbero vería un punto rojo en
 * un día que en realidad tiene libre, y eso no se nota mirando la pantalla —
 * hay que contar a mano. Acá se puede testear sin base de datos.
 *
 * Los días sin turnos NO aparecen en el resultado: el calendario ya trata la
 * ausencia como cero, y mandar 42 ceros por mes es peso al pedo.
 */

export type FilaDeConteo = {
  appointment_date: string;
  status: string;
};

/** Los estados que cuentan como "tenés laburo ese día". */
const CUENTAN = new Set(["pending", "confirmed"]);

export function contarPorDia(
  filas: FilaDeConteo[],
): Record<string, number> {
  const conteo: Record<string, number> = {};
  for (const fila of filas) {
    if (!CUENTAN.has(fila.status)) continue;
    if (!fila.appointment_date) continue;
    conteo[fila.appointment_date] = (conteo[fila.appointment_date] ?? 0) + 1;
  }
  return conteo;
}
