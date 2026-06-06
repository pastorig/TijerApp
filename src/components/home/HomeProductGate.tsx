import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * Bloque pasarela a /producto y /precios.
 *
 * Extraído del home/page.tsx para permitir lazy loading (está bien below
 * the fold después de varias secciones, no se ve en el primer paint).
 */
export function HomeProductGate() {
  return (
    <section className="relative isolate overflow-hidden border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 80% at 50% 50%, color-mix(in oklab, var(--brand-gold) 10%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Conocé el producto completo
          </p>
          <h2 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-5 sm:text-4xl lg:text-5xl">
            Todas las features que tu barbería{" "}
            <span className="text-[color:var(--brand-gold)]">necesita</span>,
            explicadas en detalle.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[color:var(--text-secondary)] sm:text-lg sm:leading-8">
            Turnero, multi-barbero, reservas públicas, lista de espera,
            reportes, galería, recordatorios automáticos. Mirá cómo funciona
            cada parte.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/producto"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-7 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:brightness-110 sm:w-auto"
            >
              Ver producto completo
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              href="/precios"
              prefetch={false}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-6 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] sm:w-auto"
            >
              Ver precios
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
