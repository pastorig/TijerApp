/**
 * Cuándo avisarle al barbero que se le vence el plan.
 *
 * Lógica pura, sin base ni red, para que se pueda testear sola: el cron
 * (`/api/cron/reminders`) le pregunta a esto por cada barbería y después se
 * ocupa de mandar.
 *
 * Dos avisos por vencimiento:
 *  - `vence_3d`  — al entrar en la ventana de 3 días o menos.
 *  - `vence_hoy` — el día que se corta.
 *
 * **La ventana es "3 días o menos", no "exactamente 3".** Con la regla exacta,
 * una barbería que ya está a 2 días cuando esto se activa no recibiría nunca
 * el primer aviso. Que no se repita todos los días no lo resuelve esta
 * función: lo resuelve el índice único de `plan_notice_log`.
 */

export const ARG_TZ = "America/Argentina/Buenos_Aires";

export const PLAN_NOTICE_KINDS = ["vence_3d", "vence_hoy"] as const;
export type PlanNoticeKind = (typeof PLAN_NOTICE_KINDS)[number];

/** Días de anticipación con los que se manda el primer aviso. */
export const NOTICE_WINDOW_DAYS = 3;

/** Fecha en formato YYYY-MM-DD según el calendario argentino. */
export function toArgYmd(date: Date): string {
  // `en-CA` da directamente YYYY-MM-DD, y el timeZone explícito evita depender
  // del reloj del server (las functions corren en UTC).
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ARG_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Días de diferencia entre dos fechas YYYY-MM-DD, en días de calendario.
 *
 * Se comparan a mediodía UTC y no en milisegundos crudos: dos momentos del
 * mismo día tienen que dar 0 aunque uno sea a las 00:10 y el otro a las 23:50,
 * y el cambio de hora no puede correr el resultado un día.
 */
function daysBetweenYmd(fromYmd: string, toYmd: string): number | null {
  const parse = (ymd: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
    if (!match) return null;
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  };
  const from = parse(fromYmd);
  const to = parse(toYmd);
  if (from === null || to === null) return null;
  return Math.round((to - from) / 86_400_000);
}

/**
 * Qué aviso corresponde hoy, si es que corresponde alguno.
 *
 * @param periodEndsAt  Vencimiento del período pago (ISO). `null` = nunca pagó
 *                      → no es asunto de esta función: ese caso lo cubre el
 *                      cartel de fin de prueba, que ya existe.
 * @param todayYmd      Hoy en calendario argentino (YYYY-MM-DD).
 */
export function planNoticeDue({
  periodEndsAt,
  todayYmd,
}: {
  periodEndsAt: string | null | undefined;
  todayYmd: string;
}): PlanNoticeKind | null {
  if (!periodEndsAt) return null;

  const ends = new Date(periodEndsAt);
  if (Number.isNaN(ends.getTime())) return null;

  const diff = daysBetweenYmd(todayYmd, toArgYmd(ends));
  if (diff === null) return null;

  // Ya venció: de acá en más manda el modo lectura, no un aviso de cobro.
  if (diff < 0) return null;
  if (diff === 0) return "vence_hoy";
  if (diff <= NOTICE_WINDOW_DAYS) return "vence_3d";
  return null;
}

/**
 * Texto del push.
 *
 * `priceLabel` tiene que ser lo que la barbería **paga** (ver `billedMonthlyArs`
 * en plans.ts), no el precio del tier que tiene asignado: a un fundador con
 * Esencial de regalo decirle que renueve por $33.000 cuando transfiere $22.000
 * es mandarle mal el número al bolsillo.
 */
export function planNoticeMessage(
  kind: PlanNoticeKind,
  daysLeft: number,
  priceLabel?: string,
): { title: string; body: string } {
  const monto = priceLabel ? ` (${priceLabel}/mes)` : "";
  if (kind === "vence_hoy") {
    return {
      title: "Tu plan vence hoy",
      body: `Renovalo${monto} para que tus clientes puedan seguir reservando online.`,
    };
  }
  const dias = daysLeft === 1 ? "1 día" : `${daysLeft} días`;
  return {
    title: `Tu plan vence en ${dias}`,
    body: `Entrá al panel y renovalo${monto} así no se te corta la reserva online.`,
  };
}

/** Días que faltan para el vencimiento, en días de calendario argentino. */
export function daysUntil(periodEndsAt: string, todayYmd: string): number {
  return daysBetweenYmd(todayYmd, toArgYmd(new Date(periodEndsAt))) ?? 0;
}
