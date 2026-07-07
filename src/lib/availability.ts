import type {
  BarberDayOverrideRow,
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
  reason:
    | "available"
    | "outside-hours"
    | "blocked"
    | "occupied"
    | "past"
    | "too-soon";
};

export type WeeklyScheduleDraft = {
  dayOfWeek: number;
  label: string;
  startTime: string;
  endTime: string;
  isWorking: boolean;
  // Pausa al medio opcional (ambos null o ambos seteados). Si está, los slots
  // dentro de breakStart..breakEnd NO se muestran como disponibles.
  breakStart: string | null;
  breakEnd: string | null;
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
    breakStart: null,
    breakEnd: null,
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
      breakStart: matchingSchedule.break_start
        ? normalizeTimeValue(matchingSchedule.break_start)
        : null,
      breakEnd: matchingSchedule.break_end
        ? normalizeTimeValue(matchingSchedule.break_end)
        : null,
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
 * Algoritmo "una grilla por servicio" (sin huecos, consistente):
 *  1. Por cada hueco libre del día (entre turnos/bloques) genera slots
 *     cada `appointmentDurationMinutes`. El primer slot del hueco
 *     empieza JUSTO al inicio del hueco (post-turno o apertura del día),
 *     así no queda tiempo perdido entre cortes.
 *  2. Agrega un slot final que termine exacto en el cierre, si entra
 *     dentro del horario.
 *  3. Filtra los candidatos que solapan con turnos/bloques.
 *  4. Marca como `past` los que ya pasaron en el día actual.
 *
 * El grid sigue la duración del SERVICIO ELEGIDO. Si Juan corta cada
 * 45 min, sus slots son 16:00, 16:45, 17:30, … Si Ricardo corta cada
 * 30 min, los suyos son 16:00, 16:30, 17:00, …
 *
 * Sólo se devuelven slots con razón `available` o `past`. Los slots
 * ocupados/bloqueados no aparecen — la UI muestra una lista limpia.
 *
 * `barbershopIntervalMinutes` se usa como fallback defensivo para
 * turnos viejos sin duración cargada.
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
  dayOverride?: BarberDayOverrideRow | null;
  timeBlocks: BarberTimeBlockRow[];
  appointments: AppointmentInterval[];
  now?: Date;
  /**
   * Anticipación mínima (en minutos) para poder reservar un turno. Si es 60,
   * a las 15:20 no se puede tomar el de las 16:00 (faltan 40 min) — el más
   * cercano pasa a ser el siguiente slot según el intervalo del barbero.
   * 0 = sin restricción (comportamiento por defecto). Solo aplica a HOY.
   */
  minBookingNoticeMinutes?: number;
}) {
  const {
    appointmentDate,
    appointmentDurationMinutes,
    barbershopIntervalMinutes,
    workingHours,
    weeklySchedules,
    dayOverride,
    timeBlocks,
    appointments,
    now = new Date(),
    minBookingNoticeMinutes = 0,
  } = params;

  if (appointmentDurationMinutes <= 0) {
    return [] satisfies AvailabilitySlot[];
  }

  const mergedSchedules = mergeWeeklySchedulesWithDefaults(
    weeklySchedules,
    workingHours,
  );
  const weeklySchedule = mergedSchedules.find(
    (schedule) => schedule.dayOfWeek === getDayOfWeekFromDate(appointmentDate),
  );

  const activeSchedule = dayOverride
    ? {
        startTime: normalizeTimeValue(dayOverride.start_time),
        endTime: normalizeTimeValue(dayOverride.end_time),
        isWorking: dayOverride.is_working,
        // Day overrides puntuales no soportan pausa al medio (caso edge raro).
        breakStart: null as string | null,
        breakEnd: null as string | null,
      }
    : weeklySchedule
      ? {
          startTime: weeklySchedule.startTime,
          endTime: weeklySchedule.endTime,
          isWorking: weeklySchedule.isWorking,
          breakStart: weeklySchedule.breakStart,
          breakEnd: weeklySchedule.breakEnd,
        }
      : null;

  if (!activeSchedule?.isWorking) {
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

  // 1) Construimos los intervalos ocupados (turnos + bloques + pausa) mergeados.
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
  // Pausa al medio del horario semanal (si la configuró el barbero).
  // Funciona idéntico a un time block: los slots dentro NO aparecen.
  if (activeSchedule.breakStart && activeSchedule.breakEnd) {
    busy.push({
      start: timeValueToMinutes(activeSchedule.breakStart),
      end: timeValueToMinutes(activeSchedule.breakEnd),
    });
  }
  const busyMerged = mergeBusyIntervals(busy);

  // 2) Generamos el set de tiempos candidatos.
  const candidateTimes = new Set<number>();

  // 2a) Para cada hueco libre, generar slots cada `appointmentDurationMinutes`
  //     empezando JUSTO al inicio del hueco. Así nunca quedan minutos perdidos
  //     entre turnos.
  function addSlotsInRange(rangeStart: number, rangeEnd: number) {
    const start = Math.max(rangeStart, dayStart);
    const end = Math.min(rangeEnd, dayEnd);
    for (
      let t = start;
      t + appointmentDurationMinutes <= end;
      t += appointmentDurationMinutes
    ) {
      candidateTimes.add(t);
    }
  }

  let cursor = dayStart;
  for (const interval of busyMerged) {
    if (interval.start > cursor) {
      addSlotsInRange(cursor, interval.start);
    }
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < dayEnd) {
    addSlotsInRange(cursor, dayEnd);
  }

  // 2b) Slot que termina exacto en el cierre, si entra dentro del horario.
  //     Cubre el caso donde el grid del hueco final deja tiempo muerto.
  const closingSlotStart = dayEnd - appointmentDurationMinutes;
  if (closingSlotStart >= dayStart) {
    candidateTimes.add(closingSlotStart);
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

    // "past" = ya arrancó. "too-soon" = todavía no arrancó pero falta menos que
    // la anticipación mínima configurada (ej. faltan 40 min y el mínimo es 60).
    const notice = appointmentDate === today ? Math.max(0, minBookingNoticeMinutes) : 0;
    const isPast = appointmentDate === today && t < currentMinutes;
    const isTooSoon =
      !isPast && appointmentDate === today && t < currentMinutes + notice;
    const unavailable = isPast || isTooSoon;
    slots.push({
      time: formatMinutesToTime(t),
      isAvailable: !unavailable,
      reason: isPast ? "past" : isTooSoon ? "too-soon" : "available",
    });
  }

  return slots;
}
