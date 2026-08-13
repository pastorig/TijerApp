"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Crown,
  Loader2,
  Wallet,
  X,
} from "lucide-react";
import { DEMO_BARBERSHOP_SLUGS } from "@/data/demo-barbershops";
import { useToast } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { PLAN_META, type PlanTier, type SubscriptionStatus } from "@/lib/plans";

type PlanRow = {
  slug: string;
  name: string;
  is_active: boolean;
  plan_tier: PlanTier | null;
  status: SubscriptionStatus | null;
  trial_started_at: string | null;
  trial_expires_at: string | null;
  grace_expires_at: string | null;
  current_period_ends_at: string | null;
  notes: string | null;
  updated_at: string | null;
};

const STATUS_LABEL: Record<SubscriptionStatus, { label: string; classes: string }> = {
  trial: {
    label: "Trial",
    classes: "border-[color:var(--brand-gold)]/40 text-[color:var(--brand-gold)]",
  },
  active: {
    label: "Activo (pagado)",
    classes: "border-[color:var(--success)]/40 text-[color:var(--success)]",
  },
  grace: {
    label: "Gracia",
    classes: "border-amber-400/40 text-amber-300",
  },
  expired: {
    label: "Expirado",
    classes: "border-[color:var(--danger)]/40 text-[color:var(--danger)]",
  },
  cancelled: {
    label: "Cancelado",
    classes: "border-[color:var(--text-muted)]/40 text-[color:var(--text-muted)]",
  },
};

function daysRemaining(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatShortDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function OwnerPlansManager() {
  const toast = useToast();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [paying, setPaying] = useState<PlanRow | null>(null);
  // Se incrementa al registrar un pago para que el historial se recargue.
  const [paymentsKey, setPaymentsKey] = useState(0);
  // La demo arranca plegada: no es un cliente y ensucia la lista.
  const [showDemo, setShowDemo] = useState(false);

  /**
   * Las barberías se muestran agrupadas por su situación comercial en vez de en
   * una lista sola: lo primero que querés ver es quién paga y quién está por
   * decidir. Las de vitrina van al final y plegadas.
   */
  const grouped = useMemo(() => {
    const activas: PlanRow[] = [];
    const enPrueba: PlanRow[] = [];
    const bajas: PlanRow[] = [];
    const sinPlan: PlanRow[] = [];
    const demo: PlanRow[] = [];

    for (const plan of plans) {
      if (DEMO_BARBERSHOP_SLUGS.includes(plan.slug)) demo.push(plan);
      // `is_active: false` es la baja de la barbería (soft-delete), sin importar
      // en qué estado haya quedado su plan.
      else if (!plan.is_active) bajas.push(plan);
      else if (plan.status === "active") activas.push(plan);
      else if (plan.status === "trial" || plan.status === "grace")
        enPrueba.push(plan);
      else if (plan.status === "expired" || plan.status === "cancelled")
        bajas.push(plan);
      else sinPlan.push(plan);
    }

    return { activas, enPrueba, bajas, sinPlan, demo };
  }, [plans]);

  const GROUP_ORDER = [
    { key: "activas" as const, label: "Activas (pagando)", collapsible: false },
    { key: "enPrueba" as const, label: "En prueba", collapsible: false },
    {
      key: "sinPlan" as const,
      label: "Sin plan asignado",
      collapsible: false,
    },
    {
      key: "bajas" as const,
      label: "Vencidas, canceladas o eliminadas",
      collapsible: false,
    },
    { key: "demo" as const, label: "Demo", collapsible: true },
  ];

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Sesión expirada");
        return;
      }
      const res = await fetch("/api/owner/plans", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("Error cargando planes", { description: err.error });
        return;
      }
      const data = (await res.json()) as { plans: PlanRow[] };
      setPlans(data.plans);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Carga inicial del panel owner al montar. Acá sí queremos disparar el
    // fetch una vez desde el effect aunque internamente setee estado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="animate-fade-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
          Planes
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase leading-tight tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
          Planes por barbería
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)]">
          Asigná plan, status y duración de trial a cada barbería. Los cambios
          aplican inmediato — las features Pro/Esencial que el plan no incluye
          se ocultan del sidebar del barbero.
        </p>
      </header>

      <section className="card-premium overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-[color:var(--brand-gold)]" />
          </div>
        ) : plans.length === 0 ? (
          <p className="py-10 text-center text-sm text-[color:var(--text-muted)]">
            No hay barberías cargadas.
          </p>
        ) : (
          /* Tarjetas y no `<table>`, igual que el historial de cobros de más
             abajo: esta pantalla se mira desde el celular y una tabla de 5
             columnas obliga a scrollear para el costado. Era la única
             pantalla del owner que quedaba con ese problema. */
          <div className="grid gap-3 px-3 pb-3 sm:px-4 sm:pb-4">
            {GROUP_ORDER.map((group) => {
              const rows = grouped[group.key];
              if (rows.length === 0) return null;
              const isCollapsed = group.collapsible && !showDemo;
              return (
                <Fragment key={group.key}>
                  <div className="pt-1">
                    {group.collapsible ? (
                      <button
                        type="button"
                        onClick={() => setShowDemo((v) => !v)}
                        className="inline-flex min-h-8 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)] transition-colors hover:text-white"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="size-3" />
                        ) : (
                          <ChevronDown className="size-3" />
                        )}
                        {group.label} ({rows.length})
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)]">
                        {group.label}{" "}
                        <span className="text-[color:var(--text-muted)]">
                          ({rows.length})
                        </span>
                      </span>
                    )}
                  </div>
                  {isCollapsed
                    ? null
                    : rows.map((p) => (
                        <PlanCard
                          key={p.slug}
                          p={p}
                          onEdit={() => setEditing(p)}
                          onPay={() => setPaying(p)}
                        />
                      ))}
                </Fragment>
              );
            })}
          </div>
        )}
      </section>

      {editing ? (
        <EditPlanModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      ) : null}

      <PaymentsHistory
        nameBySlug={Object.fromEntries(plans.map((p) => [p.slug, p.name]))}
        reloadKey={paymentsKey}
      />

      {paying ? (
        <RegisterPaymentModal
          row={paying}
          onClose={() => setPaying(null)}
          onSaved={() => {
            setPaying(null);
            setPaymentsKey((key) => key + 1);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Una fila de la tabla de planes. Vive aparte porque ahora la tabla se arma por
 * grupos (activas / en prueba / dadas de baja / demo) y el markup se repetía en
 * cada uno.
 */
function PlanCard({
  p,
  onEdit,
  onPay,
}: {
  p: PlanRow;
  onEdit: () => void;
  onPay: () => void;
}) {
  const trialDays = daysRemaining(p.trial_expires_at);
  const graceDays = daysRemaining(p.grace_expires_at);
  const statusMeta = p.status ? STATUS_LABEL[p.status] : null;
  const tierMeta = p.plan_tier ? PLAN_META[p.plan_tier] : null;

  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-3.5 transition-colors hover:border-[color:var(--border-strong)] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-white">{p.name}</p>
          <code className="text-[10px] text-[color:var(--text-muted)]">
            {p.slug}
          </code>
        </div>
        {statusMeta ? (
          <span
            className={cn(
              "shrink-0 rounded-[var(--radius-xs)] border bg-[color:var(--surface-0)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
              statusMeta.classes,
            )}
          >
            {statusMeta.label}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px]">
        {tierMeta ? (
          <span className="inline-flex items-center rounded-[var(--radius-xs)] border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)]">
            {tierMeta.name} · ${tierMeta.priceArs.toLocaleString("es-AR")}
          </span>
        ) : (
          <span className="text-[10px] text-[color:var(--text-muted)]">
            sin plan
          </span>
        )}
        {/* Prioridad: si tiene período pago vigente, lo mostramos.
            Sino, el countdown de trial/gracia. */}
        {p.current_period_ends_at ? (
          <span className="font-semibold text-[color:var(--success)]">
            Pagado hasta {formatShortDate(p.current_period_ends_at)}
          </span>
        ) : p.status === "active" ? (
          <span className="text-[color:var(--text-muted)]">activo</span>
        ) : p.status === "trial" && trialDays !== null && trialDays > 0 ? (
          <span className="text-[color:var(--text-secondary)]">
            {trialDays}d restantes
          </span>
        ) : (p.status === "grace" || p.status === "trial") &&
          graceDays !== null &&
          graceDays > 0 ? (
          <span className="text-amber-300">gracia: {graceDays}d</span>
        ) : null}
      </div>

      {/* En el celular los botones ocupan toda la fila: son el objetivo táctil
          principal de la pantalla. */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => onPay()}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[var(--radius-xs)] border border-[color:var(--success)]/50 bg-[color:var(--success-soft)] px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--success)] transition-colors hover:bg-[color:var(--success)] hover:text-black sm:min-h-9"
        >
          <Wallet className="size-3" />
          Registrar pago
        </button>
        <button
          type="button"
          onClick={() => onEdit()}
          className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-xs)] border border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] transition-colors hover:bg-gold-grad hover:text-black sm:min-h-9"
        >
          Editar
        </button>
      </div>
    </div>
  );
}

type PaymentRow = {
  id: string;
  barbershop_slug: string;
  amount: string;
  method: string;
  period_start: string;
  period_end: string;
  note: string | null;
  created_at: string;
};

/**
 * Historial de cobros. La tabla `barbershop_payments` se venía llenando con cada
 * "Registrar pago" desde la feature 007 y ninguna pantalla la mostraba: el dato
 * estaba pero el owner no podía verlo.
 *
 * Va en tarjetas y no en `<table>` a propósito: esta pantalla se mira desde el
 * celular y una tabla obliga a scrollear para el costado.
 */
function PaymentsHistory({
  nameBySlug,
  reloadKey,
}: {
  nameBySlug: Record<string, string>;
  reloadKey: number;
}) {
  const toast = useToast();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;
      const res = await fetch("/api/owner/payments", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("Error cargando el historial", { description: err.error });
        return;
      }
      const data = (await res.json()) as {
        payments: PaymentRow[];
        totalAmount: number;
      };
      setPayments(data.payments);
      setTotalAmount(data.totalAmount);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load, reloadKey]);

  return (
    <section className="card-premium p-4 sm:p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)]">
            Cobros registrados
          </p>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            Cada pago que registrás queda acá.
          </p>
        </div>
        {payments.length > 0 ? (
          <p className="text-sm font-black text-gold-gradient">
            ${totalAmount.toLocaleString("es-AR")} cobrados
          </p>
        ) : null}
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-[color:var(--brand-gold)]" />
        </div>
      ) : payments.length === 0 ? (
        <p className="py-8 text-center text-sm text-[color:var(--text-muted)]">
          Todavía no registraste ningún cobro.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">
                  {nameBySlug[payment.barbershop_slug] ??
                    payment.barbershop_slug}
                </p>
                <p className="text-[11px] text-[color:var(--text-muted)]">
                  {formatShortDate(payment.created_at)} · {payment.method}
                  {payment.period_end
                    ? ` · cubre hasta ${formatShortDate(payment.period_end)}`
                    : ""}
                </p>
                {payment.note ? (
                  <p className="mt-0.5 text-[11px] italic text-[color:var(--text-subtle)]">
                    {payment.note}
                  </p>
                ) : null}
              </div>
              <p className="text-sm font-black tabular-nums text-[color:var(--success)]">
                ${Number(payment.amount).toLocaleString("es-AR")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EditPlanModal({
  row,
  onClose,
  onSaved,
}: {
  row: PlanRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [planTier, setPlanTier] = useState<PlanTier>(row.plan_tier ?? "pro");
  const [status, setStatus] = useState<SubscriptionStatus>(row.status ?? "trial");
  const [trialDays, setTrialDays] = useState<string>("14");
  const [notes, setNotes] = useState(row.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;

      const body: Record<string, unknown> = {
        barbershopSlug: row.slug,
        plan_tier: planTier,
        status,
        notes: notes.trim() || null,
      };
      // Si vamos a trial Y pusieron días, resetea las fechas
      if (status === "trial" && trialDays && Number(trialDays) > 0) {
        body.trialDays = Number(trialDays);
      }

      const res = await fetch("/api/owner/plans", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("No se guardó", { description: err.error });
        return;
      }
      toast.success("Plan actualizado");
      onSaved();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
              Editar plan
            </p>
            <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white">
              {row.name}
            </h2>
            <code className="text-[11px] text-[color:var(--text-muted)]">
              {row.slug}
            </code>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-[var(--radius-xs)] border border-[color:var(--border-default)] p-1.5 text-[color:var(--text-muted)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
              Plan
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["solo", "esencial", "pro"] as PlanTier[]).map((t) => {
                const meta = PLAN_META[t];
                const isActive = planTier === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPlanTier(t)}
                    className={cn(
                      "rounded-[var(--radius-sm)] border p-2 text-center transition-colors",
                      isActive
                        ? "border-[color:var(--brand-gold)] bg-gold-grad text-black"
                        : "border-[color:var(--border-default)] bg-[color:var(--surface-0)] text-white hover:border-[color:var(--brand-gold)]",
                    )}
                  >
                    <p className="text-xs font-black uppercase">{meta.name}</p>
                    <p className="text-[10px] opacity-80">
                      ${meta.priceArs.toLocaleString("es-AR")}/mes
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
              Status
            </label>

            {/* Atajos rápidos para los 2 estados más comunes */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("trial")}
                className={cn(
                  "rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-colors",
                  status === "trial"
                    ? "border-[color:var(--brand-gold)] bg-gold-grad text-black"
                    : "border-[color:var(--border-default)] bg-[color:var(--surface-0)] text-white hover:border-[color:var(--brand-gold)]",
                )}
              >
                🎁 Trial (gratis X días)
              </button>
              <button
                type="button"
                onClick={() => setStatus("active")}
                className={cn(
                  "rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-colors",
                  status === "active"
                    ? "border-[color:var(--success)] bg-[color:var(--success)] text-black"
                    : "border-[color:var(--border-default)] bg-[color:var(--surface-0)] text-white hover:border-[color:var(--success)]",
                )}
              >
                💵 Pagado (sin trial)
              </button>
            </div>

            {/* Estados secundarios (grace/expired/cancelled) en fila chica */}
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(
                ["grace", "expired", "cancelled"] as SubscriptionStatus[]
              ).map((s) => {
                const isActive = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      "rounded-[var(--radius-xs)] border px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
                      isActive
                        ? "border-[color:var(--brand-gold)] bg-gold-grad text-black"
                        : "border-[color:var(--border-default)] bg-[color:var(--surface-0)] text-[color:var(--text-secondary)] hover:border-[color:var(--brand-gold)]",
                    )}
                  >
                    {STATUS_LABEL[s].label}
                  </button>
                );
              })}
            </div>
          </div>

          {status === "trial" ? (
            <div>
              <label
                htmlFor="trial-days"
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]"
              >
                Duración trial (días)
              </label>
              <input
                id="trial-days"
                type="number"
                min={1}
                max={365}
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
              />
              <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
                Se resetean las fechas: trial expira en {trialDays || "?"}d + 7d
                de gracia.
              </p>
            </div>
          ) : status === "active" ? (
            <p className="rounded-[var(--radius-sm)] border border-[color:var(--success)]/30 bg-[color:var(--success-soft)]/40 px-3 py-2 text-[11px] leading-5 text-[color:var(--text-secondary)]">
              💵 Al guardar, las fechas de trial se borran. El barbero pasa a
              estado pagado sin countdown.
            </p>
          ) : null}

          <div>
            <label
              htmlFor="notes"
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]"
            >
              Notas <span className="text-[color:var(--text-muted)]">— opcional</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Ej. Founder customer, descuento manual, etc."
              className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-4 text-xs font-bold uppercase tracking-[0.14em] text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-gold-grad px-4 text-xs font-bold uppercase tracking-[0.14em] text-black hover:bg-[color:var(--brand-gold-hi)] disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Crown className="size-3.5" />}
              {isSaving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Registrar pago manual (transferencia) de una barbería. Extiende el período
 * pago (current_period_ends_at) +1 mes y la activa. Ver spec 007-cobro-barberos.
 */
function RegisterPaymentModal({
  row,
  onClose,
  onSaved,
}: {
  row: PlanRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const defaultAmount = row.plan_tier ? PLAN_META[row.plan_tier].priceArs : 0;
  const [amount, setAmount] = useState<string>(String(defaultAmount));
  const [method, setMethod] = useState<"transferencia" | "efectivo" | "otro">(
    "transferencia",
  );
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      toast.error("Monto inválido");
      return;
    }
    setIsSaving(true);
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Sesión expirada");
        return;
      }
      const res = await fetch("/api/owner/register-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          slug: row.slug,
          amount: amountNum,
          method,
          note: note.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        pagadoHasta?: string;
      };
      if (!res.ok || !data.ok) {
        toast.error("No se registró el pago", { description: data.error });
        return;
      }
      toast.success("Pago registrado", {
        description: data.pagadoHasta
          ? `Pagado hasta ${formatShortDate(data.pagadoHasta)}`
          : undefined,
      });
      onSaved();
    } finally {
      setIsSaving(false);
    }
  }

  const METHODS: Array<{ value: typeof method; label: string }> = [
    { value: "transferencia", label: "Transferencia" },
    { value: "efectivo", label: "Efectivo" },
    { value: "otro", label: "Otro" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--success)]">
              Registrar pago
            </p>
            <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white">
              {row.name}
            </h2>
            <p className="text-[11px] text-[color:var(--text-muted)]">
              {row.current_period_ends_at
                ? `Pagado hasta ${formatShortDate(row.current_period_ends_at)} — suma 1 mes`
                : "Activa la barbería por 1 mes"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-[var(--radius-xs)] border border-[color:var(--border-default)] p-1.5 text-[color:var(--text-muted)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="pay-amount"
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--success)]"
            >
              Monto (ARS)
            </label>
            <input
              id="pay-amount"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 font-mono text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
            />
            <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
              Prefill: precio del plan{" "}
              {row.plan_tier ? PLAN_META[row.plan_tier].name : "—"}.
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--success)]">
              Método
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={cn(
                    "rounded-[var(--radius-sm)] border px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                    method === m.value
                      ? "border-[color:var(--success)] bg-[color:var(--success)] text-black"
                      : "border-[color:var(--border-default)] bg-[color:var(--surface-0)] text-white hover:border-[color:var(--success)]",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="pay-note"
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--success)]"
            >
              Nota{" "}
              <span className="text-[color:var(--text-muted)]">— opcional</span>
            </label>
            <input
              id="pay-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Ej. Transferencia Naranja X 07/07"
              className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-4 text-xs font-bold uppercase tracking-[0.14em] text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--success)] px-4 text-xs font-bold uppercase tracking-[0.14em] text-black hover:brightness-110 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Wallet className="size-3.5" />
              )}
              {isSaving ? "Registrando…" : "Registrar pago"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
