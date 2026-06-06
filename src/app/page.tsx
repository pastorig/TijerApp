import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui";
import { CommercialFooter } from "@/components/home/CommercialFooter";
import { CommercialNav } from "@/components/home/CommercialNav";
import { HomeContact } from "@/components/home/HomeContact";
import { HomeFaq } from "@/components/home/HomeFaq";
import { HomeHowItWorks } from "@/components/home/HomeHowItWorks";
import { HomeWhatIsIt } from "@/components/home/HomeWhatIsIt";
import { PWARedirector } from "@/components/pwa/PWARedirector";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* PWA: si abrió desde el icon del home screen + tenía last_context,
          redirige a esa barbería. Si vino desde el browser, no hace nada. */}
      <Suspense fallback={null}>
        <PWARedirector />
      </Suspense>

      <CommercialNav />

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(70% 50% at 50% 0%, color-mix(in oklab, var(--brand-gold) 12%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:px-12 lg:pb-24 lg:pt-20">
          <div className="animate-fade-up">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
              Plataforma SaaS · Argentina
            </p>
            <h1 className="mt-6 max-w-3xl text-[2.25rem] font-black uppercase leading-[0.95] tracking-tight text-balance sm:mt-8 sm:text-5xl lg:text-6xl xl:text-7xl">
              Turnos online
              <br />
              <span className="text-[color:var(--brand-gold)]">
                para barberías
              </span>
              <br />
              <span className="text-[color:var(--brand-silver)]">modernas.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-[color:var(--text-secondary)] sm:mt-8 sm:text-lg sm:leading-8">
              TijerApp centraliza reservas, barberos, servicios y agenda en
              una plataforma operativa. Cada barbería con su espacio público
              y su panel admin.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#contacto"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-6 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)]"
              >
                Hablar con nosotros
                <ArrowUpRight className="size-4" />
              </Link>
              <Button
                as="link"
                href="/sv-barber"
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Ver demo en vivo
              </Button>
            </div>
          </div>
        </div>
      </section>

      <HomeWhatIsIt />
      <HomeHowItWorks />

      {/* CTA pasarela a /producto — destacado con gradient gold */}
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
                className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-6 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] sm:w-auto"
              >
                Ver precios
              </Link>
            </div>
          </div>
        </div>
      </section>

      <HomeFaq />
      <HomeContact />

      <CommercialFooter />
    </main>
  );
}
