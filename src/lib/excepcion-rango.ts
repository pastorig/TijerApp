/**
 * De "del 14 al 18" a la lista de fechas que hay que escribir.
 *
 * El rango es cómo se carga una excepción, no cómo se guarda: en la base va una
 * fila por fecha. Guardar rangos obligaría a resolver solapamientos entre ellos
 * cada vez que se calcula un día, y de ahí salen los bugs difíciles de ver. Con
 * una fila por fecha, "¿qué rige el 17?" tiene una sola respuesta.
 */
import { ahoraEnArgentina } from "@/lib/hora-argentina";

/** Tope de días por carga. Una temporada entra; un error de tipeo no. */
export const MAX_DIAS_DE_RANGO = 90;

export type DiaLaborable = (diaDeLaSemana: number) => boolean;

export type EntradaRango = {
  /** YYYY-MM-DD */
  desde: string;
  /** YYYY-MM-DD */
  hasta: string;
  /**
   * Si el barbero trabaja ese día de la semana según su regla semanal.
   * 0 = domingo.
   */
  trabajaEseDia: DiaLaborable;
  /**
   * Abrir también los días que la regla semanal tiene cerrados. Apagado por
   * defecto: abrir un domingo sin querer es el error más caro — el cliente
   * reserva, el barbero no aparece, y para el cliente la que falló es la app.
   */
  incluirDiasLibres?: boolean;
  /** Para poder testear sin depender del reloj. */
  hoy?: Date;
};

export type ResultadoRango =
  | { ok: true; fechas: string[]; salteadas: string[] }
  | { ok: false; error: string };

function aYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Mediodía a propósito: a las 00:00 cualquier corrimiento cambia el día. */
function aFecha(ymd: string): Date {
  return new Date(`${ymd}T12:00:00`);
}

export function fechasDelRango(entrada: EntradaRango): ResultadoRango {
  const { desde, hasta, trabajaEseDia, incluirDiasLibres = false } = entrada;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    return { ok: false, error: "Revisá las fechas." };
  }
  if (hasta < desde) {
    return { ok: false, error: "La fecha de fin no puede ser anterior a la de inicio." };
  }

  // La fecha de hoy sale de la hora de LA BARBERÍA. Con `new Date()` pelado,
  // en el servidor esto es UTC —tres horas adelante— y cerca de la medianoche
  // rechazaría un rango que arranca hoy diciendo que ya pasó.
  const hoy = aYmd(entrada.hoy ?? ahoraEnArgentina());
  if (desde < hoy) {
    return { ok: false, error: "No se puede cambiar el horario de un día que ya pasó." };
  }

  const fechas: string[] = [];
  const salteadas: string[] = [];
  const fin = aFecha(hasta);

  for (let d = aFecha(desde); d <= fin; d.setDate(d.getDate() + 1)) {
    if (fechas.length + salteadas.length >= MAX_DIAS_DE_RANGO) {
      return {
        ok: false,
        error: `El rango no puede pasar de ${MAX_DIAS_DE_RANGO} días. Cargalo en partes.`,
      };
    }
    const ymd = aYmd(d);
    if (incluirDiasLibres || trabajaEseDia(d.getDay())) {
      fechas.push(ymd);
    } else {
      salteadas.push(ymd);
    }
  }

  if (fechas.length === 0) {
    return {
      ok: false,
      error: "En ese rango no hay ningún día que el barbero trabaje. Marcá la opción de incluir sus días libres si querés abrirlos.",
    };
  }

  return { ok: true, fechas, salteadas };
}
