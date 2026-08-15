import type { MetadataRoute } from "next";
import { listKnownBarbershops } from "@/lib/barbershops";
import { DEMO_BARBERSHOP_SLUGS } from "@/data/demo-barbershops";
import { listReadOnlyBarbershopSlugs } from "@/lib/plan-access";
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
 * Quedan afuera dos casos, por regla y no por slug hardcodeado:
 *  - Las **demo** (`DEMO_BARBERSHOP_SLUGS`): son ficticias.
 *  - Las **vencidas** (plan en modo lectura): tienen la reserva pública apagada.
 *    Si vuelven a pagar, reaparecen solas en la próxima revalidación.
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
    const [{ data: barbershops }, readOnlySlugs] = await Promise.all([
      listKnownBarbershops(),
      listReadOnlyBarbershopSlugs(),
    ]);

    const demoSlugs = new Set(DEMO_BARBERSHOP_SLUGS);

    const barbershopRoutes: MetadataRoute.Sitemap = (barbershops ?? [])
      .filter((barbershop) => barbershop.isActive !== false)
      // Fuera las barberías DEMO: son ficticias. Indexarlas le muestra a Google
      // y a los buscadores con IA un negocio que no existe, y eso baja la
      // confianza en todo el dominio — incluida la comparativa de /guias, que
      // es justo la página que queremos que citen.
      .filter((barbershop) => !demoSlugs.has(barbershop.slug))
      // Fuera las vencidas: están en modo lectura, con la reserva pública
      // apagada. Mandar a un crawler a una página donde nadie puede reservar no
      // le sirve a nadie. Si vuelven a pagar, vuelven al sitemap solas.
      .filter((barbershop) => !readOnlySlugs.has(barbershop.slug))
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
