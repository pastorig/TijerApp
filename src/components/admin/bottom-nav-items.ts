/**
 * Qué va en la barra de abajo del celular y qué en "Más" (feature 041).
 * Sale de la misma fuente que el menú lateral (`admin-nav.ts`), así una
 * sección nueva aparece sola en "Más" y respeta el plan.
 */
import {
  getAdminNavGroups,
  itemIsActive,
  visibleItems,
  type AdminNavItem,
  type CanUseFeature,
} from "@/components/admin/admin-nav";

/** Las tres de la barra (más el ＋ y "Más"): lo que el barbero usa todo el día. */
const EN_LA_BARRA = ["", "/turnero", "/clientes"] as const;

export type SeccionDelMas = { titulo: string; items: AdminNavItem[] };

export function itemsDeLaBarra(slug: string, canUse: CanUseFeature): AdminNavItem[] {
  const base = `/${slug}/admin`;
  const todos = getAdminNavGroups(slug).flatMap((g) => visibleItems(g, canUse));
  return EN_LA_BARRA.map((sufijo) => todos.find((i) => i.href === base + sufijo)).filter(
    (i): i is AdminNavItem => Boolean(i),
  );
}

/** El resto, agrupado como en el menú lateral, sin las que ya están en la barra. */
export function seccionesDelMas(slug: string, canUse: CanUseFeature): SeccionDelMas[] {
  const enLaBarra = new Set(itemsDeLaBarra(slug, canUse).map((i) => i.href));
  return getAdminNavGroups(slug)
    .map((g) => ({ titulo: g.label, items: visibleItems(g, canUse).filter((i) => !enLaBarra.has(i.href)) }))
    .filter((s) => s.items.length > 0);
}

/** La sección actual está en "Más" (y no en la barra): "Más" se marca elegido. */
export function estaEnElMas(slug: string, pathname: string, canUse: CanUseFeature): boolean {
  const barra = itemsDeLaBarra(slug, canUse);
  if (barra.some((i) => itemIsActive(i, pathname))) return false;
  return seccionesDelMas(slug, canUse).some((s) => s.items.some((i) => itemIsActive(i, pathname)));
}
