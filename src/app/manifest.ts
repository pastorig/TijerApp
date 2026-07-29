import type { MetadataRoute } from "next";

/**
 * Manifest PWA TijerApp — declarativo via Next.js App Router.
 *
 * Estrategia multi-tenant: la PWA cubre TODA la plataforma con scope: "/".
 * El start_url incluye `?source=pwa` para que la página redirector pueda
 * distinguir "abierto desde el icon del home screen" vs "navegado desde
 * browser", y rediriga al último contexto guardado en localStorage.
 *
 * Theme color NEGRO, igual que el `themeColor` de `layout.tsx`. Antes acá
 * decía gold (#c9a23e): en el browser mandaba el meta negro del layout, pero
 * con la PWA instalada mandaba este manifest y la status bar salía dorada,
 * chocando contra la nav negra que queda justo debajo. Las dos fuentes tienen
 * que decir lo mismo — el gold es color de acento, no de fondo.
 * Background color negro para coherencia con el dark mode default.
 */

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // ID explícito: identidad estable de la app independiente del start_url.
    // Si en el futuro cambiamos el start_url, los browsers siguen reconociendo
    // la instalación existente en vez de ofrecer instalarla de nuevo.
    id: "/",
    name: "TijerApp",
    short_name: "TijerApp",
    description:
      "Turnos online para barberías modernas. Reservas, agenda y operación en un solo lugar.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#000000",
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
