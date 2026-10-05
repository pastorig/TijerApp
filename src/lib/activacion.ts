/**
 * Activación de barberías recién registradas (feature 034).
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 * El 4/10/2026, tres barberías registradas tenían cero turnos. Las tres habían
 * hecho lo mismo: registrarse, dejar la barbería configurada, entrar UNA vez y
 * no volver. No se trabaron configurando — lo que nunca pasó es que un cliente
 * reservara, porque nadie compartió el link. Y TijerApp no les volvió a hablar:
 * al registrarse no les llegaba ni un mail.
 *
 * ── Qué vive acá ────────────────────────────────────────────────────────────
 * Las decisiones (qué paso le toca a quién) y los textos para compartir, que
 * usan igual la pantalla "Compartir" y los mails. Sin base y sin mails, para
 * poder testearlo entero.
 */

export type PasoDeActivacion = "dia_1" | "dia_3" | "dia_7";

/** Todo lo que se anota en el registro de activación. */
export type TipoDeActivacion = "bienvenida" | PasoDeActivacion | "aviso_fundador";

/** Pasados estos días, "compartí tu link" ya es ruido. */
export const DIAS_DE_ACTIVACION = 14;

/**
 * Hora argentina. La misma ventana que el pedido de reseña, y ancha por el
 * mismo motivo: el cron no es puntual (ver `VENTANA_RESENA`).
 */
export const VENTANA_ACTIVACION = { desde: 10, hasta: 21 } as const;

export function enVentanaDeActivacion(horaArgentina: number): boolean {
  return (
    horaArgentina >= VENTANA_ACTIVACION.desde &&
    horaArgentina < VENTANA_ACTIVACION.hasta
  );
}

/**
 * Días calendario entre dos fechas "YYYY-MM-DD".
 *
 * Calendario y no "24 horas": quien se registra a las 23 h tiene que recibir
 * el mail del día 1 a la mañana siguiente, no pasado mañana.
 */
export function diasEntre(desde: string, hasta: string): number {
  const aUtc = (ymd: string) => {
    const [a, m, d] = ymd.split("-").map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((aUtc(hasta) - aUtc(desde)) / 86_400_000);
}

/**
 * Qué mail de la serie le toca hoy a una barbería, si le toca alguno.
 *
 * - **Solo si recibió la bienvenida.** Ese renglón lo escribe únicamente el
 *   registro, así que deja afuera, sin ninguna columna extra, a las barberías
 *   creadas a mano desde `/owner` y a todas las que ya existían el día que esto
 *   salió: nadie recibe "compartí tu link" tres meses tarde.
 * - **Se corta con el primer turno** y con la prueba vencida.
 * - **El paso más avanzado que corresponda, uno solo.** Si el cron no corrió
 *   dos días, al día 4 sale el del día 3 y el del día 1 se pierde: mandar los
 *   dos juntos es peor que perder uno.
 */
export function pasoQueToca(entrada: {
  /** Días calendario desde el registro (0 = se registró hoy). */
  dias: number;
  /** Turnos no eliminados de la barbería. */
  turnos: number;
  pruebaVigente: boolean;
  /** Tipos ya enviados a esta barbería. */
  enviados: ReadonlySet<string>;
}): PasoDeActivacion | null {
  const { dias, turnos, pruebaVigente, enviados } = entrada;
  if (!enviados.has("bienvenida")) return null;
  if (turnos > 0) return null;
  if (!pruebaVigente) return null;
  if (dias < 1 || dias > DIAS_DE_ACTIVACION) return null;

  const paso: PasoDeActivacion = dias >= 7 ? "dia_7" : dias >= 3 ? "dia_3" : "dia_1";
  if (enviados.has(paso)) return null;
  // Un paso anterior ya no se manda si se mandó uno posterior (no puede pasar
  // con el orden natural, pero un reenvío manual podría dejarlo así).
  const orden: PasoDeActivacion[] = ["dia_1", "dia_3", "dia_7"];
  const posteriores = orden.slice(orden.indexOf(paso) + 1);
  if (posteriores.some((p) => enviados.has(p))) return null;
  return paso;
}

/** ¿Hay que avisarle al fundador para que le escriba él? Una sola vez. */
export function avisarAlFundador(entrada: {
  dias: number;
  turnos: number;
  pruebaVigente: boolean;
  enviados: ReadonlySet<string>;
}): boolean {
  const { dias, turnos, pruebaVigente, enviados } = entrada;
  return (
    enviados.has("bienvenida") &&
    turnos === 0 &&
    pruebaVigente &&
    dias >= 3 &&
    dias <= DIAS_DE_ACTIVACION &&
    !enviados.has("aviso_fundador")
  );
}

// ── Textos para compartir ───────────────────────────────────────────────────
// Viven acá porque los usan la pantalla y los mails: si el de la pantalla dice
// una cosa y el del mail otra, el barbero copia el que no era.

/** La página de reservas: a donde tiene que llegar el que ya quiere turno. */
export function urlDeReservas(siteUrl: string, slug: string): string {
  return `${siteUrl.replace(/\/$/, "")}/${slug}/reservar`;
}

/** Para la bio de Instagram: corto, porque la bio tiene 150 caracteres. */
export function textoParaBio(urlReservas: string): string {
  return `📅 Sacá tu turno online 👇\n${urlReservas.replace(/^https?:\/\//, "")}`;
}

/** Para mandar a los clientes de siempre por WhatsApp. */
export function mensajeParaClientes(nombreBarberia: string, urlReservas: string): string {
  return `¡Hola! Desde ahora podés sacar tu turno en ${nombreBarberia} directo desde el celu, sin esperar a que te conteste: ${urlReservas}`;
}
