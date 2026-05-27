import { notFound } from "next/navigation";
import { AdminAuthGuard } from "@/components/AdminAuthGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  listKnownBarbershops,
  resolveManagedBarbershopBySlug,
} from "@/lib/barbershops";

type AdminReportesPageProps = {
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

export default async function AdminReportesPage({
  params,
}: AdminReportesPageProps) {
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
        <div className="space-y-8">
          <header className="animate-fade-up">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
              Reportes
            </p>
            <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
              Análisis y métricas
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
              Operación, ingresos y rendimiento de {barbershop.name}.
            </p>
          </header>

          <div className="rounded-[var(--radius-sm)] border border-dashed border-[color:var(--border-subtle)] p-10 text-center">
            <p className="text-sm font-bold text-white">
              Reportes en construcción
            </p>
            <p className="mt-2 text-xs text-[color:var(--text-muted)] sm:text-sm">
              Próximamente: KPIs, comparativa vs período anterior, ranking de
              barberos, top servicios y horarios pico.
            </p>
          </div>
        </div>
      </AdminShell>
    </AdminAuthGuard>
  );
}
