import { notFound } from "next/navigation";
import { AdminAuthGuard } from "@/components/AdminAuthGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { ShareKit } from "@/components/admin/ShareKit";
import {
  listKnownBarbershops,
  resolveManagedBarbershopBySlug,
} from "@/lib/barbershops";

type AdminSharePageProps = {
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

/**
 * "Compartir" (feature 034): el link, el QR, los textos y el cartel.
 *
 * Sin chequeo de plan y sin bloqueo por plan vencido: compartir el link es
 * justo lo que una barbería tiene que poder hacer siempre, y no escribe nada.
 */
export default async function AdminSharePage({ params }: AdminSharePageProps) {
  const { barbershopSlug } = await params;
  const { data: barbershop } =
    await resolveManagedBarbershopBySlug(barbershopSlug);

  if (!barbershop) {
    notFound();
  }

  // El sitio canónico, no el dominio desde donde se abre el panel: el QR
  // impreso tiene que servir aunque el cartel se haya armado desde una preview.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tijerapp.com";

  return (
    <AdminAuthGuard barbershopSlug={barbershop.slug}>
      <AdminShell
        barbershopSlug={barbershop.slug}
        barbershopName={barbershop.name}
      >
        <ShareKit
          barbershopName={barbershop.name}
          barbershopSlug={barbershop.slug}
          siteUrl={siteUrl}
        />
      </AdminShell>
    </AdminAuthGuard>
  );
}
