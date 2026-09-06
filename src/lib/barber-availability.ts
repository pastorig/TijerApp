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
import { ahoraEnArgentina } from "@/lib/hora-argentina";

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
  /** true (default) = la pausa sale de la regla semanal de ese día. */
  heredaPausa?: boolean;
  /** Solo se miran si `heredaPausa` es false. Ambos null = ese día no para. */
  breakStart?: string | null;
  breakEnd?: string | null;
  nota?: string | null;
};

type GetBarberDayAvailabilityInput = BarberLookupInput & {
  appointmentDate: string;
  appointmentDurationMinutes: number;
  barbershopIntervalMinutes: number;
  workingHours: {
    start: string;
    end: string;
  };
  /** Anticipación mínima (min) para reservar. 0 = sin restricción. */
  minBookingNoticeMinutes?: number;
};

const weeklySchedulesSelect =
  "id, created_at, barbershop_slug, barber_id, day_of_week, start_time, end_time, is_working, break_start, break_end";
const timeBlocksSelect =
  "id, created_at, barbershop_slug, barber_id, block_date, start_time, end_time, reason, is_active, deleted_at";
// Las columnas de la pausa SÍ se piden: una columna que no se pide llega
// `undefined` y apaga la feature en silencio, sin error y sin log. Acá eso
// significaría que la excepción vuelve a borrarle el almuerzo al barbero.
const dayOverridesSelect =
  "id, created_at, barbershop_slug, barber_id, override_date, start_time, end_time, is_working, deleted_at, hereda_pausa, break_start, break_end, nota";

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

/**
 * Todos los horarios semanales de la barbería, de todos sus barberos. Lo usa la
 * guía de primeros pasos para saber si el barbero ya configuró sus días —dato
 * que no vive en el horario base de la barbería sino acá.
 */
export async function listWeeklySchedulesByBarbershop(barbershopSlug: string) {
  const { data, error } = await getSupabaseClient()
    .from("barber_weekly_schedules")
    .select(weeklySchedulesSelect)
    .eq("barbershop_slug", barbershopSlug)
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
  heredaPausa = true,
  breakStart = null,
  breakEnd = null,
  nota = null,
}: UpsertDayOverrideInput) {
  const payload: BarberDayOverrideInsert = {
    barbershop_slug: barbershopSlug,
    barber_id: barberId,
    override_date: overrideDate,
    start_time: startTime,
    end_time: endTime,
    is_working: isWorking,
    deleted_at: null,
    hereda_pausa: heredaPausa,
    break_start: breakStart,
    break_end: breakEnd,
    nota,
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

/**
 * Escribe una excepción en varias fechas de un saque.
 *
 * Va en un solo upsert con array y no en un `for` de N llamadas: cargar una
 * quincena serían quince idas a la base, y si la séptima falla queda media
 * excepción escrita sin que nadie sepa dónde cortó.
 *
 * El `onConflict` es lo que hace que reescribir una fecha ya cargada la
 * reemplace en vez de duplicar, y que reactivar una borrada sea el mismo
 * camino: el borrado es blando y `deleted_at: null` la revive. El unique de la
 * tabla no filtra por `deleted_at`, así que un insert pelado chocaría.
 */
export async function upsertDayOverridesEnLote(
  filas: UpsertDayOverrideInput[],
) {
  if (filas.length === 0) {
    return { data: [], error: null };
  }

  const payload: BarberDayOverrideInsert[] = filas.map((f) => ({
    barbershop_slug: f.barbershopSlug,
    barber_id: f.barberId,
    override_date: f.overrideDate,
    start_time: f.startTime,
    end_time: f.endTime,
    is_working: f.isWorking,
    deleted_at: null,
    hereda_pausa: f.heredaPausa ?? true,
    break_start: f.breakStart ?? null,
    break_end: f.breakEnd ?? null,
    nota: f.nota ?? null,
  }));

  const { data, error } = await getSupabaseClient()
    .from("barber_day_overrides")
    .upsert(payload, { onConflict: "barber_id,override_date" })
    .select(dayOverridesSelect);

  return { data, error };
}

/**
 * Las excepciones de un barbero de una fecha en adelante, para la lista de la
 * pantalla. Las viejas no se muestran: ya no cambian nada y solo estorban.
 */
export async function listDayOverridesDesde({
  barbershopSlug,
  barberId,
  desde,
}: BarberLookupInput & { desde: string }) {
  const { data, error } = await getSupabaseClient()
    .from("barber_day_overrides")
    .select(dayOverridesSelect)
    .eq("barbershop_slug", barbershopSlug)
    .eq("barber_id", barberId)
    .gte("override_date", desde)
    .is("deleted_at", null)
    .order("override_date", { ascending: true });

  return { data, error };
}

/** Borrado blando de una fecha: vuelve a regir la regla semanal. */
export async function deleteDayOverride(overrideId: string) {
  const { data, error } = await getSupabaseClient()
    .from("barber_day_overrides")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", overrideId)
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
  minBookingNoticeMinutes = 0,
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
    minBookingNoticeMinutes,
    // La hora manda la barbería, no el aparato del cliente. Acá casi siempre
    // coinciden —el que reserva está en Argentina—, pero un celular con la
    // zona mal puesta le tachaba o le ofrecía horarios que no eran.
    now: ahoraEnArgentina(),
  });

  return {
    data: slots,
    error: null,
  };
}
