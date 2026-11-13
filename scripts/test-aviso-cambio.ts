/**
 * Tests del aviso por WhatsApp cuando el cliente cancela o cambia el horario
 * desde el link de su turno. Lo pidió un barbero el 12/11/2026: "muchos me lo
 * reagendan y no me llegan notificaciones".
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-aviso-cambio.ts
 */
import {
  linkDeAvisoDeCambio,
  mensajeDeCambio,
  telefonoParaAvisos,
} from "../src/lib/aviso-cambio-cliente.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(got)}`}`);
  if (ok) passed++;
  else failed++;
}

const barberos = [
  { name: "Esteban Perez", displayName: "Esteban", whatsapp: "+54 9 351 600-1111" },
  { name: "Matias Rojas", whatsapp: "" },
];

// ── A quién se avisa: igual que la reserva ──────────────────────────────────
check("al barbero del turno si tiene número", telefonoParaAvisos(barberos, "Esteban", "3571 566221"), "5493516001111");
check("se lo encuentra por el nombre completo también", telefonoParaAvisos(barberos, "esteban perez", "3571 566221"), "5493516001111");
check("si el barbero no tiene número, a la barbería", telefonoParaAvisos(barberos, "Matias Rojas", "3571 566221"), "3571566221");
check("barbero que ya no está: a la barbería", telefonoParaAvisos(barberos, "Otro", "3571 566221"), "3571566221");
check("sin ningún número no hay aviso", telefonoParaAvisos(barberos, "Matias Rojas", ""), null);
check("un número de relleno no sirve", telefonoParaAvisos([], "X", "000"), null);

// ── El mensaje ──────────────────────────────────────────────────────────────
const cancelo = mensajeDeCambio({
  cliente: "Juan",
  barbero: "Esteban",
  servicio: "Corte",
  cambio: { tipo: "cancelo", fecha: "2026-11-19", hora: "16:20:00" },
});
check("cancelación: dice quién, que canceló y cuándo era", cancelo, "Hola, soy Juan. Cancelé mi turno.\n\nEra el jueves 19/11 a las 16:20\nServicio: Corte\nBarbero: Esteban");

const reagendo = mensajeDeCambio({
  cliente: "Juan",
  barbero: "Esteban",
  servicio: "Corte",
  cambio: { tipo: "reagendo", fecha: "2026-11-19", hora: "16:20:00", fechaNueva: "2026-11-21", horaNueva: "10:00" },
});
check("cambio de horario: el de antes y el de ahora", reagendo, "Hola, soy Juan. Cambié el horario de mi turno.\n\nAntes: jueves 19/11 a las 16:20\nAhora: sábado 21/11 a las 10:00\nServicio: Corte\nBarbero: Esteban");

const link = linkDeAvisoDeCambio("5493516001111", "Hola & chau");
check("link directo a WhatsApp con el texto codificado", link, "https://api.whatsapp.com/send/?phone=5493516001111&text=Hola%20%26%20chau&type=phone_number&app_absent=0");

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
