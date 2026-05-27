import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui";
import { getPublicAppointmentByToken } from "@/lib/public-appointment";
import { AppointmentActionPanel } from "./AppointmentActionPanel";

type PublicAppointmentPageProps = {
  params: Promise<{
    token: string;
  }>;
};

// Server component: trae el turno con SSR. La interacción confirmar/cancelar
// la maneja el componente cliente `AppointmentActionPanel`.
export default async function PublicAppointmentPage({
  params,
}: PublicAppointmentPageProps) {
  const { token } = await params;

  // Validación mínima del formato: si no parece UUID, 404 directo (evita
  // bots probando URLs random).
  if (!/^[0-9a-f-]{30,40}$/i.test(token)) {
    notFound();
  }

  const { data: appointment } = await getPublicAppointmentByToken(token);

  if (!appointment) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-5 sm:px-8 sm:py-6 lg:px-12">
        <Link
          href={`/${appointment.barbershop_slug}`}
          className="inline-flex min-w-0 items-center gap-1 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)] sm:tracking-[0.2em]"
        >
          ← {appointment.barbershop_name}
        </Link>
        <Logo variant="mark" size="sm" className="shrink-0" />
      </nav>

      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
        <AppointmentActionPanel
          token={token}
          initialAppointment={appointment}
        />
      </div>
    </main>
  );
}
