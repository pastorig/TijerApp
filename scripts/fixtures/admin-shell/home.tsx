import { notFound } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { demoBarbershops } from "@/data/demo-barbershops";

export default function DesignPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  const barbershop = { ...demoBarbershops[0], slug: "design-preview", name: "Barberia demo" };
  return <AdminChrome barbershopSlug={barbershop.slug} barbershopName={barbershop.name}>
    <AdminDashboard barbershop={barbershop} />
  </AdminChrome>;
}
