import Image from "next/image";
import { Quote } from "lucide-react";
import { founderInitials, founders } from "@/data/founders";

/**
 * Prueba social de la home: los testimonios REALES de barberos que usan
 * TijerApp. Sale de la misma fuente que la sección Fundadores de /precios
 * (`src/data/founders.ts`), así no hay dos listas que mantener.
 *
 * Solo muestra fundadores que tengan `quote` — o sea, los que efectivamente
 * nos pasaron un testimonio y autorizaron publicarlo. Si no hay ninguno, no
 * renderiza nada (mejor sin sección que con testimonios de relleno).
 *
 * Va después de HomeWhatIsIt: primero el visitante entiende qué es la app,
 * y ahí le mostramos a alguien real diciendo que le sirvió.
 */
export function HomeTestimonials() {
  const withQuote = founders.filter((f) => f.quote);
  if (withQuote.length === 0) return null;

  const isSingle = withQuote.length === 1;

  return (
    <section className="border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]">
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <header className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Barberos reales
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            Lo que dicen los que ya lo usan
          </h2>
        </header>

        <div
          className={
            isSingle
              ? "mx-auto mt-10 max-w-2xl sm:mt-12"
              : "mx-auto mt-10 grid max-w-4xl gap-4 sm:mt-12 sm:grid-cols-2"
          }
        >
          {withQuote.map((founder) => (
            <figure
              key={founder.slug}
              className="card-premium relative p-6 sm:p-8"
            >
              <Quote
                aria-hidden="true"
                className="size-7 text-[color:var(--brand-gold)]/40"
              />

              <blockquote
                className={
                  isSingle
                    ? "mt-4 text-lg leading-8 text-white sm:text-xl sm:leading-9"
                    : "mt-4 text-base leading-7 text-white"
                }
              >
                &ldquo;{founder.quote}&rdquo;
              </blockquote>

              <figcaption className="mt-6 flex items-center gap-3 border-t border-[color:var(--border-subtle)] pt-5">
                <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[color:var(--brand-gold)]/30 bg-black p-1">
                  {founder.logoSrc ? (
                    <span className="relative block size-full">
                      <Image
                        src={founder.logoSrc}
                        alt={`Logo de ${founder.name}`}
                        fill
                        sizes="48px"
                        className="object-contain"
                      />
                    </span>
                  ) : (
                    <span className="font-mono text-xs font-black uppercase text-[color:var(--brand-gold)]">
                      {founderInitials(founder.name)}
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-white">
                    {founder.name}
                  </span>
                  <span className="block text-xs text-[color:var(--text-muted)]">
                    Barbería fundadora
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
