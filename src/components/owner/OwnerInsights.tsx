"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Users2,
  Activity,
} from "lucide-react";
import { getOwnerDashboardMetrics } from "@/lib/owner-metrics";
import type { OwnerBarbershopSummary } from "@/lib/owner-metrics";
import { cn } from "@/lib/cn";

/**
 * OwnerInsights — Panel de insights estratégicos para el dueño SaaS (TijerApp).
 *
 * Métricas pensadas para vos como owner que decidís roadmap y precios:
 *  - MRR estimado: total barberías activas × precio plan promedio
 *  - Healthy / Quiet / Inactive: distribución de barberías por health status
 *  - Alertas operativas: barberías sin actividad > 14d (probables churners)
 *
 * Pricing assumptions (paste de /precios):
 *   - Plan Esencial (gratis): $0
 *   - Plan Pro: $40/mes
 *   - Asumimos por ahora que todas las activas están en Pro (no hay aún
 *     billing real). Cuando se implemente subscriptions table, leerlo de ahí.
 */
const ASSUMED_PRO_PRICE_USD = 40;

type HealthBuckets = {
  active: OwnerBarbershopSummary[];
  quiet: OwnerBarbershopSummary[];
  inactive: OwnerBarbershopSummary[];
};

function bucketByHealth(
  barbershops: OwnerBarbershopSummary[],
): HealthBuckets {
  const now = Date.now();
  const buckets: HealthBuckets = { active: [], quiet: [], inactive: [] };

  for (const bs of barbershops) {
    if (bs.todayAppointmentCount > 0) {
      buckets.active.push(bs);
      continue;
    }
    if (!bs.lastAppointmentCreatedAt) {
      buckets.inactive.push(bs);
      continue;
    }
    const last = new Date(bs.lastAppointmentCreatedAt).getTime();
    const days = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    if (days <= 3) buckets.active.push(bs);
    else if (days <= 14) buckets.quiet.push(bs);
    else buckets.inactive.push(bs);
  }
  return buckets;
}

export function OwnerInsights() {
  const [barbershops, setBarbershops] = useState<OwnerBarbershopSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data: metrics } = await getOwnerDashboardMetrics();
        if (!metrics) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!cancelled) setBarbershops(metrics.barbershops);
      } finally {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const buckets = useMemo(() => bucketByHealth(barbershops), [barbershops]);
  const totalActive = buckets.active.length + buckets.quiet.length;
  const mrrEstimateUsd = totalActive * ASSUMED_PRO_PRICE_USD;
  const arr = mrrEstimateUsd * 12;

  if (isLoading) {
    return (
      <section className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5 text-xs text-[color:var(--text-muted)]">
        Cargando insights…
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
          Insights estratégicos
        </p>
        <h2 className="mt-1 text-lg font-black uppercase tracking-tight text-white">
          Health del SaaS
        </h2>
      </header>

      {/* KPIs financieros */}
      <div className="grid gap-3 sm:grid-cols-3">
        <InsightCard
          icon={DollarSign}
          label="MRR estimado"
          value={`USD ${mrrEstimateUsd.toLocaleString("en-US")}`}
          hint={`${totalActive} barberías × $${ASSUMED_PRO_PRICE_USD}/mes`}
          highlight
        />
        <InsightCard
          icon={TrendingUp}
          label="ARR proyectado"
          value={`USD ${arr.toLocaleString("en-US")}`}
          hint="MRR × 12"
        />
        <InsightCard
          icon={Users2}
          label="Barberías totales"
          value={String(barbershops.length)}
          hint={`${buckets.active.length} activas hoy`}
        />
      </div>

      {/* Distribución de salud */}
      <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-4 sm:p-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">
          Distribución por health status
        </h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <HealthBlock
            label="Activas"
            count={buckets.active.length}
            tone="success"
          />
          <HealthBlock
            label="Quiet"
            count={buckets.quiet.length}
            tone="warning"
          />
          <HealthBlock
            label="Inactivas"
            count={buckets.inactive.length}
            tone="danger"
          />
        </div>
      </div>

      {/* Alertas operativas */}
      {buckets.inactive.length > 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[color:var(--danger)]/30 bg-[color:var(--danger-soft)]/10 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-[color:var(--danger)]"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white">
                {buckets.inactive.length} barbería
                {buckets.inactive.length !== 1 ? "s" : ""} en riesgo de churn
              </h3>
              <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                Sin actividad hace más de 14 días. Considerá contactarlas:
              </p>
              <ul className="mt-3 space-y-1.5">
                {buckets.inactive.slice(0, 5).map((bs) => (
                  <li
                    key={bs.slug}
                    className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] px-3 py-2 text-xs"
                  >
                    <span className="truncate text-white">{bs.name}</span>
                    <code className="shrink-0 text-[10px] text-[color:var(--text-muted)]">
                      {bs.slug}
                    </code>
                  </li>
                ))}
                {buckets.inactive.length > 5 ? (
                  <li className="text-center text-[10px] text-[color:var(--text-muted)]">
                    + {buckets.inactive.length - 5} más
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[var(--radius-md)] border border-[color:var(--success)]/30 bg-[color:var(--success-soft)]/10 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Activity
              aria-hidden="true"
              className="size-5 shrink-0 text-[color:var(--success)]"
            />
            <p className="text-sm font-bold text-white">
              🎉 Ninguna barbería en riesgo de churn
            </p>
          </div>
          <p className="mt-1 pl-8 text-xs text-[color:var(--text-secondary)]">
            Todas las barberías tuvieron actividad en los últimos 14 días.
          </p>
        </div>
      )}
    </section>
  );
}

function InsightCard({
  icon: Icon,
  label,
  value,
  hint,
  highlight = false,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border bg-[color:var(--surface-1)] p-3 sm:p-4",
        highlight
          ? "border-[color:var(--brand-gold)]/40 ring-1 ring-[color:var(--brand-gold)]/20"
          : "border-[color:var(--border-subtle)]",
      )}
    >
      <div className="flex items-start gap-2">
        <Icon
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-4 shrink-0",
            highlight
              ? "text-[color:var(--brand-gold)]"
              : "text-[color:var(--text-muted)]",
          )}
        />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)] sm:text-[11px]">
            {label}
          </p>
          <p className="mt-1 stat-number text-lg font-black tracking-tight text-white sm:text-xl">
            {value}
          </p>
          <p className="mt-0.5 text-[10px] text-[color:var(--text-muted)]">
            {hint}
          </p>
        </div>
      </div>
    </div>
  );
}

function HealthBlock({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "success" | "warning" | "danger";
}) {
  const toneClasses = {
    success: "border-[color:var(--success)]/30 bg-[color:var(--success-soft)] text-[color:var(--success)]",
    warning: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    danger: "border-[color:var(--danger)]/30 bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
  };

  return (
    <div className={cn("rounded-[var(--radius-sm)] border p-3 text-center", toneClasses[tone])}>
      <p className="stat-number text-2xl font-black leading-none">{count}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.14em]">{label}</p>
    </div>
  );
}
