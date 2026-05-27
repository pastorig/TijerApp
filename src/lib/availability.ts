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

function rangesOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
) {
  return firstStart < secondEnd && secondStart < firstEnd;
}

/**
 * Construye los slots disponibles del día para un barbero específico.
 *
 * Algoritmo combinado (sin huecos + buen aprovechamiento del horario):
 *  1. Genera tiempos candidatos cada `barbershopIntervalMinutes` desde
 *     el inicio del día (grid base — da al cliente horarios "redondos").
 *  2. Agrega tiempos candidatos que empiezan JUSTO al terminar cada
 *     turno o bloque (evita huecos cuando los servicios no encajan
 *     en el grid fijo, ej. cortes de 45 min con grid de 30).
 *  3. Para cada candidato verifica que no solape con turnos/bloques y
 *     que su duración entre dentro del horario laboral.
 *  4. Marca como `past` los que ya pasaron en el día actual.
 *
 * Sólo se devuelven slots con razón `available` o `past`. Los slots
 * ocupados o bloqueados no aparecen — la UI muestra una lista limpia.
 *
 * `barbershopIntervalMinutes` se usa como granularidad del grid base y
 * como fallback defensivo para turnos viejos sin duración cargada.
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

  // 1) Construimos los intervalos ocupados (turnos + bloques) mergeados.
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

  // 2) Generamos el set de tiempos candidatos.
  const candidateTimes = new Set<number>();

  // 2a) Grid base cada `barbershopIntervalMinutes`.
  const gridStep =
    barbershopIntervalMinutes > 0 ? barbershopIntervalMinutes : 30;
  for (let t = dayStart; t + appointmentDurationMinutes <= dayEnd; t += gridStep) {
    candidateTimes.add(t);
  }

  // 2b) Tiempos dinámicos: justo al terminar cada turno/bloque, para
  //     no perder minutos entre turnos consecutivos.
  for (const interval of busyMerged) {
    if (
      interval.end >= dayStart &&
      interval.end + appointmentDurationMinutes <= dayEnd
    ) {
      candidateTimes.add(interval.end);
    }
  }

  // 3) Filtramos candidatos solapados con turnos/bloques.
  const slots: AvailabilitySlot[] = [];
  const sortedTimes = [...candidateTimes].sort((a, b) => a - b);

  for (const t of sortedTimes) {
    const slotEnd = t + appointmentDurationMinutes;
    const overlapsBusy = busyMerged.some((iv) =>
      rangesOverlap(t, slotEnd, iv.start, iv.end),
    );
    if (overlapsBusy) continue;

    const isPast = appointmentDate === today && t < currentMinutes;
    slots.push({
      time: formatMinutesToTime(t),
      isAvailable: !isPast,
      reason: isPast ? "past" : "available",
    });
  }

  return slots;
}
