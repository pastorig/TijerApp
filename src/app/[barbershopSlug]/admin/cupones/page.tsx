import { notFound } from "next/navigation";
import { AdminAuthGuard } from "@/components/AdminAuthGuard";
import { AdminCouponsManager } from "@/components/admin/AdminCouponsManager";
import { AdminShell } from "@/components/admin/AdminShell";
import { RequirePlan } from "@/components/admin/RequirePlan";
import {
  listKnownBarbershops,
  resolveManagedBarbershopBySlug,
} from "@/lib/barbershops";

type Props = {
  params: Promise<{ barbershopSlug: string }>;
};

export async function generateStaticParams() {
  const { data } = await listKnownBarbershops();
  return data.map((b) => ({ barbershopSlug: b.slug }));
}

export default async function AdminCouponsPage({ params }: Props) {
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
        <RequirePlan feature="cupones" barbershopSlug={barbershop.slug}>
          <AdminCouponsManager barbershop={barbershop} />
        </RequirePlan>
      </AdminShell>
    </AdminAuthGuard>
  );
}
