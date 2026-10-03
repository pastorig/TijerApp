import { notFound } from "next/navigation";
import { resolveManagedBarbershopBySlug } from "@/lib/barbershops";
import { StaffPassword } from "@/components/staff/StaffPassword";
import { StaffNotifications } from "@/components/staff/StaffNotifications";
import { StaffShell } from "@/components/staff/StaffShell";

type Props = { params: Promise<{ barbershopSlug: string }> };

/** Mi cuenta: avisos de turnos nuevos y contraseña propia. */
export default async function MiCuentaPage({ params }: Props) {
  const { barbershopSlug } = await params;
  const { data: barbershop } =
    await resolveManagedBarbershopBySlug(barbershopSlug);
  if (!barbershop) notFound();

  return (
    <StaffShell
      barbershopSlug={barbershop.slug}
      barbershopName={barbershop.name}
    >
      <header>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Mi cuenta</h1>
      </header>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <StaffPassword />
        <StaffNotifications barbershopSlug={barbershop.slug} />
      </div>
    </StaffShell>
  );
}
