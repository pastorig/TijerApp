import type { Metadata } from "next";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Logo } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sin conexión",
  description: "Volvé a intentar cuando tengas señal de internet.",
  robots: { index: false, follow: false },
};

/**
 * Página de fallback offline para PWA.
 *
 * Se sirve desde el cache del service worker cuando una navigation request
 * falla por falta de red. Es server component PURO (sin client components
 * anidados) para garantizar que funcione 100% sin JavaScript — porque
 * cuando el usuario llega acá offline, los chunks de Next.js no se pueden
 * descargar y no hay hydration.
 *
 * El botón "Reintentar" es un <Link href="/"> en lugar de un <button>
 * con onClick — navega al home, que el SW serve igual desde cache o desde
 * red según corresponda. Sin JS, sin React, funciona.
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
          <Link
            href="/"
            prefetch={false}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-gold-grad px-6 text-sm font-bold uppercase tracking-[0.14em] text-black no-underline transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)]"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Reintentar
          </Link>
        </div>
      </div>
    </main>
  );
}
