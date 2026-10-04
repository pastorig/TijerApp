/**
 * Tests del cierre automático del día y del pedido de reseña (feature 033).
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-cierre-del-dia.ts
 */
import {
  claveCliente,
  debeCerrarse,
  diaAnterior,
  elegirPedidosDeResena,
  enVentanaDeResena,
  type TurnoParaResena,
} from "../src/lib/cierre-del-dia.ts";

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

const HOY = "2026-10-04";

// ── Qué se cierra ───────────────────────────────────────────────────────────
check(
  "un pendiente de ayer se cierra",
  debeCerrarse({ status: "pending", appointment_date: "2026-10-03" }, HOY),
  true,
);
check(
  "un pendiente de hace tres meses también (los 233 viejos)",
  debeCerrarse({ status: "pending", appointment_date: "2026-07-13" }, HOY),
  true,
);
// El barbero tiene el día entero para marcar un "no vino".
check(
  "un pendiente de HOY no se cierra, aunque ya haya pasado su hora",
  debeCerrarse({ status: "pending", appointment_date: HOY }, HOY),
  false,
);
check(
  "uno de mañana tampoco",
  debeCerrarse({ status: "pending", appointment_date: "2026-10-05" }, HOY),
  false,
);
for (const status of ["confirmed", "cancelled", "deleted"]) {
  check(
    `un turno ${status} no se toca`,
    debeCerrarse({ status, appointment_date: "2026-10-03" }, HOY),
    false,
  );
}
// Seña pedida y sin pagar: ese turno nunca terminó de reservarse.
for (const deposit_status of ["pending", "expired", "failed", null]) {
  check(
    `con seña pedida y estado ${deposit_status} no se cierra`,
    debeCerrarse(
      { status: "pending", appointment_date: "2026-10-03", deposit_required: true, deposit_status },
      HOY,
    ),
    false,
  );
}
check(
  "con la seña paga sí se cierra",
  debeCerrarse(
    { status: "pending", appointment_date: "2026-10-03", deposit_required: true, deposit_status: "paid" },
    HOY,
  ),
  true,
);
check(
  "sin seña pedida, el estado de la seña no importa",
  debeCerrarse(
    { status: "pending", appointment_date: "2026-10-03", deposit_required: false, deposit_status: null },
    HOY,
  ),
  true,
);

// ── Ventana y fechas ────────────────────────────────────────────────────────
check("a las 9 todavía no se piden reseñas", enVentanaDeResena(9), false);
check("a las 10 sí", enVentanaDeResena(10), true);
check("a las 12 sí", enVentanaDeResena(12), true);
check("a las 13 ya no", enVentanaDeResena(13), false);
check("a la medianoche no", enVentanaDeResena(0), false);
check("el día anterior", diaAnterior("2026-10-04"), "2026-10-03");
check("cruza el mes", diaAnterior("2026-10-01"), "2026-09-30");
check("cruza el año", diaAnterior("2027-01-01"), "2026-12-31");
check("marzo en bisiesto", diaAnterior("2028-03-01"), "2028-02-29");

// ── A quién se le pide reseña ───────────────────────────────────────────────
const turno = (id: string, extra: Partial<TurnoParaResena> = {}): TurnoParaResena => ({
  id,
  barbershop_slug: "barber",
  status: "confirmed",
  customer_email: `${id}@mail.com`,
  confirmation_token: `tok-${id}`,
  ...extra,
});
const vacio = {
  conResena: new Set<string>(),
  yaPedidos: new Set<string>(),
  pedidosRecientes: new Set<string>(),
  barberiasEnLectura: new Set<string>(),
};
const ids = (r: ReturnType<typeof elegirPedidosDeResena>) => r.pedir.map((t) => t.id);
const motivo = (r: ReturnType<typeof elegirPedidosDeResena>, id: string) =>
  r.descartados.find((d) => d.id === id)?.motivo ?? null;

check(
  "confirmado, con mail y con link: se le pide",
  ids(elegirPedidosDeResena({ ...vacio, turnos: [turno("a")] })),
  ["a"],
);

let r = elegirPedidosDeResena({
  ...vacio,
  turnos: [
    turno("pendiente", { status: "pending" }),
    turno("cancelado", { status: "cancelled" }),
    turno("sinmail", { customer_email: null }),
    turno("mailvacio", { customer_email: "   " }),
    turno("sinlink", { confirmation_token: null }),
  ],
});
check("ninguno de esos recibe pedido", ids(r), []);
check("pendiente: no confirmado", motivo(r, "pendiente"), "no confirmado");
// El "no vino" llega como cancelado: es la forma de frenar el pedido.
check("cancelado (el 'no vino'): no confirmado", motivo(r, "cancelado"), "no confirmado");
check("sin mail", motivo(r, "sinmail"), "sin mail");
check("mail en blanco cuenta como sin mail", motivo(r, "mailvacio"), "sin mail");
check("sin token no hay link que mandar", motivo(r, "sinlink"), "sin link");

r = elegirPedidosDeResena({
  ...vacio,
  turnos: [turno("a"), turno("b"), turno("c", { barbershop_slug: "vencida" })],
  conResena: new Set(["a"]),
  yaPedidos: new Set(["b"]),
  barberiasEnLectura: new Set(["vencida"]),
});
check("con reseña, ya pedido o barbería vencida: ninguno", ids(r), []);
check("ya tiene reseña", motivo(r, "a"), "ya tiene reseña");
check("ya se le pidió por este turno", motivo(r, "b"), "ya se le pidió por este turno");
check("barbería en modo lectura", motivo(r, "c"), "barbería en modo lectura");

// Uno cada 90 días por cliente y barbería.
r = elegirPedidosDeResena({
  ...vacio,
  turnos: [
    turno("frecuente", { customer_email: "Juan@Mail.com " }),
    turno("otra", { customer_email: "juan@mail.com", barbershop_slug: "leocuts" }),
  ],
  pedidosRecientes: new Set([claveCliente("barber", "juan@mail.com")]),
});
check(
  "al que se le pidió hace poco EN ESA barbería no; en otra barbería sí",
  ids(r),
  ["otra"],
);
check(
  "el mail se compara sin mayúsculas ni espacios",
  motivo(r, "frecuente"),
  "se le pidió hace poco",
);

// El padre que sacó turno para él y para el hijo con el mismo mail.
r = elegirPedidosDeResena({
  ...vacio,
  turnos: [
    turno("padre", { customer_email: "familia@mail.com" }),
    turno("hijo", { customer_email: "familia@mail.com" }),
  ],
});
check("dos turnos de ayer del mismo cliente: un solo pedido", ids(r), ["padre"]);
check(
  "y el segundo queda explicado",
  motivo(r, "hijo"),
  "mismo cliente, otro turno de ayer",
);

console.log(`\n${passed} pasaron, ${failed} fallaron`);
if (failed > 0) process.exit(1);
