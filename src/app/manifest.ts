import type { MetadataRoute } from "next";

/**
 * Manifest PWA TijerApp — declarativo via Next.js App Router.
 *
 * Estrategia multi-tenant: la PWA cubre TODA la plataforma con scope: "/".
 * El start_url incluye `?source=pwa` para que la página redirector pueda
 * distinguir "abierto desde el icon del home screen" vs "navegado desde
 * browser", y rediriga al último contexto guardado en localStorage.
 *
 * Theme color gold para que la status bar de mobile matchee el branding.
 * Background color negro para coherencia con el dark mode default.
 */

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TijerApp",
    short_name: "TijerApp",
    description:
      "Turnos online para barberías modernas. Reservas, agenda y operación en un solo lugar.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#c9a23e",
    lang: "es-AR",
    dir: "ltr",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/brand/icons/manifest-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icons/manifest-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icons/manifest-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/icons/manifest-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["business", "productivity", "lifestyle"],
  };
}
