import "server-only";

import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * Lectura del catálogo de productos para lo PÚBLICO (página de la barbería y,
 * más adelante, la reserva). Feature 035.
 *
 * La tabla no tiene políticas para `anon`: se lee acá, en el servidor, y se
 * devuelve solo lo que un cliente tiene que ver. Nada de paths internos ni de
 * productos agotados o borrados.
 */

export type ProductoPublico = {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string | null;
  public_url: string | null;
};

/**
 * Los productos disponibles de una barbería, en el orden que eligió el dueño.
 *
 * Si algo falla devuelve una lista vacía: la página de la barbería y la
 * reserva tienen que seguir andando igual sin el catálogo. El error se
 * registra — salvo "la tabla no existe", que es una instalación sin la
 * migración y no una falla.
 *
 * Quien llama decide si el PLAN de la barbería incluye el catálogo; esta
 * función no lo mira.
 */
export async function listAvailableProducts(
  barbershopSlug: string,
): Promise<ProductoPublico[]> {
  try {
    const { data, error } = await getSupabaseAdminClient()
      .from("barbershop_products" as never)
      .select("id, name, price, category, description, public_url")
      .eq("barbershop_slug", barbershopSlug)
      .eq("is_available", true)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      const code = (error as { code?: string }).code;
      if (code !== "42P01" && code !== "PGRST205") {
        Sentry.captureException(error, { tags: { helper: "productos", step: "list" } });
      }
      return [];
    }
    return (data ?? []) as unknown as ProductoPublico[];
  } catch (error) {
    Sentry.captureException(error, { tags: { helper: "productos", step: "list" } });
    return [];
  }
}
