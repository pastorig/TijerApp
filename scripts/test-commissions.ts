/**
 * Tests de la liquidación de comisiones (pura). Acá está el riesgo de la
 * feature: si las cuentas no cierran, el dueño ve una diferencia de pesos que no
 * le puede explicar a su empleado.
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-commissions.ts
 */
import {
  calculateCommissions,
  type BarberProduction,
} from "../src/lib/commissions.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(
    `${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${expected}, obtenido ${got}`}`,
  );
  if (ok) passed++;
  else failed++;
}

const barbero = (
  name: string,
  revenue: number,
  commissionPercent: number | null,
): BarberProduction => ({ barberId: name, name, revenue, commissionPercent });

// ── 1. Sin configurar (null) NO entra al cálculo y no es 0% ─────────────────
const conNull = calculateCommissions([barbero("Santi", 100000, null)]);
check("sin configurar → no genera fila de liquidación", conNull.rows.length, 0);
check("sin configurar → va a la lista aparte", conNull.unconfigured.length, 1);
check("sin configurar → no suma al total", conNull.totalCommission, 0);

// ── 2. Comisión 0% configurada SÍ entra (distinto del caso 1) ───────────────
const conCero = calculateCommissions([barbero("Nico", 100000, 0)]);
check("0% configurado → sí genera fila", conCero.rows.length, 1);
check("0% configurado → no va a 'sin configurar'", conCero.unconfigured.length, 0);
check("0% configurado → comisión $0", conCero.rows[0].commission, 0);
check("0% configurado → todo queda en la barbería", conCero.rows[0].barbershopShare, 100000);

// ── 3. LAS CUENTAS CIERRAN — el caso que motivó la decisión de redondeo ─────
const dificil = calculateCommissions([
  barbero("A", 10001, 33),
  barbero("B", 33333, 47.5),
  barbero("C", 7777, 3),
]);
for (const row of dificil.rows) {
  check(
    `${row.name}: comisión + barbería = producido`,
    row.commission + row.barbershopShare,
    row.revenue,
  );
}
check(
  "TOTAL: comisiones + barbería = producción total",
  dificil.totalCommission + dificil.totalBarbershopShare,
  dificil.totalRevenue,
);
check("total producido es la suma de las filas", dificil.totalRevenue, 10001 + 33333 + 7777);

// ── 4. 100% → todo al barbero ───────────────────────────────────────────────
const todo = calculateCommissions([barbero("Dueño", 50000, 100)]);
check("100% → se lleva todo", todo.rows[0].commission, 50000);
check("100% → la barbería no se queda nada", todo.rows[0].barbershopShare, 0);

// ── 5. Producción 0 → sin división por cero ─────────────────────────────────
const sinProd = calculateCommissions([barbero("Nuevo", 0, 50)]);
check("producción 0 → comisión 0", sinProd.rows[0].commission, 0);
check("producción 0 → barbería 0", sinProd.rows[0].barbershopShare, 0);

// ── 6. Producción inválida (NaN por precios nulos) no rompe ─────────────────
const raro = calculateCommissions([barbero("Raro", Number.NaN, 50)]);
check("producción NaN → se trata como 0", raro.rows[0].commission, 0);
check("producción NaN → producido 0", raro.rows[0].revenue, 0);

// ── 7. Los totales salen de las filas ya redondeadas ────────────────────────
const dos = calculateCommissions([barbero("X", 999, 33), barbero("Y", 999, 33)]);
check(
  "total comisión = suma de las filas redondeadas",
  dos.totalCommission,
  dos.rows[0].commission + dos.rows[1].commission,
);

// ── 8. Sin ningún barbero con comisión → nada que mostrar ───────────────────
const vacio = calculateCommissions([
  barbero("A", 1000, null),
  barbero("B", 2000, null),
]);
check("ninguno configurado → 0 filas", vacio.rows.length, 0);
check("ninguno configurado → total 0", vacio.totalRevenue, 0);
check("ninguno configurado → 2 en la lista aparte", vacio.unconfigured.length, 2);

// ── Extra: orden por comisión descendente ──────────────────────────────────
const orden = calculateCommissions([
  barbero("Poco", 10000, 10),
  barbero("Mucho", 100000, 50),
]);
check("ordena por comisión, mayor primero", orden.rows[0].name, "Mucho");

console.log(`\n${passed}/${passed + failed} OK`);
if (failed > 0) process.exit(1);
