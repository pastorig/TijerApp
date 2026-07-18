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
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { PLAN_META, type PlanTier, type SubscriptionStatus } from "@/lib/plans";
import { StackedBar } from "./charts";

/**
 * OwnerInsights — Panel de insights estratégicos para el dueño SaaS (TijerApp).
 *
 *  - MRR / ARR REALES: suma del precio del plan de las barberías que
 *    efectivamente están pagando (tienen un pago registrado y vigente).
 *    Antes esto multiplicaba TODAS las barberías con actividad × el precio de
 *    Pro, así que inventaba ingresos: mostraba $244.000 cuando en realidad
 *    nadie había pagado todavía (3 en prueba + 1 demo).
 *  - MRR potencial: lo que entraría si convierten las que están en prueba.
 *  - Las barberías demo se excluyen de todo lo que sea plata (no son clientes).
 *  - Healthy / Quiet / Inactive: distribución por actividad real.
 */

/** Fila de plan que devuelve /api/owner/plans. */
type OwnerPlanRow = {
  barbershop_slug: string;
  plan_tier: PlanTier | null;
  status: SubscriptionStatus | null;
  current_period_ends_at: string | null;
  trial_expires_at: string | null;
};

type HealthBuckets = {
  active: OwnerBarbershopSummary[];
  quiet: OwnerBarbershopSummary[];
  inactive: OwnerBarbershopSummary[];
};

/** Trae los planes/suscripciones desde el endpoint de owner (service role). */
async function loadOwnerPlans(): Promise<OwnerPlanRow[]> {
  try {
    const { data: sessionData } = await getCurrentSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return [];
    const res = await fetch("/api/owner/plans", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const payload = (await res.json()) as { plans?: OwnerPlanRow[] };
    return payload.plans ?? [];
  } catch {
    return [];
  }
}

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
  const [plans, setPlans] = useState<OwnerPlanRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // "Ahora" se captura al cargar (no en render: Date.now() es impuro y React
  // lo prohíbe durante el render).
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Los planes viven detrás de /api/owner/plans (service role): las
        // suscripciones no se pueden leer desde el browser por RLS.
        const [{ data: metrics }, planRows] = await Promise.all([
          getOwnerDashboardMetrics(),
          loadOwnerPlans(),
        ]);
        if (cancelled) return;
        if (metrics) setBarbershops(metrics.barbershops);
        setPlans(planRows);
        setNowMs(Date.now());
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

  /**
   * Facturación REAL. La fuente de verdad es el `status` de la suscripción,
   * que el owner administra a mano desde /owner/planes:
   *
   *  - active          → es cliente que paga. Suma al MRR con el precio de SU
   *                      plan (no el de Pro para todos, como antes).
   *  - trial / grace   → todavía no paga. Suma al potencial, no al MRR.
   *  - expired/cancel. → no suma a nada.
   *
   * De las que pagan, marcamos aparte las "atrasadas" (sin pago registrado o
   * con el período ya vencido) para que se vea a quién hay que ir a cobrarle.
   *
   * A propósito NO usamos `isDemo`: esa bandera sale de `demo-barbershops.ts`,
   * que hoy solo tiene a sv-barber (que es un cliente REAL) y no a la demo
   * actual, así que excluiría a la barbería equivocada.
   */
  const billing = useMemo(() => {
    const bySlug = new Map(plans.map((p) => [p.barbershop_slug, p]));

    let mrr = 0;
    let potencial = 0;
    let pagando = 0;
    let enPrueba = 0;
    let vencidas = 0;
    let atrasadas = 0;

    for (const bs of barbershops) {
      const row = bySlug.get(bs.slug);
      // Sin fila de suscripción = trial Pro por default (ver getBarbershopPlan).
      const tier: PlanTier = row?.plan_tier ?? "pro";
      const status: SubscriptionStatus = row?.status ?? "trial";
      const precio = PLAN_META[tier].priceArs;
      const paidUntilMs = row?.current_period_ends_at
        ? new Date(row.current_period_ends_at).getTime()
        : null;

      if (status === "active") {
        mrr += precio;
        pagando++;
        if (paidUntilMs === null || paidUntilMs < nowMs) atrasadas++;
      } else if (status === "trial" || status === "grace") {
        potencial += precio;
        enPrueba++;
      } else {
        vencidas++;
      }
    }

    return {
      mrr,
      arr: mrr * 12,
      potencial,
      pagando,
      enPrueba,
      vencidas,
      atrasadas,
      total: barbershops.length,
    };
  }, [barbershops, plans, nowMs]);

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
          value={`$${billing.mrr.toLocaleString("es-AR")}`}
          hint={
            billing.pagando > 0
              ? `${billing.pagando} barbería${billing.pagando === 1 ? "" : "s"} pagando`
              : "Todavía no paga ninguna"
          }
          highlight
        />
        <InsightCard
          icon={TrendingUp}
          label="ARR"
          value={`$${billing.arr.toLocaleString("es-AR")}`}
          hint="MRR × 12"
        />
        <InsightCard
          icon={Users2}
          label="Barberías"
          value={String(billing.total)}
          hint={
            [
              billing.pagando > 0 ? `${billing.pagando} pagando` : null,
              billing.enPrueba > 0 ? `${billing.enPrueba} en prueba` : null,
              billing.vencidas > 0
                ? `${billing.vencidas} vencida${billing.vencidas === 1 ? "" : "s"}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Sin barberías todavía"
          }
        />
      </div>

      {/* Potencial de las que están en prueba + aviso de pagos atrasados */}
      {billing.potencial > 0 || billing.atrasadas > 0 ? (
        <div className="space-y-1.5 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] px-3.5 py-2.5">
          {billing.potencial > 0 ? (
            <p className="text-[11px] text-[color:var(--text-muted)]">
              Potencial:{" "}
              <strong className="text-[color:var(--brand-gold)]">
                ${billing.potencial.toLocaleString("es-AR")}/mes
              </strong>{" "}
              si convierten las {billing.enPrueba} en prueba (al plan que tienen
              asignado hoy).
            </p>
          ) : null}
          {billing.atrasadas > 0 ? (
            <p className="text-[11px] text-amber-300">
              {billing.atrasadas} de las que pagan{" "}
              {billing.atrasadas === 1 ? "está" : "están"} sin el pago del mes
              registrado — cobrale y registralo en Planes.
            </p>
          ) : null}
        </div>
      ) : null}

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
        "card-premium card-premium-hover px-3 py-2.5",
        highlight && "card-premium-glow",
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
            <p
              className={cn(
                "stat-number text-base font-black tracking-tight sm:text-lg",
                highlight ? "text-gold-gradient" : "text-white",
              )}
            >
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
