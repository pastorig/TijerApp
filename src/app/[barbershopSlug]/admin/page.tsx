import { notFound } from "next/navigation";
import { AdminAppointments } from "@/components/AdminAppointments";
import {
  demoBarbershops,
  getDemoBarbershopBySlug,
} from "@/data/demo-barbershops";

type AdminPageProps = {
  params: Promise<{
    barbershopSlug: string;
  }>;
};

export function generateStaticParams() {
  return demoBarbershops.map((barbershop) => ({
    barbershopSlug: barbershop.slug,
  }));
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { barbershopSlug } = await params;
  const barbershop = getDemoBarbershopBySlug(barbershopSlug);

  if (!barbershop) {
    notFound();
  }

  return <AdminAppointments barbershop={barbershop} />;
}
