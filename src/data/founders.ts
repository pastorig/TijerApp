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

import { ahoraEnArgentina } from "@/lib/hora-argentina";

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
export const FOUNDER_SLUGS: readonly string[] = ["leocuts", "barber"];

export function isFounder(barbershopSlug: string): boolean {
  return FOUNDER_SLUGS.includes(barbershopSlug);
}

/**
 * Hasta cuándo le rige a cada fundador el PRECIO congelado (fecha argentina
 * inclusive, `YYYY-MM-DD`). `null` = el beneficio ya terminó y pasa a pagar la
 * lista.
 *
 * Está separado de `FOUNDER_SLUGS` a propósito: ser Fundador es permanente
 * —el badge del panel y el muro de /precios se quedan para siempre, es un
 * reconocimiento— y lo que vence es únicamente el descuento. Cuando las dos
 * cosas colgaban de `isFounder`, sacarle el precio a alguien le borraba
 * también el reconocimiento.
 *
 * Un slug que no figura acá nunca tuvo precio congelado.
 */
export const FOUNDER_PRICE_UNTIL: Readonly<Record<string, string | null>> = {
  // Fundador #1. Congelado hasta el 21/10/2026.
  leocuts: "2026-10-21",
  // Fundador #2 (SV Barber, renombrada de `sv-barber`). El beneficio terminó
  // el 09/09/2026: pasa a pagar Esencial de lista.
  barber: null,
};

/**
 * ¿Hoy le rige el precio de fundador? Decide si se le muestra el tier de abajo
 * o el precio de lista.
 *
 * La fecha se compara en hora argentina y no con `new Date()` a secas: esto
 * corre tanto en el navegador del barbero como en funciones de Vercel, que van
 * en UTC. Sin eso, el día del vencimiento el precio cambiaría tres horas antes
 * de tiempo para quien lo mire desde el servidor.
 */
export function tienePrecioDeFundador(
  barbershopSlug: string,
  hoyEnArgentina: Date = ahoraEnArgentina(),
): boolean {
  if (!isFounder(barbershopSlug)) return false;
  const hasta = FOUNDER_PRICE_UNTIL[barbershopSlug];
  if (!hasta) return false;
  return aYmd(hoyEnArgentina) <= hasta;
}

/** `YYYY-MM-DD` de un Date ya expresado en hora argentina. */
function aYmd(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
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
  {
    // Renombrada de `sv-barber` a `barber` (2026-07-30): sumó un empleado y no
    // quería sus iniciales en el link. El nombre público y el archivo del logo
    // quedan como estaban — solo cambió el slug.
    slug: "barber",
    name: "SV Barber",
    logoSrc: "/fundadores/sv-barber.jpg",
    instagram: "https://www.instagram.com/santiivargaas_/",
    quote:
      "Me ordenó los turnos y los días, y sobre todo hizo que la gente reserve mucho más rápido.",
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
