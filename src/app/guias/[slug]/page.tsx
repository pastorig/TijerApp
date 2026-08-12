import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { CommercialNav } from "@/components/home/CommercialNav";
import { CommercialFooter } from "@/components/home/CommercialFooter";
import { GuiaBlocks } from "@/components/home/GuiaBlocks";
import { getGuiaBySlug, getGuiasOrdenadas, guias } from "@/data/guias";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tijerapp.com";

type Props = { params: Promise<{ slug: string }> };

/** Prerenderiza todas las guías: son contenido fijo, no hay motivo para ir al server. */
export function generateStaticParams() {
  return guias.map((guia) => ({ slug: guia.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guia = getGuiaBySlug(slug);
  if (!guia) return {};

  return {
    title: guia.title,
    description: guia.description,
    alternates: { canonical: `/guias/${guia.slug}` },
    openGraph: {
      type: "article",
      title: guia.title,
      description: guia.description,
      publishedTime: guia.publishedAt,
      modifiedTime: guia.updatedAt ?? guia.publishedAt,
    },
  };
}

function formatFecha(iso: string): string {
  // `T12:00` para que la zona horaria no corra la fecha un día.
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function GuiaPage({ params }: Props) {
  const { slug } = await params;
  const guia = getGuiaBySlug(slug);

  if (!guia) notFound();

  // Otras guías para seguir leyendo: mantiene a la gente en el sitio y le da a
  // Google links internos entre contenido relacionado.
  const otras = getGuiasOrdenadas()
    .filter((otra) => otra.slug !== guia.slug)
    .slice(0, 2);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guia.title,
    description: guia.description,
    datePublished: guia.publishedAt,
    dateModified: guia.updatedAt ?? guia.publishedAt,
    inLanguage: "es-AR",
    mainEntityOfPage: `${siteUrl}/guias/${guia.slug}`,
    author: { "@type": "Organization", name: "TijerApp", url: siteUrl },
    publisher: { "@type": "Organization", name: "TijerApp", url: siteUrl },
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <CommercialNav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <article>
        <header className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(70% 50% at 50% 0%, color-mix(in oklab, var(--brand-gold) 12%, transparent) 0%, transparent 70%)",
            }}
          />
          <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-10 sm:px-8 sm:pb-12 sm:pt-14 lg:pt-16">
            <Link
              href="/guias"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--brand-gold)]"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              Guías
            </Link>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="chip-gold !px-2 !py-1 !text-[9px]">
                {guia.category}
              </span>
              {/* Si la guía se actualizó, mostramos ESA fecha y no la de
                  publicación: en una comparativa con precios de terceros, la
                  fecha visible es lo que le dice al lector si el dato sigue
                  vigente. El JSON-LD ya usaba updatedAt, el texto no. */}
              <span className="text-[11px] text-[color:var(--text-muted)]">
                {guia.readingMinutes} min ·{" "}
                {guia.updatedAt
                  ? `Actualizada el ${formatFecha(guia.updatedAt)}`
                  : formatFecha(guia.publishedAt)}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
              {guia.title}
            </h1>
            <p className="mt-5 text-base leading-7 text-[color:var(--text-secondary)] sm:text-lg sm:leading-8">
              {guia.description}
            </p>
          </div>
        </header>

        <div className="border-t border-[color:var(--border-subtle)]">
          <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8 sm:py-14">
            <GuiaBlocks blocks={guia.blocks} />
          </div>
        </div>
      </article>

      {/* CTA: la guía sirve sola, pero quien llegó hasta acá es el lector
          indicado para probar el producto. */}
      <section className="border-t border-[color:var(--border-subtle)]">
        <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
          <div className="card-premium card-premium-glow p-6 text-center sm:p-8">
            <h2 className="text-2xl font-black uppercase tracking-tight text-balance text-white sm:text-3xl">
              Probalo con tu barbería
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
              14 días gratis, sin tarjeta. Cargás tus servicios y tus horarios y
              en diez minutos tenés tu link para compartir.
            </p>
            <Link
              href="/registro"
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-gold-grad px-7 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:brightness-110"
            >
              Empezar gratis
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          {otras.length > 0 ? (
            <div className="mt-12">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
                Seguí leyendo
              </p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {otras.map((otra) => (
                  <li key={otra.slug}>
                    <Link
                      href={`/guias/${otra.slug}`}
                      className="card-premium card-premium-hover flex h-full flex-col p-4"
                    >
                      <span className="text-sm font-bold text-white">
                        {otra.cardTitle}
                      </span>
                      <span className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">
                        {otra.readingMinutes} min de lectura
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <CommercialFooter />
    </main>
  );
}
