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
import { StackedBar } from "./charts";

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
 *   - Plan Pro: $61.000 ARS/mes (precio en pesos argentinos)
 *   - Asumimos por ahora que todas las activas están en Pro (no hay aún
 *     billing real). Cuando se implemente subscriptions table, leerlo de ahí.
 */
const ASSUMED_PRO_PRICE_ARS = 61000;

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
        if (!cancelled) setBarbershops(metrics.barbershops);
      } finally {
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
  const mrrEstimateArs = totalActive * ASSUMED_PRO_PRICE_ARS;
  const arrArs = mrrEstimateArs * 12;

  if (isLoading) {
    return (
      <section className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5 text-xs text-[color:var(--text-muted)]">
        Cargando insights…
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Insights estratégicos
          </p>
          <h2 className="mt-0.5 text-base font-black uppercase tracking-tight text-white sm:text-lg">
            Health del SaaS
          </h2>
        </div>
        <Activity
          aria-hidden="true"
          className="size-5 shrink-0 text-[color:var(--brand-gold)]/70"
        />
      </header>

      {/* KPIs financieros + Health Status — 1 sola fila en desktop, stack en mobile */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <InsightCard
          icon={DollarSign}
          label="MRR"
          value={`$${mrrEstimateArs.toLocaleString("es-AR")}`}
          hint={`${totalActive} barberías × $${ASSUMED_PRO_PRICE_ARS.toLocaleString("es-AR")}/mes`}
          highlight
        />
        <InsightCard
          icon={TrendingUp}
          label="ARR"
          value={`$${arrArs.toLocaleString("es-AR")}`}
          hint="MRR × 12"
        />
        <InsightCard
          icon={Users2}
          label="Barberías"
          value={String(barbershops.length)}
          hint={`${buckets.active.length} activas hoy`}
        />
      </div>

      {/* Health blocks compactos en 1 fila */}
      <div className="grid grid-cols-3 gap-2">
        <HealthBlock
          label="Activas"
          count={buckets.active.length}
          tone="success"
        />
        <HealthBlock
          label="En pausa"
          count={buckets.quiet.length}
          tone="warning"
        />
        <HealthBlock
          label="Inactivas"
          count={buckets.inactive.length}
          tone="danger"
        />
      </div>

      {/* Distribución visual — barra apilada proporcional (activas/quiet/inactivas) */}
      {barbershops.length > 0 ? (
        <div className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] px-3.5 py-3">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Distribución de barberías
          </p>
          <StackedBar
            ariaLabel={`Distribución de ${barbershops.length} barberías por salud`}
            segments={[
              {
                label: "Activas",
                value: buckets.active.length,
                barClass: "bg-[color:var(--success)]",
                textClass: "text-[color:var(--success)]",
              },
              {
                label: "En pausa",
                value: buckets.quiet.length,
                barClass: "bg-amber-400",
                textClass: "text-amber-300",
              },
              {
                label: "Inactivas",
                value: buckets.inactive.length,
                barClass: "bg-[color:var(--danger)]",
                textClass: "text-[color:var(--danger)]",
              },
            ]}
          />
        </div>
      ) : null}

      {/* Alertas operativas — compactas */}
      {buckets.inactive.length > 0 ? (
        <div className="rounded-[var(--radius-sm)] border border-[color:var(--danger)]/30 bg-[color:var(--danger-soft)]/10 p-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-[color:var(--danger)]"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">
                {buckets.inactive.length} barbería
                {buckets.inactive.length !== 1 ? "s" : ""} en riesgo de churn
                <span className="ml-1 font-normal text-[color:var(--text-muted)]">
                  · 14d+ inactivas
                </span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {buckets.inactive.slice(0, 6).map((bs) => (
                  <span
                    key={bs.slug}
                    className="inline-flex items-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] px-2.5 py-0.5 text-[11px] text-white"
                  >
                    {bs.name}
                  </span>
                ))}
                {buckets.inactive.length > 6 ? (
                  <span className="text-[10px] text-[color:var(--text-muted)]">
                    + {buckets.inactive.length - 6} más
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-[color:var(--success)]/30 bg-[color:var(--success-soft)]/10 px-3 py-2">
          <Activity
            aria-hidden="true"
            className="size-4 shrink-0 text-[color:var(--success)]"
          />
          <p className="text-xs font-semibold text-white">
            Ninguna barbería en riesgo de churn (todas activas en los últimos 14 días)
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
        "rounded-[var(--radius-sm)] border bg-[color:var(--surface-1)] px-3 py-2.5",
        highlight
          ? "border-[color:var(--brand-gold)]/40 ring-1 ring-[color:var(--brand-gold)]/20"
          : "border-[color:var(--border-subtle)]",
      )}
    >
      <div className="flex items-center gap-2.5">
        <Icon
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0",
            highlight
              ? "text-[color:var(--brand-gold)]"
              : "text-[color:var(--text-muted)]",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              {label}
            </p>
            <p className="stat-number text-base font-black tracking-tight text-white sm:text-lg">
              {value}
            </p>
          </div>
          <p className="text-[10px] text-[color:var(--text-muted)]">{hint}</p>
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
    success:
      "border-[color:var(--success)]/30 bg-[color:var(--success-soft)] text-[color:var(--success)]",
    warning: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    danger:
      "border-[color:var(--danger)]/30 bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border px-3 py-2",
        toneClasses[tone],
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]">
        {label}
      </p>
      <p className="stat-number text-xl font-black leading-none tabular-nums">
        {count}
      </p>
    </div>
  );
}
