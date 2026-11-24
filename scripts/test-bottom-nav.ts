/**
 * Tests de qué va en la barra de abajo del celular y qué en "Más" (feature 041).
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-bottom-nav.ts
 */
import { estaEnElMas, itemsDeLaBarra, seccionesDelMas } from "../src/components/admin/bottom-nav-items.ts";
import type { Feature } from "../src/lib/plans.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(got)}`}`);
  if (ok) passed++;
  else failed++;
}

const todo = () => true;
const soloBasico = (f: Feature) => !["fidelizacion", "cupones", "cuentas_empleados", "cobros_online", "catalogo_productos"].includes(f);

check("la barra: Inicio, Turnero y Clientes", itemsDeLaBarra("leocuts", todo).map((i) => i.label), ["Dashboard", "Turnero", "Clientes"]);

const mas = seccionesDelMas("leocuts", todo);
check("Más no repite lo de la barra", mas.flatMap((s) => s.items.map((i) => i.label)).filter((l) => ["Dashboard", "Turnero", "Clientes"].includes(l)), []);
check("Más agrupa como el menú lateral", mas.map((s) => s.titulo), ["Agenda", "Clientes", "Equipo", "Caja", "Mi barbería"]);
check("Más trae Configuración", mas.some((s) => s.items.some((i) => i.label === "Configuración")), true);

const masBasico = seccionesDelMas("leocuts", soloBasico).flatMap((s) => s.items.map((i) => i.label));
check("sin el plan, Cupones no aparece", masBasico.includes("Cupones"), false);
check("sin el plan, Fidelización no aparece", masBasico.includes("Fidelización"), false);

check("en Turnero, Más no va marcado", estaEnElMas("leocuts", "/leocuts/admin/turnero", todo), false);
check("en el Inicio, Más no va marcado", estaEnElMas("leocuts", "/leocuts/admin", todo), false);
check("en Reportes, Más va marcado", estaEnElMas("leocuts", "/leocuts/admin/reportes", todo), true);
check("en Cupones, Más va marcado", estaEnElMas("leocuts", "/leocuts/admin/cupones", todo), true);

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
