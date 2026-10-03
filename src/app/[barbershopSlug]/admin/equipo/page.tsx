import { notFound } from "next/navigation";
import { AdminAuthGuard } from "@/components/AdminAuthGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminTeamManager } from "@/components/admin/AdminTeamManager";
import { StaffAccessSection } from "@/components/admin/StaffAccessSection";
import { RequirePlan } from "@/components/admin/RequirePlan";
import {
  listKnownBarbershops,
  resolveManagedBarbershopBySlug,
} from "@/lib/barbershops";
import { getBarbershopPlan } from "@/lib/plan-access";
import { hasFeature } from "@/lib/plans";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ barbershopSlug: string }>;
};

export async function generateStaticParams() {
  const { data } = await listKnownBarbershops();
  return data.map((b) => ({ barbershopSlug: b.slug }));
}

export default async function AdminTeamPage({ params }: Props) {
  const { barbershopSlug } = await params;
  const { data: barbershop } =
    await resolveManagedBarbershopBySlug(barbershopSlug);

  if (!barbershop) notFound();

  // Esta página tiene DOS features distintas, y confundirlas dejaba a Esencial
  // afuera de algo que paga: `multi_admin` (más cuentas de DUEÑO) es Pro, pero
  // los accesos de empleado son Esencial. Con la página entera detrás de
  // `multi_admin`, la subpestaña no aparecía y la pantalla para dar un acceso
  // era inalcanzable — aunque el servidor sí los dejaba entrar. Así que la
  // puerta la marca la feature de ABAJO, y la lista de admins se muestra sólo
  // si el plan la incluye.
  const plan = await getBarbershopPlan(barbershop.slug);

  return (
    <AdminAuthGuard barbershopSlug={barbershop.slug}>
      <AdminShell
        barbershopSlug={barbershop.slug}
        barbershopName={barbershop.name}
      >
        <RequirePlan
          feature="cuentas_empleados"
          barbershopSlug={barbershop.slug}
        >
          {hasFeature(plan.tier, "multi_admin") ? (
            <>
              <AdminTeamManager barbershop={barbershop} />
              <StaffAccessSection barbershop={barbershop} />
            </>
          ) : (
            // Sin la lista de admins arriba, la tarjeta se queda sin el `main`
            // que le daba el ancho y el aire: los trae ella misma. (No se puede
            // envolver siempre porque `AdminTeamManager` ya trae su propio
            // `main` y anidarlos sería HTML inválido.)
            <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
              <StaffAccessSection barbershop={barbershop} />
            </main>
          )}
        </RequirePlan>
      </AdminShell>
    </AdminAuthGuard>
  );
}
