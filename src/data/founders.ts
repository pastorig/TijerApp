/**
 * Fundadores TijerApp — las primeras barberías que confiaron.
 *
 * Se muestran en la sección "Fundadores" de /precios (FoundersWall). La
 * mención es OPCIONAL: solo entra acá quien dio el OK explícito de aparecer
 * con su marca, y `quote` solo si además autorizó publicar su testimonio.
 *
 * Módulo de datos puro (sin "use client") para poder importarlo desde
 * Server Components sin arrastrar el bundle del cliente.
 */

export type Founder = {
  /** Slug de la barbería en TijerApp. */
  slug: string;
  /** Nombre tal cual pidió que aparezca. */
  name: string;
  /** Logo en /public/fundadores/. Si es null se muestran las iniciales. */
  logoSrc: string | null;
  /** URL completa de Instagram, o null si no la compartió / no quiere link. */
  instagram: string | null;
  /** Testimonio textual. Solo con autorización explícita para publicarlo. */
  quote: string | null;
  /** Ciudad/zona, opcional — da contexto local. */
  location: string | null;
};

/** Cupos totales del Programa Fundadores (primeros 10 clientes). */
export const FOUNDER_SPOTS = 10;

/**
 * Slugs con status de Fundador → habilita el badge en el panel admin.
 *
 * Deliberadamente una constante y no una columna en la DB: son 10 clientes
 * como máximo y no cambia solo, así que una migración + join por request no
 * se justifica. Si el programa creciera, migrar a `barbershops.is_founder`.
 *
 * Es una lista APARTE de `founders` porque son dos permisos distintos: se
 * puede ser Fundador (badge) sin querer aparecer públicamente en el sitio.
 */
export const FOUNDER_SLUGS: readonly string[] = ["leocuts"];

export function isFounder(barbershopSlug: string): boolean {
  return FOUNDER_SLUGS.includes(barbershopSlug);
}

export const founders: Founder[] = [
  {
    slug: "leocuts",
    name: "Leo Cuts",
    logoSrc: "/fundadores/leocuts.jpeg",
    instagram: "https://instagram.com/leoo.cts",
    quote:
      "De 10 la verdad, me ayudó muchísimo con la organización y a todos mis clientes les encantó porque es muy práctico para usar.",
    location: null,
  },
];

/** Iniciales (máx 2) para el fallback cuando no hay logo. */
export function founderInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
