"use client";

import { useEffect, useState } from "react";
import { Crown, Loader2, X } from "lucide-react";
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

export function OwnerPlansManager() {
  const toast = useToast();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<PlanRow | null>(null);

  async function load() {
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
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
          Owner
        </p>
        <h1 className="mt-2 text-2xl font-black uppercase leading-tight tracking-tight sm:text-3xl lg:text-4xl">
          Planes por barbería
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)]">
          Asigná plan, status y duración de trial a cada barbería. Los cambios
          aplican inmediato — las features Pro/Esencial que el plan no incluye
          se ocultan del sidebar del barbero.
        </p>
      </header>

      <section className="mt-6 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-[color:var(--brand-gold)]" />
          </div>
        ) : plans.length === 0 ? (
          <p className="py-10 text-center text-sm text-[color:var(--text-muted)]">
            No hay barberías cargadas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[color:var(--border-subtle)] text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3 text-left">Barbería</th>
                  <th className="px-4 py-3 text-left">Plan</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Trial</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => {
                  const trialDays = daysRemaining(p.trial_expires_at);
                  const graceDays = daysRemaining(p.grace_expires_at);
                  const statusMeta = p.status ? STATUS_LABEL[p.status] : null;
                  const tierMeta = p.plan_tier ? PLAN_META[p.plan_tier] : null;
                  return (
                    <tr
                      key={p.slug}
                      className="border-b border-[color:var(--border-subtle)] last:border-b-0 hover:bg-[color:var(--surface-0)]/40"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-white">{p.name}</p>
                          <code className="text-[10px] text-[color:var(--text-muted)]">
                            {p.slug}
                          </code>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {tierMeta ? (
                          <span className="inline-flex items-center gap-1 rounded-[var(--radius-xs)] border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)]">
                            {tierMeta.name} · ${tierMeta.priceUsd}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[color:var(--text-muted)]">
                            sin plan
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {statusMeta ? (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-[var(--radius-xs)] border bg-[color:var(--surface-0)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                              statusMeta.classes,
                            )}
                          >
                            {statusMeta.label}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[color:var(--text-muted)]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[color:var(--text-secondary)]">
                        {/* Si está pagado (active), no muestra trial countdown.
                            Si está en trial real con días restantes, sí. */}
                        {p.status === "active" ? (
                          <span className="text-[color:var(--text-muted)]">
                            sin trial
                          </span>
                        ) : p.status === "trial" &&
                          trialDays !== null &&
                          trialDays > 0 ? (
                          <span>{trialDays}d restantes</span>
                        ) : (p.status === "grace" || p.status === "trial") &&
                          graceDays !== null &&
                          graceDays > 0 ? (
                          <span className="text-amber-300">
                            gracia: {graceDays}d
                          </span>
                        ) : (
                          <span className="text-[color:var(--text-muted)]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setEditing(p)}
                          className="inline-flex min-h-8 items-center justify-center rounded-[var(--radius-xs)] border border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] transition-colors hover:bg-[color:var(--brand-gold)] hover:text-black"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
    </main>
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
                        ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)] text-black"
                        : "border-[color:var(--border-default)] bg-[color:var(--surface-0)] text-white hover:border-[color:var(--brand-gold)]",
                    )}
                  >
                    <p className="text-xs font-black uppercase">{meta.name}</p>
                    <p className="text-[10px] opacity-80">
                      USD {meta.priceUsd}/mes
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
                    ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)] text-black"
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
                        ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)] text-black"
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
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-4 text-xs font-bold uppercase tracking-[0.14em] text-black hover:bg-[color:var(--brand-gold-hi)] disabled:opacity-50"
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
