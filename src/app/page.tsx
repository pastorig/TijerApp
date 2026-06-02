import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui";
import { CommercialFooter } from "@/components/home/CommercialFooter";
import { CommercialNav } from "@/components/home/CommercialNav";
import { HomeContact } from "@/components/home/HomeContact";
import { HomeFaq } from "@/components/home/HomeFaq";
import { HomeHowItWorks } from "@/components/home/HomeHowItWorks";
import { HomeWhatIsIt } from "@/components/home/HomeWhatIsIt";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
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

      {/* CTA pasarela a /producto */}
      <section className="border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-8 sm:py-16 lg:px-12">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
                Conocer todo
              </p>
              <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-3xl lg:text-4xl">
                Mirá en detalle qué incluye TijerApp.
              </h2>
            </div>
            <Button
              as="link"
              href="/producto"
              variant="secondary"
              size="lg"
              iconRight={<ArrowUpRight className="size-4" />}
              className="w-full sm:w-auto"
            >
              Ver producto
            </Button>
          </div>
        </div>
      </section>

      <HomeFaq />
      <HomeContact />

      <CommercialFooter />
    </main>
  );
}
