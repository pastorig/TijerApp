import { NextResponse } from "next/server";
import { hasFeature } from "@/lib/plans";
import { getBarbershopPlan } from "@/lib/plan-access";
import { listAvailableProducts } from "@/lib/server/productos";

export const runtime = "nodejs";

/**
 * GET /api/products?bs=<slug> — el catálogo que ve un cliente al reservar
 * (feature 035). Público y de solo lectura.
 *
 * Devuelve SOLO los productos disponibles y solo lo que el cliente necesita
 * ver. Si el plan de la barbería no trae el catálogo, o está vencido, la lista
 * vuelve vacía y el paso de la reserva directamente no aparece.
 */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("bs") ?? "";
  if (!slug.trim()) {
    return NextResponse.json({ productos: [] });
  }
  const plan = await getBarbershopPlan(slug);
  if (plan.isReadOnly || !hasFeature(plan.tier, "catalogo_productos")) {
    return NextResponse.json({ productos: [] });
  }
  const productos = await listAvailableProducts(slug);
  return NextResponse.json(
    { productos },
    // Un minuto de caché en el navegador: abrir la reserva dos veces seguidas
    // no vuelve a preguntar, y un producto recién agotado deja de ofrecerse
    // casi enseguida (el servidor lo vuelve a chequear al reservar).
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
