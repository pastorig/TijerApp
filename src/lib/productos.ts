/**
 * Catálogo de productos (feature 035): las reglas, sin base de datos ni
 * pantalla. Lo usan el panel, el servidor y la reserva, para que los tres
 * digan lo mismo sobre qué es un producto válido y cuánto se puede pedir.
 */

/**
 * Lista corta y fija. Con texto libre, "cera", "Ceras" y "cera mate" terminan
 * siendo tres categorías y el catálogo no se puede agrupar.
 */
export const CATEGORIAS_DE_PRODUCTO = [
  { key: "cera", label: "Cera" },
  { key: "pomada", label: "Pomada" },
  { key: "polvo", label: "Polvo texturizador" },
  { key: "barba", label: "Barba" },
  { key: "cuidado", label: "Shampoo y cuidado" },
  { key: "otro", label: "Otro" },
] as const;

export type CategoriaDeProducto = (typeof CATEGORIAS_DE_PRODUCTO)[number]["key"];

/** Una barbería vende pocos productos; el tope evita un catálogo interminable en la reserva. */
export const MAX_PRODUCTOS_POR_BARBERIA = 40;
/** Por turno: cuántas unidades de un mismo producto y cuántos productos distintos. */
export const MAX_UNIDADES_POR_PRODUCTO = 5;
export const MAX_RENGLONES_POR_TURNO = 10;

export const LARGO_MAX_NOMBRE = 60;
export const LARGO_MAX_DESCRIPCION = 160;

export function esCategoriaDeProducto(valor: unknown): valor is CategoriaDeProducto {
  return CATEGORIAS_DE_PRODUCTO.some((c) => c.key === valor);
}

export function etiquetaDeCategoria(key: string): string {
  return CATEGORIAS_DE_PRODUCTO.find((c) => c.key === key)?.label ?? "Otro";
}

export type DatosDeProducto = {
  name: string;
  price: number;
  category: CategoriaDeProducto;
  description: string | null;
};

type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string };

/**
 * Lee un precio escrito por una persona. Acepta "8000", "8.000" y "$ 8.000"
 * (el punto es separador de miles en Argentina). No acepta centavos: los
 * precios del catálogo son pesos enteros, como los servicios.
 */
export function leerPrecio(valor: unknown): number | null {
  if (typeof valor === "number") {
    return Number.isInteger(valor) ? valor : null;
  }
  if (typeof valor !== "string") return null;
  const limpio = valor.replace(/[\s$]/g, "");
  if (!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(limpio)) return null;
  return Number(limpio.replace(/\./g, ""));
}

/** Valida lo que se va a guardar de un producto. Devuelve los datos ya limpios. */
export function validarProducto(input: {
  name?: unknown;
  price?: unknown;
  category?: unknown;
  description?: unknown;
}): Resultado<DatosDeProducto> {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 2) {
    return { ok: false, error: "Ponele un nombre al producto." };
  }
  if (name.length > LARGO_MAX_NOMBRE) {
    return {
      ok: false,
      error: `El nombre no puede pasar de ${LARGO_MAX_NOMBRE} letras.`,
    };
  }

  const price = leerPrecio(input.price);
  if (price === null || price <= 0) {
    return { ok: false, error: "Ponele un precio en pesos, sin centavos." };
  }
  if (price >= 10_000_000) {
    return { ok: false, error: "Ese precio es demasiado alto." };
  }

  if (!esCategoriaDeProducto(input.category)) {
    return { ok: false, error: "Elegí una categoría." };
  }

  const descripcion =
    typeof input.description === "string" ? input.description.trim() : "";
  if (descripcion.length > LARGO_MAX_DESCRIPCION) {
    return {
      ok: false,
      error: `La descripción no puede pasar de ${LARGO_MAX_DESCRIPCION} letras.`,
    };
  }

  return {
    ok: true,
    valor: {
      name,
      price,
      category: input.category,
      description: descripcion || null,
    },
  };
}

export type RenglonDePedido = { id: string; cantidad: number };

/**
 * Deja prolijo el pedido de productos que manda el navegador al reservar.
 *
 * Del navegador solo se acepta QUÉ producto y CUÁNTOS: el precio, el nombre y
 * si está disponible los resuelve el servidor contra la base. Un pedido que no
 * respeta los topes se rechaza entero (no se recorta en silencio: el cliente
 * tiene que saber que no se le anotó lo que pidió).
 */
export function normalizarPedido(raw: unknown): Resultado<RenglonDePedido[]> {
  if (raw === undefined || raw === null) return { ok: true, valor: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, error: "El pedido de productos no es válido." };
  }

  const porProducto = new Map<string, number>();
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "El pedido de productos no es válido." };
    }
    const { id, cantidad } = item as { id?: unknown; cantidad?: unknown };
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
      return { ok: false, error: "El pedido de productos no es válido." };
    }
    if (typeof cantidad !== "number" || !Number.isInteger(cantidad) || cantidad < 1) {
      return { ok: false, error: "La cantidad de un producto no es válida." };
    }
    // El mismo producto dos veces se suma: es lo que el cliente quiso decir.
    porProducto.set(id, (porProducto.get(id) ?? 0) + cantidad);
  }

  if (porProducto.size > MAX_RENGLONES_POR_TURNO) {
    return {
      ok: false,
      error: `Se pueden sumar hasta ${MAX_RENGLONES_POR_TURNO} productos distintos por turno.`,
    };
  }
  for (const cantidad of porProducto.values()) {
    if (cantidad > MAX_UNIDADES_POR_PRODUCTO) {
      return {
        ok: false,
        error: `Se pueden sumar hasta ${MAX_UNIDADES_POR_PRODUCTO} unidades de cada producto.`,
      };
    }
  }

  return {
    ok: true,
    valor: [...porProducto.entries()].map(([id, cantidad]) => ({ id, cantidad })),
  };
}

/** Cuánto suman los productos de un turno. */
export function totalDeProductos(
  renglones: ReadonlyArray<{ unit_price: number; quantity: number }>,
): number {
  return renglones.reduce((suma, r) => suma + r.unit_price * r.quantity, 0);
}
