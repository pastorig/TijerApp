"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLastContext } from "@/lib/pwa/last-context";
import { useStandaloneMode } from "@/lib/pwa/useStandaloneMode";

/**
 * PWARedirector — componente invisible que se monta en `app/page.tsx`
 * (la home `/`). Si detecta que el usuario abrió la app desde el icon
 * de la PWA en su home screen, lo redirige al último contexto navegado
 * (`/<slug>/admin` o `/<slug>`).
 *
 * Heurística de "vino desde PWA":
 * - searchParam `source=pwa` (definido en manifest.start_url), o
 * - `display-mode: standalone` matches (instalada y abierta como app)
 *
 * Si el usuario entra a `/` desde el browser normal (sin source=pwa y
 * sin standalone mode), NO redirige — ve la landing comercial.
 *
 * Si es PWA pero no hay last context guardado, tampoco redirige —
 * queda en la landing comercial como fallback.
 */
export function PWARedirector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isStandalone = useStandaloneMode();

  useEffect(() => {
    const source = searchParams.get("source");
    const isFromPWA = source === "pwa" || isStandalone;

    if (!isFromPWA) return;

    const { slug, role } = getLastContext();
    if (!slug) return;

    const target = role === "admin" ? `/${slug}/admin` : `/${slug}`;
    router.replace(target);
  }, [router, searchParams, isStandalone]);

  return null;
}
