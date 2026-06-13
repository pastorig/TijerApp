import { notFound } from "next/navigation";
import { AdminAuthGuard } from "@/components/AdminAuthGuard";
import { AdminLoyaltyManager } from "@/components/admin/AdminLoyaltyManager";
import { AdminShell } from "@/components/admin/AdminShell";
import { RequirePlan } from "@/components/admin/RequirePlan";
import {
  listKnownBarbershops,
  resolveManagedBarbershopBySlug,
} from "@/lib/barbershops";

// Dinámica: el plan de la barbería puede cambiar en cualquier momento desde
// /owner/planes, y el gating de la página depende de ese plan. Sin dynamic,
// Next.js cachea el plan viejo y el cambio del owner no se refleja hasta
// el siguiente deploy.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ barbershopSlug: string }>;
};

export async function generateStaticParams() {
  const { data } = await listKnownBarbershops();
  return data.map((b) => ({ barbershopSlug: b.slug }));
}

export default async function AdminLoyaltyPage({ params }: Props) {
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
        <RequirePlan feature="fidelizacion" barbershopSlug={barbershop.slug}>
          <AdminLoyaltyManager barbershop={barbershop} />
        </RequirePlan>
      </AdminShell>
    </AdminAuthGuard>
  );
}
