import { notFound } from "next/navigation";
import { AdminAuthGuard } from "@/components/AdminAuthGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminTeamManager } from "@/components/admin/AdminTeamManager";
import { RequirePlan } from "@/components/admin/RequirePlan";
import {
  listKnownBarbershops,
  resolveManagedBarbershopBySlug,
} from "@/lib/barbershops";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ barbershopSlug: string }>;
};

export async function generateStaticParams() {
  const { data } = await listKnownBarbershops();
  return data.map((b) => ({ barbershopSlug: b.slug }));
}

export default async function AdminTeamPage({ params }: Props) {
  const { barbershopSlug } = await params;
  const { data: barbershop } =
    await resolveManagedBarbershopBySlug(barbershopSlug);

  if (!barbershop) notFound();

  return (
    <AdminAuthGuard barbershopSlug={barbershop.slug}>
      <AdminShell
        barbershopSlug={barbershop.slug}
        barbershopName={barbershop.name}
      >
        <RequirePlan feature="multi_admin" barbershopSlug={barbershop.slug}>
          <AdminTeamManager barbershop={barbershop} />
        </RequirePlan>
      </AdminShell>
    </AdminAuthGuard>
  );
}
