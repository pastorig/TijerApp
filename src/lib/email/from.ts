/**
 * Resolución segura del remitente de email para TijerApp.
 *
 * PROBLEMA: si OWNER_NOTIFICATION_FROM o REMINDER_EMAIL_FROM en Vercel
 * apunta al proyecto viejo (BarberSync u otro), los emails salen con
 * ese branding. Ya nos pasó.
 *
 * FIX: aceptamos el env var SOLO si menciona 'tijerapp' (case-insensitive).
 * Si no menciona, fallback al default seguro. Esto NO depende de que el user
 * recuerde borrar el env var viejo.
 *
 * Uso:
 *   const fromAddress = resolveEmailFrom();
 *   await resend.emails.send({ from: fromAddress, ... });
 */

const DEFAULT_FROM = "TijerApp <onboarding@resend.dev>";

export function resolveEmailFrom(): string {
  const candidates = [
    process.env.OWNER_NOTIFICATION_FROM,
    process.env.REMINDER_EMAIL_FROM,
  ];
  for (const candidate of candidates) {
    if (candidate && /tijerapp/i.test(candidate)) {
      return candidate;
    }
  }
  return DEFAULT_FROM;
}
