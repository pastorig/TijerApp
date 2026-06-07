"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Gift, Loader2, Sparkles, TrendingUp, Users } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { useToast } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import type { LoyaltyProgramRow } from "@/lib/supabase";

// Tipo duplicado de @/lib/loyalty (que es server-only y no podemos importar
// desde un client component). Cualquier cambio en el shape del API debe
// reflejarse acá.
type LoyaltyCustomerSummary = {
  customer_phone: string;
  customer_name: string | null;
  active_stamps: number;
  total_stamps: number;
  last_visit_at: string | null;
  can_redeem: boolean;
};

type AdminLoyaltyManagerProps = {
  barbershop: DemoBarbershop;
};

export function AdminLoyaltyManager({ barbershop }: AdminLoyaltyManagerProps) {
  const toast = useToast();
  const [program, setProgram] = useState<LoyaltyProgramRow | null>(null);
  const [customers, setCustomers] = useState<LoyaltyCustomerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields (controlled)
  const [isActive, setIsActive] = useState(true);
  const [visitsRequired, setVisitsRequired] = useState(10);
  const [rewardName, setRewardName] = useState("Corte gratis");
  const [rewardDescription, setRewardDescription] = useState("");

  // Reload program + customers
  async function load() {
    setIsLoading(true);
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Tu sesión expiró, volvé a iniciar sesión.");
        return;
      }
      const res = await fetch(
        `/api/admin/loyalty?barbershopSlug=${encodeURIComponent(barbershop.slug)}&action=customers`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("Error cargando fidelización", {
          description: err.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      const data = (await res.json()) as {
        program: LoyaltyProgramRow | null;
        customers: LoyaltyCustomerSummary[];
      };
      setProgram(data.program);
      setCustomers(data.customers);
      if (data.program) {
        setIsActive(data.program.is_active);
        setVisitsRequired(data.program.visits_required);
        setRewardName(data.program.reward_name);
        setRewardDescription(data.program.reward_description ?? "");
      }
    } catch (err) {
      toast.error("Error inesperado", {
        description: err instanceof Error ? err.message : "Error desconocido.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // Load es async y setea state — exactamente lo que la nueva regla
    // react-hooks/set-state-in-effect quiere evitar, pero acá es legítimo
    // porque necesitamos fetch al montar Y cuando cambia barbershop.slug.
    // Alternativas (useSyncExternalStore con fetcher) son overkill.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barbershop.slug]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Tu sesión expiró.");
        return;
      }
      const res = await fetch("/api/admin/loyalty", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          barbershopSlug: barbershop.slug,
          isActive,
          visitsRequired,
          rewardName,
          rewardDescription: rewardDescription.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("No pudimos guardar", { description: err.error ?? `HTTP ${res.status}` });
        return;
      }
      const data = (await res.json()) as { program: LoyaltyProgramRow };
      setProgram(data.program);
      toast.success("Programa actualizado");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRedeem(customer: LoyaltyCustomerSummary) {
    if (!program) return;
    const ok = window.confirm(
      `¿Confirmás canjear ${program.visits_required} sellos de ${customer.customer_name ?? customer.customer_phone} para entregar "${program.reward_name}"?`,
    );
    if (!ok) return;
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;
      const res = await fetch("/api/admin/loyalty", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          barbershopSlug: barbershop.slug,
          customerPhone: customer.customer_phone,
          count: program.visits_required,
          note: program.reward_name,
        }),
      });
      if (!res.ok) {
        toast.error("No se pudo canjear");
        return;
      }
      const data = (await res.json()) as { redeemed: number };
      toast.success(`${data.redeemed} sellos canjeados`, {
        description: `Premio entregado: ${program.reward_name}`,
      });
      await load();
    } catch (err) {
      toast.error("Error canjeando", {
        description: err instanceof Error ? err.message : "Error.",
      });
    }
  }

  const totalActiveStamps = customers.reduce((acc, c) => acc + c.active_stamps, 0);
  const customersWithReward = customers.filter((c) => c.can_redeem).length;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
          Feature Pro
        </p>
        <h1 className="mt-2 text-2xl font-black uppercase leading-tight tracking-tight sm:text-3xl lg:text-4xl">
          Fidelización
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)]">
          Premiá a tus clientes recurrentes. Configurá cada cuántas visitas
          obtienen un premio y entregalo cuando lo alcanzan.
        </p>
      </header>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          icon={Users}
          label="Clientes con sellos"
          value={String(customers.length)}
        />
        <StatCard
          icon={TrendingUp}
          label="Sellos activos"
          value={String(totalActiveStamps)}
        />
        <StatCard
          icon={Sparkles}
          label="Premios disponibles"
          value={String(customersWithReward)}
          highlight={customersWithReward > 0}
        />
        <StatCard
          icon={Gift}
          label="Estado"
          value={program?.is_active ? "Activo" : "Pausado"}
          highlight={program?.is_active}
        />
      </div>

      {/* Form config */}
      <section className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5 sm:p-6">
        <h2 className="text-lg font-black uppercase tracking-tight">
          Configuración del programa
        </h2>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          Cambios se guardan al hacer clic en Guardar. Si pausás el programa,
          se conserva la configuración pero no se entregan sellos nuevos.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-[color:var(--brand-gold)]" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] p-3 transition-colors hover:border-[color:var(--brand-gold)]/30">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mt-1 size-4 accent-[color:var(--brand-gold)]"
              />
              <div>
                <p className="text-sm font-bold text-white">
                  Programa activo
                </p>
                <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                  {isActive
                    ? "Los clientes acumulan sellos al confirmar cortes."
                    : "Pausado. No se otorgan sellos nuevos pero se conservan los actuales."}
                </p>
              </div>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="visitsRequired"
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]"
                >
                  Visitas para el premio
                </label>
                <input
                  id="visitsRequired"
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={visitsRequired}
                  onChange={(e) => setVisitsRequired(Number(e.target.value))}
                  className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 text-base text-white outline-none focus:border-[color:var(--brand-gold)]"
                />
              </div>
              <div>
                <label
                  htmlFor="rewardName"
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]"
                >
                  Nombre del premio
                </label>
                <input
                  id="rewardName"
                  type="text"
                  value={rewardName}
                  onChange={(e) => setRewardName(e.target.value)}
                  maxLength={80}
                  className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 text-base text-white outline-none focus:border-[color:var(--brand-gold)]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="rewardDescription"
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]"
              >
                Descripción del premio <span className="text-[color:var(--text-muted)]">— opcional</span>
              </label>
              <textarea
                id="rewardDescription"
                value={rewardDescription}
                onChange={(e) => setRewardDescription(e.target.value)}
                rows={2}
                maxLength={200}
                placeholder="Ej. Incluye lavado y peinado básico."
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>
        )}
      </section>

      {/* Customer list */}
      <section className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5 sm:p-6">
        <h2 className="text-lg font-black uppercase tracking-tight">
          Clientes
        </h2>
        <p className="mt-1 text-xs text-[color:var(--text-muted)]">
          Ordenados por premios pendientes y luego por sellos activos.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-[color:var(--brand-gold)]" />
          </div>
        ) : customers.length === 0 ? (
          <p className="mt-6 rounded-[var(--radius-sm)] border border-dashed border-[color:var(--border-subtle)] py-8 text-center text-sm text-[color:var(--text-muted)]">
            Sin clientes con sellos todavía. Aparecerán cuando confirmes
            turnos pasados.
          </p>
        ) : (
          <ul className="mt-5 space-y-2">
            {customers.map((c) => (
              <li
                key={c.customer_phone}
                className={cn(
                  "rounded-[var(--radius-sm)] border bg-[color:var(--surface-0)] p-3 transition-colors sm:p-4",
                  c.can_redeem
                    ? "border-[color:var(--brand-gold)]/40 ring-1 ring-[color:var(--brand-gold)]/30"
                    : "border-[color:var(--border-subtle)]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {c.customer_name ?? c.customer_phone}
                    </p>
                    <p className="truncate text-[11px] text-[color:var(--text-muted)]">
                      {c.customer_phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-mono text-lg font-black tabular-nums",
                        c.can_redeem
                          ? "text-[color:var(--brand-gold)]"
                          : "text-white",
                      )}
                    >
                      {c.active_stamps}
                      {program ? `/${program.visits_required}` : ""}
                    </p>
                    <p className="text-[10px] uppercase text-[color:var(--text-muted)]">
                      Sellos activos
                    </p>
                  </div>
                </div>

                {c.can_redeem && program ? (
                  <button
                    type="button"
                    onClick={() => void handleRedeem(c)}
                    className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] px-3 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] transition-colors hover:bg-[color:var(--brand-gold)] hover:text-black sm:w-auto sm:self-end"
                  >
                    <Check className="size-3.5" />
                    Canjear {program.reward_name}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border bg-[color:var(--surface-1)] p-3 sm:p-4",
        highlight
          ? "border-[color:var(--brand-gold)]/40 ring-1 ring-[color:var(--brand-gold)]/30"
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
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)] sm:text-[11px]">
            {label}
          </p>
          <p className="mt-1 stat-number text-xl font-black tracking-tight text-white sm:text-2xl">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
