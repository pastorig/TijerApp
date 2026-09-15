/**
 * Tests de la activación desde crmsaas (lógica pura, sin DB ni red).
 *
 * Lo que se cuida: que un pedido mal armado no llegue a la base, que el
 * importe no pase por punto flotante, y que dos pedidos con el mismo contenido
 * den el mismo hash (de eso depende no cobrar dos veces).
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-crm-activate.ts
 */
import {
  parseActivationBody,
  requestHashOf,
  rpcErrorResponse,
} from "../src/lib/crm-activate.ts";

let passed = 0;
let failed = 0;

function check(name: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${expected}, obtenido ${got}`}`);
  if (ok) passed++;
  else failed++;
}

function pedido(extra: Record<string, unknown> = {}) {
  return {
    contractVersion: 1,
    commandId: "aaaaaaaa-0000-4000-8000-000000000001",
    accountExternalId: "11111111-1111-4111-8111-111111111111",
    amount: "12000",
    currency: "ARS",
    method: "transferencia",
    reference: "  comprobante 123  ",
    paidAt: "2026-09-15T12:00:00-03:00",
    coverageStart: "2026-09-15T00:00:00.000Z",
    coverageEnd: "2026-10-15T00:00:00.000Z",
    ...extra,
  };
}

function campoConError(body: unknown): string {
  const r = parseActivationBody(body);
  return r.ok ? "(ninguno)" : Object.keys(r.fields).sort().join(",");
}

console.log("\n— Un pedido válido —");
{
  const r = parseActivationBody(pedido());
  check("se acepta", r.ok, true);
  if (r.ok) {
    check("el importe queda con dos decimales", r.data.amount, "12000.00");
    check("la referencia se recorta", r.data.reference, "comprobante 123");
    check("las fechas se normalizan a UTC", r.data.paidAt, "2026-09-15T15:00:00.000Z");
    check("el pagado hasta viaja entero", r.data.coverageEnd, "2026-10-15T00:00:00.000Z");
  }
}
{
  const r = parseActivationBody(pedido({ amount: "100.5", reference: "" }));
  check("un decimal de un dígito se completa", r.ok && r.data.amount, "100.50");
  check("una referencia vacía es null", r.ok && r.data.reference, null);
}
{
  const r = parseActivationBody(pedido({ reference: undefined }));
  check("sin referencia también se acepta", r.ok && r.data.reference, null);
}

console.log("\n— Lo que no llega a la base —");
check("otra versión del contrato", campoConError(pedido({ contractVersion: 2 })), "contractVersion");
check("un body que no es objeto", campoConError("hola"), "body");
check("commandId que no es uuid", campoConError(pedido({ commandId: "123" })), "commandId");
check("cuenta que no es uuid", campoConError(pedido({ accountExternalId: "lopez" })), "accountExternalId");
check("importe cero", campoConError(pedido({ amount: "0" })), "amount");
check("importe negativo", campoConError(pedido({ amount: "-100" })), "amount");
check("importe como número de JS", campoConError(pedido({ amount: 12000 })), "amount");
check("importe con tres decimales", campoConError(pedido({ amount: "10.555" })), "amount");
check("otra moneda", campoConError(pedido({ currency: "USD" })), "currency");
check("medio desconocido", campoConError(pedido({ method: "cheque" })), "method");
check("referencia larguísima", campoConError(pedido({ reference: "x".repeat(121) })), "reference");
check("fecha ilegible", campoConError(pedido({ paidAt: "ayer" })), "paidAt");
check(
  "la cobertura no puede terminar antes de empezar",
  campoConError(pedido({ coverageEnd: "2026-09-01T00:00:00.000Z" })),
  "coverageEnd",
);
check(
  "ni terminar el mismo instante",
  campoConError(pedido({ coverageEnd: "2026-09-15T00:00:00.000Z" })),
  "coverageEnd",
);

console.log("\n— Hash del pedido —");
{
  const a = parseActivationBody(pedido());
  const b = parseActivationBody(pedido({ amount: "12000.00", reference: "comprobante 123" }));
  const c = parseActivationBody(pedido({ amount: "12001" }));
  if (a.ok && b.ok && c.ok) {
    check("el mismo contenido escrito distinto da el mismo hash", requestHashOf(a.data), requestHashOf(b.data));
    check("otro importe da otro hash", requestHashOf(a.data) === requestHashOf(c.data), false);
    check("es un sha256 en hex", /^[0-9a-f]{64}$/.test(requestHashOf(a.data)), true);
  } else {
    check("los tres pedidos del hash son válidos", false, true);
  }
}

console.log("\n— Errores de la RPC —");
check("cuenta inexistente es 404", rpcErrorResponse("account_not_found")?.status, 404);
check("mismo commandId con otro contenido es 409", rpcErrorResponse("command_conflict")?.status, 409);
check("y se contesta con su código", rpcErrorResponse("command_conflict")?.error, "command_conflict");
check("cualquier otro error no se traduce", rpcErrorResponse("connection reset"), null);

console.log(`\n${passed} pasaron, ${failed} fallaron`);
if (failed > 0) process.exit(1);
