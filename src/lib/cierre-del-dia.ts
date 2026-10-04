/**
 * Cierre automático del día y pedido de reseña (feature 033).
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 * Un turno solo cuenta —como visita, como sello, en reportes y en la caja—
 * cuando está confirmado, y confirmarlo era un toque del barbero, turno por
 * turno. El 4/10/2026 había 233 turnos ya pasados todavía "pendientes"; 216
 * eran de la barbería que más usa la app. La mitad de lo que trabajó no
 * figuraba como trabajado. Lo mismo con las reseñas: había que pedirlas a mano
 * y en toda la plataforma había cero.
 *
 * ── Qué vive acá ────────────────────────────────────────────────────────────
 * Solo las decisiones: qué turno se cierra y a quién se le pide reseña. Sin
 * base, sin reloj propio y sin mails, para poder testearlas enteras. La ruta
 * del cron lee, pregunta acá y escribe.
 */

/** Quién figura como autor del cambio de estado cuando lo cierra el sistema. */
export const AUTOR_CIERRE = "Cierre automático";

/** Un cliente frecuente no recibe un pedido después de cada corte. */
export const DIAS_ENTRE_PEDIDOS = 90;

/** Hora argentina. De 10 a 13: se lee, y el barbero ya pudo marcar un "no vino". */
export const VENTANA_RESENA = { desde: 10, hasta: 13 } as const;

export type TurnoParaCerrar = {
  status: string;
  /** "YYYY-MM-DD" */
  appointment_date: string;
  deposit_required?: boolean | null;
  deposit_status?: string | null;
};

/**
 * ¿Este turno se cierra solo?
 *
 * - Solo los pendientes: lo cancelado, lo eliminado y lo ya confirmado no se toca.
 * - Solo con la fecha TERMINADA (anterior a hoy en Argentina). El de hoy no,
 *   aunque ya haya pasado su hora: el barbero tiene el día para marcar "no vino".
 * - Con seña pedida y sin pagar, no: ese turno no está firme, y lo resuelve el
 *   vencimiento de la seña. Confirmarlo acá sería dar por atendido a alguien
 *   que nunca terminó de reservar.
 */
export function debeCerrarse(turno: TurnoParaCerrar, hoy: string): boolean {
  if (turno.status !== "pending") return false;
  if (!(turno.appointment_date < hoy)) return false;
  if (turno.deposit_required && turno.deposit_status !== "paid") return false;
  return true;
}

export function enVentanaDeResena(horaArgentina: number): boolean {
  return horaArgentina >= VENTANA_RESENA.desde && horaArgentina < VENTANA_RESENA.hasta;
}

/** El día anterior a un "YYYY-MM-DD", sin pasar por husos horarios. */
export function diaAnterior(ymd: string): string {
  const [a, m, d] = ymd.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  fecha.setUTCDate(fecha.getUTCDate() - 1);
  return fecha.toISOString().slice(0, 10);
}

export type TurnoParaResena = {
  id: string;
  barbershop_slug: string;
  status: string;
  customer_email: string | null;
  confirmation_token: string | null;
};

export type MotivoSinPedido =
  | "no confirmado"
  | "sin mail"
  | "sin link"
  | "ya tiene reseña"
  | "ya se le pidió por este turno"
  | "se le pidió hace poco"
  | "barbería en modo lectura"
  | "mismo cliente, otro turno de ayer";

/** Cómo se identifica a un cliente dentro de una barbería para no repetirle. */
export function claveCliente(slug: string, email: string): string {
  return `${slug}|${email.trim().toLowerCase()}`;
}

/**
 * De los turnos de ayer, a quién se le pide reseña y a quién no (y por qué).
 *
 * El "por qué" se devuelve entero porque el modo de prueba lo muestra: es la
 * forma de ver qué haría el cron contra la base real sin mandar un solo mail.
 */
export function elegirPedidosDeResena(entrada: {
  turnos: TurnoParaResena[];
  /** Ids de turnos que ya tienen reseña (se la pidieron a mano, por ejemplo). */
  conResena: Set<string>;
  /** Ids de turnos a los que ya se les mandó el pedido. */
  yaPedidos: Set<string>;
  /** `claveCliente` de quienes recibieron un pedido en los últimos 90 días. */
  pedidosRecientes: Set<string>;
  /** Slugs con el plan vencido. */
  barberiasEnLectura: Set<string>;
}): {
  pedir: TurnoParaResena[];
  descartados: Array<{ id: string; motivo: MotivoSinPedido }>;
} {
  const pedir: TurnoParaResena[] = [];
  const descartados: Array<{ id: string; motivo: MotivoSinPedido }> = [];
  const enEstaPasada = new Set<string>();

  for (const turno of entrada.turnos) {
    const descartar = (motivo: MotivoSinPedido) =>
      descartados.push({ id: turno.id, motivo });

    if (turno.status !== "confirmed") {
      descartar("no confirmado");
      continue;
    }
    const email = turno.customer_email?.trim();
    if (!email) {
      descartar("sin mail");
      continue;
    }
    if (!turno.confirmation_token) {
      descartar("sin link");
      continue;
    }
    if (entrada.barberiasEnLectura.has(turno.barbershop_slug)) {
      descartar("barbería en modo lectura");
      continue;
    }
    if (entrada.conResena.has(turno.id)) {
      descartar("ya tiene reseña");
      continue;
    }
    if (entrada.yaPedidos.has(turno.id)) {
      descartar("ya se le pidió por este turno");
      continue;
    }
    const clave = claveCliente(turno.barbershop_slug, email);
    if (entrada.pedidosRecientes.has(clave)) {
      descartar("se le pidió hace poco");
      continue;
    }
    // El padre que sacó turno para él y para el hijo: un mail, no dos.
    if (enEstaPasada.has(clave)) {
      descartar("mismo cliente, otro turno de ayer");
      continue;
    }
    enEstaPasada.add(clave);
    pedir.push(turno);
  }

  return { pedir, descartados };
}
