"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Download,
  Phone,
  Scissors,
  Search,
  TrendingUp,
  Upload,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { ImportClientsModal } from "@/components/admin/ImportClientsModal";
import { useToast } from "@/components/ui";
import {
  ClientTagsEditor,
  getTagTone,
  tagClassesFor,
} from "@/components/admin/ClientTagsEditor";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { getCurrentSession } from "@/lib/auth";
import { listAppointmentsByBarbershop } from "@/lib/appointments";
import {
  listClientsByBarbershop,
  normalizePhone,
  type BarbershopClient,
} from "@/lib/barbershop-clients";
import {
  computeSegment,
  daysBetween,
  SEGMENT_META,
  segmentTagClasses,
  type ClientSegment,
} from "@/lib/client-segments";
import { createWhatsAppReactivationLink } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";
import {
  formatDateForDisplay,
  formatPrice,
  normalizeDateValue,
  normalizeTimeValue,
} from "@/lib/format";
import type { AppointmentRow } from "@/lib/supabase";

type AdminClientsManagerProps = {
  barbershop: DemoBarbershop;
};

export function AdminClientsManager({ barbershop }: AdminClientsManagerProps) {
  const [clients, setClients] = useState<BarbershopClient[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editedNotes, setEditedNotes] = useState("");
  const [editedName, setEditedName] = useState("");
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<ClientSegment | "all">(
    "all",
  );
  const [isImportOpen, setIsImportOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [clientsResult, appsResult] = await Promise.all([
          listClientsByBarbershop(barbershop.slug),
          listAppointmentsByBarbershop(barbershop.slug),
        ]);
        if (!isMounted) return;
        if (clientsResult.error) {
          setErrorMessage("No pudimos cargar los clientes.");
          return;
        }
        setClients(clientsResult.data ?? []);
        setAppointments(appsResult.data ?? []);
      } catch {
        if (isMounted) setErrorMessage("No pudimos cargar los clientes.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [barbershop.slug]);

  const appointmentsByClient = useMemo(() => {
    const map = new Map<string, AppointmentRow[]>();
    for (const appointment of appointments) {
      if (appointment.status === "deleted") continue;
      const phoneNormalized = normalizePhone(appointment.customer_phone);
      if (!phoneNormalized) continue;
      const list = map.get(phoneNormalized) ?? [];
      list.push(appointment);
      map.set(phoneNormalized, list);
    }
    return map;
  }, [appointments]);

  const clientsWithStats = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    return clients.map((client) => {
      const appts = appointmentsByClient.get(client.phone_normalized) ?? [];
      // Visitas "completadas" = no canceladas, no eliminadas, fecha <= hoy.
      const completedVisits = appts.filter(
        (a) =>
          a.status !== "cancelled" &&
          a.status !== "deleted" &&
          normalizeDateValue(a.appointment_date) <= todayIso,
      );
      const visits = completedVisits.length;
      const lastVisit = completedVisits
        .map((a) => normalizeDateValue(a.appointment_date))
        .sort()
        .reverse()[0];
      const daysSinceLastVisit = lastVisit
        ? daysBetween(lastVisit, todayIso)
        : null;
      const upcoming = appts
        .filter(
          (a) =>
            (a.status === "pending" || a.status === "confirmed") &&
            normalizeDateValue(a.appointment_date) >= todayIso,
        )
        .sort((a, b) =>
          normalizeDateValue(a.appointment_date).localeCompare(
            normalizeDateValue(b.appointment_date),
          ),
        )[0];
      const segment = computeSegment({ visits, daysSinceLastVisit });
      return {
        client,
        visits,
        lastVisit,
        daysSinceLastVisit,
        upcoming,
        segment,
        hasUpcoming: Boolean(upcoming),
      };
    });
  }, [clients, appointmentsByClient]);

  const segmentCounts = useMemo(() => {
    const counts: Record<ClientSegment | "all", number> = {
      all: clientsWithStats.length,
      vip: 0,
      recurrente: 0,
      activo: 0,
      nuevo: 0,
      "por-reactivar": 0,
      inactivo: 0,
      "sin-visitas": 0,
    };
    for (const { segment } of clientsWithStats) {
      counts[segment] = (counts[segment] ?? 0) + 1;
    }
    return counts;
  }, [clientsWithStats]);

  const inactivosCount = segmentCounts.inactivo;
  const porReactivarCount = segmentCounts["por-reactivar"];

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return clientsWithStats.filter((entry) => {
      if (segmentFilter !== "all" && entry.segment !== segmentFilter) {
        return false;
      }
      if (!query) return true;
      return (
        entry.client.name.toLowerCase().includes(query) ||
        entry.client.phone_normalized.includes(query.replace(/\D/g, ""))
      );
    });
  }, [clientsWithStats, searchQuery, segmentFilter]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clientsWithStats.find((c) => c.client.id === selectedClientId);
  }, [clientsWithStats, selectedClientId]);

  const selectedClientAppointments = useMemo(() => {
    if (!selectedClient) return [];
    return (appointmentsByClient.get(selectedClient.client.phone_normalized) ?? [])
      .slice()
      .sort((a, b) => {
        const dateCompare = normalizeDateValue(b.appointment_date).localeCompare(
          normalizeDateValue(a.appointment_date),
        );
        if (dateCompare !== 0) return dateCompare;
        return b.appointment_time.localeCompare(a.appointment_time);
      });
  }, [selectedClient, appointmentsByClient]);

  /**
   * Métricas derivadas de los turnos del cliente seleccionado.
   * Solo cuenta visitas "completadas" (no canceladas, no eliminadas, fecha pasada o hoy).
   */
  const selectedClientInsights = useMemo(() => {
    if (!selectedClient) return null;
    const todayIso = new Date().toISOString().slice(0, 10);
    const completed = selectedClientAppointments.filter(
      (a) =>
        a.status !== "cancelled" &&
        a.status !== "deleted" &&
        normalizeDateValue(a.appointment_date) <= todayIso,
    );

    if (completed.length === 0) {
      return {
        lifetimeValue: 0,
        avgFrequencyDays: null as number | null,
        favoriteBarber: null as string | null,
        favoriteService: null as string | null,
        cancelledCount: selectedClientAppointments.filter(
          (a) => a.status === "cancelled",
        ).length,
      };
    }

    // Lifetime value = suma de service_price de visitas completadas
    const lifetimeValue = completed.reduce(
      (sum, a) => sum + (a.service_price ?? 0),
      0,
    );

    // Frecuencia promedio entre visitas (en días)
    let avgFrequencyDays: number | null = null;
    if (completed.length >= 2) {
      const datesSorted = completed
        .map((a) => normalizeDateValue(a.appointment_date))
        .sort();
      let totalGapDays = 0;
      for (let i = 1; i < datesSorted.length; i++) {
        totalGapDays += daysBetween(datesSorted[i - 1], datesSorted[i]);
      }
      avgFrequencyDays = Math.round(totalGapDays / (datesSorted.length - 1));
    }

    // Mode helper
    const modeBy = <T,>(items: T[], key: (x: T) => string | null): string | null => {
      const counts = new Map<string, number>();
      for (const it of items) {
        const k = key(it);
        if (!k) continue;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      let topKey: string | null = null;
      let topCount = 0;
      for (const [k, n] of counts) {
        if (n > topCount) {
          topCount = n;
          topKey = k;
        }
      }
      return topKey;
    };

    const favoriteBarber = modeBy(completed, (a) => a.barber_name ?? null);
    const favoriteService = modeBy(completed, (a) => a.service_name ?? null);
    const cancelledCount = selectedClientAppointments.filter(
      (a) => a.status === "cancelled",
    ).length;

    return {
      lifetimeValue,
      avgFrequencyDays,
      favoriteBarber,
      favoriteService,
      cancelledCount,
    };
  }, [selectedClient, selectedClientAppointments]);

  function handleSelectClient(client: BarbershopClient) {
    setSelectedClientId(client.id);
    setEditedNotes(client.notes ?? "");
    setEditedName(client.name);
    setEditedTags(client.tags ?? []);
    setSuccessMessage("");
    setErrorMessage("");
  }

  function escapeCsv(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function handleExportCsv() {
    if (filteredClients.length === 0) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    const header = [
      "Nombre",
      "Telefono",
      "Email",
      "Visitas",
      "Ultima visita",
      "Dias desde ultima",
      "Segmento",
      "Tags",
      "Lifetime value",
      "Notas",
      "Cliente desde",
    ];
    const rows = filteredClients.map(
      ({
        client,
        visits,
        lastVisit,
        daysSinceLastVisit,
        segment,
      }) => {
        const apptsForClient =
          appointmentsByClient.get(client.phone_normalized) ?? [];
        const lifetime = apptsForClient
          .filter(
            (a) =>
              a.status !== "cancelled" &&
              a.status !== "deleted" &&
              normalizeDateValue(a.appointment_date) <= todayIso,
          )
          .reduce((sum, a) => sum + (a.service_price ?? 0), 0);
        return [
          escapeCsv(client.name),
          escapeCsv(client.phone_display),
          escapeCsv(client.email ?? ""),
          escapeCsv(visits),
          escapeCsv(lastVisit ?? ""),
          escapeCsv(daysSinceLastVisit ?? ""),
          escapeCsv(SEGMENT_META[segment].label),
          escapeCsv((client.tags ?? []).join(" / ")),
          escapeCsv(lifetime),
          escapeCsv(client.notes ?? ""),
          escapeCsv(client.created_at.slice(0, 10)),
        ].join(",");
      },
    );
    // BOM para que Excel reconozca UTF-8 (acentos, ñ).
    const csv = "﻿" + [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clientes-${barbershop.slug}-${todayIso}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleSave() {
    if (!selectedClient) return;
    const { client } = selectedClient;
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Tu sesión expiró, volvé a iniciar sesión.");
        return;
      }
      const response = await fetch("/api/admin/clients", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          clientId: client.id,
          barbershopSlug: barbershop.slug,
          name: editedName.trim() || client.name,
          notes: editedNotes,
          tags: editedTags,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(payload.error ?? "No pudimos guardar.");
        return;
      }
      const payload = (await response.json()) as { client: BarbershopClient };
      setClients((current) =>
        current.map((c) => (c.id === payload.client.id ? payload.client : c)),
      );
      toast.success("Cliente actualizado", {
        description: editedName.trim() || client.name,
      });
    } catch {
      toast.error("No pudimos guardar.");
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Detalle ─────────────────────────────────────────────────
  if (selectedClient) {
    const { client, visits, lastVisit, segment, daysSinceLastVisit } =
      selectedClient;
    const segmentMeta = SEGMENT_META[segment];
    const showReactivationCta =
      (segment === "inactivo" || segment === "por-reactivar") &&
      Boolean(client.phone_display) &&
      daysSinceLastVisit !== null;
    const reactivationLink = showReactivationCta
      ? createWhatsAppReactivationLink({
          barbershopName: barbershop.name,
          barbershopSlug: barbershop.slug,
          clientName: client.name,
          clientPhone: client.phone_display,
          daysSinceLastVisit: daysSinceLastVisit ?? 0,
        })
      : null;
    return (
      <div className="space-y-6 sm:space-y-8">
        <button
          type="button"
          onClick={() => setSelectedClientId(null)}
          className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
        >
          <ArrowLeft className="size-3" />
          Volver a clientes
        </button>

        <header className="animate-fade-up">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
            Ficha de cliente
          </p>
          <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
            {client.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="inline-flex items-center gap-1 font-mono text-sm text-[color:var(--text-secondary)]">
              <Phone className="size-3.5" />
              {client.phone_display}
            </p>
            <span
              className={cn(
                "inline-flex items-center rounded-[var(--radius-xs)] border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]",
                segmentTagClasses(segmentMeta.tone),
              )}
              title={segmentMeta.description}
            >
              {segmentMeta.label}
            </span>
          </div>
        </header>

        {/* CTA reactivación cuando corresponde */}
        {reactivationLink ? (
          <div className="flex flex-wrap items-start gap-3 rounded-[var(--radius-md)] border border-amber-400/30 bg-amber-400/5 p-4">
            <AlertTriangle
              aria-hidden="true"
              className="size-5 shrink-0 text-amber-300"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                {segment === "inactivo"
                  ? "Cliente inactivo"
                  : "Cliente por reactivar"}
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-secondary)] sm:text-sm">
                Hace <strong className="text-white">{daysSinceLastVisit}</strong>{" "}
                días que no viene. Mandale un WhatsApp para invitarlo a volver.
              </p>
              <a
                href={reactivationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--success)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--success)]/15"
              >
                Mandar WhatsApp de reactivación
              </a>
            </div>
          </div>
        ) : null}

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              Visitas
            </p>
            <p className="mt-1 font-mono text-2xl font-black tabular-nums text-[color:var(--brand-gold)] sm:text-3xl">
              {visits}
            </p>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              Última visita
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              {lastVisit ? formatDateForDisplay(lastVisit) : "—"}
            </p>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              Cliente desde
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              {formatDateForDisplay(
                normalizeDateValue(client.created_at.slice(0, 10)),
              )}
            </p>
          </div>
        </section>

        {/* Insights derivados */}
        {selectedClientInsights ? (
          <section className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
              Comportamiento
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <InsightCard
                icon={<Wallet className="size-4" aria-hidden="true" />}
                label="Lifetime value"
                value={
                  selectedClientInsights.lifetimeValue > 0
                    ? formatPrice(selectedClientInsights.lifetimeValue)
                    : "—"
                }
                accent
              />
              <InsightCard
                icon={<TrendingUp className="size-4" aria-hidden="true" />}
                label="Frecuencia"
                value={
                  selectedClientInsights.avgFrequencyDays !== null
                    ? `Cada ${selectedClientInsights.avgFrequencyDays}d`
                    : "—"
                }
                hint={
                  selectedClientInsights.avgFrequencyDays === null
                    ? "Necesita ≥2 visitas"
                    : undefined
                }
              />
              <InsightCard
                icon={<UserRound className="size-4" aria-hidden="true" />}
                label="Barbero preferido"
                value={selectedClientInsights.favoriteBarber ?? "—"}
              />
              <InsightCard
                icon={<Scissors className="size-4" aria-hidden="true" />}
                label="Servicio favorito"
                value={selectedClientInsights.favoriteService ?? "—"}
              />
            </div>
            {selectedClientInsights.cancelledCount > 0 ? (
              <p className="mt-4 text-[11px] text-[color:var(--text-muted)]">
                <span className="font-bold text-[color:var(--danger)]">
                  {selectedClientInsights.cancelledCount}
                </span>{" "}
                {selectedClientInsights.cancelledCount === 1
                  ? "turno cancelado histórico"
                  : "turnos cancelados históricos"}
                .
              </p>
            ) : null}
          </section>
        ) : null}

        {/* Editar nombre + notas */}
        <section className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
            Datos del cliente
          </p>
          <div className="mt-4 grid gap-3">
            <div>
              <label
                htmlFor="client-name"
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
              >
                Nombre
              </label>
              <input
                id="client-name"
                value={editedName}
                disabled={isSaving}
                onChange={(e) => setEditedName(e.target.value)}
                className="mt-2 min-h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
              />
            </div>
            <div>
              <label
                htmlFor="client-notes"
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
              >
                Notas privadas
              </label>
              <textarea
                id="client-notes"
                value={editedNotes}
                disabled={isSaving}
                onChange={(e) => setEditedNotes(e.target.value)}
                rows={4}
                placeholder="Notas que solo vos ves: preferencias, alergias, comportamiento…"
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                Tags
              </p>
              <div className="mt-2 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black p-3">
                <ClientTagsEditor
                  tags={editedTags}
                  disabled={isSaving}
                  onChange={setEditedTags}
                />
              </div>
            </div>
            {errorMessage ? (
              <p
                role="alert"
                className="border-l-2 border-[color:var(--danger)] pl-3 text-sm font-semibold text-[color:var(--danger)]"
              >
                {errorMessage}
              </p>
            ) : null}
            {successMessage ? (
              <p className="border-l-2 border-[color:var(--success)] pl-3 text-sm font-semibold text-[color:var(--success)]">
                {successMessage}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Guardando…" : "Guardar"}
              </button>
              <Link
                href={`/${barbershop.slug}/reservar`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-1 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
              >
                Reservar nuevo turno
              </Link>
            </div>
          </div>
        </section>

        {/* Historial */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Historial ({selectedClientAppointments.length})
          </p>
          {selectedClientAppointments.length === 0 ? (
            <p className="mt-4 text-sm text-[color:var(--text-subtle)]">
              Sin turnos cargados todavía.
            </p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {selectedClientAppointments.map((appointment) => (
                <li
                  key={appointment.id}
                  className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-3"
                >
                  <div className="w-20 shrink-0">
                    <p className="font-mono text-base font-bold tabular-nums leading-none text-white">
                      {normalizeTimeValue(appointment.appointment_time)}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-[color:var(--text-muted)]">
                      {formatDateForDisplay(
                        normalizeDateValue(appointment.appointment_date),
                      )}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "w-[2px] shrink-0 self-stretch rounded-full",
                      appointment.status === "confirmed"
                        ? "bg-[color:var(--success)]"
                        : appointment.status === "cancelled"
                          ? "bg-[color:var(--danger)]"
                          : "bg-[color:var(--brand-gold)]",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {appointment.service_name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[color:var(--text-muted)]">
                      {appointment.barber_name}
                      <span className="mx-1.5 text-[color:var(--text-subtle)]">
                        ·
                      </span>
                      <span
                        className={cn(
                          "uppercase tracking-[0.14em]",
                          appointment.status === "confirmed"
                            ? "text-[color:var(--success)]"
                            : appointment.status === "cancelled"
                              ? "text-[color:var(--danger)]"
                              : "text-[color:var(--brand-gold)]",
                        )}
                      >
                        {appointment.status}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  // ─── Listado ─────────────────────────────────────────────────
  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="animate-fade-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
          Clientes
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
          Tu lista
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
          Todos los clientes que pasaron por tu barbería. Click en cualquiera
          para ver su ficha completa con historial y notas privadas.
        </p>
      </header>

      <div className="flex flex-wrap items-stretch gap-2">
        <div className="relative flex-1 min-w-[14rem]">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--text-subtle)]"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o teléfono…"
            className="h-11 w-full appearance-none rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] pl-9 pr-3 text-sm text-white placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)] focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
          >
            <Upload className="size-3.5" aria-hidden="true" />
            Importar CSV
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredClients.length === 0}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-3.5" aria-hidden="true" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Alerta de inactivos / por reactivar */}
      {(inactivosCount > 0 || porReactivarCount > 0) && !isLoading ? (
        <div className="flex flex-wrap items-start gap-3 rounded-[var(--radius-md)] border border-amber-400/30 bg-amber-400/5 p-4">
          <AlertTriangle
            aria-hidden="true"
            className="size-5 shrink-0 text-amber-300"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
              Clientes que se están perdiendo
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-secondary)] sm:text-sm">
              {inactivosCount > 0 ? (
                <>
                  Tenés <strong className="text-white">{inactivosCount}</strong>{" "}
                  cliente{inactivosCount === 1 ? "" : "s"} sin venir hace más de
                  60 días.
                </>
              ) : null}
              {inactivosCount > 0 && porReactivarCount > 0 ? " " : null}
              {porReactivarCount > 0 ? (
                <>
                  <strong className="text-white">{porReactivarCount}</strong>{" "}
                  más entre 30 y 60 días.
                </>
              ) : null}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {inactivosCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setSegmentFilter("inactivo")}
                  className="inline-flex items-center rounded-[var(--radius-xs)] border border-[color:var(--danger)]/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--danger)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--danger-soft)]"
                >
                  Ver inactivos ({inactivosCount})
                </button>
              ) : null}
              {porReactivarCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setSegmentFilter("por-reactivar")}
                  className="inline-flex items-center rounded-[var(--radius-xs)] border border-amber-400/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300 transition-colors duration-[var(--duration-fast)] hover:bg-amber-400/10"
                >
                  Ver por reactivar ({porReactivarCount})
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Filtros por segmento */}
      {!isLoading && clients.length > 0 ? (
        <div className="-mx-1 flex flex-wrap gap-1.5 overflow-x-auto px-1">
          {(
            [
              "all",
              "vip",
              "recurrente",
              "activo",
              "nuevo",
              "por-reactivar",
              "inactivo",
            ] as const
          ).map((value) => {
            const isActive = segmentFilter === value;
            const label =
              value === "all" ? "Todos" : SEGMENT_META[value].shortLabel;
            const count = segmentCounts[value];
            if (value !== "all" && count === 0) return null;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSegmentFilter(value)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-xs)] border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-[var(--duration-fast)]",
                  isActive
                    ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)] text-black"
                    : "border-[color:var(--border-default)] text-[color:var(--text-secondary)] hover:border-[color:var(--brand-gold)]/50 hover:text-[color:var(--brand-gold)]",
                )}
              >
                {label}
                <span
                  className={cn(
                    "rounded-[var(--radius-xs)] px-1 font-mono text-[10px] tabular-nums",
                    isActive
                      ? "bg-black/10 text-black"
                      : "text-[color:var(--text-subtle)]",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {errorMessage ? (
        <p
          role="alert"
          className="border-l-2 border-[color:var(--danger)] pl-4 text-sm font-semibold text-[color:var(--danger)]"
        >
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-[color:var(--text-muted)]">
          Cargando clientes…
        </p>
      ) : clients.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-subtle)] p-10 text-center">
          <Users className="mx-auto size-8 text-[color:var(--text-subtle)]" />
          <p className="mt-3 text-sm font-bold text-white">
            Sin clientes todavía
          </p>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            Cuando alguien reserve, aparece automáticamente acá.
          </p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-subtle)] p-10 text-center">
          <p className="text-sm font-bold text-white">Sin resultados</p>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            No encontramos ningún cliente para &quot;{searchQuery}&quot;.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 animate-stagger">
          {filteredClients.map(
            ({
              client,
              visits,
              lastVisit,
              upcoming,
              segment,
              daysSinceLastVisit,
            }) => {
              const segmentMeta = SEGMENT_META[segment];
              return (
            <li key={client.id}>
              <button
                type="button"
                onClick={() => handleSelectClient(client)}
                className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-4 text-left transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)]/40"
              >
                <div
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] font-mono text-xs font-bold uppercase text-[color:var(--brand-gold)]"
                >
                  {client.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p: string) => p[0]?.toUpperCase() ?? "")
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="truncate text-sm font-bold text-white sm:text-base">
                      {client.name}
                    </p>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-[var(--radius-xs)] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]",
                        segmentTagClasses(segmentMeta.tone),
                      )}
                      title={segmentMeta.description}
                    >
                      {segmentMeta.shortLabel}
                    </span>
                    {client.tags?.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-[var(--radius-xs)] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]",
                          tagClassesFor(getTagTone(tag)),
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-xs text-[color:var(--text-muted)]">
                    {client.phone_display}
                  </p>
                  {upcoming ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--brand-gold)]">
                      <CalendarDays className="size-3" />
                      Próximo:{" "}
                      {formatDateForDisplay(
                        normalizeDateValue(upcoming.appointment_date),
                      )}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-base font-bold tabular-nums text-white">
                    {visits}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                    {visits === 1 ? "visita" : "visitas"}
                  </p>
                  {daysSinceLastVisit !== null ? (
                    <p
                      className={cn(
                        "mt-1 font-mono text-[10px]",
                        daysSinceLastVisit > 60
                          ? "text-[color:var(--danger)]"
                          : daysSinceLastVisit > 30
                            ? "text-amber-300"
                            : "text-[color:var(--text-subtle)]",
                      )}
                    >
                      Hace {daysSinceLastVisit}d
                    </p>
                  ) : lastVisit ? (
                    <p className="mt-1 font-mono text-[10px] text-[color:var(--text-subtle)]">
                      Últ. {formatDateForDisplay(lastVisit)}
                    </p>
                  ) : null}
                </div>
              </button>
            </li>
              );
            },
          )}
        </ul>
      )}

      <ImportClientsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        barbershopSlug={barbershop.slug}
        onImported={() => {
          // Refresca lista de clientes desde DB
          void (async () => {
            const { data } = await listClientsByBarbershop(barbershop.slug);
            if (data) setClients(data);
          })();
        }}
      />
    </div>
  );
}

function InsightCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-sm)] border p-3",
        accent
          ? "border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)]"
          : "border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]/60",
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
        <span
          className={cn(
            accent
              ? "text-[color:var(--brand-gold)]"
              : "text-[color:var(--text-subtle)]",
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      <p
        className={cn(
          "mt-1.5 truncate text-sm font-bold",
          accent ? "text-[color:var(--brand-gold)]" : "text-white",
        )}
        title={value}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-[color:var(--text-subtle)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
