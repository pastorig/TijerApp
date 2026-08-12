import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tijerapp.com";

/**
 * robots.txt de TijerApp.
 *
 * Además de lo obvio (dejar entrar a los buscadores, apuntar al sitemap),
 * apunta a `/llms.txt`: el estándar de llmstxt.org que leen los buscadores con
 * IA. Es un resumen denso y factual del producto —qué es, cuánto sale, qué
 * hace, en qué se diferencia— para que cuando alguien le pregunte a ChatGPT o
 * Perplexity por un sistema de turnos para barberías en Argentina, la respuesta
 * salga de datos correctos y no de lo que el modelo adivine del HTML.
 *
 * Se bloquea todo lo que no tiene por qué indexarse: el panel de cada barbería,
 * el panel de plataforma, los links con token de cada turno (que son privados
 * de ese cliente) y las pantallas de sesión.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          // Paneles: nada que indexar y son privados.
          "/owner",
          "/owner/",
          "/*/admin",
          "/*/admin/",
          // Links con token de un turno puntual: son de ese cliente.
          "/r/",
          "/rev/",
          "/w/",
          // Pantallas de sesión y utilidades.
          "/login",
          "/recuperar",
          "/nueva-password",
          "/offline",
          "/abrir",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
