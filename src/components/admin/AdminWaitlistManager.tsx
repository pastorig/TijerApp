"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  MessageCircle,
  Phone,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { useConfirm } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatDateForDisplay, normalizeDateValue } from "@/lib/format";
import { listBarbersByBarbershop } from "@/lib/barbers";
import { listWaitlistByBarbershop, type WaitlistEntry } from "@/lib/waitlist";
import type { BarberRow } from "@/lib/supabase";

type AdminWaitlistManagerProps = {
  barbershop: DemoBarbershop;
};

type Filter = "pending" | "all" | "resolved";

const FILTER_OPTIONS: Array<{ value: Filter; label: string }> = [
  { value: "pending", label: "Pendientes" },
  { value: "resolved", label: "Atendidos" },
  { value: "all", label: "Todos" },
];

export function AdminWaitlistManager({ barbershop }: AdminWaitlistManagerProps) {
  const confirm = useConfirm();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [errorMessage, setErrorMessage] = useState("");
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);

  async function refresh(opts?: { silent?: boolean }) {
    if (!opts?.silent) setIsLoading(true);
    if (!opts?.silent) setErrorMessage("");
    try {
      const [entriesResult, barbersResult] = await Promise.all([
        listWaitlistByBarbershop(barbershop.slug),
        listBarbersByBarbershop(barbershop.slug),
      ]);
      if (entriesResult.error) {
        if (!opts?.silent) {
          setErrorMessage("No pudimos cargar la lista de espera.");
        }
        return;
      }
      setEntries(entriesResult.data ?? []);
      setBarbers(barbersResult.data ?? []);
    } catch {
      if (!opts?.silent) {
        setErrorMessage("No pudimos cargar la lista de espera.");
      }
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    void refresh();
    // Polling silencioso cada 30s: si un cliente confirma desde /w/[token]
    // y queda fulfilled, lo vemos sin tener que refrescar la página.
    const intervalId = window.setInterval(() => {
      void refresh({ silent: true });
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, [barbershop.slug]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const barberById = useMemo(() => {
    const map = new Map<string, BarberRow>();
    for (const b of barbers) map.set(b.id, b);
    return map;
  }, [barbers]);

  const visibleEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filter === "all") return true;
      if (filter === "pending") return entry.status === "pending";
      return entry.status !== "pending";
    });
  }, [entries, filter]);

  const pendingCount = entries.filter((e) => e.status === "pending").length;

  async function callPatch(
    entry: WaitlistEntry,
    body: Record<string, unknown>,
  ) {
    setBusyEntryId(entry.id);
    setErrorMessage("");
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setErrorMessage("Tu sesión expiró, volvé a iniciar sesión.");
        return null;
      }
      const response = await fetch("/api/admin/waitlist", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          entryId: entry.id,
          barbershopSlug: barbershop.slug,
          ...body,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorMessage(payload.error ?? "No pudimos actualizar.");
        return null;
      }
      const payload = (await response.json()) as { entry: WaitlistEntry };
      return payload.entry;
    } catch {
      setErrorMessage("No pudimos actualizar.");
      return null;
    } finally {
      setBusyEntryId(null);
    }
  }

  async function handleMarkContacted(entry: WaitlistEntry) {
    const updated = await callPatch(entry, { status: "contacted" });
    if (updated) {
      setEntries((current) =>
        current.map((e) => (e.id === entry.id ? updated : e)),
      );
    }
  }

  async function handleMarkFulfilled(entry: WaitlistEntry) {
    const updated = await callPatch(entry, { status: "fulfilled" });
    if (updated) {
      setEntries((current) =>
        current.map((e) => (e.id === entry.id ? updated : e)),
      );
    }
  }

  async function handleReopen(entry: WaitlistEntry) {
    const updated = await callPatch(entry, { status: "pending" });
    if (updated) {
      setEntries((current) =>
        current.map((e) => (e.id === entry.id ? updated : e)),
      );
    }
  }

  async function handleDelete(entry: WaitlistEntry) {
    const ok = await confirm({
      title: "Eliminar de la lista",
      message: `Sacar a ${entry.customer_name} de la lista de espera.`,
      confirmLabel: "Eliminar",
      cancelLabel: "Volver",
      danger: true,
    });
    if (!ok) return;
    const updated = await callPatch(entry, { softDelete: true });
    if (updated) {
      setEntries((current) => current.filter((e) => e.id !== entry.id));
    }
  }

  function getWhatsAppLink(entry: WaitlistEntry): string {
    const digits = entry.customer_phone.replace(/\D/g, "");
    const barberName =
      barberById.get(entry.barber_id)?.display_name ??
      barberById.get(entry.barber_id)?.name ??
      "tu barbero";
    const siteUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    const confirmUrl = `${siteUrl}/w/${entry.confirmation_token}`;
    const lines = [
      `Hola ${entry.customer_name}!`,
      `Te escribimos de ${barbershop.name}.`,
      "",
      `Se liberó un horario para ${entry.service_name} con ${barberName}.`,
      "",
      "Elegí día y hora para confirmar tu turno con un click:",
      confirmUrl,
    ];
    return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
          Lista de espera
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
          Clientes que esperan
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
          Personas que se anotaron porque no encontraron horario. Cuando se
          libera un slot, mandales un WhatsApp con un click.
        </p>
      </header>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={cn(
                  "inline-flex min-h-9 shrink-0 items-center rounded-[var(--radius-sm)] border px-3 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-[var(--duration-fast)]",
                  isActive
                    ? "border-[color:var(--brand-gold)] bg-gold-grad text-black"
                    : "border-[color:var(--border-default)] text-[color:var(--text-secondary)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            {pendingCount} pendientes
          </p>
          <button
            type="button"
            onClick={() => refresh()}
            aria-label="Actualizar lista"
            title="Actualizar"
            className="inline-flex size-8 items-center justify-center rounded-[var(--radius-xs)] border border-[color:var(--border-default)] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
          >
            <RefreshCw className="size-3" />
          </button>
        </div>
      </section>

      {errorMessage ? (
        <p
          role="alert"
          className="border-l-2 border-[color:var(--danger)] pl-4 text-sm font-semibold text-[color:var(--danger)]"
        >
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-[color:var(--text-muted)]">Cargando…</p>
      ) : visibleEntries.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-subtle)] p-10 text-center">
          <p className="text-sm font-bold text-white">
            {filter === "pending"
              ? "Sin clientes en espera"
              : "Sin entradas con este filtro"}
          </p>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            {filter === "pending"
              ? "Cuando alguien se anote desde la página pública, aparece acá."
              : "Cambiá el filtro para ver otras entradas."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {visibleEntries.map((entry) => {
            const isBusy = busyEntryId === entry.id;
            const isPending = entry.status === "pending";
            const barber = barberById.get(entry.barber_id);
            const statusMeta = getStatusMeta(entry.status);
            return (
              <li
                key={entry.id}
                className={cn(
                  "rounded-[var(--radius-md)] border bg-[color:var(--surface-1)] p-4",
                  isPending
                    ? "border-[color:var(--brand-gold)]/30"
                    : "border-[color:var(--border-subtle)] opacity-70",
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-white">
                      {entry.customer_name}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-[color:var(--text-muted)]">
                      <Phone className="size-3" />
                      {entry.customer_phone}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-[var(--radius-xs)] border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                      statusMeta.classes,
                    )}
                  >
                    {statusMeta.label}
                  </span>
                </div>

                <div className="mt-3 grid gap-1 text-xs text-[color:var(--text-secondary)]">
                  <p>
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                      Quiere
                    </span>{" "}
                    {entry.service_name} con{" "}
                    {barber?.display_name ?? barber?.name ?? "—"}
                  </p>
                  <p className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3 text-[color:var(--brand-gold)]" />
                    {formatDateForDisplay(
                      normalizeDateValue(entry.preferred_date),
                    )}
                    {entry.preferred_time_from && entry.preferred_time_to
                      ? ` · entre ${entry.preferred_time_from.slice(0, 5)} y ${entry.preferred_time_to.slice(0, 5)}`
                      : null}
                  </p>
                  {entry.notes ? (
                    <p className="mt-1 rounded-[var(--radius-xs)] border-l border-[color:var(--border-subtle)] pl-2 text-[11px] italic text-[color:var(--text-muted)]">
                      {entry.notes}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[color:var(--border-subtle)] pt-3">
                  <a
                    href={getWhatsAppLink(entry)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-8 items-center gap-1 rounded-[var(--radius-xs)] border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--success)] transition-colors duration-[var(--duration-fast)] hover:opacity-80"
                  >
                    <MessageCircle className="size-3" />
                    WhatsApp
                  </a>
                  {isPending ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleMarkContacted(entry)}
                        disabled={isBusy}
                        className="inline-flex min-h-8 items-center gap-1 rounded-[var(--radius-xs)] border border-[color:var(--border-default)] px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:opacity-50"
                      >
                        Marcar contactado
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkFulfilled(entry)}
                        disabled={isBusy}
                        className="inline-flex min-h-8 items-center gap-1 rounded-[var(--radius-xs)] border border-[color:var(--success)]/40 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--success)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--success-soft)] disabled:opacity-50"
                      >
                        <Check className="size-3" />
                        Cumplido
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleReopen(entry)}
                      disabled={isBusy}
                      className="inline-flex min-h-8 items-center gap-1 rounded-[var(--radius-xs)] border border-[color:var(--border-default)] px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:opacity-50"
                    >
                      <RotateCcw className="size-3" />
                      Reabrir
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(entry)}
                    disabled={isBusy}
                    className="ml-auto inline-flex min-h-8 items-center gap-1 rounded-[var(--radius-xs)] border border-[color:var(--danger)]/40 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--danger)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--danger-soft)] disabled:opacity-50"
                  >
                    <Trash2 className="size-3" />
                    Eliminar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function getStatusMeta(status: WaitlistEntry["status"]): {
  label: string;
  classes: string;
} {
  switch (status) {
    case "contacted":
      return {
        label: "Contactado",
        classes:
          "border-blue-500/40 bg-blue-500/10 text-blue-400",
      };
    case "fulfilled":
      return {
        label: "Cumplido",
        classes:
          "border-[color:var(--success)]/40 bg-[color:var(--success-soft)] text-[color:var(--success)]",
      };
    case "cancelled":
      return {
        label: "Cancelado",
        classes:
          "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
      };
    default:
      return {
        label: "Pendiente",
        classes:
          "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]",
      };
  }
}

