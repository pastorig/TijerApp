import "server-only";

import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { ProductoDeTurno, RenglonDePedido } from "@/lib/productos";

/**
 * Lectura y guardado del catálogo de productos del lado del servidor
 * (feature 035).
 *
 * Las tablas no tienen políticas para `anon`: lo público se lee acá y se
 * devuelve solo lo que un cliente tiene que ver. Nada de paths internos ni de
 * productos agotados o borrados.
 *
 * Regla de todo el archivo: **ninguna función tira**. Si algo falla, devuelven
 * vacío o `false` y registran el error. La página de la barbería, la reserva y
 * la agenda tienen que seguir andando igual sin el catálogo.
 */

export type ProductoPublico = {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string | null;
  public_url: string | null;
};

const TABLA_DE_CATALOGO = "barbershop_products" as never;
const TABLA_DE_TURNO = "appointment_products" as never;

/** "Esa tabla no existe": una instalación sin la migración, no una falla. */
function esTablaFaltante(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "42P01" || code === "PGRST205";
}

function registrar(error: unknown, step: string) {
  if (esTablaFaltante(error)) return;
  Sentry.captureException(error, { tags: { helper: "productos", step } });
}

/**
 * Los productos disponibles de una barbería, en el orden que eligió el dueño.
 *
 * Quien llama decide si el PLAN de la barbería incluye el catálogo; esta
 * función no lo mira.
 */
export async function listAvailableProducts(
  barbershopSlug: string,
): Promise<ProductoPublico[]> {
  try {
    const { data, error } = await getSupabaseAdminClient()
      .from(TABLA_DE_CATALOGO)
      .select("id, name, price, category, description, public_url")
      .eq("barbershop_slug", barbershopSlug)
      .eq("is_available", true)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      registrar(error, "list");
      return [];
    }
    return (data ?? []) as unknown as ProductoPublico[];
  } catch (error) {
    registrar(error, "list");
    return [];
  }
}

// ── Productos de un turno (etapa C) ─────────────────────────────────────────

export type FilaDeProductoDeTurno = ProductoDeTurno & { product_id: string };

/** Cómo se nombra, en el aviso al cliente, un producto que ya no existe. */
const SIN_NOMBRE = "un producto";

/**
 * Resuelve contra la base el pedido de productos de una reserva.
 *
 * Del navegador llegó solo QUÉ y CUÁNTOS. Acá sale, para cada uno, el nombre y
 * el precio reales, y se separa lo que no se puede sumar: un producto de otra
 * barbería, borrado o que el dueño marcó agotado mientras el cliente
 * reservaba. Lo descartado vuelve con nombre cuando se lo conoce, para poder
 * decirle al cliente cuál fue.
 */
export async function resolverPedidoDeProductos(
  barbershopSlug: string,
  renglones: ReadonlyArray<RenglonDePedido>,
): Promise<{ filas: FilaDeProductoDeTurno[]; noSumados: string[] }> {
  if (renglones.length === 0) return { filas: [], noSumados: [] };
  try {
    const { data, error } = await getSupabaseAdminClient()
      .from(TABLA_DE_CATALOGO)
      .select("id, name, price, is_available, deleted_at")
      // El filtro por barbería es lo que impide sumar un producto ajeno.
      .eq("barbershop_slug", barbershopSlug)
      .in(
        "id",
        renglones.map((r) => r.id),
      );
    if (error) {
      registrar(error, "resolver");
      return { filas: [], noSumados: renglones.map(() => SIN_NOMBRE) };
    }
    const porId = new Map(
      (
        (data ?? []) as unknown as Array<{
          id: string;
          name: string;
          price: number;
          is_available: boolean;
          deleted_at: string | null;
        }>
      ).map((p) => [p.id, p]),
    );
    const filas: FilaDeProductoDeTurno[] = [];
    const noSumados: string[] = [];
    for (const renglon of renglones) {
      const producto = porId.get(renglon.id);
      if (!producto) {
        noSumados.push(SIN_NOMBRE);
      } else if (!producto.is_available || producto.deleted_at) {
        noSumados.push(producto.name);
      } else {
        filas.push({
          product_id: producto.id,
          product_name: producto.name,
          unit_price: producto.price,
          quantity: renglon.cantidad,
        });
      }
    }
    return { filas, noSumados };
  } catch (error) {
    registrar(error, "resolver");
    return { filas: [], noSumados: renglones.map(() => SIN_NOMBRE) };
  }
}

/**
 * Guarda los productos de un turno recién creado. Devuelve si quedaron.
 *
 * Va DESPUÉS del insert del turno y fuera de su transacción, a propósito: un
 * fallo acá se informa, no se revierte. Perder un turno por una cera es peor
 * que un turno sin su cera anotada.
 */
export async function guardarProductosDelTurno(
  appointmentId: string,
  barbershopSlug: string,
  filas: ReadonlyArray<FilaDeProductoDeTurno>,
): Promise<boolean> {
  if (filas.length === 0) return true;
  try {
    const { error } = await getSupabaseAdminClient()
      .from(TABLA_DE_TURNO)
      .insert(
        filas.map((f) => ({
          appointment_id: appointmentId,
          barbershop_slug: barbershopSlug,
          product_id: f.product_id,
          product_name: f.product_name,
          unit_price: f.unit_price,
          quantity: f.quantity,
        })) as never,
      );
    if (error) {
      registrar(error, "guardar");
      return false;
    }
    return true;
  } catch (error) {
    registrar(error, "guardar");
    return false;
  }
}

/**
 * Los productos de varios turnos, agrupados por turno. Una sola consulta para
 * todos los turnos del día, no una por turno.
 */
export async function productosDeTurnos(
  appointmentIds: ReadonlyArray<string>,
): Promise<Record<string, ProductoDeTurno[]>> {
  if (appointmentIds.length === 0) return {};
  try {
    const { data, error } = await getSupabaseAdminClient()
      .from(TABLA_DE_TURNO)
      .select("appointment_id, product_name, unit_price, quantity")
      .in("appointment_id", [...appointmentIds])
      .order("created_at", { ascending: true });
    if (error) {
      registrar(error, "de-turnos");
      return {};
    }
    const porTurno: Record<string, ProductoDeTurno[]> = {};
    for (const fila of (data ?? []) as unknown as Array<
      ProductoDeTurno & { appointment_id: string }
    >) {
      (porTurno[fila.appointment_id] ??= []).push({
        product_name: fila.product_name,
        unit_price: fila.unit_price,
        quantity: fila.quantity,
      });
    }
    return porTurno;
  } catch (error) {
    registrar(error, "de-turnos");
    return {};
  }
}

/** Los productos del turno que abre el cliente con su link (`/r/[token]`). */
export async function productosDelTurnoPorToken(
  token: string,
): Promise<ProductoDeTurno[]> {
  try {
    const { data: turno, error } = await getSupabaseAdminClient()
      .from("appointments")
      .select("id")
      .eq("confirmation_token", token)
      .maybeSingle();
    if (error || !turno?.id) return [];
    const porTurno = await productosDeTurnos([turno.id]);
    return porTurno[turno.id] ?? [];
  } catch (error) {
    registrar(error, "por-token");
    return [];
  }
}
