import { notFound } from "next/navigation";
import { AdminAuthGuard } from "@/components/AdminAuthGuard";
import { AdminMercadoPagoSettings } from "@/components/admin/AdminMercadoPagoSettings";
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

export default async function AdminCobrosPage({ params }: Props) {
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
        <RequirePlan feature="cobros_online" barbershopSlug={barbershop.slug}>
          <AdminMercadoPagoSettings barbershop={barbershop} />
        </RequirePlan>
      </AdminShell>
    </AdminAuthGuard>
  );
}
