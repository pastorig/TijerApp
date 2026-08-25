/**
 * Tests del ruteo post-login y de qué cuenta como ruta del empleado.
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-staff-routing.ts
 */
import {
  isStaffPath,
  resolvePostLoginDestination,
} from "../src/lib/staff-routing.ts";

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

const dest = (isAdmin: boolean, isStaff: boolean) =>
  resolvePostLoginDestination({ barbershopSlug: "leocuts", isAdmin, isStaff });

// ── El destino ──────────────────────────────────────────────────────────────
check("el dueño va al panel", dest(true, false).kind, "admin");
check("y a su ruta", dest(true, false).path, "/leocuts/admin");

check("el empleado va a su agenda", dest(false, true).kind, "staff");
check("y a la suya", dest(false, true).path, "/leocuts/mi-agenda");

// Si alguien es las dos cosas (el dueño se dio acceso a sí mismo para probar),
// gana el panel: mandarlo a la agenda reducida le sacaría acceso a lo suyo.
check("dueño Y empleado → gana el panel", dest(true, true).kind, "admin");

check("sin ningún acceso → no entra", dest(false, false).kind, "sin-acceso");

// ── Qué es una ruta de empleado ─────────────────────────────────────────────
check("la agenda del empleado lo es", isStaffPath("/leocuts/mi-agenda"), true);
check("y sus subrutas también", isStaffPath("/leocuts/mi-agenda/ganancias"), true);
check("con query string también", isStaffPath("/leocuts/mi-agenda?d=2026-08-25"), true);

check("el panel del dueño NO lo es", isStaffPath("/leocuts/admin"), false);
check("la landing pública tampoco", isStaffPath("/leocuts"), false);
check("ni la reserva", isStaffPath("/leocuts/reservar"), false);
check("la raíz tampoco", isStaffPath("/"), false);

// Una ruta que apenas se le parece no puede colarse: si `mi-agenda-falsa`
// contara como ruta de empleado, alcanzaría con inventar una para confundir al
// ruteo.
check("una ruta parecida no cuenta", isStaffPath("/leocuts/mi-agenda-falsa"), false);
check("ni con el nombre adentro", isStaffPath("/leocuts/admin/mi-agenda"), false);

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
