import type {
  BarberTimeBlockRow,
  BarberWeeklyScheduleRow,
} from "@/lib/supabase";
import { normalizeDateValue, normalizeTimeValue, timeValueToMinutes } from "@/lib/format";

export type AppointmentInterval = {
  startTime: string;
  durationMinutes: number;
};

export type AvailabilitySlot = {
  time: string;
  isAvailable: boolean;
  reason: "available" | "outside-hours" | "blocked" | "occupied" | "past";
};

export type WeeklyScheduleDraft = {
  dayOfWeek: number;
  label: string;
  startTime: string;
  endTime: string;
  isWorking: boolean;
};

export const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
] as const;

export function getDayOfWeekFromDate(date: string) {
  return new Date(`${normalizeDateValue(date)}T00:00:00`).getDay();
}

export function buildDefaultWeeklySchedules(workingHours: {
  start: string;
  end: string;
}) {
  return WEEKDAY_LABELS.map((label, dayOfWeek) => ({
    dayOfWeek,
    label,
    startTime: workingHours.start,
    endTime: workingHours.end,
    isWorking: true,
  })) satisfies WeeklyScheduleDraft[];
}

export function mergeWeeklySchedulesWithDefaults(
  schedules: BarberWeeklyScheduleRow[],
  workingHours: {
    start: string;
    end: string;
  },
) {
  const defaults = buildDefaultWeeklySchedules(workingHours);

  return defaults.map((defaultSchedule) => {
    const matchingSchedule = schedules.find(
      (schedule) => schedule.day_of_week === defaultSchedule.dayOfWeek,
    );

    if (!matchingSchedule) {
      return defaultSchedule;
    }

    return {
      dayOfWeek: matchingSchedule.day_of_week,
      label: defaultSchedule.label,
      startTime: normalizeTimeValue(matchingSchedule.start_time),
      endTime: normalizeTimeValue(matchingSchedule.end_time),
      isWorking: matchingSchedule.is_working,
    };
  });
}

function formatMinutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}`;
}

/**
 * Mergea intervalos solapados en una lista ordenada [start, end].
 * Devuelve la lista compacta. Por ej.
 *   [{s:60,e:90}, {s:80,e:120}, {s:200,e:230}]
 *   → [{s:60,e:120}, {s:200,e:230}]
 */
function mergeBusyIntervals(
  intervals: Array<{ start: number; end: number }>,
): Array<{ start: number; end: number }> {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const interval of sorted) {
    if (interval.end <= interval.start) continue; // ignora intervalos vacíos
    const last = merged[merged.length - 1];
    if (!last || interval.start > last.end) {
      merged.push({ ...interval });
    } else {
      last.end = Math.max(last.end, interval.end);
    }
  }
  return merged;
}

/**
 * Construye los slots disponibles del día para un barbero específico.
 *
 * Algoritmo dinámico (sin huecos):
 *  1. Construye los intervalos OCUPADOS del día (turnos + bloques).
 *  2. Recorre los huecos libres y, dentro de cada uno, emite slots cada
 *     `appointmentDurationMinutes` empezando JUSTO donde arranca el hueco.
 *  3. El próximo slot disponible después de un turno empieza al terminar
 *     ese turno (no se redondea a un grid fijo).
 *
 * Sólo se emiten slots con razón `available` o `past`. Los slots ocupados
 * o bloqueados no aparecen en la lista — la UI no los muestra.
 *
 * `barbershopIntervalMinutes` se mantiene como fallback defensivo para
 * turnos viejos donde `durationMinutes` quedó en 0 o nulo.
 */
export function buildAvailabilitySlots(params: {
  appointmentDate: string;
  appointmentDurationMinutes: number;
  barbershopIntervalMinutes: number;
  workingHours: {
    start: string;
    end: string;
  };
  weeklySchedules: BarberWeeklyScheduleRow[];
  timeBlocks: BarberTimeBlockRow[];
  appointments: AppointmentInterval[];
  now?: Date;
}) {
  const {
    appointmentDate,
    appointmentDurationMinutes,
    barbershopIntervalMinutes,
    workingHours,
    weeklySchedules,
    timeBlocks,
    appointments,
    now = new Date(),
  } = params;

  if (appointmentDurationMinutes <= 0) {
    return [] satisfies AvailabilitySlot[];
  }

  const mergedSchedules = mergeWeeklySchedulesWithDefaults(
    weeklySchedules,
    workingHours,
  );
  const activeSchedule = mergedSchedules.find(
    (schedule) => schedule.dayOfWeek === getDayOfWeekFromDate(appointmentDate),
  );

  if (!activeSchedule || !activeSchedule.isWorking) {
    return [] satisfies AvailabilitySlot[];
  }

  const dayStart = timeValueToMinutes(activeSchedule.startTime);
  const dayEnd = timeValueToMinutes(activeSchedule.endTime);

  const today = normalizeDateValue(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`,
  );
  const currentMinutes =
    appointmentDate === today ? now.getHours() * 60 + now.getMinutes() : -1;

  // 1) Construimos los intervalos ocupados (turnos + bloques).
  const busy: Array<{ start: number; end: number }> = [];
  for (const block of timeBlocks) {
    busy.push({
      start: timeValueToMinutes(block.start_time),
      end: timeValueToMinutes(block.end_time),
    });
  }
  for (const appointment of appointments) {
    const apptStart = timeValueToMinutes(appointment.startTime);
    const apptDuration =
      appointment.durationMinutes && appointment.durationMinutes > 0
        ? appointment.durationMinutes
        : barbershopIntervalMinutes;
    busy.push({ start: apptStart, end: apptStart + apptDuration });
  }
  const busyMerged = mergeBusyIntervals(busy);

  // 2) Recorremos los huecos libres dentro del horario laboral.
  const slots: AvailabilitySlot[] = [];

  function emitSlotsInRange(rangeStart: number, rangeEnd: number) {
    // Clamp al horario laboral.
    const start = Math.max(rangeStart, dayStart);
    const end = Math.min(rangeEnd, dayEnd);
    for (
      let slotStart = start;
      slotStart + appointmentDurationMinutes <= end;
      slotStart += appointmentDurationMinutes
    ) {
      const isPast =
        appointmentDate === today && slotStart < currentMinutes;
      slots.push({
        time: formatMinutesToTime(slotStart),
        isAvailable: !isPast,
        reason: isPast ? "past" : "available",
      });
    }
  }

  let cursor = dayStart;
  for (const interval of busyMerged) {
    if (interval.start > cursor) {
      emitSlotsInRange(cursor, interval.start);
    }
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < dayEnd) {
    emitSlotsInRange(cursor, dayEnd);
  }

  return slots;
}
