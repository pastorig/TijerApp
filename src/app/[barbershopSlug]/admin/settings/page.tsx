import { notFound } from "next/navigation";
import { AdminAuthGuard } from "@/components/AdminAuthGuard";
import { AdminSettingsForm } from "@/components/AdminSettingsForm";
import {
  listKnownBarbershops,
  resolveManagedBarbershopBySlug,
} from "@/lib/barbershops";

type AdminSettingsPageProps = {
  params: Promise<{
    barbershopSlug: string;
  }>;
};

// Render dinámico siempre: la página de Settings refleja config viva de la
// barbería. Si la dejamos estática, se queda con el snapshot de build y
// los cambios no aparecen hasta el siguiente deploy.
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const { data } = await listKnownBarbershops();

  return data.map((barbershop) => ({
    barbershopSlug: barbershop.slug,
  }));
}

export default async function AdminSettingsPage({
  params,
}: AdminSettingsPageProps) {
  const { barbershopSlug } = await params;
  const { data: barbershop } =
    await resolveManagedBarbershopBySlug(barbershopSlug);

  if (!barbershop) {
    notFound();
  }

  return (
    <AdminAuthGuard barbershopSlug={barbershop.slug}>
      <AdminSettingsForm barbershop={barbershop} />
    </AdminAuthGuard>
  );
}
