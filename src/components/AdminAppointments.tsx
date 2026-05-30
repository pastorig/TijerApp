"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import {
  cancelAppointment,
  confirmAppointment,
  deleteAppointment,
  listAppointmentsByBarbershop,
  restoreDeletedAppointment,
  updateAppointmentActualDuration,
} from "@/lib/appointments";
import { getCurrentSession } from "@/lib/auth";
import { listActiveServicesByBarbershop } from "@/lib/barber-services";
import { listBarbersByBarbershop } from "@/lib/barbers";
import {
  listClientsByBarbershop,
  normalizePhone,
} from "@/lib/barbershop-clients";
import { cn } from "@/lib/cn";
import {
  formatDateForDisplay,
  normalizeDateValue,
  timeValueToMinutes,
} from "@/lib/format";
import {
  getDayOfWeekFromDate,
  mergeWeeklySchedulesWithDefaults,
} from "@/lib/availability";
import {
  listDayOverridesByBarber,
  listWeeklySchedulesByBarber,
  upsertDayOverrideForBarber,
} from "@/lib/barber-availability";
import type {
  AppointmentRow,
  BarberDayOverrideRow,
  BarberRow,
  BarberServiceRow,
  BarbershopClientRow,
  BarberWeeklyScheduleRow,
} from "@/lib/supabase";
import {
  createWhatsAppConfirmationLink,
  createWhatsAppDelayLink,
  createWhatsAppReviewRequestLink,
} from "@/lib/whatsapp";
import { Select } from "@/components/ui";
import { AgendaCalendar } from "./admin/AgendaCalendar";
import { AppointmentRow as AppointmentCard } from "./admin/AppointmentRow";
import { DuplicateAppointmentModal } from "./admin/DuplicateAppointmentModal";
import { QuickBlockTimeButton } from "./admin/QuickBlockTimeButton";
import { getTodayYmd, normalizeTimeShort } from "./admin/date-utils";

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
  { value: "day", label: "Dia" },
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmados" },
  { value: "cancelled", label: "Cancelados" },
  { value: "deleted", label: "Eliminados" },
];

export function AdminAppointments({ barbershop }: AdminAppointmentsProps) {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [services, setServices] = useState<BarberServiceRow[]>([]);
  const [clients, setClients] = useState<BarbershopClientRow[]>([]);
  const [weeklySchedulesByBarber, setWeeklySchedulesByBarber] = useState<
    Record<string, BarberWeeklyScheduleRow[]>
  >({});
  const [dayOverridesByBarber, setDayOverridesByBarber] = useState<
    Record<string, BarberDayOverrideRow | null>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [focusDate, setFocusDate] = useState(getTodayYmd());
  const [activeFilter, setActiveFilter] = useState<AppointmentFilter>("day");
  const [selectedBarberFilter, setSelectedBarberFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmingAppointmentId, setConfirmingAppointmentId] = useState<
    string | null
  >(null);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<
    string | null
  >(null);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<
    string | null
  >(null);
  const [hardDeletingAppointmentId, setHardDeletingAppointmentId] = useState<
    string | null
  >(null);
  const [isBulkHardDeleting, setIsBulkHardDeleting] = useState(false);
  const [duplicatingAppointment, setDuplicatingAppointment] =
    useState<AppointmentRow | null>(null);
  const [restoringAppointmentId, setRestoringAppointmentId] = useState<
    string | null
  >(null);
  const [updatingDurationAppointmentId, setUpdatingDurationAppointmentId] =
    useState<string | null>(null);
  const [updatingDayOverrideBarberId, setUpdatingDayOverrideBarberId] =
    useState<string | null>(null);
  const [isOptimizationExpanded, setIsOptimizationExpanded] = useState(true);
  const [acceptedOvertimeByAppointmentId, setAcceptedOvertimeByAppointmentId] =
    useState<Record<string, number>>({});

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

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  const filteredAppointments = useMemo(() => {
    const base = appointments.filter((a) => {
      if (!matchesBarber(a)) return false;

      // BÃƒÆ’Ã‚Âºsqueda: si hay query, ignoramos filtro de dÃƒÆ’Ã‚Â­a/estado pero
      // seguimos respetando barbero y excluimos eliminados.
      if (isSearching) {
        if (a.status === "deleted") return false;
        const name = a.customer_name?.toLowerCase() ?? "";
        const phone = a.customer_phone?.toLowerCase() ?? "";
        return (
          name.includes(normalizedQuery) || phone.includes(normalizedQuery)
        );
      }

      if (activeFilter === "deleted") return a.status === "deleted";
      if (a.status === "deleted") return false;
      if (activeFilter === "all") return true;
      if (activeFilter === "day")
        return normalizeDateValue(a.appointment_date) === focusDate;
      return a.status === activeFilter;
    });

    return base.sort((a, b) => {
      const dateCompare = normalizeDateValue(a.appointment_date).localeCompare(
        normalizeDateValue(b.appointment_date),
      );
      if (dateCompare !== 0) return dateCompare;
      return (
        timeValueToMinutes(a.appointment_time) -
        timeValueToMinutes(b.appointment_time)
      );
    });
  }, [
    appointments,
    activeFilter,
    focusDate,
    matchesBarber,
    isSearching,
    normalizedQuery,
  ]);

  const scheduleProjectionByAppointmentId = useMemo(() => {
    const projections = new Map<
      string,
      {
        effectiveDurationMinutes: number;
        estimatedStartMinutes: number;
        estimatedEndMinutes: number;
        delayMinutes: number;
      }
    >();

    const activeAppointments = appointments
      .filter(
        (appointment) =>
          appointment.status === "pending" || appointment.status === "confirmed",
      )
      .sort((firstAppointment, secondAppointment) => {
        const firstDate = normalizeDateValue(firstAppointment.appointment_date);
        const secondDate = normalizeDateValue(secondAppointment.appointment_date);
        const byBarber = firstAppointment.barber_id.localeCompare(
          secondAppointment.barber_id,
        );

        if (firstDate !== secondDate) {
          return firstDate.localeCompare(secondDate);
        }

        if (byBarber !== 0) {
          return byBarber;
        }

        return (
          timeValueToMinutes(firstAppointment.appointment_time) -
          timeValueToMinutes(secondAppointment.appointment_time)
        );
      });

    const lastEndByBarberAndDate = new Map<string, number>();

    activeAppointments.forEach((appointment) => {
      if (!appointment.id) {
        return;
      }

      const date = normalizeDateValue(appointment.appointment_date);
      const chainKey = `${appointment.barber_id}:${date}`;
      const reservedStartMinutes = timeValueToMinutes(appointment.appointment_time);
      const previousEstimatedEndMinutes =
        lastEndByBarberAndDate.get(chainKey) ?? reservedStartMinutes;
      const effectiveDurationMinutes =
        appointment.actual_duration_minutes ?? appointment.service_duration_minutes;
      const estimatedStartMinutes = Math.max(
        reservedStartMinutes,
        previousEstimatedEndMinutes,
      );
      const estimatedEndMinutes =
        estimatedStartMinutes + effectiveDurationMinutes;
      const delayMinutes = Math.max(
        0,
        estimatedStartMinutes - reservedStartMinutes,
      );

      projections.set(appointment.id, {
        effectiveDurationMinutes,
        estimatedStartMinutes,
        estimatedEndMinutes,
        delayMinutes,
      });

      lastEndByBarberAndDate.set(chainKey, estimatedEndMinutes);
    });

    return projections;
  }, [appointments]);

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

  // Mapa barberId ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ duraciÃƒÆ’Ã‚Â³n mÃƒÆ’Ã‚Â­nima de sus servicios activos.
  // Usado para calcular cuÃƒÆ’Ã‚Â¡ntos cortes posibles caben en un gap.
  // Mapa phone_normalized → tags del cliente. Para mostrar badges al
  // lado del nombre en cada AppointmentRow del turnero.
  const tagsByPhone = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const client of clients) {
      if (client.tags && client.tags.length > 0) {
        map.set(client.phone_normalized, client.tags);
      }
    }
    return map;
  }, [clients]);

  function getTagsForAppointment(appointment: AppointmentRow): string[] {
    const phoneNorm = normalizePhone(appointment.customer_phone);
    if (!phoneNorm) return [];
    return tagsByPhone.get(phoneNorm) ?? [];
  }

  const minDurationByBarber = useMemo(() => {
    const map = new Map<string, number>();
    services.forEach((s) => {
      const current = map.get(s.barber_id);
      const minutes = s.duration_minutes ?? 30;
      if (current === undefined || minutes < current) {
        map.set(s.barber_id, minutes);
      }
    });
    return map;
  }, [services]);

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

  const dayOptimizationAlerts = useMemo(() => {
    const activeFocusDateAppointments = focusDateAppointments
      .filter(
        (appointment) =>
          appointment.status === "pending" || appointment.status === "confirmed",
      )
      .sort(
        (firstAppointment, secondAppointment) =>
          timeValueToMinutes(firstAppointment.appointment_time) -
          timeValueToMinutes(secondAppointment.appointment_time),
      );

    if (activeFocusDateAppointments.length === 0) {
      return [];
    }

    const appointmentsByBarber = new Map<string, AppointmentRow[]>();

    activeFocusDateAppointments.forEach((appointment) => {
      const currentAppointments =
        appointmentsByBarber.get(appointment.barber_id) ?? [];
      currentAppointments.push(appointment);
      appointmentsByBarber.set(appointment.barber_id, currentAppointments);
    });

    return Array.from(appointmentsByBarber.entries())
      .map(([barberId, barberAppointments]) => {
        const barber =
          barbers.find((currentBarber) => currentBarber.id === barberId) ?? null;
        const barberName =
          barber?.display_name?.trim() || barber?.name || barberAppointments[0]?.barber_name;
        const baseDurationMinutes = minDurationByBarber.get(barberId) ?? 30;
        const daySchedule = getBarberDaySchedule({
          barberId,
          date: focusDate,
          weeklySchedulesByBarber,
          dayOverridesByBarber,
          workingHours: barbershop.workingHours,
          focusDate,
        });

        if (!daySchedule?.isWorking) {
          return null;
        }

        const hasManualDayOverride = Boolean(dayOverridesByBarber[barberId]);

        const dayStartMinutes = timeValueToMinutes(daySchedule.startTime);
        const dayEndMinutes = timeValueToMinutes(daySchedule.endTime);
        const projectedAppointments = barberAppointments
          .map((appointment) => {
            if (!appointment.id) {
              return null;
            }

            const projection =
              scheduleProjectionByAppointmentId.get(appointment.id) ?? null;

            if (!projection) {
              return null;
            }

            return {
              appointment,
              projection,
            };
          })
          .filter(
            (
              projectedAppointment,
            ): projectedAppointment is NonNullable<typeof projectedAppointment> =>
              projectedAppointment !== null,
          );

        if (projectedAppointments.length === 0) {
          return null;
        }

        const latestEstimatedEndMinutes = projectedAppointments.reduce(
          (latestMinutes, projectedAppointment) =>
            Math.max(
              latestMinutes,
              projectedAppointment.projection.estimatedEndMinutes,
            ),
          dayStartMinutes,
        );

        const overflowMinutes = Math.max(0, latestEstimatedEndMinutes - dayEndMinutes);
        const lastPotentialSlotStartMinutes = Math.max(
          dayStartMinutes,
          dayEndMinutes - baseDurationMinutes,
        );
        const losesLastSlot =
          latestEstimatedEndMinutes > lastPotentialSlotStartMinutes &&
          latestEstimatedEndMinutes < dayEndMinutes;
        const lostCuts = losesLastSlot ? 1 : 0;
        const extensionMinutes =
          overflowMinutes > 0
            ? overflowMinutes
            : !hasManualDayOverride && losesLastSlot
              ? Math.max(
                  0,
                  latestEstimatedEndMinutes +
                    baseDurationMinutes -
                    dayEndMinutes,
                )
              : 0;

        if (overflowMinutes === 0 && (hasManualDayOverride || lostCuts === 0)) {
          return null;
        }

        return {
          barberId,
          barberName,
          dayLabel: formatDayCompact(focusDate),
          closingTime: normalizeTimeShort(daySchedule.endTime),
          latestEstimatedEndTime: formatMinutesToTime(latestEstimatedEndMinutes),
          lostCuts,
          overflowMinutes,
          lastPotentialSlotTime: formatMinutesToTime(lastPotentialSlotStartMinutes),
          extensionMinutes,
          currentClosingTime: normalizeTimeShort(daySchedule.endTime),
          nextClosingTime: formatMinutesToTime(dayEndMinutes + extensionMinutes),
        };
      })
      .filter((alert): alert is NonNullable<typeof alert> => alert !== null);
  }, [
    barbers,
    barbershop.workingHours,
    focusDate,
    focusDateAppointments,
    minDurationByBarber,
    scheduleProjectionByAppointmentId,
    dayOverridesByBarber,
    weeklySchedulesByBarber,
  ]);

  const resolvedDayOverrideSummaries = useMemo(() => {
    return Object.entries(dayOverridesByBarber)
      .filter(([, override]) => override !== null)
      .filter(([barberId]) => selectedBarberFilter === "all" || barberId === selectedBarberFilter)
      .map(([barberId, override]) => {
        if (!override) {
          return null;
        }

        const barber =
          barbers.find((currentBarber) => currentBarber.id === barberId) ?? null;
        const barberName = barber?.display_name?.trim() || barber?.name || "Barbero";
        const weeklySchedules = weeklySchedulesByBarber[barberId] ?? [];
        const mergedSchedules = mergeWeeklySchedulesWithDefaults(
          weeklySchedules,
          barbershop.workingHours,
        );
        const weeklySchedule = mergedSchedules.find(
          (schedule) => schedule.dayOfWeek === getDayOfWeekFromDate(focusDate),
        );

        if (!weeklySchedule) {
          return null;
        }

        return {
          barberId,
          barberName,
          dayLabel: formatDayCompact(focusDate),
          baseClosingTime: weeklySchedule.endTime,
          overrideClosingTime: normalizeTimeShort(override.end_time),
        };
      })
      .filter((summary): summary is NonNullable<typeof summary> => summary !== null);
  }, [
    barbers,
    barbershop.workingHours,
    dayOverridesByBarber,
    focusDate,
    selectedBarberFilter,
    weeklySchedulesByBarber,
  ]);

  const hasOptimizationSection =
    dayOptimizationAlerts.length > 0 || resolvedDayOverrideSummaries.length > 0;

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
      // El cliente recibe el mensaje con un link `/r/[token]` para confirmar
      // o cancelar desde la web sin loguearse.
      confirmationToken: appointment.confirmation_token,
    });
    window.open(link, "_blank", "noopener,noreferrer");
  }

  async function handleCancelAppointment(appointment: AppointmentRow) {
    if (!appointment.id) {
      setErrorMessage("No pudimos identificar la reserva.");
      return;
    }
    const ok = window.confirm(
      `Cancelar el turno de ${appointment.customer_name} del ${formatDateForDisplay(
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
      `Eliminar visualmente el turno cancelado de ${appointment.customer_name}?`,
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

  async function handleHardDeleteAppointment(appointment: AppointmentRow) {
    if (!appointment.id) {
      setErrorMessage("No pudimos identificar la reserva.");
      return;
    }
    const ok = window.confirm(
      `Borrar definitivamente el turno de ${appointment.customer_name}? Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    setErrorMessage("");
    setHardDeletingAppointmentId(appointment.id);
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setErrorMessage("Tu sesión expiró, volvé a iniciar sesión.");
        return;
      }
      const response = await fetch("/api/admin/appointments", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          barbershopSlug: barbershop.slug,
        }),
      });
      if (!response.ok) {
        setErrorMessage("No pudimos borrar definitivamente la reserva.");
        return;
      }
      setAppointments((current) =>
        current.filter((a) => a.id !== appointment.id),
      );
    } catch {
      setErrorMessage("No pudimos borrar definitivamente la reserva.");
    } finally {
      setHardDeletingAppointmentId(null);
    }
  }

  async function handleSaveInternalNotes(
    appointment: AppointmentRow,
    nextNotes: string,
  ) {
    if (!appointment.id) {
      throw new Error("Sin id de appointment.");
    }
    const trimmed = nextNotes.trim();
    const { data: sessionData } = await getCurrentSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      throw new Error("Sesión expirada.");
    }
    const response = await fetch("/api/admin/appointments", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        appointmentId: appointment.id,
        barbershopSlug: barbershop.slug,
        internalNotes: trimmed,
      }),
    });
    if (!response.ok) {
      throw new Error("PATCH appointments failed");
    }
    // Optimistic update local
    setAppointments((current) =>
      current.map((a) =>
        a.id === appointment.id
          ? { ...a, internal_notes: trimmed || null }
          : a,
      ),
    );
  }

  async function handleHardDeleteAllDeleted() {
    const deletedAppointments = appointments.filter(
      (a) => a.status === "deleted",
    );
    if (deletedAppointments.length === 0) return;
    const ok = window.confirm(
      `Borrar definitivamente los ${deletedAppointments.length} turnos eliminados? Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    setErrorMessage("");
    setIsBulkHardDeleting(true);
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setErrorMessage("Tu sesión expiró, volvé a iniciar sesión.");
        return;
      }
      const response = await fetch("/api/admin/appointments", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          barbershopSlug: barbershop.slug,
          deleteAllDeleted: true,
        }),
      });
      if (!response.ok) {
        setErrorMessage("No pudimos borrar los turnos definitivamente.");
        return;
      }
      setAppointments((current) => current.filter((a) => a.status !== "deleted"));
    } catch {
      setErrorMessage("No pudimos borrar los turnos definitivamente.");
    } finally {
      setIsBulkHardDeleting(false);
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

  async function handleAdjustActualDuration(
    appointment: AppointmentRow,
    nextDurationMinutes: number | null,
  ) {
    if (!appointment.id) {
      setErrorMessage("No pudimos identificar la reserva.");
      return;
    }

    setErrorMessage("");
    setUpdatingDurationAppointmentId(appointment.id);

    try {
      const { data, error } = await updateAppointmentActualDuration(
        appointment.id,
        nextDurationMinutes,
      );

      if (error || !data) {
        setErrorMessage("No pudimos actualizar la duracion real.");
        return;
      }

      setAppointments((currentAppointments) =>
        currentAppointments.map((currentAppointment) =>
          currentAppointment.id === appointment.id ? data : currentAppointment,
        ),
      );
    } catch {
      setErrorMessage("No pudimos actualizar la duracion real.");
    } finally {
      setUpdatingDurationAppointmentId(null);
    }
  }

  async function handleExtendClosingForDay(
    barberId: string,
    extensionMinutes: number,
  ) {
    if (extensionMinutes <= 0) {
      return;
    }

    const weeklySchedules = weeklySchedulesByBarber[barberId] ?? [];
    const dayOverride = dayOverridesByBarber[barberId] ?? null;
    const mergedSchedules = mergeWeeklySchedulesWithDefaults(
      weeklySchedules,
      barbershop.workingHours,
    );
    const weeklySchedule = mergedSchedules.find(
      (schedule) => schedule.dayOfWeek === getDayOfWeekFromDate(focusDate),
    );

    const baseSchedule = dayOverride
      ? {
          startTime: normalizeTimeShort(dayOverride.start_time),
          endTime: normalizeTimeShort(dayOverride.end_time),
          isWorking: dayOverride.is_working,
        }
      : weeklySchedule
        ? {
            startTime: weeklySchedule.startTime,
            endTime: weeklySchedule.endTime,
            isWorking: weeklySchedule.isWorking,
          }
        : null;

    if (!baseSchedule?.isWorking) {
      setErrorMessage("No pudimos extender el cierre para ese dia.");
      return;
    }

    setErrorMessage("");
    setUpdatingDayOverrideBarberId(barberId);

    try {
      const nextEndMinutes =
        timeValueToMinutes(baseSchedule.endTime) + extensionMinutes;
      const { data, error } = await upsertDayOverrideForBarber({
        barbershopSlug: barbershop.slug,
        barberId,
        overrideDate: focusDate,
        startTime: baseSchedule.startTime,
        endTime: formatMinutesToTime(nextEndMinutes),
        isWorking: true,
      });

      if (error || !data) {
        setErrorMessage("No pudimos extender el cierre para ese dia.");
        return;
      }

      setDayOverridesByBarber((currentOverrides) => ({
        ...currentOverrides,
        [barberId]: data,
      }));
      setIsOptimizationExpanded(false);
    } catch {
      setErrorMessage("No pudimos extender el cierre para ese dia.");
    } finally {
      setUpdatingDayOverrideBarberId(null);
    }
  }

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [appsResult, barbersResult, servicesResult, clientsResult] =
          await Promise.all([
            listAppointmentsByBarbershop(barbershop.slug),
            listBarbersByBarbershop(barbershop.slug),
            listActiveServicesByBarbershop(barbershop.slug),
            listClientsByBarbershop(barbershop.slug),
          ]);
        if (!isMounted) return;
        if (appsResult.error) {
          setErrorMessage("No pudimos cargar las reservas.");
          setAppointments([]);
          return;
        }
        const currentBarbers = barbersResult.data ?? [];
        const weeklyScheduleEntries = await Promise.all(
          currentBarbers.map(async (barber) => {
            const { data } = await listWeeklySchedulesByBarber({
              barbershopSlug: barbershop.slug,
              barberId: barber.id,
            });

            return [barber.id, data ?? []] as const;
          }),
        );
        if (!isMounted) return;
        setAppointments(appsResult.data ?? []);
        setBarbers(currentBarbers);
        setServices(servicesResult.data ?? []);
        setClients(clientsResult.data ?? []);
        setWeeklySchedulesByBarber(Object.fromEntries(weeklyScheduleEntries));
      } catch {
        if (isMounted) {
          setErrorMessage("No pudimos cargar las reservas.");
          setAppointments([]);
          setBarbers([]);
          setServices([]);
          setClients([]);
          setWeeklySchedulesByBarber({});
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

  useEffect(() => {
    if (barbers.length === 0) {
      return;
    }

    let isMounted = true;

    async function loadDayOverrides() {
      try {
        const dayOverrideEntries = await Promise.all(
          barbers.map(async (barber) => {
            const { data } = await listDayOverridesByBarber({
              barbershopSlug: barbershop.slug,
              barberId: barber.id,
              overrideDate: focusDate,
            });

            return [barber.id, data?.[0] ?? null] as const;
          }),
        );

        if (!isMounted) {
          return;
        }

        setDayOverridesByBarber(Object.fromEntries(dayOverrideEntries));
      } catch {
        if (isMounted) {
          setDayOverridesByBarber({});
        }
      }
    }

    loadDayOverrides();

    return () => {
      isMounted = false;
    };
  }, [barbers, barbershop.slug, focusDate]);

  const activeFilterLabel =
    FILTER_OPTIONS.find((o) => o.value === activeFilter)?.label.toLowerCase() ??
    "este filtro";

  return (
    <div className="min-w-0">
      <section className="min-w-0">
        <header className="mb-8 animate-fade-up">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
            Turnero
          </p>
          <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
            Agenda de {barbershop.name}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-[color:var(--text-secondary)] sm:text-base">
            Gestiona las reservas del dia. Confirmar y enviar WhatsApp son
            acciones separadas.
          </p>
        </header>

        {isLoading ? (
          <div className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] p-6 text-sm text-[color:var(--text-secondary)]">
            Cargando reservas...
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

            {hasOptimizationSection ? (
              <section className="mb-6 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)]">
                <button
                  type="button"
                  onClick={() =>
                    setIsOptimizationExpanded((currentValue) => !currentValue)
                  }
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
                      Aprovechamiento del horario
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                      {dayOptimizationAlerts.length > 0
                        ? `${dayOptimizationAlerts.length} ajuste${dayOptimizationAlerts.length === 1 ? "" : "s"} sugerido${dayOptimizationAlerts.length === 1 ? "" : "s"} para ${formatDayCompact(focusDate)}`
                        : resolvedDayOverrideSummaries
                            .map(
                              (summary) =>
                                `${summary.barberName}: cierre ${summary.overrideClosingTime}`,
                            )
                            .join(" - ")}
                    </p>
                  </div>
                  {isOptimizationExpanded ? (
                    <ChevronDown
                      className="size-4 text-[color:var(--text-subtle)]"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronRight
                      className="size-4 text-[color:var(--text-subtle)]"
                      aria-hidden="true"
                    />
                  )}
                </button>

                {isOptimizationExpanded ? (
                  <div className="grid gap-3 border-t border-[color:var(--border-subtle)] px-4 py-4">
                    {dayOptimizationAlerts.map((alert) => (
                      <DayOptimizationAlertCard
                        key={`${alert.barberId}-${focusDate}`}
                        barberName={alert.barberName}
                        dayLabel={alert.dayLabel}
                        closingTime={alert.closingTime}
                        latestEstimatedEndTime={alert.latestEstimatedEndTime}
                        lostCuts={alert.lostCuts}
                        overflowMinutes={alert.overflowMinutes}
                        lastPotentialSlotTime={alert.lastPotentialSlotTime}
                        extensionMinutes={alert.extensionMinutes}
                        currentClosingTime={alert.currentClosingTime}
                        nextClosingTime={alert.nextClosingTime}
                        isRecovering={
                          updatingDayOverrideBarberId === alert.barberId
                        }
                        onExtendClosing={() =>
                          handleExtendClosingForDay(
                            alert.barberId,
                            alert.extensionMinutes,
                          )
                        }
                      />
                    ))}

                    {dayOptimizationAlerts.length === 0
                      ? resolvedDayOverrideSummaries.map((summary) => (
                          <ResolvedDayOverrideSummaryCard
                            key={`${summary.barberId}-${focusDate}`}
                            barberName={summary.barberName}
                            dayLabel={summary.dayLabel}
                            baseClosingTime={summary.baseClosingTime}
                            overrideClosingTime={summary.overrideClosingTime}
                          />
                        ))
                      : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* Buscador + filtro barbero + bloqueo rápido */}
            <div className="mb-4 space-y-3">
              <div className="flex items-center justify-end">
                <QuickBlockTimeButton
                  barbershopSlug={barbershop.slug}
                  barbers={barberFilterOptions}
                  focusDate={focusDate}
                  preselectedBarberId={
                    selectedBarberFilter !== "all"
                      ? selectedBarberFilter
                      : undefined
                  }
                />
              </div>
              <div
                className={cn(
                  "grid gap-2",
                  barberFilterOptions.length > 1
                    ? "sm:grid-cols-[1fr_minmax(0,16rem)]"
                    : "",
                )}
              >
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--text-subtle)]"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar cliente por nombre o telefono..."
                    aria-label="Buscar cliente"
                    className="h-11 w-full appearance-none rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] pl-9 pr-9 text-sm text-white placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)] focus:outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Limpiar busqueda"
                      className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-xs)] text-[color:var(--text-subtle)] transition-colors duration-[var(--duration-fast)] hover:text-white"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </div>

                {barberFilterOptions.length > 1 ? (
                  <Select
                    id="barber-filter"
                    aria-label="Filtrar por barbero"
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
                ) : null}
              </div>

              {/* Chips de estado: ocultos durante busqueda */}
              {!isSearching ? (
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
              ) : (
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Resultados de busqueda - {filteredAppointments.length}
                </p>
              )}
            </div>

            {activeFilter === "deleted" && filteredAppointments.length > 0 ? (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleHardDeleteAllDeleted}
                  disabled={isBulkHardDeleting}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-[color:var(--danger)]/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--danger)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="size-3.5" aria-hidden="true" />
                  {isBulkHardDeleting
                    ? "Borrando..."
                    : `Borrar todos (${filteredAppointments.length})`}
                </button>
              </div>
            ) : null}

            {/* Lista de turnos */}
            {appointments.length === 0 ? (
              <EmptyState
                title="Sin reservas todavia"
                description="Cuando alguien reserve por la pagina publica, aparecera aca."
              />
            ) : filteredAppointments.length === 0 ? (
              <EmptyState
                title={isSearching ? "Sin resultados" : "Nada en este filtro"}
                description={
                  isSearching
                    ? `No encontramos turnos para "${searchQuery.trim()}".`
                    : `No hay reservas para ${activeFilterLabel}.`
                }
              />
            ) : (
              <ul className="grid gap-3">
                {filteredAppointments.flatMap((appointment, index, arr) => {
                  const appointmentDate = normalizeDateValue(
                    appointment.appointment_date,
                  );
                  const daySchedule = getBarberDaySchedule({
                    barberId: appointment.barber_id,
                    date: appointmentDate,
                    weeklySchedulesByBarber,
                    dayOverridesByBarber,
                    workingHours: barbershop.workingHours,
                    focusDate,
                  });
                  const scheduleProjection = appointment.id
                    ? scheduleProjectionByAppointmentId.get(appointment.id)
                    : undefined;
                  const dayClosingMinutes =
                    daySchedule?.isWorking
                      ? timeValueToMinutes(daySchedule.endTime)
                      : undefined;
                  const overtimeMinutes =
                    dayClosingMinutes !== undefined && scheduleProjection
                      ? Math.max(
                          0,
                          scheduleProjection.estimatedEndMinutes -
                            dayClosingMinutes,
                        )
                      : 0;
                  // Botón "Pedir reseña" sólo cuando el turno está
                  // confirmado/pendiente, la fecha ya pasó y tenemos el token.
                  const todayIso = new Date().toISOString().slice(0, 10);
                  const reviewWhatsAppHref =
                    appointment.confirmation_token &&
                    appointment.customer_phone &&
                    (appointment.status === "confirmed" ||
                      appointment.status === "pending") &&
                    appointmentDate <= todayIso
                      ? createWhatsAppReviewRequestLink({
                          barbershopName: barbershop.name,
                          clientName: appointment.customer_name,
                          clientPhone: appointment.customer_phone,
                          confirmationToken: appointment.confirmation_token,
                        })
                      : undefined;

                  // Si hay delay propagado y el turno todavía no ocurrió o
                  // es de hoy, ofrecemos botón para avisar al cliente.
                  const delayWhatsAppHref =
                    scheduleProjection &&
                    scheduleProjection.delayMinutes > 0 &&
                    appointment.customer_phone &&
                    (appointment.status === "confirmed" ||
                      appointment.status === "pending") &&
                    appointmentDate >= todayIso
                      ? createWhatsAppDelayLink({
                          barbershopName: barbershop.name,
                          clientName: appointment.customer_name,
                          clientPhone: appointment.customer_phone,
                          serviceName: appointment.service_name,
                          reservedTime: appointment.appointment_time.slice(0, 5),
                          estimatedTime: `${String(
                            Math.floor(
                              scheduleProjection.estimatedStartMinutes / 60,
                            ),
                          ).padStart(2, "0")}:${String(
                            scheduleProjection.estimatedStartMinutes % 60,
                          ).padStart(2, "0")}`,
                          delayMinutes: scheduleProjection.delayMinutes,
                        })
                      : undefined;
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
                      onHardDelete={handleHardDeleteAppointment}
                      onSaveInternalNotes={handleSaveInternalNotes}
                      onDuplicate={setDuplicatingAppointment}
                      confirmingId={confirmingAppointmentId}
                      cancellingId={cancellingAppointmentId}
                      restoringId={restoringAppointmentId}
                      deletingId={deletingAppointmentId}
                      hardDeletingId={hardDeletingAppointmentId}
                      updatingDurationId={updatingDurationAppointmentId}
                      onAdjustActualDuration={handleAdjustActualDuration}
                      scheduleProjection={scheduleProjection}
                      dayClosingMinutes={dayClosingMinutes}
                      overtimeAccepted={
                        Boolean(appointment.id) &&
                        acceptedOvertimeByAppointmentId[appointment.id ?? ""] ===
                          overtimeMinutes &&
                        overtimeMinutes > 0
                      }
                      onAcceptOvertime={
                        appointment.id && overtimeMinutes > 0
                          ? () =>
                              setAcceptedOvertimeByAppointmentId(
                                (currentAcceptedState) => ({
                                  ...currentAcceptedState,
                                  [appointment.id ?? ""]: overtimeMinutes,
                                }),
                              )
                          : undefined
                      }
                      showDate={isSearching || activeFilter === "all"}
                      clientTags={getTagsForAppointment(appointment)}
                      reviewWhatsAppHref={reviewWhatsAppHref}
                      delayWhatsAppHref={delayWhatsAppHref}
                    />,
                  ];

                  // Gap marker entre turnos consecutivos activos del mismo dÃƒÆ’Ã‚Â­a.
                  // Solo tiene sentido cuando el filtro es "DÃƒÆ’Ã‚Â­a" (ver un solo dÃƒÆ’Ã‚Â­a)
                  // y ambos turnos estÃƒÆ’Ã‚Â¡n activos (pending/confirmed).
                  // Durante bÃƒÆ’Ã‚Âºsqueda no aplicamos gap markers (los resultados
                  // pueden ser de distintos dÃƒÆ’Ã‚Â­as).
                  if (
                    !isSearching &&
                    activeFilter === "day" &&
                    index < arr.length - 1
                  ) {
                    const next = arr[index + 1];
                    const currentActive =
                      appointment.status === "pending" ||
                      appointment.status === "confirmed";
                    const nextActive =
                      next.status === "pending" || next.status === "confirmed";

                    if (currentActive && nextActive) {
                      const currentProjection = appointment.id
                        ? scheduleProjectionByAppointmentId.get(appointment.id)
                        : undefined;
                      const currentEnd =
                        currentProjection?.estimatedEndMinutes ??
                        (timeValueToMinutes(appointment.appointment_time) +
                          (appointment.actual_duration_minutes ??
                            appointment.service_duration_minutes ??
                            0));
                      const nextStart = timeValueToMinutes(next.appointment_time);
                      const gap = nextStart - currentEnd;

                      if (gap > 0) {
                        // Capacidad estimada segÃƒÆ’Ã‚Âºn servicios activos de cada
                        // barbero. Si los dos barberos del gap tienen MISMA
                        // duraciÃƒÆ’Ã‚Â³n mÃƒÆ’Ã‚Â­nima (o son el mismo), mostramos un solo
                        // nÃƒÆ’Ã‚Âºmero. Si difieren, desglosamos por barbero.
                        const prevMin = minDurationByBarber.get(
                          appointment.barber_id,
                        );
                        const nextMin = minDurationByBarber.get(next.barber_id);
                        const sameBarber =
                          appointment.barber_id === next.barber_id;

                        let possibleCuts = 0;
                        let perBarber:
                          | Array<{ name: string; cuts: number }>
                          | null = null;

                        if (sameBarber) {
                          if (prevMin && prevMin > 0) {
                            possibleCuts = Math.floor(gap / prevMin);
                          }
                        } else if (prevMin && nextMin && prevMin === nextMin) {
                          possibleCuts = Math.floor(gap / prevMin);
                        } else if (prevMin && nextMin) {
                          perBarber = [
                            {
                              name: appointment.barber_name,
                              cuts: Math.floor(gap / prevMin),
                            },
                            {
                              name: next.barber_name,
                              cuts: Math.floor(gap / nextMin),
                            },
                          ];
                        } else if (prevMin) {
                          possibleCuts = Math.floor(gap / prevMin);
                        } else if (nextMin) {
                          possibleCuts = Math.floor(gap / nextMin);
                        }

                        nodes.push(
                          <GapMarker
                            key={`gap-${appointment.id ?? index}`}
                            startMinutes={currentEnd}
                            endMinutes={nextStart}
                            minutes={gap}
                            possibleCuts={possibleCuts}
                            perBarber={perBarber}
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

      <DuplicateAppointmentModal
        isOpen={duplicatingAppointment !== null}
        appointment={duplicatingAppointment}
        onClose={() => setDuplicatingAppointment(null)}
        onCreated={() => {
          // Refresca lista para que aparezca el nuevo turno
          void (async () => {
            const { data } = await listAppointmentsByBarbershop(
              barbershop.slug,
            );
            setAppointments(data ?? []);
          })();
        }}
      />
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

function formatDayCompact(dateValue: string) {
  const date = new Date(`${normalizeDateValue(dateValue)}T12:00:00`);
  const label = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getBarberDaySchedule(params: {
  barberId: string;
  date: string;
  weeklySchedulesByBarber: Record<string, BarberWeeklyScheduleRow[]>;
  dayOverridesByBarber: Record<string, BarberDayOverrideRow | null>;
  workingHours: DemoBarbershop["workingHours"];
  focusDate: string;
}) {
  const {
    barberId,
    date,
    weeklySchedulesByBarber,
    dayOverridesByBarber,
    workingHours,
    focusDate,
  } = params;
  const weeklySchedules = weeklySchedulesByBarber[barberId] ?? [];
  const mergedSchedules = mergeWeeklySchedulesWithDefaults(
    weeklySchedules,
    workingHours,
  );
  const weeklySchedule = mergedSchedules.find(
    (schedule) => schedule.dayOfWeek === getDayOfWeekFromDate(date),
  );
  const dayOverride =
    normalizeDateValue(date) === focusDate
      ? dayOverridesByBarber[barberId] ?? null
      : null;

  if (dayOverride) {
    return {
      startTime: normalizeTimeShort(dayOverride.start_time),
      endTime: normalizeTimeShort(dayOverride.end_time),
      isWorking: dayOverride.is_working,
    };
  }

  if (!weeklySchedule) {
    return null;
  }

  return {
    startTime: weeklySchedule.startTime,
    endTime: weeklySchedule.endTime,
    isWorking: weeklySchedule.isWorking,
  };
}

function DayOptimizationAlertCard({
  barberName,
  dayLabel,
  closingTime,
  latestEstimatedEndTime,
  lostCuts,
  overflowMinutes,
  lastPotentialSlotTime,
  extensionMinutes,
  currentClosingTime,
  nextClosingTime,
  isRecovering,
  onExtendClosing,
}: {
  barberName: string;
  dayLabel: string;
  closingTime: string;
  latestEstimatedEndTime: string;
  lostCuts: number;
  overflowMinutes: number;
  lastPotentialSlotTime: string;
  extensionMinutes: number;
  currentClosingTime: string;
  nextClosingTime: string;
  isRecovering: boolean;
  onExtendClosing: () => void;
}) {
  const isOverflowing = overflowMinutes > 0;
  const canExtendClosing = extensionMinutes > 0;

  return (
    <article
      className={cn(
        "rounded-[var(--radius-sm)] border px-4 py-3",
        isOverflowing
          ? "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)]/30"
          : "border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold)]/8",
      )}
    >
      <p className="text-sm font-bold text-white">
        {barberName} - {dayLabel}
      </p>

      <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
        {isOverflowing
          ? `Si cerras a las ${closingTime}, el ultimo turno termina a las ${latestEstimatedEndTime} y te pasas ${overflowMinutes} min.`
          : `Si cerras a las ${closingTime}, desaprovechas ${lostCuts === 1 ? "un corte" : `${lostCuts} cortes`} ${lostCuts === 1 ? `a las ${lastPotentialSlotTime}` : ""}, porque el ultimo turno termina a las ${latestEstimatedEndTime}.`}
      </p>

      {canExtendClosing ? (
        <button
          type="button"
          onClick={onExtendClosing}
          disabled={isRecovering}
          className="mt-3 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/30 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold)]/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRecovering
            ? "Guardando..."
            : `Extender cierre a ${nextClosingTime}`}
        </button>
      ) : null}

      {canExtendClosing ? (
        <p className="mt-2 text-xs text-[color:var(--text-muted)]">
          Esto ajusta el cierre de {dayLabel} solamente, de {currentClosingTime} a{" "}
          {nextClosingTime}.
        </p>
      ) : null}
    </article>
  );
}

function ResolvedDayOverrideSummaryCard({
  barberName,
  dayLabel,
  baseClosingTime,
  overrideClosingTime,
}: {
  barberName: string;
  dayLabel: string;
  baseClosingTime: string;
  overrideClosingTime: string;
}) {
  return (
    <article className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]/60 px-4 py-3">
      <p className="text-sm font-bold text-white">
        {barberName} - {dayLabel}
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
        El cierre de este dia quedo extendido de {baseClosingTime} a{" "}
        {overrideClosingTime}.
      </p>
    </article>
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
  possibleCuts,
  perBarber,
}: {
  startMinutes: number;
  endMinutes: number;
  minutes: number;
  /** Cortes que entrarÃƒÆ’Ã‚Â­an en el hueco si solo importa la capacidad global. */
  possibleCuts: number;
  /** Si los barberos del gap tienen duraciones distintas, breakdown por barbero. */
  perBarber: Array<{ name: string; cuts: number }> | null;
}) {
  const ariaLabel = perBarber
    ? `Hueco libre de ${minutes} minutos. ${perBarber
        .map((b) => `${b.name}: ${b.cuts} cortes`)
        .join(", ")}`
    : possibleCuts > 0
      ? `Hueco libre de ${minutes} minutos, ${possibleCuts} cortes posibles`
      : `Hueco libre de ${minutes} minutos`;

  return (
    <li
      aria-label={ariaLabel}
      className="flex items-center gap-3 px-2 py-1"
    >
      <span className="h-px flex-1 bg-[color:var(--border-subtle)]" aria-hidden="true" />
      <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
        <span className="font-mono tabular-nums">
          {formatMinutesToTime(startMinutes)}
          <span className="mx-1 text-[color:var(--text-subtle)]">-&gt;</span>
          {formatMinutesToTime(endMinutes)}
        </span>
        {perBarber ? (
          <span className="text-[color:var(--brand-gold)]">
            {perBarber.map((b, idx) => (
              <span key={`${b.name}-${idx}`}>
                {idx > 0 ? (
                  <span className="mx-1 text-[color:var(--text-subtle)]">/</span>
                ) : null}
                {b.name}: {b.cuts}
              </span>
            ))}
            <span className="mx-1 text-[color:var(--text-subtle)]">-</span>
            {formatGapDuration(minutes)} libres
          </span>
        ) : possibleCuts > 0 ? (
          <span className="text-[color:var(--brand-gold)]">
            {possibleCuts} {possibleCuts === 1 ? "corte" : "cortes"} posibles
            <span className="mx-1 text-[color:var(--text-subtle)]">-</span>
            {formatGapDuration(minutes)} libres
          </span>
        ) : (
          <span className="text-[color:var(--brand-gold)]">
            {formatGapDuration(minutes)} libres
          </span>
        )}
      </span>
      <span className="h-px flex-1 bg-[color:var(--border-subtle)]" aria-hidden="true" />
    </li>
  );
}

