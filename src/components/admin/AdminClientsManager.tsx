"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Phone,
  Search,
  Users,
} from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { getCurrentSession } from "@/lib/auth";
import { listAppointmentsByBarbershop } from "@/lib/appointments";
import {
  listClientsByBarbershop,
  normalizePhone,
  type BarbershopClient,
} from "@/lib/barbershop-clients";
import { cn } from "@/lib/cn";
import {
  formatDateForDisplay,
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
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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
    return clients.map((client) => {
      const appts = appointmentsByClient.get(client.phone_normalized) ?? [];
      const visits = appts.length;
      const lastVisit = appts
        .map((a) => normalizeDateValue(a.appointment_date))
        .sort()
        .reverse()[0];
      const upcoming = appts
        .filter(
          (a) =>
            (a.status === "pending" || a.status === "confirmed") &&
            normalizeDateValue(a.appointment_date) >=
              new Date().toISOString().slice(0, 10),
        )
        .sort((a, b) =>
          normalizeDateValue(a.appointment_date).localeCompare(
            normalizeDateValue(b.appointment_date),
          ),
        )[0];
      return { client, visits, lastVisit, upcoming };
    });
  }, [clients, appointmentsByClient]);

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return clientsWithStats;
    return clientsWithStats.filter(({ client }) => {
      return (
        client.name.toLowerCase().includes(query) ||
        client.phone_normalized.includes(query.replace(/\D/g, ""))
      );
    });
  }, [clientsWithStats, searchQuery]);

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

  function handleSelectClient(client: BarbershopClient) {
    setSelectedClientId(client.id);
    setEditedNotes(client.notes ?? "");
    setEditedName(client.name);
    setSuccessMessage("");
    setErrorMessage("");
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
        setErrorMessage("Tu sesión expiró, volvé a iniciar sesión.");
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
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorMessage(payload.error ?? "No pudimos guardar.");
        return;
      }
      const payload = (await response.json()) as { client: BarbershopClient };
      setClients((current) =>
        current.map((c) => (c.id === payload.client.id ? payload.client : c)),
      );
      setSuccessMessage("Cliente actualizado.");
    } catch {
      setErrorMessage("No pudimos guardar.");
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Detalle ─────────────────────────────────────────────────
  if (selectedClient) {
    const { client, visits, lastVisit } = selectedClient;
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
          <p className="mt-2 inline-flex items-center gap-1 font-mono text-sm text-[color:var(--text-secondary)]">
            <Phone className="size-3.5" />
            {client.phone_display}
          </p>
        </header>

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

      <div className="relative">
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
        <ul className="grid gap-2">
          {filteredClients.map(({ client, visits, lastVisit, upcoming }) => (
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
                  <p className="truncate text-sm font-bold text-white sm:text-base">
                    {client.name}
                  </p>
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
                  {lastVisit ? (
                    <p className="mt-1 font-mono text-[10px] text-[color:var(--text-subtle)]">
                      Últ. {formatDateForDisplay(lastVisit)}
                    </p>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
