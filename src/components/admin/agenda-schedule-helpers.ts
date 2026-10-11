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
import { ocupacionPorDia } from "@/lib/ocupacion-del-mes";
import type {
  BarberDayOverrideRow,
  BarberWeeklyScheduleRow,
} from "@/lib/supabase";
import { normalizeTimeShort } from "@/components/calendar/date-utils";

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

/* ───────────────────────── Ocupación del mes ───────────────────────── */

/** "HH:MM" o "HH:MM:SS" → minutos desde las 00:00. */
function aMinutos(hora: string): number {
  const [h, m] = hora.split(":");
  return Number(h) * 60 + Number(m);
}

export type ExcepcionDelMes = Pick<
  BarberDayOverrideRow,
  "override_date" | "start_time" | "end_time" | "is_working"
> & {
  barber_id: string;
  hereda_pausa?: boolean | null;
  break_start?: string | null;
  break_end?: string | null;
};

/**
 * La ocupación de cada día, a partir de las filas crudas de la base.
 *
 * La usan el turnero del dueño (en el navegador) y la agenda del empleado (en
 * el servidor). Resuelve la jornada con `getBarberDaySchedule`, la misma que
 * dibuja el calendario del día: si cada lado la armara a su modo, el punto del
 * mes y el "% ocupado" del día terminarían discrepando.
 */
export function ocupacionDelMesDesdeFilas(params: {
  barberIds: string[];
  weeklySchedulesByBarber: Record<string, BarberWeeklyScheduleRow[]>;
  excepciones: ExcepcionDelMes[];
  bloqueos: Array<{
    barber_id: string;
    block_date: string;
    start_time: string;
    end_time: string;
  }>;
  turnos: Array<{
    barber_id: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
    service_duration_minutes: number | null;
    actual_duration_minutes?: number | null;
  }>;
  workingHours: DemoBarbershop["workingHours"];
}): Record<string, number> {
  const { barberIds, weeklySchedulesByBarber, excepciones, bloqueos, turnos, workingHours } =
    params;
  const intervalo = workingHours.intervalMinutes > 0 ? workingHours.intervalMinutes : 30;

  const excepcionPorBarberoYDia = new Map<string, ExcepcionDelMes>();
  for (const e of excepciones) {
    excepcionPorBarberoYDia.set(`${e.barber_id}|${normalizeDateValue(e.override_date)}`, e);
  }

  return ocupacionPorDia({
    barberIds,
    jornadaDe: (barberId, fecha) => {
      const excepcion = excepcionPorBarberoYDia.get(`${barberId}|${fecha}`) ?? null;
      const dia = getBarberDaySchedule({
        barberId,
        date: fecha,
        weeklySchedulesByBarber,
        dayOverridesByBarber: {
          [barberId]: excepcion as unknown as BarberDayOverrideRow | null,
        },
        workingHours,
        focusDate: fecha,
      });
      if (!dia) return null;
      return {
        trabaja: dia.isWorking,
        inicioMin: aMinutos(dia.startTime),
        finMin: aMinutos(dia.endTime),
        pausa: dia.pausa
          ? { inicioMin: aMinutos(dia.pausa.startTime), finMin: aMinutos(dia.pausa.endTime) }
          : null,
      };
    },
    turnos: turnos
      .filter((t) => t.status === "pending" || t.status === "confirmed")
      .map((t) => ({
        fecha: normalizeDateValue(t.appointment_date),
        barberId: t.barber_id,
        inicioMin: aMinutos(t.appointment_time),
        // La misma duración que dibuja el calendario del día.
        duracionMin: t.actual_duration_minutes ?? t.service_duration_minutes ?? intervalo,
      })),
    bloqueos: bloqueos.map((b) => ({
      fecha: normalizeDateValue(b.block_date),
      barberId: b.barber_id,
      inicioMin: aMinutos(b.start_time),
      finMin: aMinutos(b.end_time),
    })),
  });
}
