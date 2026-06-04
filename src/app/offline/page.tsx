import type { Metadata } from "next";
import { Logo } from "@/components/ui";
import { OfflineRetryButton } from "./OfflineRetryButton";

export const metadata: Metadata = {
  title: "Sin conexión",
  description: "Volvé a intentar cuando tengas señal de internet.",
  robots: { index: false, follow: false },
};

/**
 * Página de fallback offline para PWA.
 *
 * Se sirve desde el cache del service worker cuando una navigation request
 * falla por falta de red. Es server component estático (sin fetch ni deps
 * dinámicas) para garantizar que esté pre-cacheada y disponible offline.
 *
 * El botón Reintentar es client component pequeño porque necesita ejecutar
 * window.location.reload() en click.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-12 text-white">
      <div className="flex max-w-sm flex-col items-center text-center">
        <Logo variant="mark" size="xl" />

        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
          Sin conexión
        </p>

        <h1 className="mt-4 text-3xl font-black uppercase leading-[0.95] tracking-tight text-balance text-white sm:text-4xl">
          Te quedaste
          <br />
          sin internet
        </h1>

        <p className="mt-6 text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
          Volvé a intentar cuando tengas señal. TijerApp necesita estar
          conectada para mostrarte la agenda y los turnos en tiempo real.
        </p>

        <div className="mt-10 w-full">
          <OfflineRetryButton />
        </div>
      </div>
    </main>
  );
}
