/**
 * VAPID Keys — TijerApp Push Notifications
 *
 * Helpers SSR-safe para acceder a las keys VAPID desde server y client.
 *
 * Estrategia:
 *   - NEXT_PUBLIC_VAPID_PUBLIC_KEY: expuesta al cliente (es la "identidad
 *     pública" del sender). El browser la usa al subscribe para firmar.
 *   - VAPID_PRIVATE_KEY: SOLO server. Nunca se importa desde un component
 *     client. Si se accede en cliente, throw error explícito.
 *   - VAPID_SUBJECT: SOLO server. mailto:<email> o https://<domain> que
 *     identifica al sender ante los push services.
 *
 * Setup local:
 *   1. node scripts/generate-vapid-keys.mjs
 *   2. Pegar las 3 lineas en .env.local
 *
 * Setup Vercel:
 *   Settings → Environment Variables → Add las 3 vars con scope
 *   Production + Preview + Development.
 */

/**
 * Public VAPID key — safe para usar en componentes client.
 * El cliente la convierte a Uint8Array para pasársela al PushManager.subscribe().
 */
export function getPublicVapidKey(): string {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) {
    throw new Error(
      "[vapid] NEXT_PUBLIC_VAPID_PUBLIC_KEY no está definida. " +
        "Generala con `node scripts/generate-vapid-keys.mjs` y agregala a .env.local + Vercel.",
    );
  }
  return key;
}

/**
 * Private VAPID key — server-side ONLY.
 * Throw si se llama desde el cliente (NEXT_PUBLIC_ no la expone, así que
 * en el browser process.env.VAPID_PRIVATE_KEY es undefined).
 */
export function getPrivateVapidKey(): string {
  if (typeof window !== "undefined") {
    throw new Error(
      "[vapid] getPrivateVapidKey() llamada desde el cliente. NUNCA exponer la private key.",
    );
  }
  const key = process.env.VAPID_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      "[vapid] VAPID_PRIVATE_KEY no está definida en el servidor. " +
        "Asegurate que esté en .env.local localmente y en Vercel Environment Variables.",
    );
  }
  return key;
}

/**
 * VAPID subject — server-side. mailto:<email> o https://<domain>.
 * Los push services lo usan para contactar al sender si hay problemas.
 */
export function getVapidSubject(): string {
  if (typeof window !== "undefined") {
    throw new Error(
      "[vapid] getVapidSubject() llamada desde el cliente. Solo server.",
    );
  }
  const subject = process.env.VAPID_SUBJECT;
  if (!subject) {
    throw new Error(
      "[vapid] VAPID_SUBJECT no está definida. Usá un mailto:<email> o https://<domain>.",
    );
  }
  return subject;
}

/**
 * Helper para web-push.sendNotification(): retorna el objeto vapidDetails
 * completo, listo para pasar como option al send.
 */
export function getVapidDetails(): {
  subject: string;
  publicKey: string;
  privateKey: string;
} {
  return {
    subject: getVapidSubject(),
    publicKey: getPublicVapidKey(),
    privateKey: getPrivateVapidKey(),
  };
}
