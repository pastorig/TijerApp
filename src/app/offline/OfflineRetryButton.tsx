"use client";

import { RefreshCw } from "lucide-react";

/**
 * Botón Reintentar para la página /offline.
 *
 * Aislado como client component porque la página principal es server-side
 * (para máxima compatibilidad con cache). El click llama
 * window.location.reload() que el browser intenta de nuevo — si volvió
 * la red, carga normal; si no, vuelve a esta misma página.
 */
export function OfflineRetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-6 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)]"
    >
      <RefreshCw className="size-4" aria-hidden="true" />
      Reintentar
    </button>
  );
}
