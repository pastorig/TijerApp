"use client";

import { useLastContextTracker } from "@/hooks/useLastContextTracker";
import type { LastContextRole } from "@/lib/pwa/last-context";

/**
 * LastContextTracker — wrapper client component que ejecuta
 * `useLastContextTracker` y no renderiza nada visible.
 *
 * Permite usar el tracker desde server components (PublicBarbershopLanding,
 * AdminShell) sin convertirlos a client. Solo se monta este pequeño
 * componente client adentro.
 */
export function LastContextTracker({
  slug,
  role,
}: {
  slug: string;
  role: LastContextRole;
}) {
  useLastContextTracker(slug, role);
  return null;
}
