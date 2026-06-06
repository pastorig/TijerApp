#!/usr/bin/env node
/**
 * VAPID Keys Generator — TijerApp Push Notifications
 *
 * Genera un par de keys VAPID (public + private) usando web-push.
 * Imprime el resultado en formato listo-para-copiar al .env.local y a Vercel.
 *
 * Uso:
 *   node scripts/generate-vapid-keys.mjs
 *
 * Output:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 *   VAPID_SUBJECT=mailto:bau.pastori@gmail.com
 *
 * IMPORTANTE:
 * - El VAPID_PRIVATE_KEY NUNCA se commitea al repo. Va solo a .env.local
 *   (que ya está en .gitignore) y a Vercel Environment Variables.
 * - El NEXT_PUBLIC_VAPID_PUBLIC_KEY se puede exponer al cliente — es la
 *   "address" que el browser usa para verificar las notifs.
 * - VAPID_SUBJECT debe ser un mailto:<email> o https://<domain> que
 *   identifique al sender ante los push services (FCM, Mozilla, Apple).
 *
 * Steps siguientes (manuales del user):
 *   1. Pegá las 3 lineas en .env.local
 *   2. En Vercel: Settings → Environment Variables → Add para cada una,
 *      scope = Production + Preview + Development
 *   3. Re-deploy o esperá al próximo push para que tomen efecto en Vercel
 */

import webpush from "web-push";

const SUBJECT = "mailto:bau.pastori@gmail.com";

const keys = webpush.generateVAPIDKeys();

console.log("");
console.log("# ─────────────────────────────────────────────────────");
console.log("# TijerApp — VAPID keys generadas");
console.log(`# Generado: ${new Date().toISOString()}`);
console.log("# Copiá lo siguiente a .env.local y a Vercel");
console.log("# ─────────────────────────────────────────────────────");
console.log("");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=${SUBJECT}`);
console.log("");
console.log("# ─────────────────────────────────────────────────────");
console.log("# RECORDÁ:");
console.log("# - NUNCA commitees VAPID_PRIVATE_KEY al repo");
console.log("# - Si rotás las keys, todas las suscripciones existentes");
console.log("#   se invalidan (los browsers tienen que re-suscribirse)");
console.log("# ─────────────────────────────────────────────────────");
console.log("");
