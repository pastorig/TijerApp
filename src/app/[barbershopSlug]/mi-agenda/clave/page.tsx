import { notFound } from "next/navigation";
import { resolveManagedBarbershopBySlug } from "@/lib/barbershops";
import { StaffPassword } from "@/components/staff/StaffPassword";
import { StaffShell } from "@/components/staff/StaffShell";

type Props = { params: Promise<{ barbershopSlug: string }> };

/** El empleado cambia su propia contraseña. */
export default async function MiClavePage({ params }: Props) {
  const { barbershopSlug } = await params;
  const { data: barbershop } =
    await resolveManagedBarbershopBySlug(barbershopSlug);
  if (!barbershop) notFound();

  return (
    <StaffShell
      barbershopSlug={barbershop.slug}
      barbershopName={barbershop.name}
    >
      <StaffPassword />
    </StaffShell>
  );
}
