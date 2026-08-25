import { notFound } from "next/navigation";
import { resolveManagedBarbershopBySlug } from "@/lib/barbershops";
import { StaffAgenda } from "@/components/staff/StaffAgenda";
import { StaffShell } from "@/components/staff/StaffShell";

type Props = { params: Promise<{ barbershopSlug: string }> };

/**
 * La agenda del empleado.
 *
 * Acá NO se cargan turnos: el server component solo resuelve el nombre de la
 * barbería, que es público. Los turnos los pide el cliente a /api/staff/agenda,
 * que es donde se sabe quién es el empleado y de qué barbero es la agenda.
 */
export default async function MiAgendaPage({ params }: Props) {
  const { barbershopSlug } = await params;
  const { data: barbershop } =
    await resolveManagedBarbershopBySlug(barbershopSlug);
  if (!barbershop) notFound();

  return (
    <StaffShell
      barbershopSlug={barbershop.slug}
      barbershopName={barbershop.name}
    >
      <StaffAgenda
        barbershopSlug={barbershop.slug}
        barbershopName={barbershop.name}
      />
    </StaffShell>
  );
}
