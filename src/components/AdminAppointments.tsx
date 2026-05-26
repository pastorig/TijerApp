"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut, Plus, Users } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import {
  cancelAppointment,
  confirmAppointment,
  deleteAppointment,
  listAppointmentsByBarbershop,
  restoreDeletedAppointment,
} from "@/lib/appointments";
import { signOut } from "@/lib/auth";
import { listBarbersByBarbershop } from "@/lib/barbers";
import { cn } from "@/lib/cn";
import {
  formatDateForDisplay,
  normalizeDateValue,
  normalizeTimeValue,
  timeValueToMinutes,
} from "@/lib/format";
import type { AppointmentRow, BarberRow } from "@/lib/supabase";
import { createWhatsAppConfirmationLink } from "@/lib/whatsapp";
import { Button, Select } from "@/components/ui";
import { AgendaCalendar } from "./admin/AgendaCalendar";
import { AppointmentRow as AppointmentCard } from "./admin/AppointmentRow";
import {
  formatDayHeading,
  getTodayYmd,
  normalizeTimeShort,
} from "./admin/date-utils";

type AdminAppointmentsProps = {
  barbershop: DemoBarbershop;
};

type AppointmentFilter =
  | "day"
  | "all"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "deleted";

const FILTER_OPTIONS: Array<{ value: AppointmentFilter; label: string }> = [
  { value: "day", label: "Día" },
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmados" },
  { value: "cancelled", label: "Cancelados" },
  { value: "deleted", label: "Eliminados" },
];

function getCurrentTimeValue() {
  return normalizeTimeValue(
    new Date().toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  );
}

export function AdminAppointments({ barbershop }: AdminAppointmentsProps) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [focusDate, setFocusDate] = useState(getTodayYmd());
  const [activeFilter, setActiveFilter] = useState<AppointmentFilter>("day");
  const [selectedBarberFilter, setSelectedBarberFilter] = useState("all");
  const [confirmingAppointmentId, setConfirmingAppointmentId] = useState<
    string | null
  >(null);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<
    string | null
  >(null);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<
    string | null
  >(null);
  const [restoringAppointmentId, setRestoringAppointmentId] = useState<
    string | null
  >(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const today = getTodayYmd();
  const currentTime = getCurrentTimeValue();
  const currentTimeMinutes = timeValueToMinutes(currentTime);
  const isFocusToday = focusDate === today;
  const isFocusFuture = focusDate > today;
  const canShowUpcoming = isFocusToday || isFocusFuture;

  const matchesBarber = useMemo(() => {
    return (a: AppointmentRow) =>
      selectedBarberFilter === "all" || a.barber_id === selectedBarberFilter;
  }, [selectedBarberFilter]);

  const visibleAppointments = useMemo(
    () =>
      appointments.filter((a) => a.status !== "deleted" && matchesBarber(a)),
    [appointments, matchesBarber],
  );

  const deletedAppointments = useMemo(
    () =>
      appointments.filter((a) => a.status === "deleted" && matchesBarber(a)),
    [appointments, matchesBarber],
  );

  const countsByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    visibleAppointments.forEach((a) => {
      const date = normalizeDateValue(a.appointment_date);
      counts[date] = (counts[date] ?? 0) + 1;
    });
    return counts;
  }, [visibleAppointments]);

  const focusDateAppointments = useMemo(
    () =>
      visibleAppointments.filter(
        (a) => normalizeDateValue(a.appointment_date) === focusDate,
      ),
    [visibleAppointments, focusDate],
  );

  const upcomingAppointment = useMemo(() => {
    return focusDateAppointments
      .filter(
        (a) =>
          (a.status === "pending" || a.status === "confirmed") &&
          canShowUpcoming &&
          (isFocusFuture ||
            (isFocusToday &&
              timeValueToMinutes(a.appointment_time) >= currentTimeMinutes)),
      )
      .sort(
        (a, b) =>
          timeValueToMinutes(a.appointment_time) -
          timeValueToMinutes(b.appointment_time),
      )[0];
  }, [
    focusDateAppointments,
    canShowUpcoming,
    isFocusFuture,
    isFocusToday,
    currentTimeMinutes,
  ]);

  const dayStats = useMemo(() => {
    return {
      total: focusDateAppointments.length,
      pending: focusDateAppointments.filter((a) => a.status === "pending")
        .length,
      confirmed: focusDateAppointments.filter((a) => a.status === "confirmed")
        .length,
      cancelled: focusDateAppointments.filter((a) => a.status === "cancelled")
        .length,
    };
  }, [focusDateAppointments]);

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((a) => {
        if (!matchesBarber(a)) return false;
        if (activeFilter === "deleted") return a.status === "deleted";
        if (a.status === "deleted") return false;
        if (activeFilter === "all") return true;
        if (activeFilter === "day")
          return normalizeDateValue(a.appointment_date) === focusDate;
        return a.status === activeFilter;
      })
      .sort((a, b) => {
        const dateCompare = normalizeDateValue(a.appointment_date).localeCompare(
          normalizeDateValue(b.appointment_date),
        );
        if (dateCompare !== 0) return dateCompare;
        return (
          timeValueToMinutes(a.appointment_time) -
          timeValueToMinutes(b.appointment_time)
        );
      });
  }, [appointments, activeFilter, focusDate, matchesBarber]);

  const filterCounts: Record<AppointmentFilter, number> = useMemo(
    () => ({
      day: focusDateAppointments.length,
      all: visibleAppointments.length,
      pending: visibleAppointments.filter((a) => a.status === "pending").length,
      confirmed: visibleAppointments.filter((a) => a.status === "confirmed")
        .length,
      cancelled: visibleAppointments.filter((a) => a.status === "cancelled")
        .length,
      deleted: deletedAppointments.length,
    }),
    [focusDateAppointments, visibleAppointments, deletedAppointments],
  );

  const barberFilterOptions = useMemo(() => {
    if (barbers.length > 0) {
      return barbers.map((b) => ({
        id: b.id,
        name: b.display_name?.trim() || b.name,
      }));
    }
    const seen = new Set<string>();
    return appointments.reduce<Array<{ id: string; name: string }>>(
      (acc, a) => {
        if (seen.has(a.barber_id)) return acc;
        seen.add(a.barber_id);
        acc.push({ id: a.barber_id, name: a.barber_name });
        return acc;
      },
      [],
    );
  }, [barbers, appointments]);

  async function handleConfirmAppointment(appointment: AppointmentRow) {
    if (!appointment.id) {
      setErrorMessage("No pudimos identificar la reserva.");
      return;
    }
    setErrorMessage("");
    setConfirmingAppointmentId(appointment.id);
    try {
      const { error } = await confirmAppointment(appointment.id);
      if (error) {
        setErrorMessage("No pudimos confirmar la reserva.");
        return;
      }
      setAppointments((current) =>
        current.map((a) =>
          a.id === appointment.id ? { ...a, status: "confirmed" } : a,
        ),
      );
    } catch {
      setErrorMessage("No pudimos confirmar la reserva.");
    } finally {
      setConfirmingAppointmentId(null);
    }
  }

  function handleSendWhatsApp(appointment: AppointmentRow) {
    if (appointment.status === "cancelled" || appointment.status === "deleted")
      return;
    const link = createWhatsAppConfirmationLink({
      barbershopName: barbershop.name,
      clientName: appointment.customer_name,
      clientPhone: appointment.customer_phone,
      serviceName: appointment.service_name,
      date: formatDateForDisplay(appointment.appointment_date),
      time: appointment.appointment_time,
    });
    window.open(link, "_blank", "noopener,noreferrer");
  }

  async function handleCancelAppointment(appointment: AppointmentRow) {
    if (!appointment.id) {
      setErrorMessage("No pudimos identificar la reserva.");
      return;
    }
    const ok = window.confirm(
      `¿Cancelar el turno de ${appointment.customer_name} del ${formatDateForDisplay(
        appointment.appointment_date,
      )} a las ${normalizeTimeShort(appointment.appointment_time)}?`,
    );
    if (!ok) return;
    setErrorMessage("");
    setCancellingAppointmentId(appointment.id);
    try {
      const { error } = await cancelAppointment(appointment.id);
      if (error) {
        setErrorMessage("No pudimos cancelar la reserva.");
        return;
      }
      setAppointments((current) =>
        current.map((a) =>
          a.id === appointment.id ? { ...a, status: "cancelled" } : a,
        ),
      );
    } catch {
      setErrorMessage("No pudimos cancelar la reserva.");
    } finally {
      setCancellingAppointmentId(null);
    }
  }

  async function handleDeleteAppointment(appointment: AppointmentRow) {
    if (!appointment.id) {
      setErrorMessage("No pudimos identificar la reserva.");
      return;
    }
    const ok = window.confirm(
      `¿Eliminar visualmente el turno cancelado de ${appointment.customer_name}?`,
    );
    if (!ok) return;
    setErrorMessage("");
    setDeletingAppointmentId(appointment.id);
    try {
      const { error } = await deleteAppointment(appointment.id);
      if (error) {
        setErrorMessage("No pudimos eliminar visualmente la reserva.");
        return;
      }
      setAppointments((current) =>
        current.map((a) =>
          a.id === appointment.id ? { ...a, status: "deleted" } : a,
        ),
      );
    } catch {
      setErrorMessage("No pudimos eliminar visualmente la reserva.");
    } finally {
      setDeletingAppointmentId(null);
    }
  }

  async function handleRestoreAppointment(appointment: AppointmentRow) {
    if (!appointment.id) {
      setErrorMessage("No pudimos identificar la reserva.");
      return;
    }
    setErrorMessage("");
    setRestoringAppointmentId(appointment.id);
    try {
      const { error } = await restoreDeletedAppointment(appointment.id);
      if (error) {
        setErrorMessage("No pudimos restaurar la reserva.");
        return;
      }
      setAppointments((current) =>
        current.map((a) =>
          a.id === appointment.id ? { ...a, status: "cancelled" } : a,
        ),
      );
    } catch {
      setErrorMessage("No pudimos restaurar la reserva.");
    } finally {
      setRestoringAppointmentId(null);
    }
  }

  async function handleSignOut() {
    setErrorMessage("");
    setIsSigningOut(true);
    try {
      const { error } = await signOut();
      if (error) {
        setErrorMessage("No pudimos cerrar sesión.");
        return;
      }
      router.replace("/login");
    } catch {
      setErrorMessage("No pudimos cerrar sesión.");
    } finally {
      setIsSigningOut(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [appsResult, barbersResult] = await Promise.all([
          listAppointmentsByBarbershop(barbershop.slug),
          listBarbersByBarbershop(barbershop.slug),
        ]);
        if (!isMounted) return;
        if (appsResult.error) {
          setErrorMessage("No pudimos cargar las reservas.");
          setAppointments([]);
          return;
        }
        setAppointments(appsResult.data ?? []);
        setBarbers(barbersResult.data ?? []);
      } catch {
        if (isMounted) {
          setErrorMessage("No pudimos cargar las reservas.");
          setAppointments([]);
          setBarbers([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [barbershop.slug]);

  const activeFilterLabel =
    FILTER_OPTIONS.find((o) => o.value === activeFilter)?.label.toLowerCase() ??
    "este filtro";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:gap-12">
      {/* Columna principal */}
      <section className="min-w-0">
        <header className="mb-8 animate-fade-up">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
            Agenda admin
          </p>
          <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
            {barbershop.name}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-[color:var(--text-secondary)] sm:text-base">
            Gestioná las reservas del día. Confirmar y enviar WhatsApp son
            acciones separadas.
          </p>
        </header>

        {isLoading ? (
          <div className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] p-6 text-sm text-[color:var(--text-secondary)]">
            Cargando reservas…
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <div
            role="alert"
            className="mb-6 border-l-2 border-[color:var(--danger)] pl-4 text-sm font-semibold text-[color:var(--danger)]"
          >
            {errorMessage}
          </div>
        ) : null}

        {!isLoading && !errorMessage ? (
          <>
            {/* Calendario */}
            <div className="mb-8">
              <AgendaCalendar
                focusDate={focusDate}
                onFocusDateChange={(date) => {
                  setFocusDate(date);
                  setActiveFilter("day");
                }}
                countsByDay={countsByDay}
              />
            </div>

            {/* Filtros */}
            <div className="mb-6 space-y-3">
              {barberFilterOptions.length > 1 ? (
                <div className="grid gap-2 sm:max-w-xs">
                  <label
                    htmlFor="barber-filter"
                    className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
                  >
                    Barbero
                  </label>
                  <Select
                    id="barber-filter"
                    value={selectedBarberFilter}
                    onChange={(e) => setSelectedBarberFilter(e.target.value)}
                  >
                    <option value="all">Todos los barberos</option>
                    {barberFilterOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}

              <div className="flex gap-2 overflow-x-auto pb-1">
                {FILTER_OPTIONS.map((opt) => {
                  const isActive = activeFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setActiveFilter(opt.value)}
                      className={cn(
                        "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-[var(--radius-sm)] border px-3 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-[var(--duration-fast)]",
                        isActive
                          ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)] text-black"
                          : "border-[color:var(--border-default)] text-[color:var(--text-secondary)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]",
                      )}
                    >
                      {opt.label}
                      <span
                        className={cn(
                          "rounded-[var(--radius-xs)] px-1 font-mono text-[10px] tabular-nums",
                          isActive
                            ? "bg-black/10 text-black"
                            : "text-[color:var(--text-subtle)]",
                        )}
                      >
                        {filterCounts[opt.value]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista de turnos */}
            {appointments.length === 0 ? (
              <EmptyState
                title="Sin reservas todavía"
                description="Cuando alguien reserve por la página pública, aparecerá acá."
              />
            ) : filteredAppointments.length === 0 ? (
              <EmptyState
                title="Nada en este filtro"
                description={`No hay reservas para ${activeFilterLabel}.`}
              />
            ) : (
              <ul className="grid gap-3">
                {filteredAppointments.flatMap((appointment, index, arr) => {
                  const nodes: React.ReactNode[] = [
                    <AppointmentCard
                      key={
                        appointment.id ??
                        `${appointment.customer_phone}-${appointment.appointment_date}-${appointment.appointment_time}`
                      }
                      appointment={appointment}
                      onConfirm={handleConfirmAppointment}
                      onWhatsApp={handleSendWhatsApp}
                      onCancel={handleCancelAppointment}
                      onRestore={handleRestoreAppointment}
                      onDelete={handleDeleteAppointment}
                      confirmingId={confirmingAppointmentId}
                      cancellingId={cancellingAppointmentId}
                      restoringId={restoringAppointmentId}
                      deletingId={deletingAppointmentId}
                    />,
                  ];

                  // Gap marker entre turnos consecutivos activos del mismo día.
                  // Solo tiene sentido cuando el filtro es "Día" (ver un solo día)
                  // y ambos turnos están activos (pending/confirmed).
                  if (activeFilter === "day" && index < arr.length - 1) {
                    const next = arr[index + 1];
                    const currentActive =
                      appointment.status === "pending" ||
                      appointment.status === "confirmed";
                    const nextActive =
                      next.status === "pending" || next.status === "confirmed";

                    if (currentActive && nextActive) {
                      const currentEnd =
                        timeValueToMinutes(appointment.appointment_time) +
                        (appointment.service_duration_minutes ?? 0);
                      const nextStart = timeValueToMinutes(next.appointment_time);
                      const gap = nextStart - currentEnd;

                      if (gap > 0) {
                        nodes.push(
                          <GapMarker
                            key={`gap-${appointment.id ?? index}`}
                            startMinutes={currentEnd}
                            endMinutes={nextStart}
                            minutes={gap}
                          />,
                        );
                      }
                    }
                  }

                  return nodes;
                })}
              </ul>
            )}
          </>
        ) : null}
      </section>

      {/* Aside derecho — resumen y acciones */}
      <aside className="lg:sticky lg:top-12">
        <div
          className="animate-fade-up border-t border-[color:var(--border-subtle)] pt-8 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0 lg:pl-8"
          style={{ animationDelay: "100ms" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)]">
            Resumen del día
          </p>
          <p className="mt-3 text-sm text-[color:var(--text-secondary)]">
            {formatDayHeading(focusDate)}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatCell label="Turnos" value={dayStats.total} highlight />
            <StatCell label="Pendientes" value={dayStats.pending} />
            <StatCell label="Confirmados" value={dayStats.confirmed} />
            <StatCell label="Cancelados" value={dayStats.cancelled} />
          </div>

          {/* Próximo turno */}
          {upcomingAppointment ? (
            <div className="mt-6 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
                Próximo turno
              </p>
              <p className="mt-2 font-mono text-3xl font-black tabular-nums leading-none text-[color:var(--brand-gold)]">
                {normalizeTimeShort(upcomingAppointment.appointment_time)}
              </p>
              <p className="mt-3 text-sm font-bold text-white">
                {upcomingAppointment.customer_name}
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
                {upcomingAppointment.service_name}
              </p>
              <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                {upcomingAppointment.barber_name}
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-[var(--radius-sm)] border border-dashed border-[color:var(--border-subtle)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                Próximo turno
              </p>
              <p className="mt-2 text-sm text-[color:var(--text-subtle)]">
                Sin próximos turnos para esta fecha.
              </p>
            </div>
          )}

          {/* Acciones */}
          <div className="mt-8 grid gap-2">
            <Button
              as="link"
              href={`/${barbershop.slug}/admin/barbers`}
              variant="secondary"
              size="md"
              fullWidth
              iconLeft={<Users className="size-3.5" />}
            >
              Gestionar barberos
            </Button>
            <Button
              as="link"
              href={`/${barbershop.slug}`}
              variant="ghost"
              size="md"
              fullWidth
              iconLeft={<ExternalLink className="size-3.5" />}
            >
              Página pública
            </Button>
            <Button
              as="link"
              href={`/${barbershop.slug}/reservar`}
              variant="ghost"
              size="md"
              fullWidth
              iconLeft={<Plus className="size-3.5" />}
            >
              Nuevo turno (público)
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              fullWidth
              loading={isSigningOut}
              onClick={handleSignOut}
              iconLeft={<LogOut className="size-3.5" />}
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-dashed border-[color:var(--border-subtle)] p-10 text-center">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-2 text-xs text-[color:var(--text-muted)] sm:text-sm">
        {description}
      </p>
    </div>
  );
}

function formatMinutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatGapDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours} h`;
  return `${hours}h ${rest}min`;
}

function GapMarker({
  startMinutes,
  endMinutes,
  minutes,
}: {
  startMinutes: number;
  endMinutes: number;
  minutes: number;
}) {
  return (
    <li
      aria-label={`Hueco libre de ${minutes} minutos`}
      className="flex items-center gap-3 px-2 py-1"
    >
      <span className="h-px flex-1 bg-[color:var(--border-subtle)]" aria-hidden="true" />
      <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
        <span className="font-mono tabular-nums">
          {formatMinutesToTime(startMinutes)}
          <span className="mx-1 text-[color:var(--text-subtle)]">→</span>
          {formatMinutesToTime(endMinutes)}
        </span>
        <span className="text-[color:var(--brand-gold)]">
          {formatGapDuration(minutes)} libres
        </span>
      </span>
      <span className="h-px flex-1 bg-[color:var(--border-subtle)]" aria-hidden="true" />
    </li>
  );
}

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-sm)] border p-3 sm:p-4",
        highlight
          ? "border-[color:var(--border-default)] bg-[color:var(--surface-1)]"
          : "border-[color:var(--border-subtle)]",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-2xl font-black tabular-nums leading-none sm:text-3xl",
          highlight ? "text-[color:var(--brand-gold)]" : "text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}
