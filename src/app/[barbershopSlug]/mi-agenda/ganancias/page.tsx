import { notFound } from "next/navigation";
import { resolveManagedBarbershopBySlug } from "@/lib/barbershops";
import { StaffEarnings } from "@/components/staff/StaffEarnings";
import { StaffShell } from "@/components/staff/StaffShell";

type Props = { params: Promise<{ barbershopSlug: string }> };

/** Las ganancias del empleado. El número lo calcula /api/staff/earnings. */
export default async function MisGananciasPage({ params }: Props) {
  const { barbershopSlug } = await params;
  const { data: barbershop } =
    await resolveManagedBarbershopBySlug(barbershopSlug);
  if (!barbershop) notFound();

  return (
    <StaffShell
      barbershopSlug={barbershop.slug}
      barbershopName={barbershop.name}
    >
      <StaffEarnings barbershopSlug={barbershop.slug} />
    </StaffShell>
  );
}
