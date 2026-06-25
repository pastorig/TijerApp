/**
 * Test unitario del cálculo de seña (lógica pura, sin DB ni red).
 * Correr: node --experimental-strip-types scripts/test-deposit.ts
 */
import { computeDepositAmount } from "../src/lib/mercadopago/deposit.ts";

type Case = {
  name: string;
  in: { servicePrice: number; depositPercent: number; depositMinAmount?: number | null };
  expected: number;
};

const cases: Case[] = [
  {
    name: "30% de $8.500 = $2.550 (sin mínimo)",
    in: { servicePrice: 8500, depositPercent: 30, depositMinAmount: null },
    expected: 2550,
  },
  {
    name: "30% de $8.500 con mínimo $3.000 → cobra el mínimo",
    in: { servicePrice: 8500, depositPercent: 30, depositMinAmount: 3000 },
    expected: 3000,
  },
  {
    name: "50% de $10.000 = $5.000",
    in: { servicePrice: 10000, depositPercent: 50 },
    expected: 5000,
  },
  {
    name: "redondeo: 30% de $8.333 = $2.499.9 → $2.500",
    in: { servicePrice: 8333, depositPercent: 30 },
    expected: 2500,
  },
  {
    name: "mínimo mayor que el precio → tope = precio total",
    in: { servicePrice: 2000, depositPercent: 30, depositMinAmount: 5000 },
    expected: 2000,
  },
  {
    name: "100% = precio completo",
    in: { servicePrice: 7000, depositPercent: 100 },
    expected: 7000,
  },
  {
    name: "precio 0 → 0 (inválido)",
    in: { servicePrice: 0, depositPercent: 30 },
    expected: 0,
  },
  {
    name: "porcentaje 0 → 0 (inválido)",
    in: { servicePrice: 8500, depositPercent: 0 },
    expected: 0,
  },
];

let passed = 0;
let failed = 0;
for (const c of cases) {
  const got = computeDepositAmount(c.in);
  const ok = got === c.expected;
  console.log(
    `${ok ? "✓" : "✗"} ${c.name} → esperado ${c.expected}, obtenido ${got}`,
  );
  if (ok) passed++;
  else failed++;
}

console.log(`\n${passed}/${cases.length} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
