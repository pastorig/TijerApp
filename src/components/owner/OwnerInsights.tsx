"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Users2,
  Activity,
} from "lucide-react";
import { getOwnerDashboardMetrics, isDemoBarbershop } from "@/lib/owner-metrics";
import type { OwnerBarbershopSummary } from "@/lib/owner-metrics";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import {
  billedMonthlyArs,
  type PlanTier,
  type SubscriptionStatus,
} from "@/lib/plans";
import { tienePrecioDeFundador } from "@/data/founders";
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

/**
 * Fila de plan que devuelve /api/owner/plans.
 * OJO: la clave del slug es `slug` (no `barbershop_slug`, que es como se llama
 * la columna en la tabla) — el endpoint arma el objeto desde `barbershops`.
 */
type OwnerPlanRow = {
  slug: string;
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

/**
 * Trae los planes/suscripciones desde el endpoint de owner (service role).
 * Devuelve `ok:false` si falla: NO devolvemos una lista vacía y listo, porque
 * sin planes el cálculo asumiría un plan por default e inventaría ingresos —
 * preferimos avisar que no se pudo cargar antes que mostrar un número falso.
 */
async function loadOwnerPlans(): Promise<
  { ok: true; plans: OwnerPlanRow[] } | { ok: false; plans: [] }
> {
  try {
    const { data: sessionData } = await getCurrentSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return { ok: false, plans: [] };
    const res = await fetch("/api/owner/plans", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { ok: false, plans: [] };
    const payload = (await res.json()) as { plans?: OwnerPlanRow[] };
    return { ok: true, plans: payload.plans ?? [] };
  } catch {
    return { ok: false, plans: [] };
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
  const [plansFailed, setPlansFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [metricsFailed, setMetricsFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // "Ahora" se captura al cargar (no en render: Date.now() es impuro y React
  // lo prohíbe durante el render).
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Los planes viven detrás de /api/owner/plans (service role): las
        // suscripciones no se pueden leer desde el browser por RLS.
        const [metricsResult, planResult] = await Promise.all([
          getOwnerDashboardMetrics(),
          loadOwnerPlans(),
        ]);
        if (cancelled) return;
        const { data: metrics, error } = metricsResult;
        setMetricsFailed(Boolean(error) || !metrics);
        if (metrics) setBarbershops(metrics.barbershops);
        setPlans(planResult.plans);
        setPlansFailed(!planResult.ok);
        setNowMs(Date.now());
      } catch {
        if (!cancelled) setMetricsFailed(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function retryLoad() {
    setIsLoading(true);
    setMetricsFailed(false);
    setReloadKey(value => value + 1);
  }

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
   * El precio SIEMPRE sale del plan asignado a esa barbería (`plan_tier`), esté
   * en prueba o pagando — si le cambiás el plan, el número se corrige solo.
   *
   * Las barberías demo (ver DEMO_BARBERSHOP_SLUGS) quedan afuera de todo: no
   * son clientes, solo se cuentan aparte para mostrarlas como referencia.
   */
  const billing = useMemo(() => {
    const bySlug = new Map(plans.map((p) => [p.slug, p]));

    let mrr = 0;
    let potencial = 0;
    let pagando = 0;
    let enPrueba = 0;
    let vencidas = 0;
    let atrasadas = 0;
    let demos = 0;
    let sinPlan = 0;

    for (const bs of barbershops) {
      if (isDemoBarbershop(bs.slug)) {
        demos++;
        continue;
      }
      const row = bySlug.get(bs.slug);
      // Sin plan asignado NO asumimos ninguno: contarlo con un precio
      // inventado es justo lo que hacía que estos números fueran falsos.
      if (!row?.plan_tier) {
        sinPlan++;
        continue;
      }
      const tier: PlanTier = row.plan_tier;
      const status: SubscriptionStatus = row.status ?? "trial";
      // Lo que factura de verdad. Con el precio del tier asignado, cada
      // fundador infla el MRR con la diferencia que nadie pagó.
      const precio = billedMonthlyArs(tier, tienePrecioDeFundador(bs.slug));
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
      demos,
      sinPlan,
      /** Barberías CLIENTE (sin contar las demo). */
      total: barbershops.length - demos,
    };
  }, [barbershops, plans, nowMs]);

  if (isLoading) {
    return (
      <section role="status" aria-live="polite" className="min-h-48 py-5 text-sm text-[color:var(--text-secondary)]">
        Cargando resumen de la plataforma…
      </section>
    );
  }

  if (metricsFailed) {
    return <section role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-400/30 bg-red-400/5 p-4">
      <p className="text-sm text-red-200">No pudimos cargar el resumen de la plataforma.</p>
      <button type="button" onClick={retryLoad} className="min-h-11 rounded-md border border-white/20 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-gold)]">Reintentar</button>
    </section>;
  }

  return (
    <section className="space-y-3">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[color:var(--brand-gold)]">
            TijerApp Owner
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            Resumen de la plataforma
          </h2>
        </div>
        <Activity
          aria-hidden="true"
          className="size-5 shrink-0 text-[color:var(--brand-gold)]/70"
        />
      </header>

      {/* KPIs financieros + Health Status — 1 sola fila en desktop, stack en mobile */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <InsightCard
          icon={DollarSign}
          label="Ingreso mensual"
          value={plansFailed ? "—" : `$${billing.mrr.toLocaleString("es-AR")}`}
          hint={
            plansFailed
              ? "No pudimos cargar los planes"
              : billing.pagando > 0
                ? `${billing.pagando} barbería${billing.pagando === 1 ? "" : "s"} pagando`
                : "Todavía no paga ninguna"
          }
          highlight
        />
        <InsightCard
          icon={TrendingUp}
          label="Proyección anual"
          value={plansFailed ? "—" : `$${billing.arr.toLocaleString("es-AR")}`}
          hint={plansFailed ? "Sin datos de plan" : "Ingreso mensual × 12"}
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
              billing.sinPlan > 0 ? `${billing.sinPlan} sin plan` : null,
              billing.demos > 0 ? `+${billing.demos} demo` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Sin clientes todavía"
          }
        />
      </div>

      {plansFailed ? <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-l-2 border-amber-400 pl-3">
        <p className="text-sm text-amber-200">Los importes no están disponibles: falló la carga de planes.</p>
        <button type="button" onClick={retryLoad} className="min-h-11 px-3 text-sm font-semibold text-white underline underline-offset-4">Reintentar</button>
      </div> : null}

      {/* Potencial de las que están en prueba + aviso de pagos atrasados */}
      {billing.potencial > 0 || billing.atrasadas > 0 ? (
        <div className="space-y-2 border-l-2 border-[color:var(--brand-gold)] pl-3 py-1">
          {billing.potencial > 0 ? (
            <p className="text-sm text-[color:var(--text-secondary)]">
              Potencial:{" "}
              <strong className="text-[color:var(--brand-gold)]">
                ${billing.potencial.toLocaleString("es-AR")}/mes
              </strong>{" "}
              si convierten las {billing.enPrueba} en prueba (al plan que tienen
              asignado hoy).
            </p>
          ) : null}
          {billing.atrasadas > 0 ? (
            <p className="text-sm text-amber-300">
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
        <div className="border-y border-white/10 py-3 [&_li]:text-xs">
          <p className="mb-2.5 text-xs font-semibold text-[color:var(--text-secondary)]">
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
                {buckets.inactive.length !== 1 ? "s" : ""} sin actividad reciente
                <span className="ml-1 font-normal text-[color:var(--text-muted)]">
                  · 14d+ inactivas
                </span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {buckets.inactive.slice(0, 6).map((bs) => (
                  <span
                    key={bs.slug}
                    className="inline-flex max-w-full break-words rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] px-2.5 py-1 text-xs text-white"
                  >
                    {bs.name}
                  </span>
                ))}
                {buckets.inactive.length > 6 ? (
                  <span className="text-xs text-[color:var(--text-muted)]">
                    + {buckets.inactive.length - 6} más
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : barbershops.length > 0 ? (
        <div className="flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-[color:var(--success)]/30 bg-[color:var(--success-soft)]/10 px-3 py-2">
          <Activity
            aria-hidden="true"
            className="size-4 shrink-0 text-[color:var(--success)]"
          />
          <p className="text-xs font-semibold text-white">
            Todas las barberías tienen actividad en los últimos 14 días.
          </p>
        </div>
      ) : <p className="py-3 text-sm text-[color:var(--text-secondary)]">Todavía no hay barberías para mostrar.</p>}
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
        "min-w-0 rounded-md border border-white/10 bg-[#101012] p-3",
        highlight && "border-[color:var(--brand-gold)]/40 col-span-2 lg:col-span-1",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-4 shrink-0",
            highlight
              ? "text-[color:var(--brand-gold)]"
              : "text-[color:var(--text-muted)]",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="space-y-1">
            <p className="text-xs text-[color:var(--text-secondary)]">
              {label}
            </p>
            <p
              className={cn(
                "break-words text-xl font-bold tabular-nums sm:text-2xl",
                highlight ? "text-[color:var(--brand-gold)]" : "text-white",
              )}
            >
              {value}
            </p>
          </div>
          <p className="mt-1 text-xs text-[color:var(--text-secondary)]">{hint}</p>
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
        "flex min-w-0 flex-col items-start gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between",
        toneClasses[tone],
      )}
    >
      <p className="text-xs font-semibold">
        {label}
      </p>
      <p className="stat-number text-xl font-black leading-none tabular-nums">
        {count}
      </p>
    </div>
  );
}
