/**
 * Tests de a dónde va alguien después de entrar (feature 040). La regla es la
 * misma que tenía `GlobalLoginForm`; ahora la comparten mail+clave y Google.
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-destino-post-login.ts
 */
import { barberiaPedidaEnNext, decidirDestino } from "../src/lib/destino-post-login.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(got)}`}`);
  if (ok) passed++;
  else failed++;
}

check("next de admin → slug", barberiaPedidaEnNext("/leocuts/admin/turnero"), "leocuts");
check("next que no es del panel → nada", barberiaPedidaEnNext("/leocuts/mi-agenda"), "");

check(
  "dueño de una barbería → su panel",
  decidirDestino({ barberiasQueAdministra: ["leocuts"], barberiasDondeTrabaja: [] }),
  { kind: "ir", path: "/leocuts/admin" },
);
check(
  "respeta la URL pedida si tiene acceso",
  decidirDestino({ nextPath: "/leocuts/admin/reportes", barberiasQueAdministra: ["leocuts"], barberiasDondeTrabaja: [] }),
  { kind: "ir", path: "/leocuts/admin/reportes" },
);
check(
  "URL pedida de otra barbería: no la respeta",
  decidirDestino({ nextPath: "/barber/admin", barberiasQueAdministra: ["leocuts"], barberiasDondeTrabaja: [] }),
  { kind: "ir", path: "/leocuts/admin" },
);
check(
  "administra varias → elegir",
  decidirDestino({ barberiasQueAdministra: ["barber", "leocuts"], barberiasDondeTrabaja: [] }),
  { kind: "elegir" },
);
check(
  "varias pero pidió una puntual → esa",
  decidirDestino({ nextPath: "/barber/admin", barberiasQueAdministra: ["barber", "leocuts"], barberiasDondeTrabaja: [] }),
  { kind: "ir", path: "/barber/admin" },
);
check(
  "empleado → su agenda",
  decidirDestino({ barberiasQueAdministra: [], barberiasDondeTrabaja: ["primebarber"] }),
  { kind: "ir", path: "/primebarber/mi-agenda" },
);
check(
  "sin barbería ni empleo → sin-barberia (con Google: completar el alta)",
  decidirDestino({ barberiasQueAdministra: [], barberiasDondeTrabaja: [] }),
  { kind: "sin-barberia" },
);

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
