import { createHash } from "node:crypto";

/**
 * Exportación de datos comerciales hacia crmsaas (contrato v1).
 *
 * TijerApp es la **fuente de la verdad** de sus barberías, sus pruebas y sus
 * cobros. El CRM lee por acá y nunca al revés: nada de lo que pase en el CRM
 * modifica una barbería.
 *
 * Cuatro reglas que este módulo hace cumplir, y que son la razón de que exista
 * en vez de una consulta suelta:
 *
 *  1. **Sólo datos comerciales.** Barberías, planes, fechas y los cobros que la
 *     plataforma le hizo a cada una. Ni un turno, ni un cliente de la barbería,
 *     ni una reseña, ni una nota interna.
 *  2. **`payment_events` NO se exporta.** Esa tabla son las señas que los
 *     clientes de cada barbería pagan por Mercado Pago: plata que va a la
 *     barbería, no a TijerApp. Los cobros de la plataforma son
 *     `barbershop_payments`, que es otra cosa y es la que sale de acá.
 *  3. **La suscripción se exporta sin importe.** TijerApp guarda el plan, no lo
 *     pactado con cada barbería, y los precios de lista NO sirven como
 *     sustituto: hay al menos una barbería con precio congelado de fundador.
 *     Poner el precio de lista ahí le inventaría un contrato. Lo que sí es
 *     verdad son los pagos registrados, y esos van completos.
 *  4. **Una barbería sin fila de suscripción no genera prueba ni contrato.** La
 *     app le asigna en memoria un trial Pro de 14 días para no dejarla afuera,
 *     pero eso no se persiste: exportarlo sería exportar un default, no un dato.
 */

/** Lo que el contrato v1 admite como recurso. */
export const CRM_RESOURCES = ["accounts", "trials", "subscriptions", "payments", "usage"] as const;
export type CrmResource = (typeof CRM_RESOURCES)[number];

export const MAX_PAGE_SIZE = 100;

export function isCrmResource(value: unknown): value is CrmResource {
  return typeof value === "string" && (CRM_RESOURCES as readonly string[]).includes(value);
}

type Capability = { status: "supported" | "partial" | "unavailable"; reason: string | null };

/**
 * Qué puede y qué no puede dar TijerApp. Se manda en **todas** las páginas: el
 * CRM lo usa para no confundir "sin datos" con "sin capacidad".
 */
export const CRM_CAPABILITIES: Record<CrmResource, Capability> = {
  accounts: { status: "supported", reason: null },
  trials: { status: "supported", reason: null },
  subscriptions: {
    status: "partial",
    reason:
      "Se exporta el plan y el estado, sin importe: TijerApp no guarda lo pactado con cada barbería y el precio de lista no sirve de sustituto (hay precios congelados de fundador). El importe real está en los pagos.",
  },
  payments: {
    status: "partial",
    reason:
      "Cobros registrados a mano al acreditarse la transferencia. La moneda no está en la tabla: TijerApp cobra sólo en pesos argentinos (los precios son `priceArs`), así que se declara ARS. `paidAt` es la fecha de registro, no la del movimiento bancario.",
  },
  usage: { status: "supported", reason: null },
};

/** Fila de `barbershops` con su suscripción embebida (puede no tenerla). */
export type BarbershopRow = {
  id: string;
  slug: string;
  name: string;
  whatsapp: string | null;
  instagram: string | null;
  is_active: boolean;
  created_at: string;
  subscription: SubscriptionRow | null;
};

export type SubscriptionRow = {
  plan_tier: string | null;
  status: string | null;
  trial_started_at: string | null;
  trial_expires_at: string | null;
  grace_expires_at: string | null;
  current_period_started_at: string | null;
  current_period_ends_at: string | null;
  updated_at: string | null;
};

/** Fila de `barbershop_payments`: un cobro de la plataforma a una barbería. */
export type PaymentRow = {
  id: string;
  barbershop_slug: string;
  amount: string | number;
  method: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
};

function iso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Hash de los campos exportados, ya normalizados.
 *
 * Las claves se ordenan para que `{a,b}` y `{b,a}` den lo mismo: si el orden
 * cambiara el hash, cada sincronización parecería un cambio.
 */
export function versionHashOf(payload: Record<string, unknown>): string {
  const ordenado = Object.keys(payload)
    .sort()
    .map((clave) => `${clave}:${JSON.stringify(payload[clave] ?? null)}`)
    .join("|");
  return createHash("sha256").update(ordenado).digest("hex").slice(0, 40);
}

/**
 * Clave estable de un registro embebido.
 *
 * La prueba y la suscripción de TijerApp viven en la misma fila
 * (`barbershop_subscriptions`), así que no tienen id propio como registros del
 * CRM. Sin una clave estable, cada sincronización crearía una prueba nueva.
 */
export function embeddedKey(kind: "trial" | "subscription", barbershopId: string): string {
  return `${kind}:${barbershopId}`;
}

/**
 * Contactos comerciales de la barbería.
 *
 * Se exportan **sólo los que la barbería publica en su propia página de
 * reservas**: el WhatsApp de turnos y el Instagram del local. Son el canal por
 * el que cualquiera la contactaría, no datos personales de su dueño — los
 * dueños viven en las tablas de auth y de ahí no sale nada.
 */
export function contactosDe(row: BarbershopRow) {
  const contactos: { channel: "email" | "phone" | "whatsapp" | "social"; value: string }[] = [];
  const whatsapp = row.whatsapp?.trim();
  if (whatsapp) contactos.push({ channel: "whatsapp", value: whatsapp });
  const instagram = row.instagram?.trim();
  if (instagram) contactos.push({ channel: "social", value: instagram });
  return contactos;
}

export function toAccountRecord(row: BarbershopRow) {
  const campos = {
    name: row.name,
    slug: row.slug,
    // Clasificar una barbería como real, demo o de prueba es una decisión del
    // propietario en el CRM. TijerApp no lo sabe y no lo inventa.
    kind: "unclassified" as const,
    // El estado tal cual lo tiene la app. No es prueba de pago: `trial` sigue
    // diciendo `trial` aunque la fecha ya haya pasado, porque el vencimiento lo
    // calculan las fechas y no esta columna.
    accessStatus: row.subscription?.status ?? null,
    contacts: contactosDe(row),
  };

  return {
    type: "account" as const,
    externalId: row.id,
    sourceUpdatedAt: iso(row.subscription?.updated_at ?? null),
    versionHash: versionHashOf(campos),
    // `barbershops` no tiene baja lógica. `is_active` es otra cosa (apagar la
    // reserva online) y convertirlo en una baja borraría la cuenta en el CRM.
    deletedAt: null,
    ...campos,
  };
}

/**
 * Prueba de la barbería.
 *
 * Sin fila de suscripción no hay prueba: el trial Pro de 14 días que la app
 * arma en memoria para las barberías viejas **no está persistido**, y
 * exportarlo sería exportar un default con cara de dato.
 *
 * Sin `trial_expires_at` tampoco: una barbería que pagó desde el primer día
 * tiene esa fecha en null a propósito (la RPC de cobro la limpia), y no tuvo
 * prueba que contar.
 */
export function toTrialRecord(row: BarbershopRow) {
  const sub = row.subscription;
  if (!sub?.trial_expires_at) return null;

  const campos = {
    accountExternalId: row.id,
    // Si no se guardó cuándo arrancó, vale el alta de la barbería: la
    // suscripción se crea con ella. No se inventa una fecha intermedia.
    startsAt: iso(sub.trial_started_at ?? row.created_at),
    endsAt: iso(sub.trial_expires_at),
    rawStatus: sub.status ?? null,
  };

  return {
    type: "trial" as const,
    externalId: embeddedKey("trial", row.id),
    sourceUpdatedAt: iso(sub.updated_at),
    versionHash: versionHashOf(campos),
    deletedAt: null,
    ...campos,
  };
}

/**
 * Contrato de la barbería: plan, estado y período, **sin importe**.
 *
 * El importe va nulo y `amountBasis` va `unknown` porque TijerApp no guarda lo
 * pactado. Usar el precio de lista sería peor que no poner nada: hay al menos
 * una barbería con precio congelado de fundador, así que el número de lista
 * sería falso justo para el cliente más antiguo.
 */
export function toSubscriptionRecord(row: BarbershopRow) {
  const sub = row.subscription;
  if (!sub) return null;

  const campos = {
    accountExternalId: row.id,
    planCode: sub.plan_tier ?? null,
    rawStatus: sub.status ?? null,
    currency: null,
    amountMinor: null,
    intervalMonths: null,
    amountBasis: "unknown" as const,
    taxBasis: "unknown" as const,
    currentPeriodStart: iso(sub.current_period_started_at),
    currentPeriodEnd: iso(sub.current_period_ends_at),
    // null es "no informado". Convertirlo a false diría que la barbería NO
    // pidió la baja, y eso no lo sabemos: TijerApp no tiene esa figura.
    cancelAtPeriodEnd: null,
    endedAt: null,
  };

  return {
    type: "subscription" as const,
    externalId: embeddedKey("subscription", row.id),
    sourceUpdatedAt: iso(sub.updated_at),
    versionHash: versionHashOf(campos),
    deletedAt: null,
    ...campos,
  };
}

/**
 * Importe en centavos a partir del `numeric(12,2)` de la tabla.
 *
 * Se hace con texto y no con `Number`, para no pasar la plata por punto
 * flotante. Un importe que no se entiende devuelve null y el cobro no se
 * exporta: mejor que falte a que llegue mal.
 */
export function centavosDe(amount: string | number | null | undefined): string | null {
  if (amount === null || amount === undefined) return null;
  const texto = String(amount).trim();
  if (!/^\d+(\.\d+)?$/.test(texto)) return null;

  const [entera, decimal = ""] = texto.split(".");
  const centavos = `${decimal}00`.slice(0, 2);
  const resultado = `${entera}${centavos}`.replace(/^0+(?=\d)/, "");
  return resultado;
}

/**
 * Cobro de la plataforma a una barbería.
 *
 * Cada fila de `barbershop_payments` es una transferencia ya acreditada que
 * alguien registró a mano: por eso el estado es `confirmed` y no `pending`. No
 * existe la fila hasta que el dinero entró.
 *
 * `paidAt` es la fecha de registro, no la del movimiento bancario — TijerApp no
 * guarda la segunda. Está declarado en las capacidades.
 */
export function toPaymentRecord(row: PaymentRow, barbershopId: string | null) {
  if (!barbershopId) return null;
  const amountMinor = centavosDe(row.amount);
  if (amountMinor === null) return null;

  const campos = {
    accountExternalId: barbershopId,
    subscriptionExternalId: embeddedKey("subscription", barbershopId),
    provider: row.method?.trim() || "manual",
    amountMinor,
    // La tabla no tiene moneda. TijerApp cobra sólo en pesos argentinos: los
    // planes son `priceArs` y la UI formatea con `formatArs`.
    currency: "ARS",
    status: "confirmed" as const,
    paidAt: iso(row.created_at),
    // No hay reversas: un cobro mal cargado se corrige borrando la fila.
    reversedAt: null,
    coverageStart: iso(row.period_start),
    coverageEnd: iso(row.period_end),
  };

  return {
    type: "payment" as const,
    externalId: row.id,
    sourceUpdatedAt: iso(row.created_at),
    versionHash: versionHashOf(campos),
    deletedAt: null,
    ...campos,
  };
}

/** Compara el token sin filtrar por dónde difiere. */
export function tokenMatches(expected: string, received: string | null): boolean {
  if (!received) return false;
  if (expected.length !== received.length) return false;

  let diferencia = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diferencia |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return diferencia === 0;
}

export const CRM_ENVIRONMENTS = ["test", "preview", "production"] as const;
export type CrmEnvironment = (typeof CRM_ENVIRONMENTS)[number];

/**
 * Qué entorno declara la exportación.
 *
 * Describe **de qué base salen los datos**, no dónde corre el proceso. Un
 * `next dev` en la notebook apuntando a la base de producción exporta
 * producción, y el CRM tiene que enterarse: si no, rechaza la sincronización
 * por desajuste de entorno.
 */
export function resolveEnvironment(env: {
  explicit?: string | null;
  vercelEnv?: string | null;
  nodeEnv?: string | null;
}): CrmEnvironment {
  const declarado = env.explicit?.trim().toLowerCase();
  if (declarado && (CRM_ENVIRONMENTS as readonly string[]).includes(declarado)) {
    return declarado as CrmEnvironment;
  }
  const despliegue = (env.vercelEnv ?? env.nodeEnv ?? "").trim().toLowerCase();
  if (despliegue === "production") return "production";
  if (despliegue === "preview") return "preview";
  return "test";
}

/** El cursor de paginación es el id de la última fila leída. */
export function esCursorValido(cursor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor);
}

/** Uso agregado de una barbería. Conteos y fechas: ni un cliente. */
export type BarbershopUsage = {
  barbershopId: string;
  turnos: number;
  ultimoTurno: string | null;
};

/**
 * Señal de uso de una barbería: cuántos turnos tomó y cuándo fue el último.
 *
 * El cero se informa —"tomó 0 turnos" es el dato que se busca, no un hueco— y
 * sin actividad no se inventa una fecha.
 */
export function toUsageRecords(row: BarbershopUsage) {
  const campos = {
    accountExternalId: row.barbershopId,
    signalKey: "turnos",
    value: row.turnos,
    occurredAt: iso(row.ultimoTurno),
  };

  return [
    {
      type: "usage" as const,
      // Una señal por barbería y por clave: reimportar actualiza, no duplica.
      externalId: `turnos:${row.barbershopId}`,
      sourceUpdatedAt: null,
      versionHash: versionHashOf(campos),
      deletedAt: null,
      ...campos,
    },
  ];
}
