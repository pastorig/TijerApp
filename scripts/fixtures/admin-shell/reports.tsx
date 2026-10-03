import { notFound } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { AdminReportes } from "@/components/admin/AdminReportes";
import { demoBarbershops } from "@/data/demo-barbershops";

export default function DesignPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <AdminChrome barbershopSlug="design-preview" barbershopName="Barberia demo">
    <AdminReportes barbershop={{ ...demoBarbershops[0], slug: "design-preview", name: "Barberia demo" }} />
  </AdminChrome>;
}
