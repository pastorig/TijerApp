import Link from "next/link";
import { ArrowUpRight, Quote, Sparkles } from "lucide-react";

export function SocialProofPlaceholder() {
  return (
    <section className="border-t border-[color:var(--border-subtle)] bg-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <header className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Testimonios
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            Estamos en pre-launch.{" "}
            <span className="text-[color:var(--brand-gold)]">
              Tu lugar acá
            </span>
            .
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:mt-5 sm:text-base sm:leading-7">
            Cuando tengamos clientes activos, sus historias van a estar acá.
            Mientras tanto, los primeros 10 barberos que confíen reciben
            beneficios únicos del Programa Fundadores.
          </p>
        </header>

        <ul className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:mt-12 sm:grid sm:snap-none sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
          {[
            {
              label: "Tu historia acá",
              caption:
                "El feedback de los primeros 10 va a moldear las próximas features. Tu opinión cuenta más que nunca en esta etapa.",
            },
            {
              label: "Tu marca acá",
              caption:
                "Si querés, mencionamos tu barbería en la sección Fundadores del sitio. Visibilidad mutua para los pioneros.",
            },
            {
              label: "Tu caso de éxito acá",
              caption:
                "Querés ser uno de los primeros barberos modernos en Argentina que digitalizó su negocio? Tu historia inspira a otros.",
            },
          ].map((slot, idx) => (
            <li
              key={idx}
              className="relative flex w-[85%] shrink-0 snap-center flex-col gap-4 rounded-[var(--radius-md)] border border-dashed border-[color:var(--brand-gold)]/30 bg-[color:var(--surface-1)] p-5 sm:w-auto sm:shrink sm:snap-align-none sm:p-6"
            >
              <Quote
                aria-hidden="true"
                className="size-6 text-[color:var(--brand-gold)]/40"
              />
              <div className="flex-1">
                <p className="text-sm italic leading-6 text-[color:var(--text-muted)]">
                  &ldquo;Reservado para los primeros testimoniales de barberos
                  reales que prueben TijerApp.&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-3 border-t border-[color:var(--border-subtle)] pt-4">
                <div
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-full border border-dashed border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
                >
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{slot.label}</p>
                  <p className="text-[11px] leading-4 text-[color:var(--text-muted)]">
                    {slot.caption}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex justify-center sm:mt-12">
          <Link
            href="/#contacto"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-7 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:brightness-110"
          >
            Quiero ser de los primeros 10
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
