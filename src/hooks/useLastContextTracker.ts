"use client";

import { useEffect } from "react";
import {
  setLastContext,
  type LastContextRole,
} from "@/lib/pwa/last-context";

/**
 * useLastContextTracker — hook que guarda en localStorage el último
 * (slug, role) que el usuario navegó. Lo consumimos desde la página
 * redirector (`app/page.tsx`) cuando el usuario abre la PWA desde el
 * home screen.
 *
 * Se monta en:
 * - `PublicBarbershopLanding` con role="public"
 * - `AdminShell` con role="admin"
 *
 * Como `setLastContext` es SSR-safe, este hook se puede llamar desde
 * cualquier client component sin guards adicionales.
 */
export function useLastContextTracker(
  slug: string,
  role: LastContextRole,
): void {
  useEffect(() => {
    setLastContext(slug, role);
  }, [slug, role]);
}
