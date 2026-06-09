import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui";
import { CommercialFooter } from "@/components/home/CommercialFooter";
import { CommercialNav } from "@/components/home/CommercialNav";
import { PWARedirector } from "@/components/pwa/PWARedirector";

// Below-the-fold: dynamic con ssr:true mantiene SEO y reduce el chunk
// inicial. Cada uno carga su propio JS bundle al hidratarse cuando es
// visible. Round 2: ahora también HomeStats + HomeWhatIsIt + HomeProductGate
// son lazy (antes eran directos pero igual están below el hero del primer
// viewport en mobile).
const HomeStats = dynamic(
  () =>
    import("@/components/home/HomeStats").then((m) => ({
      default: m.HomeStats,
    })),
);
const HomeWhatIsIt = dynamic(
  () =>
    import("@/components/home/HomeWhatIsIt").then((m) => ({
      default: m.HomeWhatIsIt,
    })),
);
const HomePersonas = dynamic(
  () =>
    import("@/components/home/HomePersonas").then((m) => ({
      default: m.HomePersonas,
    })),
);
const HomeHowItWorks = dynamic(
  () =>
    import("@/components/home/HomeHowItWorks").then((m) => ({
      default: m.HomeHowItWorks,
    })),
);
const HomeComparison = dynamic(
  () =>
    import("@/components/home/HomeComparison").then((m) => ({
      default: m.HomeComparison,
    })),
);
const HomeProductGate = dynamic(
  () =>
    import("@/components/home/HomeProductGate").then((m) => ({
      default: m.HomeProductGate,
    })),
);
const HomeFaq = dynamic(
  () =>
    import("@/components/home/HomeFaq").then((m) => ({
      default: m.HomeFaq,
    })),
);
const HomeContact = dynamic(
  () =>
    import("@/components/home/HomeContact").then((m) => ({
      default: m.HomeContact,
    })),
);

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
              "radial-gradient(70% 50% at 50% 0%, color-mix(in oklab, var(--brand-gold) 14%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-16 lg:px-12 lg:pb-24 lg:pt-20">
          <div className="animate-fade-up">
            <div className="chip-gold">
              <span className="dot-gold-pulse" />
              Programa Fundadores abierto · Primeros 10
            </div>

            <h1 className="mt-5 max-w-3xl text-[2.25rem] font-black uppercase leading-[0.95] tracking-tight text-balance sm:mt-8 sm:text-5xl lg:text-6xl xl:text-7xl">
              Turnos online{" "}
              <span className="text-[color:var(--brand-gold)]">
                para barberías
              </span>{" "}
              <span className="text-[color:var(--brand-silver)]">
                modernas.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-[color:var(--text-secondary)] sm:mt-7 sm:text-lg sm:leading-8">
              La plataforma argentina que tu barbería necesita: agenda
              multi-barbero, reservas online sin app, recordatorios y reportes.
              Desde{" "}
              <span className="font-bold text-white">USD 20/mes</span>.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
              <Link
                href="/precios"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-7 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:brightness-110"
              >
                Empezar prueba gratis
                <ArrowUpRight className="size-4" />
              </Link>
              <Button
                as="link"
                href="/primebarber"
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Ver demo en vivo
              </Button>
            </div>

            {/* Proof points */}
            <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[color:var(--text-secondary)] sm:mt-8 sm:text-sm">
              <li className="flex items-center gap-1.5">
                <span className="text-[color:var(--brand-gold)]">✓</span>
                7 días gratis
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-[color:var(--brand-gold)]">✓</span>
                Sin tarjeta
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-[color:var(--brand-gold)]">✓</span>
                Cancelás cuando quieras
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-[color:var(--brand-gold)]">✓</span>
                Hecho en Argentina
              </li>
            </ul>
          </div>
        </div>
      </section>

      <HomeStats />
      <HomeWhatIsIt />
      <HomePersonas />
      <HomeHowItWorks />
      <HomeComparison />
      <HomeProductGate />
      <HomeFaq />
      <HomeContact />

      <CommercialFooter />
    </main>
  );
}
