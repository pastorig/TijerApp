/**
 * Tests de los permisos del empleado (feature 019).
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-staff-permissions.ts
 */
import {
  aColumnas,
  normalizarPermisos,
  permisosDesdeBody,
  PERMISOS_POR_DEFECTO,
  puedeCambiarEstado,
  recortarTurno,
} from "../src/lib/staff-permissions.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log(
    `${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(got)}`}`,
  );
  if (ok) passed++;
  else failed++;
}

// ── El default es "sí" ──────────────────────────────────────────────────────
// Es lo que evita que el día del deploy todos los empleados de todas las
// barberías pierdan la mitad de la app sin que nadie lo haya pedido.
check("una fila vieja, sin las columnas, puede todo", normalizarPermisos({}), {
  verGanancias: true,
  confirmar: true,
  cancelar: true,
  contactarCliente: true,
});

check("sin fila, todo permitido", normalizarPermisos(null), PERMISOS_POR_DEFECTO);

check(
  "null se lee como permitido, igual que el default de la tabla",
  normalizarPermisos({ can_see_earnings: null, can_cancel: null }),
  PERMISOS_POR_DEFECTO,
);

check(
  "un false explícito se respeta, y solo ese",
  normalizarPermisos({ can_see_earnings: false }),
  { verGanancias: false, confirmar: true, cancelar: true, contactarCliente: true },
);

check(
  "los cuatro apagados = solo turnero",
  normalizarPermisos({
    can_see_earnings: false,
    can_confirm: false,
    can_cancel: false,
    can_contact_client: false,
  }),
  { verGanancias: false, confirmar: false, cancelar: false, contactarCliente: false },
);

// ── Lo que se recorta del payload ───────────────────────────────────────────
{
  const turno = {
    id: "1",
    customer_name: "Joaquín",
    customer_phone: "3571400111",
    service_price: 12000,
  };

  check(
    "con todos los permisos, el turno viaja entero",
    recortarTurno(turno, PERMISOS_POR_DEFECTO),
    turno,
  );

  check(
    "sin ver ganancias, el precio no viaja",
    recortarTurno(turno, { ...PERMISOS_POR_DEFECTO, verGanancias: false }),
    { ...turno, service_price: null },
  );

  check(
    "sin contactar, el teléfono no viaja",
    recortarTurno(turno, { ...PERMISOS_POR_DEFECTO, contactarCliente: false }),
    { ...turno, customer_phone: null },
  );

  // El nombre del cliente NO es parte de ningún permiso: sin saber a quién
  // atiende, la agenda no sirve para nada.
  check(
    "el nombre del cliente nunca se recorta",
    recortarTurno(turno, {
      verGanancias: false,
      confirmar: false,
      cancelar: false,
      contactarCliente: false,
    }).customer_name,
    "Joaquín",
  );
}

// ── Qué acción habilita cada permiso ────────────────────────────────────────
check(
  "sin permiso de cancelar no puede cancelar",
  puedeCambiarEstado("cancelled", { ...PERMISOS_POR_DEFECTO, cancelar: false }),
  false,
);
check(
  "pero sí puede confirmar",
  puedeCambiarEstado("confirmed", { ...PERMISOS_POR_DEFECTO, cancelar: false }),
  true,
);
check(
  "y al revés",
  puedeCambiarEstado("confirmed", { ...PERMISOS_POR_DEFECTO, confirmar: false }),
  false,
);

// ── Lo que llega del dueño ──────────────────────────────────────────────────
check(
  "del body solo se toman los booleanos, el resto se ignora",
  permisosDesdeBody({
    verGanancias: false,
    cancelar: "sí",
    otraCosa: true,
    confirmar: true,
  }),
  { verGanancias: false, confirmar: true },
);

check(
  "un body vacío no cambia nada",
  aColumnas(permisosDesdeBody({})),
  {},
);

check(
  "se traduce a las columnas de la base",
  aColumnas({ verGanancias: false, contactarCliente: true }),
  { can_see_earnings: false, can_contact_client: true },
);

console.log(`\n${passed} pasaron, ${failed} fallaron`);
if (failed > 0) process.exit(1);
