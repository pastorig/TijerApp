import type { LucideIcon } from "lucide-react";
import { Activity, CalendarDays, Clock3, DollarSign } from "lucide-react";
import { formatPrice } from "@/lib/format";

type DashboardSummaryProps = {
  stats: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    estimatedRevenue: number;
    occupancyPct: number;
  };
  activeCount: number;
  closingTime: string;
};

export function DashboardSummary({ stats, activeCount, closingTime }: DashboardSummaryProps) {
  return (
    <section aria-label="Resumen de hoy">
      <h2 className="mb-3 text-sm font-semibold text-neutral-300">Resumen de hoy</h2>
      <div className="grid grid-cols-2 gap-3">
        <SummaryMetric icon={CalendarDays} label="Turnos de hoy" value={String(stats.total)}
          detail={`${stats.confirmed} confirmados · ${stats.cancelled} cancelados`} />
        <SummaryMetric icon={Clock3} label="Por confirmar" value={String(stats.pending)}
          detail={stats.pending === 0 ? "Todo al día" : "Pendientes de confirmación"} />
        <SummaryMetric icon={DollarSign} label="Ingresos estimados" value={formatPrice(stats.estimatedRevenue)}
          detail={`${activeCount} turno${activeCount === 1 ? "" : "s"} activo${activeCount === 1 ? "" : "s"}`} />
        <SummaryMetric icon={Activity} label="Ocupación" value={`${stats.occupancyPct}%`}
          detail={`Cierre estimado ${closingTime}`} />
      </div>
    </section>
  );
}

function SummaryMetric({ icon: Icon, label, value, detail }: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div data-dashboard-metric className="min-w-0 rounded-lg border border-white/10 bg-[#121214] p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-5 text-neutral-300">{label}</p>
        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-neutral-400" />
      </div>
      <p className={`mt-2 break-words font-mono font-semibold leading-tight tabular-nums text-white [overflow-wrap:anywhere] ${value.length > 12 ? "text-sm" : "text-2xl"}`}>{value}</p>
      <p className="mt-2 text-xs leading-5 text-neutral-400">{detail}</p>
    </div>
  );
}
