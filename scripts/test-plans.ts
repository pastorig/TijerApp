/**
 * Tests unitarios de la lógica de planes (pura, sin DB ni red).
 * Cubre el gating de features (que ahora también se aplica server-side en
 * los endpoints vía assertPlanFeature) + el cómputo de status y fechas de
 * facturación.
 *
 * Correr: node --experimental-strip-types scripts/test-plans.ts
 */
import {
  ANNUAL_DISCOUNT_PERCENT,
  PLAN_LIMITS,
  PLAN_META,
  addMonths,
  annualPriceArs,
  annualPriceLabel,
  computeNextPaidUntil,
  expectedPaymentAmounts,
  hasFeature,
  isExpectedPaymentAmount,
  monthlyPriceLabel,
  resolvePlanStatus,
} from "../src/lib/plans.ts";

let passed = 0;
let failed = 0;

function check(name: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${expected}, obtenido ${got}`}`);
  if (ok) passed++;
  else failed++;
}

// ─── hasFeature: la matriz de gating ───────────────────────────────────
check("Solo NO tiene fidelización", hasFeature("solo", "fidelizacion"), false);
check("Pro SÍ tiene fidelización", hasFeature("pro", "fidelizacion"), true);
check("Solo NO tiene cupones", hasFeature("solo", "cupones"), false);
check("Esencial SÍ tiene cupones", hasFeature("esencial", "cupones"), true);
check("Solo NO tiene cobros online", hasFeature("solo", "cobros_online"), false);
check("Esencial SÍ tiene cobros online", hasFeature("esencial", "cobros_online"), true);
check("Esencial NO tiene multi_admin (es Pro)", hasFeature("esencial", "multi_admin"), false);
check("Pro SÍ tiene multi_admin", hasFeature("pro", "multi_admin"), true);
check("Solo NO tiene push", hasFeature("solo", "push_notifications"), false);

// ─── resolvePlanStatus: status efectivo + canAccessFeatures ────────────
const now = new Date(2026, 0, 15); // 15-ene-2026
const future = new Date(2026, 0, 25);
const past = new Date(2026, 0, 5);

const trialActivo = resolvePlanStatus({
  tier: "pro",
  rawStatus: "trial",
  trialExpiresAt: future,
  graceExpiresAt: null,
  now,
});
check("Trial activo → active", trialActivo.effectiveStatus, "active");
check("Trial activo → puede usar features", trialActivo.canAccessFeatures, true);

const trialEnGracia = resolvePlanStatus({
  tier: "pro",
  rawStatus: "trial",
  trialExpiresAt: past,
  graceExpiresAt: future,
  now,
});
check("Trial vencido + gracia vigente → grace", trialEnGracia.effectiveStatus, "grace");
check("En gracia → todavía puede usar features", trialEnGracia.canAccessFeatures, true);

const trialVencido = resolvePlanStatus({
  tier: "pro",
  rawStatus: "trial",
  trialExpiresAt: past,
  graceExpiresAt: past,
  now,
});
check("Trial + gracia vencidos → expired", trialVencido.effectiveStatus, "expired");
check("Expired → NO puede usar features (paywall)", trialVencido.canAccessFeatures, false);

const cancelado = resolvePlanStatus({
  tier: "pro",
  rawStatus: "cancelled",
  trialExpiresAt: future,
  graceExpiresAt: null,
  now,
});
check("Cancelado → NO puede usar features", cancelado.canAccessFeatures, false);

const pagoVigente = resolvePlanStatus({
  tier: "esencial",
  rawStatus: "active",
  trialExpiresAt: null,
  graceExpiresAt: null,
  currentPeriodEndsAt: future,
  now,
});
check("Pago vigente → active", pagoVigente.effectiveStatus, "active");

const pagoVencidoLejos = resolvePlanStatus({
  tier: "esencial",
  rawStatus: "active",
  trialExpiresAt: null,
  graceExpiresAt: null,
  currentPeriodEndsAt: new Date(2025, 11, 1), // venció hace >7d
  now,
});
check("Pago vencido hace >7d → expired", pagoVencidoLejos.effectiveStatus, "expired");

// ─── addMonths / computeNextPaidUntil: fechas de facturación ───────────
check(
  "addMonths clampea fin de mes (31-ene +1 = 28-feb)",
  addMonths(new Date(2026, 0, 31), 1).getTime(),
  new Date(2026, 1, 28).getTime(),
);
check(
  "computeNextPaidUntil sin pago previo → +1 mes desde hoy",
  computeNextPaidUntil(new Date(2026, 0, 15), null).getTime(),
  new Date(2026, 1, 15).getTime(),
);
check(
  "computeNextPaidUntil con pago futuro → acumula (no regala días)",
  computeNextPaidUntil(new Date(2026, 0, 15), new Date(2026, 2, 10)).getTime(),
  new Date(2026, 3, 10).getTime(),
);
check(
  "computeNextPaidUntil con pago vencido → +1 mes desde hoy (no retroactivo)",
  computeNextPaidUntil(new Date(2026, 0, 15), new Date(2025, 11, 1)).getTime(),
  new Date(2026, 1, 15).getTime(),
);

// ─── isReadOnly: modo lectura al vencer (specs/009-modo-lectura) ───────
// Es el flag que consumen los guards de escritura del server y la UI del
// admin, así que tiene que ser exacto en los 5 estados.
const readOnlyCases: Array<[string, Parameters<typeof resolvePlanStatus>[0], boolean]> = [
  [
    "trial vigente → escribe",
    { tier: "pro", rawStatus: "trial", trialExpiresAt: future, graceExpiresAt: null, now },
    false,
  ],
  [
    "plan pago vigente → escribe",
    { tier: "solo", rawStatus: "active", trialExpiresAt: null, graceExpiresAt: null, currentPeriodEndsAt: future, now },
    false,
  ],
  [
    "en gracia → todavía escribe",
    { tier: "pro", rawStatus: "trial", trialExpiresAt: past, graceExpiresAt: future, now },
    false,
  ],
  [
    "trial vencido sin gracia → MODO LECTURA",
    { tier: "pro", rawStatus: "trial", trialExpiresAt: past, graceExpiresAt: past, now },
    true,
  ],
  [
    "cancelado → MODO LECTURA",
    { tier: "esencial", rawStatus: "cancelled", trialExpiresAt: null, graceExpiresAt: null, now },
    true,
  ],
  [
    "pago vencido hace >7d → MODO LECTURA",
    { tier: "esencial", rawStatus: "active", trialExpiresAt: null, graceExpiresAt: null, currentPeriodEndsAt: new Date(2025, 11, 1), now },
    true,
  ],
];

for (const [label, input, expected] of readOnlyCases) {
  check(`isReadOnly: ${label}`, resolvePlanStatus(input).isReadOnly, expected);
}

// isReadOnly es, por definición, el inverso exacto de canAccessFeatures.
for (const [label, input] of readOnlyCases) {
  const plan = resolvePlanStatus(input);
  check(
    `isReadOnly === !canAccessFeatures (${label})`,
    plan.isReadOnly,
    !plan.canAccessFeatures,
  );
}

// ─── Precios: PLAN_META es la única fuente ─────────────────────────────
// La landing dejó de tener los números escritos a mano, así que si estos
// tests pasan, la home / /precios / el JSON-LD muestran lo mismo.
check("Solo cuesta $22.000", PLAN_META.solo.priceArs, 22000);
check("Esencial cuesta $33.000", PLAN_META.esencial.priceArs, 33000);
check("Pro cuesta $46.000", PLAN_META.pro.priceArs, 46000);

check("la escalera de precios es creciente", PLAN_META.solo.priceArs < PLAN_META.esencial.priceArs && PLAN_META.esencial.priceArs < PLAN_META.pro.priceArs, true);

// annualPriceArs: 12 meses con el descuento, redondeado hacia abajo al millar.
check("anual Solo = $224.000", annualPriceArs("solo"), 224000);
check("anual Esencial = $336.000", annualPriceArs("esencial"), 336000);
check("anual Pro = $469.000", annualPriceArs("pro"), 469000);

check("el anual siempre redondea al millar", annualPriceArs("esencial") % 1000, 0);
check(
  "el anual es más barato que 12 meses sueltos",
  annualPriceArs("pro") < PLAN_META.pro.priceArs * 12,
  true,
);
check(
  `el descuento anual real ≈ ${ANNUAL_DISCOUNT_PERCENT}%`,
  Math.round((1 - annualPriceArs("solo") / (PLAN_META.solo.priceArs * 12)) * 100),
  ANNUAL_DISCOUNT_PERCENT,
);

// Formato es-AR: punto como separador de miles, sin decimales.
check("monthlyPriceLabel formatea es-AR", monthlyPriceLabel("esencial"), "$33.000");
check("annualPriceLabel formatea es-AR", annualPriceLabel("pro"), "$469.000");

// ─── Límites de barberos (los enforcea POST /api/admin/barbers) ────────
check("Solo = 1 barbero", PLAN_LIMITS.solo.maxBarbers, 1);
check("Esencial = 3 barberos", PLAN_LIMITS.esencial.maxBarbers, 3);
check("Pro = barberos ilimitados", PLAN_LIMITS.pro.maxBarbers, Number.POSITIVE_INFINITY);
check(
  "el tope de barberos nunca baja al subir de plan",
  PLAN_LIMITS.solo.maxBarbers <= PLAN_LIMITS.esencial.maxBarbers &&
    PLAN_LIMITS.esencial.maxBarbers <= PLAN_LIMITS.pro.maxBarbers,
  true,
);

// ── Monto de un cobro: el aviso por el cero de menos ─────────────────────────
// El 12/08/2026 un pago de $22.000 entró como $22 y nadie lo frenó.
check(
  "el precio de Solo se acepta sin preguntar",
  isExpectedPaymentAmount(PLAN_META.solo.priceArs),
  true,
);
check(
  "el precio de Pro se acepta sin preguntar",
  isExpectedPaymentAmount(PLAN_META.pro.priceArs),
  true,
);
check(
  "el precio anual también está en la lista",
  isExpectedPaymentAmount(annualPriceArs("esencial")),
  true,
);
check(
  "$22 (a Solo le falta un cero) pide confirmación",
  isExpectedPaymentAmount(22),
  false,
);
check(
  "$220.000 (a Solo le sobra un cero) pide confirmación",
  isExpectedPaymentAmount(PLAN_META.solo.priceArs * 10),
  false,
);
check("0 pide confirmación", isExpectedPaymentAmount(0), false);
check(
  "un precio a mitad de camino entre dos planes pide confirmación",
  isExpectedPaymentAmount(
    (PLAN_META.solo.priceArs + PLAN_META.esencial.priceArs) / 2,
  ),
  false,
);
check(
  "la lista tiene los 3 mensuales + los 3 anuales",
  expectedPaymentAmounts().length,
  6,
);

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
