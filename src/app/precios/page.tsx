import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui";
import { CommercialFooter } from "@/components/home/CommercialFooter";
import { CommercialNav } from "@/components/home/CommercialNav";
// PricingPlans es el bloque arriba del fold después del hero → carga directa.
import { PricingPlans } from "@/components/home/PricingPlans";

// Below-the-fold: lazy loading para reducir el JS inicial.
const PricingCompareTable = dynamic(
  () =>
    import("@/components/home/PricingCompareTable").then((m) => ({
      default: m.PricingCompareTable,
    })),
);
const PricingRoiCalculator = dynamic(
  () =>
    import("@/components/home/PricingRoiCalculator").then((m) => ({
      default: m.PricingRoiCalculator,
    })),
);
const FoundersProgram = dynamic(
  () =>
    import("@/components/home/PricingPlans").then((m) => ({
      default: m.FoundersProgram,
    })),
);
const SocialProofPlaceholder = dynamic(
  () =>
    import("@/components/home/SocialProofPlaceholder").then((m) => ({
      default: m.SocialProofPlaceholder,
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
  title: "Precios",
  description:
    "Planes claros para barberías argentinas. Desde USD 10/mes. 7 días gratis sin tarjeta. Cancelás cuando quieras.",
};

export default function PricingPage() {
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
        <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-8 sm:px-8 sm:pb-16 sm:pt-16 lg:px-12 lg:pb-20 lg:pt-20">
          <div className="animate-fade-up text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
              Precios
            </p>
            <h1 className="mx-auto mt-4 max-w-3xl text-[1.75rem] font-black uppercase leading-[1] tracking-tight text-balance sm:mt-8 sm:text-5xl lg:text-6xl">
              Planes claros para barberías que{" "}
              <span className="text-[color:var(--brand-gold)]">crecen</span>.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:mt-8 sm:text-lg sm:leading-8">
              Desde <span className="font-bold text-white">USD 10/mes</span>.
              Sin comisiones por reserva. Sin pagos por barbero. Precio fijo
              pensado para la realidad argentina.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-9 sm:flex-row">
              <Link
                href="#planes"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-6 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:brightness-110 sm:w-auto"
              >
                Ver planes
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
              <Button
                as="link"
                href="/sv-barber"
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto"
              >
                Probar la demo
              </Button>
            </div>
            <p className="mt-5 text-xs text-[color:var(--text-secondary)] sm:mt-7">
              7 días gratis · Sin tarjeta · Cancelás cuando quieras
            </p>
          </div>
        </div>
      </section>

      <div id="planes">
        <PricingPlans />
      </div>

      <PricingCompareTable />

      <PricingRoiCalculator />

      <div id="fundadores">
        <FoundersProgram />
      </div>

      <SocialProofPlaceholder />

      {/* Mini FAQ sobre billing */}
      <section className="border-t border-[color:var(--border-subtle)] bg-black">
        <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <header className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
              Preguntas frecuentes
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl">
              Lo que querés saber antes de empezar
            </h2>
          </header>

          <dl className="mt-10 space-y-6 sm:mt-12 sm:space-y-8">
            {[
              {
                q: "¿Cómo funciona el trial de 7 días?",
                a: "Te activamos el plan Pro durante 7 días, sin pedirte tarjeta. Probás todas las features. Al día 7 te pedimos cargar tu tarjeta de MercadoPago para seguir. Si no la cargás, tu cuenta queda en modo lectura por 30 días y después se archiva.",
              },
              {
                q: "¿Por qué cobran en USD?",
                a: "El precio está anclado en dólares para que sea estable y predecible, pero te cobramos en pesos al tipo de cambio MEP del primer día del mes. Ese precio queda fijo todo el mes — no hay sorpresas a mitad de período.",
              },
              {
                q: "¿Puedo cancelar cuando quiera?",
                a: "Sí. Cancelás desde el panel admin con un click. No te cobramos más a partir del próximo mes y seguís usando TijerApp normalmente hasta que termine el mes que ya pagaste. Sin penalidades, sin letra chica.",
              },
              {
                q: "¿Qué pasa si subo de plan a mitad de mes?",
                a: "Te cobramos la diferencia prorrateada por los días que quedan del mes actual. Desde el mes siguiente ya pagás el plan nuevo completo.",
              },
              {
                q: "¿Puedo cambiar entre planes?",
                a: "Sí, cuando quieras. Si subís de plan (ej. de Esencial a Pro), tomás las features nuevas al instante. Si bajás de plan, el cambio aplica desde el próximo mes para no perder lo que ya pagaste.",
              },
              {
                q: "¿Hay descuento por pago anual?",
                a: "Sí: 15% off pagando 12 meses upfront. Te queda en USD 102/año para Solo, USD 204/año para Esencial y USD 408/año para Pro.",
              },
              {
                q: "¿Cómo sé si soy uno de los 10 Fundadores?",
                a: "Si sos uno de los primeros 10 en activar billing real, te avisamos por WhatsApp y te aplicamos los beneficios automáticamente. El programa cierra cuando llegamos al cliente 11.",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="border-b border-[color:var(--border-subtle)] pb-6"
              >
                <dt className="text-base font-bold text-white sm:text-lg">
                  {item.q}
                </dt>
                <dd className="mt-2 text-sm leading-7 text-[color:var(--text-secondary)] sm:text-base">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <HomeContact />

      <CommercialFooter />
    </main>
  );
}
