import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui";
import { resolveBarbershopBySlug } from "@/lib/barbershops";
import { getPublicAppointmentByToken } from "@/lib/public-appointment";
import { AppointmentActionPanel } from "../AppointmentActionPanel";

type PublicAppointmentResponderPageProps = {
  params: Promise<{
    token: string;
  }>;
};

/**
 * Vista "activa" del turno: el cliente puede Confirmar o Cancelar.
 * Esta es la URL que va en el WhatsApp del admin → cliente (recordatorio).
 * Para vista pasiva (solo detalle, sin botones), usar `/r/[token]`.
 */
export default async function PublicAppointmentResponderPage({
  params,
}: PublicAppointmentResponderPageProps) {
  const { token } = await params;

  if (!/^[0-9a-f-]{30,40}$/i.test(token)) {
    notFound();
  }

  const { data: appointment } = await getPublicAppointmentByToken(token);

  if (!appointment) {
    notFound();
  }

  const { data: resolvedBarbershop } = await resolveBarbershopBySlug(
    appointment.barbershop_slug,
  );
  const barbershopName =
    resolvedBarbershop?.name ?? appointment.barbershop_name;
  const appointmentWithName = {
    ...appointment,
    barbershop_name: barbershopName,
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-5 sm:px-8 sm:py-6 lg:px-12">
        <Link
          href={`/${appointment.barbershop_slug}`}
          className="inline-flex min-w-0 items-center gap-1 truncate text-xs font-semibold uppercase tracking-normal text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)] sm:tracking-normal"
        >
          ← {barbershopName}
        </Link>
        <Logo variant="mark" size="sm" className="shrink-0" />
      </nav>

      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
        <AppointmentActionPanel
          token={token}
          initialAppointment={appointmentWithName}
          showActions
        />
      </div>
    </main>
  );
}
