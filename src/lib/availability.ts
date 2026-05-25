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

function rangesOverlap(
  firstStartMinutes: number,
  firstEndMinutes: number,
  secondStartMinutes: number,
  secondEndMinutes: number,
) {
  return firstStartMinutes < secondEndMinutes && secondStartMinutes < firstEndMinutes;
}

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

  const startMinutes = timeValueToMinutes(activeSchedule.startTime);
  const endMinutes = timeValueToMinutes(activeSchedule.endTime);
  const slots: AvailabilitySlot[] = [];
  const today = normalizeDateValue(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`,
  );
  const currentMinutes =
    appointmentDate === today
      ? now.getHours() * 60 + now.getMinutes()
      : -1;

  for (
    let slotStartMinutes = startMinutes;
    slotStartMinutes + appointmentDurationMinutes <= endMinutes;
    slotStartMinutes += barbershopIntervalMinutes
  ) {
    const slotEndMinutes = slotStartMinutes + appointmentDurationMinutes;
    let reason: AvailabilitySlot["reason"] = "available";

    if (appointmentDate === today && slotStartMinutes < currentMinutes) {
      reason = "past";
    }

    if (reason === "available") {
      const overlapsBlock = timeBlocks.some((block) =>
        rangesOverlap(
          slotStartMinutes,
          slotEndMinutes,
          timeValueToMinutes(block.start_time),
          timeValueToMinutes(block.end_time),
        ),
      );

      if (overlapsBlock) {
        reason = "blocked";
      }
    }

    if (reason === "available") {
      const overlapsAppointment = appointments.some((appointment) => {
        const apptStart = timeValueToMinutes(appointment.startTime);
        // Defensive: si la duración guardada es 0, NaN o falsy (turnos viejos /
        // data sucia), tratamos el slot como un bloque del tamaño del intervalo
        // base de la barbería. Garantiza que un turno confirmado SIEMPRE
        // bloquee al menos su propio slot, evitando double-booking.
        const apptDuration =
          appointment.durationMinutes && appointment.durationMinutes > 0
            ? appointment.durationMinutes
            : barbershopIntervalMinutes;
        return rangesOverlap(
          slotStartMinutes,
          slotEndMinutes,
          apptStart,
          apptStart + apptDuration,
        );
      });

      if (overlapsAppointment) {
        reason = "occupied";
      }
    }

    slots.push({
      time: formatMinutesToTime(slotStartMinutes),
      isAvailable: reason === "available",
      reason,
    });
  }

  return slots;
}
