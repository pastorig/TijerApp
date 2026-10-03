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
      <StaffNotifications barbershopSlug={barbershop.slug} />
      <StaffPassword />
    </StaffShell>
  );
}
