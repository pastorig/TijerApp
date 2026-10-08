/**
 * Tests del catálogo de productos (feature 035).
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-productos.ts
 */
import {
  etiquetaDeCategoria,
  leerPrecio,
  normalizarPedido,
  totalDeProductos,
  validarProducto,
} from "../src/lib/productos.ts";

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

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

// ── Precio escrito a mano ───────────────────────────────────────────────────
check("número pelado", leerPrecio("8000"), 8000);
check("con punto de miles", leerPrecio("8.000"), 8000);
check("con signo y espacio", leerPrecio("$ 12.500"), 12500);
check("millón", leerPrecio("1.250.000"), 1250000);
check("número de verdad", leerPrecio(8000), 8000);
// "1.500,50" leído con replace(",", ".") daba 1,5: acá directamente no entra.
check("con centavos no se acepta", leerPrecio("1.500,50"), null);
check("punto mal puesto no se acepta", leerPrecio("80.00"), null);
check("texto no se acepta", leerPrecio("ocho mil"), null);
check("vacío no se acepta", leerPrecio(""), null);
check("decimal no se acepta", leerPrecio(8000.5), null);

// ── Validar un producto ─────────────────────────────────────────────────────
const bueno = { name: "  Cera mate  ", price: "8.000", category: "cera", description: " Fijación fuerte " };
check("producto válido, ya limpio", validarProducto(bueno), {
  ok: true,
  valor: { name: "Cera mate", price: 8000, category: "cera", description: "Fijación fuerte" },
});
check(
  "sin descripción queda en null",
  validarProducto({ ...bueno, description: "   " }),
  { ok: true, valor: { name: "Cera mate", price: 8000, category: "cera", description: null } },
);
check("sin nombre", validarProducto({ ...bueno, name: " " }).ok, false);
check("nombre de una letra", validarProducto({ ...bueno, name: "C" }).ok, false);
check("nombre larguísimo", validarProducto({ ...bueno, name: "x".repeat(61) }).ok, false);
check("precio cero", validarProducto({ ...bueno, price: 0 }).ok, false);
check("precio negativo", validarProducto({ ...bueno, price: -100 }).ok, false);
check("precio con centavos", validarProducto({ ...bueno, price: "8.000,50" }).ok, false);
check("precio absurdo", validarProducto({ ...bueno, price: 10_000_000 }).ok, false);
check("categoría inventada", validarProducto({ ...bueno, category: "gel" }).ok, false);
check("sin categoría", validarProducto({ ...bueno, category: undefined }).ok, false);
check("descripción larguísima", validarProducto({ ...bueno, description: "x".repeat(161) }).ok, false);
check("etiqueta de una categoría", etiquetaDeCategoria("polvo"), "Polvo texturizador");
check("etiqueta de una desconocida", etiquetaDeCategoria("gel"), "Otro");

// ── El pedido que llega al reservar ─────────────────────────────────────────
check("sin productos es un pedido vacío", normalizarPedido(undefined), { ok: true, valor: [] });
check("null también", normalizarPedido(null), { ok: true, valor: [] });
check("lista vacía", normalizarPedido([]), { ok: true, valor: [] });
check("un producto", normalizarPedido([{ id: ID_A, cantidad: 1 }]), {
  ok: true,
  valor: [{ id: ID_A, cantidad: 1 }],
});
check(
  "el mismo producto dos veces se suma",
  normalizarPedido([{ id: ID_A, cantidad: 2 }, { id: ID_B, cantidad: 1 }, { id: ID_A, cantidad: 1 }]),
  { ok: true, valor: [{ id: ID_A, cantidad: 3 }, { id: ID_B, cantidad: 1 }] },
);
check("5 unidades entra", normalizarPedido([{ id: ID_A, cantidad: 5 }]).ok, true);
check("6 unidades no", normalizarPedido([{ id: ID_A, cantidad: 6 }]).ok, false);
check(
  "sumando repetidos tampoco se pasa del tope",
  normalizarPedido([{ id: ID_A, cantidad: 3 }, { id: ID_A, cantidad: 3 }]).ok,
  false,
);
check("cantidad cero", normalizarPedido([{ id: ID_A, cantidad: 0 }]).ok, false);
check("cantidad negativa", normalizarPedido([{ id: ID_A, cantidad: -1 }]).ok, false);
check("cantidad con decimales", normalizarPedido([{ id: ID_A, cantidad: 1.5 }]).ok, false);
check("cantidad como texto", normalizarPedido([{ id: ID_A, cantidad: "2" }]).ok, false);
check("id que no es un id", normalizarPedido([{ id: "cera", cantidad: 1 }]).ok, false);
check("renglón sin id", normalizarPedido([{ cantidad: 1 }]).ok, false);
check("no es una lista", normalizarPedido({ id: ID_A, cantidad: 1 }).ok, false);
check("renglón que no es un objeto", normalizarPedido(["cera"]).ok, false);
const once = Array.from({ length: 11 }, (_, i) => ({
  id: `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`,
  cantidad: 1,
}));
check("10 productos distintos entra", normalizarPedido(once.slice(0, 10)).ok, true);
check("11 no", normalizarPedido(once).ok, false);
// El precio NO se acepta del navegador: aunque venga, no sale del otro lado.
check(
  "un precio colado en el pedido se ignora",
  normalizarPedido([{ id: ID_A, cantidad: 1, unit_price: 1 }]),
  { ok: true, valor: [{ id: ID_A, cantidad: 1 }] },
);

// ── Total ───────────────────────────────────────────────────────────────────
check("total sin productos", totalDeProductos([]), 0);
check(
  "total con cantidades",
  totalDeProductos([
    { unit_price: 8000, quantity: 2 },
    { unit_price: 12500, quantity: 1 },
  ]),
  28500,
);

console.log(`\n${passed} pasaron, ${failed} fallaron`);
if (failed > 0) process.exit(1);
