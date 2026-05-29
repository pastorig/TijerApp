import { notFound } from "next/navigation";
import { AdminAuthGuard } from "@/components/AdminAuthGuard";
import { AdminClientsManager } from "@/components/admin/AdminClientsManager";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  listKnownBarbershops,
  resolveManagedBarbershopBySlug,
} from "@/lib/barbershops";

type AdminClientsPageProps = {
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

export default async function AdminClientsPage({
  params,
}: AdminClientsPageProps) {
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
        <AdminClientsManager barbershop={barbershop} />
      </AdminShell>
    </AdminAuthGuard>
  );
}
