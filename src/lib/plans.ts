/**
 * Plan Gating — definición de planes, features y límites de TijerApp.
 *
 * 3 tiers: solo / esencial / pro.
 * Cada feature está disponible en un subset de tiers.
 * Cada plan tiene límites (max barbers, max admins).
 *
 * Uso típico:
 *   const plan = await getBarbershopPlan(slug);
 *   if (!hasFeature(plan.tier, 'cupones')) redirect('/admin');
 */

export type PlanTier = "solo" | "esencial" | "pro";

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "grace"
  | "expired"
  | "cancelled";

/**
 * Feature flags. Cada uno representa una capability de la app que se
 * habilita/deshabilita según el plan. Sin esto, todo está disponible.
 */
export type Feature =
  | "multi_barbero" // permite crear más de 1 barbero
  | "cupones"
  | "cobros_online"
  | "reportes_pdf"
  | "reportes_por_barbero"
  | "push_notifications"
  | "fidelizacion"
  | "multi_admin" // permite agregar más de 1 admin (Equipo)
  | "reportes_mensuales_email"
  | "soporte_prioritario";

/**
 * Matriz feature → tiers que la incluyen.
 *
 * Decidida con el founder en base a research de competencia + ICP argentino.
 * Si una feature no está acá, asumir que está incluida en TODOS los planes
 * (ej. Dashboard, Turnero, Recordatorios — son base).
 */
export const PLAN_FEATURES: Record<Feature, ReadonlyArray<PlanTier>> = {
  multi_barbero: ["esencial", "pro"],
  cupones: ["esencial", "pro"],
  cobros_online: ["esencial", "pro"],
  reportes_pdf: ["esencial", "pro"],
  reportes_por_barbero: ["esencial", "pro"],
  push_notifications: ["esencial", "pro"],
  fidelizacion: ["pro"],
  multi_admin: ["pro"],
  reportes_mensuales_email: ["pro"],
  soporte_prioritario: ["pro"],
} as const;

/**
 * Límites cuantitativos por plan. Multi-barbero queda en feature flag para
 * el toggle on/off, pero el límite numérico vive acá.
 */
export const PLAN_LIMITS = {
  solo: { maxBarbers: 1, maxAdmins: 1 },
  esencial: { maxBarbers: 2, maxAdmins: 1 },
  pro: { maxBarbers: Number.POSITIVE_INFINITY, maxAdmins: 5 },
} as const satisfies Record<PlanTier, { maxBarbers: number; maxAdmins: number }>;

/**
 * Metadata por plan: nombre comercial, precio en pesos argentinos,
 * descripción corta.
 *
 * Precio en ARS por decisión del founder (post research mercado argentino):
 * el barbero argentino piensa en pesos, no en dólares. Precios fijados al
 * MEP del día del cambio (~$1.450 ARS/USD) sobre USD 15/28/42 originales,
 * redondeados a números limpios.
 */
export const PLAN_META = {
  solo: {
    name: "Solo",
    priceArs: 22000,
    tagline: "Barbero independiente",
  },
  esencial: {
    name: "Esencial",
    priceArs: 41000,
    tagline: "Barbería con 2 sillas",
  },
  pro: {
    name: "Pro",
    priceArs: 61000,
    tagline: "Barbería establecida",
  },
} as const satisfies Record<
  PlanTier,
  { name: string; priceArs: number; tagline: string }
>;

/**
 * Formatea un monto en ARS con separadores de miles argentinos
 * (punto). Ej: 22000 → "$22.000".
 */
export function formatArs(value: number): string {
  return `$${value.toLocaleString("es-AR")}`;
}

/**
 * Chequea si un plan incluye una feature. Si la feature no existe en la
 * matriz, devuelve true (defensivo: features sin definir son universales).
 */
export function hasFeature(plan: PlanTier, feature: Feature): boolean {
  const tiers = PLAN_FEATURES[feature];
  if (!tiers) return true;
  return tiers.includes(plan);
}

/**
 * Devuelve el tier mínimo que incluye la feature. Para usar en mensajes
 * tipo "Esta feature está disponible en {minTier}".
 */
export function minTierForFeature(feature: Feature): PlanTier {
  const tiers = PLAN_FEATURES[feature];
  if (!tiers || tiers.length === 0) return "solo";
  // Asumimos orden: solo < esencial < pro
  const ORDER: PlanTier[] = ["solo", "esencial", "pro"];
  return tiers
    .slice()
    .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))[0];
}

/**
 * Estado computado del plan de una barbería. status='effective' es el que
 * la UI debe usar para decidir si gatear features.
 */
export type ResolvedPlan = {
  tier: PlanTier;
  /** Status persistido en DB. */
  rawStatus: SubscriptionStatus;
  /**
   * Status efectivo después de evaluar trial/grace/expired.
   * - active: pago al día o trial activo
   * - grace: trial expiró, pero está en ventana de 7 días
   * - expired: paywall completo, solo /admin/settings/plan accesible
   * - cancelled: el owner desactivó
   */
  effectiveStatus: "active" | "grace" | "expired" | "cancelled";
  /** Fecha en la que termina el trial. Null si pagado. */
  trialExpiresAt: Date | null;
  /** Días restantes hasta que termine el trial. Null si pagado. */
  daysToTrialExpire: number | null;
  /** Fecha en la que termina la gracia (7d post-trial). */
  graceExpiresAt: Date | null;
  /**
   * Hasta cuándo está pago (current_period_ends_at). Null si nunca registró
   * un pago (en ese caso rige el trial — comportamiento legacy).
   */
  paidUntil: Date | null;
  /** Días restantes hasta que vence el período pago. Null si no aplica. */
  daysToPaidExpire: number | null;
  /** True si está en período de gracia. */
  isInGracePeriod: boolean;
  /** True si el barbero todavía puede usar features de su tier. */
  canAccessFeatures: boolean;
  /**
   * True si la barbería está en MODO LECTURA: puede ver todos sus datos
   * (agenda, clientes, reportes, configuración) pero no puede escribir nada,
   * y la reserva online pública queda apagada.
   *
   * Es el inverso de canAccessFeatures — existe como campo propio porque es
   * el concepto que consumen la UI y los guards de escritura, y leer
   * `plan.isReadOnly` dice lo que pasa mucho mejor que `!canAccessFeatures`.
   */
  isReadOnly: boolean;
};

/** Días de gracia después de que vence el trial o el período pago. */
export const GRACE_DAYS = 7;

/**
 * Suma `n` meses a una fecha, clampeando al último día válido del mes destino
 * (ej. 31/01 + 1 mes = 28/02, no 03/03). Pura, sin libs.
 */
export function addMonths(date: Date, n: number): Date {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

/**
 * Próximo "pagado hasta" al registrar un pago mensual: un mes desde el mayor
 * entre hoy y el vencimiento vigente. Así un pago retroactivo no regala días
 * y un pago anticipado se acumula sobre lo ya pagado.
 */
export function computeNextPaidUntil(now: Date, current: Date | null): Date {
  const base = current && current.getTime() > now.getTime() ? current : now;
  return addMonths(base, 1);
}

/**
 * Computa el status efectivo a partir de fechas + status raw.
 * El cron de auto-update existe pero también hacemos check en lectura por
 * si el cron está atrasado o se rompió.
 */
export function resolvePlanStatus(input: {
  tier: PlanTier;
  rawStatus: SubscriptionStatus;
  trialExpiresAt: Date | null;
  graceExpiresAt: Date | null;
  /**
   * current_period_ends_at: hasta cuándo está pago. Si está seteada, PRECEDE al
   * trial. Null => rige el trial (comportamiento legacy, cero regresión).
   */
  currentPeriodEndsAt?: Date | null;
  now?: Date;
}): ResolvedPlan {
  const now = input.now ?? new Date();
  const { tier, rawStatus, trialExpiresAt, graceExpiresAt } = input;
  const paidUntil = input.currentPeriodEndsAt ?? null;

  let effectiveStatus: ResolvedPlan["effectiveStatus"];
  let isInGracePeriod = false;

  if (rawStatus === "cancelled") {
    effectiveStatus = "cancelled";
  } else if (paidUntil) {
    // Vigencia por pago (precede al trial). Al vencer: gracia y luego expired.
    if (paidUntil.getTime() > now.getTime()) {
      effectiveStatus = "active";
    } else if (
      paidUntil.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000 >
      now.getTime()
    ) {
      effectiveStatus = "grace";
      isInGracePeriod = true;
    } else {
      effectiveStatus = "expired";
    }
  } else if (rawStatus === "active") {
    effectiveStatus = "active";
  } else if (rawStatus === "trial") {
    // Trial activo a menos que ya expiró
    if (trialExpiresAt && trialExpiresAt.getTime() < now.getTime()) {
      // Trial expiró → ver si está en grace
      if (graceExpiresAt && graceExpiresAt.getTime() > now.getTime()) {
        effectiveStatus = "grace";
        isInGracePeriod = true;
      } else {
        effectiveStatus = "expired";
      }
    } else {
      effectiveStatus = "active";
    }
  } else if (rawStatus === "grace") {
    if (graceExpiresAt && graceExpiresAt.getTime() > now.getTime()) {
      effectiveStatus = "grace";
      isInGracePeriod = true;
    } else {
      effectiveStatus = "expired";
    }
  } else {
    // expired
    effectiveStatus = "expired";
  }

  const daysToTrialExpire = trialExpiresAt
    ? Math.ceil(
        (trialExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )
    : null;

  const daysToPaidExpire = paidUntil
    ? Math.ceil((paidUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // canAccessFeatures: en active y grace, sí. En expired/cancelled, no.
  const canAccessFeatures =
    effectiveStatus === "active" || effectiveStatus === "grace";

  return {
    tier,
    rawStatus,
    effectiveStatus,
    trialExpiresAt,
    daysToTrialExpire,
    graceExpiresAt,
    paidUntil,
    daysToPaidExpire,
    isInGracePeriod,
    canAccessFeatures,
    isReadOnly: !canAccessFeatures,
  };
}
