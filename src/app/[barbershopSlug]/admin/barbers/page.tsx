import { notFound } from "next/navigation";
import { AdminAuthGuard } from "@/components/AdminAuthGuard";
import { AdminBarbersManager } from "@/components/AdminBarbersManager";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  listKnownBarbershops,
  resolveManagedBarbershopBySlug,
} from "@/lib/barbershops";

type AdminBarbersPageProps = {
  params: Promise<{
    barbershopSlug: string;
  }>;
};

export async function generateStaticParams() {
  const { data } = await listKnownBarbershops();

  return data.map((barbershop) => ({
    barbershopSlug: barbershop.slug,
  }));
}

export default async function AdminBarbersPage({
  params,
}: AdminBarbersPageProps) {
  const { barbershopSlug } = await params;
  const { data: barbershop } =
    await resolveManagedBarbershopBySlug(barbershopSlug);

  if (!barbershop) {
    notFound();
  }

  return (
    <AdminAuthGuard barbershopSlug={barbershop.slug}>
      <AdminShell
        barbershopSlug={barbershop.slug}
        barbershopName={barbershop.name}
      >
        <AdminBarbersManager barbershop={barbershop} />
      </AdminShell>
    </AdminAuthGuard>
  );
}
