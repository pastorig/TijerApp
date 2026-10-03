/**
 * agenda-schedule-helpers
 *
 * Helpers compartidos para resolver el horario de un barbero en un día
 * concreto. Extraídos de AdminAppointments.tsx para que otras vistas
 * del turnero (ej. AgendaCalendarGridView) puedan usarlos sin importar
 * de un archivo de 1800+ líneas.
 *
 * La regla de prioridad es:
 *   1. dayOverride del día (si is_working=true/false explícito) gana sobre todo
 *   2. weeklySchedule del día de la semana
 *   3. workingHours por default de la barbería (fallback)
 */

import type { DemoBarbershop } from "@/data/demo-barbershops";
import { mergeWeeklySchedulesWithDefaults, getDayOfWeekFromDate } from "@/lib/availability";
import { normalizeDateValue } from "@/lib/format";
import { resolverJornadaDelDia } from "@/lib/jornada-del-dia";
import type {
  BarberDayOverrideRow,
  BarberWeeklyScheduleRow,
} from "@/lib/supabase";
import { normalizeTimeShort } from "./date-utils";

export type BarberDaySchedule = {
  startTime: string;
  endTime: string;
  isWorking: boolean;
  /**
   * Pausa del día (almuerzo), ya resuelta con la misma regla que la
   * disponibilidad: la excepción del día puede heredarla, cambiarla o sacarla.
   */
  pausa?: { startTime: string; endTime: string } | null;
};

export function getBarberDaySchedule(params: {
  barberId: string;
  date: string;
  weeklySchedulesByBarber: Record<string, BarberWeeklyScheduleRow[]>;
  dayOverridesByBarber: Record<string, BarberDayOverrideRow | null>;
  workingHours: DemoBarbershop["workingHours"];
  focusDate: string;
}): BarberDaySchedule | null {
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

  // Los dayOverrides son contextuales al focusDate de la vista. Solo
  // aplicamos override si el `date` que estamos consultando coincide.
  const dayOverride =
    normalizeDateValue(date) === focusDate
      ? (dayOverridesByBarber[barberId] ?? null)
      : null;

  if (!dayOverride && !weeklySchedule) return null;

  const jornada = resolverJornadaDelDia({
    reglaSemanal: weeklySchedule
      ? {
          startTime: weeklySchedule.startTime,
          endTime: weeklySchedule.endTime,
          isWorking: weeklySchedule.isWorking,
          breakStart: weeklySchedule.breakStart,
          breakEnd: weeklySchedule.breakEnd,
        }
      : null,
    excepcion: dayOverride
      ? {
          startTime: normalizeTimeShort(dayOverride.start_time),
          endTime: normalizeTimeShort(dayOverride.end_time),
          isWorking: dayOverride.is_working,
          heredaPausa: dayOverride.hereda_pausa ?? true,
          breakStart: dayOverride.break_start ?? null,
          breakEnd: dayOverride.break_end ?? null,
        }
      : null,
    horarioBarberia: workingHours,
  });
  const pausa = jornada.pausa
    ? { startTime: jornada.pausa.inicio, endTime: jornada.pausa.fin }
    : null;

  if (dayOverride) {
    return {
      startTime: normalizeTimeShort(dayOverride.start_time),
      endTime: normalizeTimeShort(dayOverride.end_time),
      isWorking: dayOverride.is_working,
      pausa,
    };
  }

  return {
    startTime: weeklySchedule!.startTime,
    endTime: weeklySchedule!.endTime,
    isWorking: weeklySchedule!.isWorking,
    pausa,
  };
}
