import Image from "next/image";
import { Quote } from "lucide-react";
import {
  FOUNDER_SPOTS,
  founderInitials,
  founders,
  type Founder,
} from "@/data/founders";

/**
 * FoundersWall — las barberías que ya entraron al Programa Fundadores.
 *
 * Va debajo de FoundersProgram (que explica los beneficios): primero la
 * promesa, después la prueba. Cumple el perk "mención opcional en el sitio".
 *
 * Es Server Component (sin estado ni interacción): solo lee `founders`.
 * Si la lista está vacía no renderiza nada, así la página no muestra una
 * sección hueca antes de tener el primer fundador.
 */

function FounderCard({ founder }: { founder: Founder }) {
  return (
    <article className="card-premium flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-center gap-4">
        {/* Logo (o iniciales si todavía no lo cargamos).
            Cuadrado redondeado + object-contain: los logos de barbería suelen
            ser lettering apaisado y un círculo con object-cover les comía los
            bordes. */}
        <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[color:var(--brand-gold)]/30 bg-black p-1.5">
          {founder.logoSrc ? (
            <span className="relative block size-full">
              <Image
                src={founder.logoSrc}
                alt={`Logo de ${founder.name}`}
                fill
                sizes="80px"
                className="object-contain"
              />
            </span>
          ) : (
            <span className="font-mono text-base font-black uppercase text-[color:var(--brand-gold)]">
              {founderInitials(founder.name)}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-lg font-black uppercase tracking-tight text-white">
            {founder.name}
          </h3>
          {founder.location ? (
            <p className="truncate text-xs text-[color:var(--text-muted)]">
              {founder.location}
            </p>
          ) : null}
          {founder.instagram ? (
            <a
              href={founder.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-block text-xs font-semibold text-[color:var(--brand-gold)] transition hover:brightness-125"
            >
              Ver en Instagram
            </a>
          ) : null}
        </div>
      </div>

      {founder.quote ? (
        <blockquote className="relative rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-black/60 p-4">
          <Quote
            aria-hidden="true"
            className="absolute right-3 top-3 size-4 text-[color:var(--brand-gold)]/30"
          />
          <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
            &ldquo;{founder.quote}&rdquo;
          </p>
        </blockquote>
      ) : null}
    </article>
  );
}

export function FoundersWall() {
  if (founders.length === 0) return null;

  const remaining = Math.max(FOUNDER_SPOTS - founders.length, 0);

  return (
    <section className="border-t border-[color:var(--border-subtle)] bg-black">
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-8 sm:py-20 lg:px-12">
        <header className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Fundadores TijerApp
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl">
            Los que ya confiaron
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[color:var(--text-secondary)]">
            {remaining > 0 ? (
              <>
                Estas barberías ya laburan con TijerApp. Quedan{" "}
                <span className="font-bold text-[color:var(--brand-gold)]">
                  {remaining} {remaining === 1 ? "lugar" : "lugares"}
                </span>{" "}
                en el Programa Fundadores.
              </>
            ) : (
              <>
                Las {FOUNDER_SPOTS} barberías que apostaron temprano por
                TijerApp.
              </>
            )}
          </p>
        </header>

        {/* Con un solo fundador, una columna centrada: en grilla de 2 quedaría
            pegado a la izquierda con un hueco al lado. */}
        <div
          className={
            founders.length === 1
              ? "mx-auto mt-10 grid max-w-md gap-4 sm:mt-12"
              : "mx-auto mt-10 grid max-w-3xl gap-4 sm:mt-12 sm:grid-cols-2"
          }
        >
          {founders.map((founder) => (
            <FounderCard key={founder.slug} founder={founder} />
          ))}
        </div>
      </div>
    </section>
  );
}
