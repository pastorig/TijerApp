import type { MetadataRoute } from "next";
import { listKnownBarbershops } from "@/lib/barbershops";
import { guias } from "@/data/guias";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tijerapp.com";

/**
 * Sitemap de TijerApp.
 *
 * Incluye las páginas comerciales y **la landing pública de cada barbería
 * activa**. Esas landings son contenido real e indexable: cada una tiene el
 * nombre de la barbería, su equipo, sus servicios y su dirección, así que
 * posicionan por búsquedas locales ("barbería en Río Tercero") que la home de
 * la plataforma nunca va a cubrir.
 *
 * Se regenera cada hora: alcanza para que una barbería nueva aparezca rápido
 * sin pegarle a la base en cada request de un crawler.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/producto`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/precios`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/guias`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/registro`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    // Cada guía es una página indexable propia: son las que pueden rankear por
    // las búsquedas que hace el barbero ANTES de saber que existimos.
    ...guias.map((guia) => ({
      url: `${siteUrl}/guias/${guia.slug}`,
      lastModified: new Date(`${guia.updatedAt ?? guia.publishedAt}T12:00:00`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  try {
    const { data: barbershops } = await listKnownBarbershops();
    const barbershopRoutes: MetadataRoute.Sitemap = (barbershops ?? [])
      .filter((barbershop) => barbershop.isActive !== false)
      .flatMap((barbershop) => [
        {
          url: `${siteUrl}/${barbershop.slug}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        },
        {
          url: `${siteUrl}/${barbershop.slug}/reservar`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.6,
        },
      ]);

    return [...staticRoutes, ...barbershopRoutes];
  } catch {
    // Si la base no responde, el sitemap sale igual con las páginas fijas:
    // vale más un sitemap incompleto que un 500 para el crawler.
    return staticRoutes;
  }
}
