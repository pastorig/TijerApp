/**
 * ¿La página está abierta dentro de una app (Instagram, Facebook…) y no en un
 * navegador de verdad?
 *
 * Google no deja iniciar sesión desde esos navegadores: muestra una pantalla de
 * error en inglés ("disallowed_useragent") sin salida. En vez de mandar al
 * barbero ahí, el botón le pide que abra la página en Chrome o Safari.
 *
 * WhatsApp NO entra en la lista: en iPhone abre los links en Safari y en
 * Android en una pestaña de Chrome, y Google acepta las dos.
 */
const EMBEBIDOS = [
  /\bInstagram\b/i,
  /\bFBAN\//, // app de Facebook (iOS)
  /\bFBAV\//, // app de Facebook (Android/iOS)
  /\bFB_IAB\b/, // navegador interno de Facebook/Messenger
  /\bLine\//,
  /\bMicroMessenger\//, // WeChat
];

export function esNavegadorEmbebido(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return EMBEBIDOS.some((patron) => patron.test(userAgent));
}
