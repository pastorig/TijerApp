import Link from "next/link";
import { renglonEnTexto, totalDeProductos } from "@/lib/productos";
import { productosDelTurnoPorToken } from "@/lib/server/productos";
import { formatPrice } from "@/lib/format";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui";
import { resolveBarbershopBySlug } from "@/lib/barbershops";
import { getPublicAppointmentByToken } from "@/lib/public-appointment";
import { getAppointmentDepositByToken } from "@/lib/appointment-deposit";
import { DepositPaymentPanel } from "@/components/DepositPaymentPanel";
import { SimulatePaymentButton } from "@/components/SimulatePaymentButton";
import { AppointmentActionPanel } from "./AppointmentActionPanel";
import { ClientPushOptIn } from "./ClientPushOptIn";
import { PublicLoyaltyCard } from "./PublicLoyaltyCard";

// IMPORTANTE: dinámica para que cada request consulte la DB en vivo.
// Sin esto, Next.js cachea el resultado del RPC en el primer build de
// cada token. Si el primer build devolvió 404 (RPC roto), el cache
// sirve ese 404 hasta el siguiente deploy. Con force-dynamic, cada
// llamada al page ejecuta el RPC fresco.
export const dynamic = "force-dynamic";

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

  // El RPC cae al slug si la barbería no está en la tabla `barbershops`
  // (caso típico de las demos como SV Barber). Resolvemos el nombre real
  // desde la misma fuente que la landing pública usa.
  const [{ data: resolvedBarbershop }, deposit, productos] = await Promise.all([
    resolveBarbershopBySlug(appointment.barbershop_slug),
    getAppointmentDepositByToken(token),
    // Productos que sumó al reservar (035). Si falla, lista vacía.
    productosDelTurnoPorToken(token),
  ]);
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
          showActions={false}
        />
        {productos.length > 0 ? (
          <section
            aria-label="Productos de tu turno"
            className="card-premium mt-6 p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-normal text-[color:var(--brand-gold)]">
              También te llevás
            </p>
            <ul className="mt-3 grid gap-2">
              {productos.map((p, i) => (
                <li
                  key={`${p.product_name}-${i}`}
                  className="flex items-baseline justify-between gap-4 text-sm"
                >
                  <span className="min-w-0 break-words font-semibold text-white">
                    {renglonEnTexto(p)}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-[color:var(--text-secondary)]">
                    {formatPrice(p.unit_price * p.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-baseline justify-between gap-4 border-t border-[color:var(--border-subtle)] pt-3 text-sm font-bold text-[color:var(--brand-gold)]">
              <span>Productos</span>
              <span className="font-mono tabular-nums">
                {formatPrice(totalDeProductos(productos))}
              </span>
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              Los pagás en el local, junto con tu turno.
            </p>
          </section>
        ) : null}
        {deposit ? (
          <div className="mt-6">
            <DepositPaymentPanel
              amount={deposit.amount}
              status={deposit.status}
              payHref={
                deposit.payable ? `/api/mp/pay?token=${token}` : undefined
              }
              barbershopName={barbershopName}
            />
            {deposit.payable ? <SimulatePaymentButton token={token} /> : null}
          </div>
        ) : null}
        <ClientPushOptIn token={token} />
        <PublicLoyaltyCard
          token={token}
          barbershopSlug={appointment.barbershop_slug}
        />
      </div>
    </main>
  );
}
