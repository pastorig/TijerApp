import {
  buildAvailabilitySlots,
  type AppointmentInterval,
} from "@/lib/availability";
import {
  getSupabaseClient,
  type BarberDayOverrideInsert,
  type BarberTimeBlockInsert,
  type BarberTimeBlockUpdate,
  type BarberWeeklyScheduleInsert,
} from "@/lib/supabase";

type BarberLookupInput = {
  barbershopSlug: string;
  barberId: string;
};

type UpsertWeeklySchedulesInput = {
  barbershopSlug: string;
  barberId: string;
  schedules: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isWorking: boolean;
    // Pausa al medio opcional. Si ambos null, no hay pausa. Si ambos
    // seteados, los slots dentro del rango se excluyen.
    breakStart: string | null;
    breakEnd: string | null;
  }>;
};

type ListTimeBlocksInput = BarberLookupInput & {
  blockDate?: string;
};

type CreateTimeBlockInput = BarberTimeBlockInsert;

type UpdateTimeBlockInput = {
  blockId: string;
  values: BarberTimeBlockUpdate;
};

type ListDayOverridesInput = BarberLookupInput & {
  overrideDate?: string;
};

type UpsertDayOverrideInput = BarberLookupInput & {
  overrideDate: string;
  startTime: string;
  endTime: string;
  isWorking: boolean;
};

type GetBarberDayAvailabilityInput = BarberLookupInput & {
  appointmentDate: string;
  appointmentDurationMinutes: number;
  barbershopIntervalMinutes: number;
  workingHours: {
    start: string;
    end: string;
  };
};

const weeklySchedulesSelect =
  "id, created_at, barbershop_slug, barber_id, day_of_week, start_time, end_time, is_working, break_start, break_end";
const timeBlocksSelect =
  "id, created_at, barbershop_slug, barber_id, block_date, start_time, end_time, reason, is_active, deleted_at";
const dayOverridesSelect =
  "id, created_at, barbershop_slug, barber_id, override_date, start_time, end_time, is_working, deleted_at";

export async function listWeeklySchedulesByBarber({
  barbershopSlug,
  barberId,
}: BarberLookupInput) {
  const { data, error } = await getSupabaseClient()
    .from("barber_weekly_schedules")
    .select(weeklySchedulesSelect)
    .eq("barbershop_slug", barbershopSlug)
    .eq("barber_id", barberId)
    .order("day_of_week", { ascending: true });

  return { data, error };
}

export async function upsertWeeklySchedulesForBarber({
  barbershopSlug,
  barberId,
  schedules,
}: UpsertWeeklySchedulesInput) {
  const payload: BarberWeeklyScheduleInsert[] = schedules.map((schedule) => ({
    barbershop_slug: barbershopSlug,
    barber_id: barberId,
    day_of_week: schedule.dayOfWeek,
    start_time: schedule.startTime,
    end_time: schedule.endTime,
    is_working: schedule.isWorking,
    break_start: schedule.breakStart,
    break_end: schedule.breakEnd,
  }));

  const { data, error } = await getSupabaseClient()
    .from("barber_weekly_schedules")
    .upsert(payload, {
      onConflict: "barber_id,day_of_week",
    })
    .select(weeklySchedulesSelect)
    .order("day_of_week", { ascending: true });

  return { data, error };
}

export async function listTimeBlocksByBarber({
  barbershopSlug,
  barberId,
  blockDate,
}: ListTimeBlocksInput) {
  let query = getSupabaseClient()
    .from("barber_time_blocks")
    .select(timeBlocksSelect)
    .eq("barbershop_slug", barbershopSlug)
    .eq("barber_id", barberId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("block_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (blockDate) {
    query = query.eq("block_date", blockDate);
  }

  const { data, error } = await query;

  return { data, error };
}

export async function listDayOverridesByBarber({
  barbershopSlug,
  barberId,
  overrideDate,
}: ListDayOverridesInput) {
  let query = getSupabaseClient()
    .from("barber_day_overrides")
    .select(dayOverridesSelect)
    .eq("barbershop_slug", barbershopSlug)
    .eq("barber_id", barberId)
    .is("deleted_at", null)
    .order("override_date", { ascending: true });

  if (overrideDate) {
    query = query.eq("override_date", overrideDate);
  }

  const { data, error } = await query;

  return { data, error };
}

export async function upsertDayOverrideForBarber({
  barbershopSlug,
  barberId,
  overrideDate,
  startTime,
  endTime,
  isWorking,
}: UpsertDayOverrideInput) {
  const payload: BarberDayOverrideInsert = {
    barbershop_slug: barbershopSlug,
    barber_id: barberId,
    override_date: overrideDate,
    start_time: startTime,
    end_time: endTime,
    is_working: isWorking,
    deleted_at: null,
  };

  const { data, error } = await getSupabaseClient()
    .from("barber_day_overrides")
    .upsert(payload, {
      onConflict: "barber_id,override_date",
    })
    .select(dayOverridesSelect)
    .single();

  return { data, error };
}

export async function createTimeBlock(block: CreateTimeBlockInput) {
  return getSupabaseClient()
    .from("barber_time_blocks")
    .insert(block)
    .select(timeBlocksSelect)
    .single();
}

export async function updateTimeBlock({
  blockId,
  values,
}: UpdateTimeBlockInput) {
  return getSupabaseClient()
    .from("barber_time_blocks")
    .update(values)
    .eq("id", blockId)
    .select(timeBlocksSelect)
    .single();
}

export async function deleteTimeBlock(blockId: string) {
  return updateTimeBlock({
    blockId,
    values: {
      is_active: false,
      deleted_at: new Date().toISOString(),
    },
  });
}

async function listPublicBarberDayAppointments({
  barbershopSlug,
  barberId,
  appointmentDate,
}: {
  barbershopSlug: string;
  barberId: string;
  appointmentDate: string;
}) {
  const { data, error } = await getSupabaseClient().rpc(
    "get_public_barber_day_appointments",
    {
      p_appointment_date: appointmentDate,
      p_barber_id: barberId,
      p_barbershop_slug: barbershopSlug,
    },
  );

  return {
    data:
      data?.map((appointment) => ({
        startTime: appointment.appointment_time,
        // La RPC ya devuelve la duracion efectiva del turno:
        // actual_duration_minutes si existe, y si no la base del servicio.
        durationMinutes: appointment.service_duration_minutes,
      })) ?? [],
    error,
  };
}

export async function getBarberDayAvailability({
  barbershopSlug,
  barberId,
  appointmentDate,
  appointmentDurationMinutes,
  barbershopIntervalMinutes,
  workingHours,
}: GetBarberDayAvailabilityInput) {
  const [schedulesResult, dayOverrideResult, blocksResult, appointmentsResult] =
    await Promise.all([
      listWeeklySchedulesByBarber({ barbershopSlug, barberId }),
      listDayOverridesByBarber({
        barbershopSlug,
        barberId,
        overrideDate: appointmentDate,
      }),
      listTimeBlocksByBarber({
        barbershopSlug,
        barberId,
        blockDate: appointmentDate,
      }),
      listPublicBarberDayAppointments({
        barbershopSlug,
        barberId,
        appointmentDate,
      }),
    ]);

  const error =
    schedulesResult.error ??
    dayOverrideResult.error ??
    blocksResult.error ??
    appointmentsResult.error ??
    null;

  if (error) {
    return {
      data: [],
      error,
    };
  }

  const slots = buildAvailabilitySlots({
    appointmentDate,
    appointmentDurationMinutes,
    barbershopIntervalMinutes,
    workingHours,
    weeklySchedules: schedulesResult.data ?? [],
    dayOverride: dayOverrideResult.data?.[0] ?? null,
    timeBlocks: blocksResult.data ?? [],
    appointments: (appointmentsResult.data ?? []) as AppointmentInterval[],
  });

  return {
    data: slots,
    error: null,
  };
}
