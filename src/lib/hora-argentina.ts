/**
 * La hora de la barbería, no la del servidor.
 *
 * ── Por qué hace falta ──────────────────────────────────────────────────────
 * El motor de disponibilidad decide "ya pasó" y "falta muy poco" con
 * `now.getHours()`, que devuelve la hora local de DONDE CORRE el código. En el
 * navegador del cliente eso es hora argentina y da bien; en Vercel las
 * funciones corren en UTC, tres horas adelante.
 *
 * El resultado era que el servidor rechazaba turnos que la pantalla mostraba
 * libres: con una anticipación mínima de 60 minutos, todo lo que caía en las
 * próximas CUATRO horas (las 3 del huso más la hora de anticipación) volvía
 * como "falta muy poco para ese turno". Una barbería lo reportó al intentar
 * reservar a las 17:20 teniendo una hora de anticipación configurada.
 *
 * Todos los clientes son argentinos, así que la zona es una constante. El día
 * que haya una barbería en otro huso, esto pasa a ser una columna de
 * `barbershops` y este módulo es el único lugar que hay que tocar.
 */

export const ZONA_BARBERIA = "America/Argentina/Buenos_Aires";

/**
 * Un `Date` cuyos getters locales (`getHours`, `getDate`, …) leen el reloj de
 * pared argentino, corra donde corra el proceso.
 *
 * Ojo: el instante que representa NO es el real — está corrido para que los
 * getters den la hora de allá. Sirve para comparar contra horarios de agenda,
 * que son hora de pared; no lo uses para guardar timestamps.
 */
export function ahoraEnArgentina(instante: Date = new Date()): Date {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_BARBERIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    // `hourCycle` explícito: con `hour12: false` algunos entornos devuelven
    // "24" para la medianoche y la fecha se corre un día.
    hourCycle: "h23",
  }).formatToParts(instante);

  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((p) => p.type === tipo)?.value ?? 0);

  return new Date(
    valor("year"),
    valor("month") - 1,
    valor("day"),
    valor("hour"),
    valor("minute"),
    valor("second"),
  );
}

/**
 * El "hoy" de la barbería como YYYY-MM-DD.
 *
 * Existe porque la pantalla de reserva se renderiza dos veces: en el servidor
 * (UTC) y en el navegador. Entre las 21:00 y las 00:00 de Argentina el servidor
 * ya está en el día siguiente, así que con la fecha local de cada uno el HTML
 * salía con "sábado" y el navegador lo pisaba con "viernes": error de
 * hidratación (#418) y el día preseleccionado saltando. Con esta función los
 * dos lados dan el mismo día, y además es el día correcto para alguien que
 * reserva desde otro huso.
 */
export function hoyEnArgentina(instante: Date = new Date()): string {
  const arg = ahoraEnArgentina(instante);
  const mes = String(arg.getMonth() + 1).padStart(2, "0");
  const dia = String(arg.getDate()).padStart(2, "0");
  return `${arg.getFullYear()}-${mes}-${dia}`;
}
