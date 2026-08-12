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
/**
 * Rutas privadas: no las indexa nadie, ni buscadores ni IA.
 *
 * Los links con token (`/r/`, `/rev/`, `/w/`) son de un turno puntual y de ese
 * cliente: que aparezcan en un buscador sería una filtración.
 */
const RUTAS_PRIVADAS = [
  "/api/",
  "/owner",
  "/owner/",
  "/*/admin",
  "/*/admin/",
  "/r/",
  "/rev/",
  "/w/",
  "/login",
  "/recuperar",
  "/nueva-password",
  "/offline",
  "/abrir",
];

/**
 * Crawlers de los buscadores con IA, nombrados uno por uno.
 *
 * Con `User-agent: *` ya tendrían permiso, pero nombrarlos es explícito: deja
 * dicho que los queremos adentro y evita que un cambio futuro en la regla
 * general los deje afuera sin que nadie se dé cuenta.
 *
 * Se los deja entrar a propósito. Para un SaaS chico, que ChatGPT o Perplexity
 * puedan leer y citar el sitio es un canal de clientes real —así llegaron los
 * primeros de Dentidad—, no una fuga.
 */
const CRAWLERS_IA = [
  "OAI-SearchBot", // búsqueda de ChatGPT
  "ChatGPT-User", // cuando un usuario le pide a ChatGPT que abra el sitio
  "GPTBot", // OpenAI
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "anthropic-ai",
  "Google-Extended", // grounding de Gemini y AI Overviews
  "Applebot-Extended",
  "meta-externalagent",
  "Bytespider",
  "cohere-ai",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...CRAWLERS_IA.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: RUTAS_PRIVADAS,
      })),
      {
        userAgent: "*",
        allow: "/",
        disallow: RUTAS_PRIVADAS,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
