import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Lock } from "lucide-react";
import { BookingForm } from "@/components/BookingForm";
import { BookingUnavailableNotice } from "@/components/BookingUnavailableNotice";
import { getBarbershopPlan } from "@/lib/plan-access";
import { Logo } from "@/components/ui";
import { resolveBarbershopBySlug } from "@/lib/barbershops";

type BookingPageProps = {
  params: Promise<{
    barbershopSlug: string;
  }>;
};

// Dinámica: la reserva tiene que ver barberos/servicios actualizados al instante,
// no esperar al próximo build cuando el admin agrega o desactiva algo.
export const dynamic = "force-dynamic";

/**
 * Slugs de barberías reales (con clientes activos) que NO deberían recibir
 * reservas de prueba del público que viene a explorar TijerApp.
 *
 * VACÍO desde 2026-06-07: ahora la demo pública vive en /primebarber, así
 * que SV Barber (cliente real) puede volver a recibir reservas reales sin
 * preocuparnos por el ruido de testers. Si en el futuro hay otra barbería
 * real que se quiera proteger del ruido público, agregar su slug acá.
 */
const REAL_BARBERSHOP_SLUGS = new Set<string>();

export default async function BookingPage({ params }: BookingPageProps) {
  const { barbershopSlug } = await params;
  const { data: barbershop } = await resolveBarbershopBySlug(barbershopSlug);

  if (!barbershop) {
    notFound();
  }

  const isRealBarbershop = REAL_BARBERSHOP_SLUGS.has(barbershopSlug);

  // Plan vencido => modo lectura: la reserva online se apaga y el cliente va
  // por WhatsApp. Ver specs/009-modo-lectura/spec.md.
  const plan = await getBarbershopPlan(barbershopSlug);

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-8 sm:py-6 lg:px-12">
        <Link
          href={`/${barbershopSlug}`}
          className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)] sm:tracking-[0.2em]"
        >
          ← {barbershop.name}
        </Link>
        <Logo variant="mark" size="sm" className="shrink-0" />
      </nav>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-16">
        {plan.isReadOnly ? (
          <BookingUnavailableNotice
            barbershopName={barbershop.name}
            barbershopSlug={barbershopSlug}
            whatsapp={barbershop.whatsapp}
          />
        ) : isRealBarbershop ? (
          <RealBarbershopBlocker barbershopName={barbershop.name} />
        ) : (
          <BookingForm barbershop={barbershop} />
        )}
      </div>
    </main>
  );
}

/**
 * Pantalla que aparece cuando alguien intenta reservar en una barbería real
 * (con clientes en producción). Evita que el público que viene a explorar
 * TijerApp termine creando turnos basura en clientes reales.
 */
function RealBarbershopBlocker({ barbershopName }: { barbershopName: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-[var(--radius-md)] border border-[color:var(--brand-gold)]/20 bg-[color:var(--surface-1)] p-6 text-center sm:p-10">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)]">
        <Lock
          aria-hidden="true"
          className="size-6 text-[color:var(--brand-gold)]"
        />
      </div>

      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
        Cliente real
      </p>
      <h1 className="mt-3 text-2xl font-black uppercase leading-tight tracking-tight text-balance text-white sm:text-3xl">
        {barbershopName} es una barbería real
      </h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
        Las reservas públicas están deshabilitadas en este link para evitar
        turnos de prueba en una operación real. Si querés probar TijerApp,
        contactanos y te damos acceso a una barbería demo dedicada.
      </p>

      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/producto"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-gold-grad px-6 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:brightness-110 sm:w-auto"
        >
          Conocé TijerApp
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
        <Link
          href="/#contacto"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-6 text-sm font-bold uppercase tracking-[0.14em] text-white transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] sm:w-auto"
        >
          Contactanos
        </Link>
      </div>
    </div>
  );
}
