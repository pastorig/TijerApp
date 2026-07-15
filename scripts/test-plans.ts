/**
 * Tests unitarios de la lógica de planes (pura, sin DB ni red).
 * Cubre el gating de features (que ahora también se aplica server-side en
 * los endpoints vía assertPlanFeature) + el cómputo de status y fechas de
 * facturación.
 *
 * Correr: node --experimental-strip-types scripts/test-plans.ts
 */
import {
  addMonths,
  computeNextPaidUntil,
  hasFeature,
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

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
