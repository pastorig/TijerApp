/**
 * Tests del identificador del rate limit (lógica pura, sin base).
 *
 * Lo que fijan: el contador de reservas va por IP **y barbería**, no por IP a
 * secas. En Argentina los celulares salen por CGNAT y clientes distintos
 * comparten IP pública, así que una IP sola es un mal identificador: castiga a
 * gente real y no frena a un bot que rota IP.
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-rate-limit.ts
 */
import {
  getRequestIdentifier,
  getValueIdentifier,
} from "../src/lib/rate-limit-identity.ts";

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

function req(ip: string) {
  return new Request("https://tijerapp.com/api/appointments/book", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

const IP = "200.115.1.20";

check(
  "misma IP y misma barbería → mismo contador",
  getRequestIdentifier(req(IP), "leocuts") ===
    getRequestIdentifier(req(IP), "leocuts"),
  true,
);

check(
  "misma IP, barberías distintas → contadores separados",
  getRequestIdentifier(req(IP), "leocuts") !==
    getRequestIdentifier(req(IP), "barber"),
  true,
);

check(
  "IPs distintas en la misma barbería → contadores separados",
  getRequestIdentifier(req(IP), "leocuts") !==
    getRequestIdentifier(req("200.115.1.21"), "leocuts"),
  true,
);

check(
  "con scope y sin scope no son el mismo contador",
  getRequestIdentifier(req(IP)) !== getRequestIdentifier(req(IP), "leocuts"),
  true,
);

// La IP nunca se guarda: lo que viaja a la base es un hash de largo fijo.
const id = getRequestIdentifier(req(IP), "leocuts");
check("el identificador es un hash de 32 caracteres", id.length, 32);
check("el identificador no contiene la IP", id.includes(IP), false);

// El freno por teléfono es el que distingue a una persona de un script.
check(
  "mismo teléfono → mismo contador",
  getValueIdentifier("3571000000") === getValueIdentifier("3571000000"),
  true,
);
check(
  "teléfonos distintos → contadores separados",
  getValueIdentifier("3571000000") !== getValueIdentifier("3571000001"),
  true,
);
check(
  "el teléfono tampoco se guarda en claro",
  getValueIdentifier("3571000000").includes("3571000000"),
  false,
);

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
