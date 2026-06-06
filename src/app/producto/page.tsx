import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui";
import { CommercialFooter } from "@/components/home/CommercialFooter";
import { CommercialNav } from "@/components/home/CommercialNav";
import { ProductFeatures } from "@/components/home/ProductFeatures";

// Below-the-fold: lazy loading para reducir el chunk inicial.
const ProductShowcase = dynamic(
  () =>
    import("@/components/home/ProductShowcase").then((m) => ({
      default: m.ProductShowcase,
    })),
);
const PricingTeaser = dynamic(
  () =>
    import("@/components/home/PricingTeaser").then((m) => ({
      default: m.PricingTeaser,
    })),
);
const HomeContact = dynamic(
  () =>
    import("@/components/home/HomeContact").then((m) => ({
      default: m.HomeContact,
    })),
);

export const metadata: Metadata = {
  // El template de layout.tsx agrega "· TijerApp" automáticamente.
  title: "Producto",
  description:
    "Todo lo que tu barbería necesita: turnero, reservas públicas, multi-barbero, reportes y WhatsApp.",
};

export default function ProductPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <CommercialNav />

      {/* Hero del producto */}
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(70% 50% at 50% 0%, color-mix(in oklab, var(--brand-gold) 12%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-12 sm:px-8 sm:pb-16 sm:pt-16 lg:px-12 lg:pb-20 lg:pt-20">
          <div className="animate-fade-up">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
              Producto
            </p>
            <h1 className="mt-6 max-w-3xl text-[2.25rem] font-black uppercase leading-[0.95] tracking-tight text-balance sm:mt-8 sm:text-5xl lg:text-6xl">
              Todo lo que tu barbería{" "}
              <span className="text-[color:var(--brand-gold)]">
                necesita
              </span>{" "}
              en un solo lugar.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[color:var(--text-secondary)] sm:mt-8 sm:text-lg sm:leading-8">
              Una plataforma operativa pensada para usarla mientras se trabaja.
              Sin pasos innecesarios, sin curvas de aprendizaje. Empezás hoy.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                as="link"
                href="/sv-barber"
                size="lg"
                iconRight={<ArrowUpRight className="size-4" />}
                className="w-full sm:w-auto"
              >
                Probar la demo
              </Button>
              <Link
                href="/#contacto"
                className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-6 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
              >
                Hablar con nosotros
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ProductFeatures />

      <ProductShowcase />

      <PricingTeaser />

      {/* CTA Demo en vivo */}
      <section className="border-t border-[color:var(--border-subtle)] bg-black">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <header className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
              Mirá la demo
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
              La mejor forma de entender TijerApp es usarlo
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[color:var(--text-secondary)] sm:text-lg">
              Tenés un demo público funcionando con datos reales. Entrá y
              reservá un turno como si fueras un cliente.
            </p>
            <div className="mt-8 flex justify-center">
              <Button
                as="link"
                href="/sv-barber"
                size="lg"
                iconRight={<ArrowUpRight className="size-4" />}
              >
                Ir a la demo
              </Button>
            </div>
          </header>
        </div>
      </section>

      <HomeContact />

      <CommercialFooter />
    </main>
  );
}
