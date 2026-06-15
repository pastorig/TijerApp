import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicBarbershopLanding } from "@/components/PublicBarbershopLanding";
import { listPublicReviewsByBarbershop } from "@/lib/appointment-reviews";
import { resolveBarbershopBySlug } from "@/lib/barbershops";

type BarbershopPageProps = {
  params: Promise<{
    barbershopSlug: string;
  }>;
};

// Dinámica: la landing tiene que reflejar cambios en barberos, servicios
// y configuración apenas se hacen vía admin, no esperar al próximo build.
export const dynamic = "force-dynamic";

/**
 * Metadata dinámica por barbería. Cuando el barbero comparte su link
 * (ej. tijerapp.vercel.app/sv-barber) por WhatsApp/Instagram, el preview
 * muestra el nombre de SU barbería + su logo, no el genérico de TijerApp.
 */
export async function generateMetadata({
  params,
}: BarbershopPageProps): Promise<Metadata> {
  const { barbershopSlug } = await params;
  const { data: barbershop } = await resolveBarbershopBySlug(barbershopSlug);

  if (!barbershop) {
    return { title: "Barbería no encontrada" };
  }

  const title = `${barbershop.name} · Reservá tu turno`;
  const description =
    barbershop.description?.trim() ||
    `Reservá tu turno en ${barbershop.name} online, en segundos. Elegí barbero, servicio y horario.`;

  // Si la barbería tiene logo cargado, lo usamos como imagen de preview.
  // Sino, cae al OG image por defecto de TijerApp (definido en el layout).
  const images = barbershop.logoUrl
    ? [{ url: barbershop.logoUrl, alt: barbershop.name }]
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: barbershop.name,
      type: "website",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary" : "summary_large_image",
      title,
      description,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
  };
}

export default async function BarbershopPage({
  params,
}: BarbershopPageProps) {
  const { barbershopSlug } = await params;
  const { data: barbershop } = await resolveBarbershopBySlug(barbershopSlug);

  if (!barbershop) {
    notFound();
  }

  const { data: reviews } = await listPublicReviewsByBarbershop(
    barbershopSlug,
    6,
  );

  return (
    <PublicBarbershopLanding barbershop={barbershop} reviews={reviews} />
  );
}
