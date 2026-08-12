import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CommercialNav } from "@/components/home/CommercialNav";
import { CommercialFooter } from "@/components/home/CommercialFooter";
import { getGuiasOrdenadas } from "@/data/guias";

export const metadata: Metadata = {
  title: "Guías para barberías: turnos, comisiones y señas",
  description:
    "Cómo dejar de coordinar turnos por WhatsApp, cuánto cobrarle de comisión a un barbero, cómo cobrar seña y qué software conviene en Argentina. Guías escritas para el barbero, no para Google.",
  alternates: { canonical: "/guias" },
};

/**
 * Índice de guías.
 *
 * El sitemap y el `llms.txt` hacen que TijerApp sea encontrable; estas guías
 * son lo que hace que valga la pena encontrarlo. Cada una responde una pregunta
 * que el barbero busca antes de comprar, y sirve aunque no compre.
 */
export default function GuiasPage() {
  const guias = getGuiasOrdenadas();

  return (
    <main className="min-h-screen bg-black text-white">
      <CommercialNav />

      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(70% 50% at 50% 0%, color-mix(in oklab, var(--brand-gold) 12%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-16 lg:px-12 lg:pt-20">
          <div className="animate-fade-up">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
              Guías
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
              Cómo se maneja
              <br className="hidden sm:block" /> una barbería hoy
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--text-secondary)] sm:text-lg sm:leading-8">
              Lo que aprendimos trabajando con barberías argentinas: turnos,
              comisiones, señas y con qué conviene manejarlo. Sin vueltas y sin
              vender humo — si algo no te sirve, te lo decimos.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--border-subtle)]">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-8 sm:py-16 lg:px-12">
          <ul className="grid gap-4 sm:gap-5 lg:grid-cols-2">
            {guias.map((guia) => (
              <li key={guia.slug}>
                <Link
                  href={`/guias/${guia.slug}`}
                  className="card-premium card-premium-hover group flex h-full flex-col p-5 sm:p-6"
                >
                  <div className="flex items-center gap-2">
                    <span className="chip-gold !px-2 !py-1 !text-[9px]">
                      {guia.category}
                    </span>
                    <span className="text-[11px] text-[color:var(--text-muted)]">
                      {guia.readingMinutes} min de lectura
                    </span>
                  </div>

                  <h2 className="mt-4 text-xl font-black uppercase tracking-tight text-balance text-white sm:text-2xl">
                    {guia.cardTitle}
                  </h2>

                  <p className="mt-3 flex-1 text-sm leading-6 text-[color:var(--text-secondary)]">
                    {guia.description}
                  </p>

                  <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)]">
                    Leer
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-3.5 transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CommercialFooter />
    </main>
  );
}
