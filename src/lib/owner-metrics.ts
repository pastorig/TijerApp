import { demoBarbershops, getActiveBarbers } from "@/data/demo-barbershops";
import { listKnownBarbershops } from "@/lib/barbershops";
import { getLocalDateInputValue } from "@/lib/format";
import { getSupabaseClient } from "@/lib/supabase";

export type OwnerBarbershopSummary = {
  name: string;
  slug: string;
  barberCount: number;
  appointmentCount: number;
  /** Reservas para HOY (no eliminadas). */
  todayAppointmentCount: number;
  /** Última actividad relevante (created_at del último appointment, o null). */
  lastAppointmentCreatedAt: string | null;
  isDemo: boolean;
  isRemovable: boolean;
  isActive: boolean;
};

export type OwnerNextGlobalAppointment = {
  barbershopSlug: string;
  barbershopName: string;
  customerName: string;
  appointmentTime: string;
};

export type OwnerDashboardMetrics = {
  knownBarbershopsCount: number;
  totalBarbersCount: number;
  totalAppointmentsCount: number;
  todayAppointmentsCount: number;
  activeServicesCount: number;
  /** Estimación de ingresos del día sumando service_price de turnos activos. */
  todayEstimatedRevenue: number;
  /** Próximo turno global (cualquier barbería) — el más cercano en el tiempo, hoy. */
  nextGlobalAppointment: OwnerNextGlobalAppointment | null;
  /** Barbería con más turnos hoy. */
  mostActiveBarbershopToday: {
    slug: string;
    name: string;
    count: number;
  } | null;
  barbershops: OwnerBarbershopSummary[];
};

async function countBarbersForBarbershop(barbershopSlug: string) {
  const { count, error } = await getSupabaseClient()
    .from("barbers")
    .select("id", { count: "exact", head: true })
    .eq("barbershop_slug", barbershopSlug)
    .is("deleted_at", null);

  return {
    count: count ?? 0,
    error,
  };
}

async function countAppointmentsForBarbershop(barbershopSlug: string) {
  const { count, error } = await getSupabaseClient()
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("barbershop_slug", barbershopSlug)
    .neq("status", "deleted");

  return {
    count: count ?? 0,
    error,
  };
}

export async function getOwnerDashboardMetrics() {
  const today = getLocalDateInputValue();
  const { data: knownBarbershops } = await listKnownBarbershops();
  const demoSlugs = new Set(demoBarbershops.map((barbershop) => barbershop.slug));

  // Traemos TODAS las barbershops del DB (activas e inactivas) para que el
  // owner pueda ver y gestionar las soft-deleted.
  const { data: dbBarbershops } = await getSupabaseClient()
    .from("barbershops")
    .select("slug, name, is_active");
  const dbBarbershopSlugs = new Set(
    (dbBarbershops ?? []).map((barbershop) => barbershop.slug),
  );
  const inactiveDbBarbershops = (dbBarbershops ?? []).filter(
    (barbershop) => !barbershop.is_active,
  );

  const supabase = getSupabaseClient();

  const [
    totalBarbersResult,
    totalAppointmentsResult,
    todayAppointmentsCountResult,
    activeServicesResult,
    todayAppointmentsDataResult,
    lastAppointmentsResult,
    barbershopSummaries,
  ] = await Promise.all([
    supabase
      .from("barbers")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .neq("status", "deleted"),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("appointment_date", today)
      .neq("status", "deleted"),
    supabase
      .from("barber_services")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .is("deleted_at", null),
    // Datos completos de los turnos de HOY — para próximo global, top barbería, ingresos
    supabase
      .from("appointments")
      .select(
        "id, barbershop_slug, appointment_time, customer_name, status, service_price",
      )
      .eq("appointment_date", today)
      .in("status", ["pending", "confirmed"]),
    // Última actividad por barbería — el created_at más reciente de cada slug
    supabase
      .from("appointments")
      .select("barbershop_slug, created_at")
      .neq("status", "deleted")
      .order("created_at", { ascending: false })
      .limit(200),
    Promise.all(
      knownBarbershops.map(async (barbershop) => {
        const [barbersResult, appointmentsResult] = await Promise.all([
          countBarbersForBarbershop(barbershop.slug),
          countAppointmentsForBarbershop(barbershop.slug),
        ]);

        const fallbackBarberCount = getActiveBarbers(barbershop).length;

        return {
          name: barbershop.name,
          slug: barbershop.slug,
          barberCount:
            barbersResult.error || barbersResult.count === 0
              ? fallbackBarberCount
              : barbersResult.count,
          appointmentCount: appointmentsResult.count,
          isDemo: demoSlugs.has(barbershop.slug),
          isRemovable:
            dbBarbershopSlugs.has(barbershop.slug) &&
            !demoSlugs.has(barbershop.slug),
          isActive: true,
        };
      }),
    ),
  ]);

  const todayAppointmentsData = todayAppointmentsDataResult.data ?? [];

  // Mapas derivados
  const todayCountBySlug = new Map<string, number>();
  let todayEstimatedRevenue = 0;
  for (const appt of todayAppointmentsData) {
    todayCountBySlug.set(
      appt.barbershop_slug,
      (todayCountBySlug.get(appt.barbershop_slug) ?? 0) + 1,
    );
    todayEstimatedRevenue += appt.service_price ?? 0;
  }

  const lastAppointments = lastAppointmentsResult.data ?? [];
  const lastCreatedBySlug = new Map<string, string>();
  for (const row of lastAppointments) {
    if (row.created_at && !lastCreatedBySlug.has(row.barbershop_slug)) {
      lastCreatedBySlug.set(row.barbershop_slug, row.created_at);
    }
  }

  // Próximo turno global — el más cercano hoy, en cualquier barbería
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upcomingToday = todayAppointmentsData
    .map((a) => {
      const [hh, mm] = a.appointment_time.split(":").map(Number);
      const minutes = hh * 60 + mm;
      return { appt: a, minutes };
    })
    .filter((x) => x.minutes >= nowMinutes)
    .sort((a, b) => a.minutes - b.minutes);
  const firstUpcoming = upcomingToday[0];

  let nextGlobalAppointment: OwnerNextGlobalAppointment | null = null;
  if (firstUpcoming) {
    const barbershopMatch = knownBarbershops.find(
      (b) => b.slug === firstUpcoming.appt.barbershop_slug,
    );
    nextGlobalAppointment = {
      barbershopSlug: firstUpcoming.appt.barbershop_slug,
      barbershopName:
        barbershopMatch?.name ?? firstUpcoming.appt.barbershop_slug,
      customerName: firstUpcoming.appt.customer_name,
      appointmentTime: firstUpcoming.appt.appointment_time,
    };
  }

  // Top barbería del día
  let mostActiveBarbershopToday: OwnerDashboardMetrics["mostActiveBarbershopToday"] =
    null;
  let topCount = 0;
  for (const [slug, count] of todayCountBySlug) {
    if (count > topCount) {
      topCount = count;
      const match = knownBarbershops.find((b) => b.slug === slug);
      mostActiveBarbershopToday = {
        slug,
        name: match?.name ?? slug,
        count,
      };
    }
  }

  // Sumamos las barberías inactivas como entries con stats vacíos —
  // el dashboard las renderiza en una sección aparte.
  const inactiveSummaries: OwnerBarbershopSummary[] = inactiveDbBarbershops.map(
    (barbershop) => ({
      name: barbershop.name,
      slug: barbershop.slug,
      barberCount: 0,
      appointmentCount: 0,
      todayAppointmentCount: 0,
      lastAppointmentCreatedAt: null,
      isDemo: false,
      isRemovable: true,
      isActive: false,
    }),
  );

  // Enriquecer las summaries activas con los counts de hoy + última actividad
  const enrichedActive: OwnerBarbershopSummary[] = barbershopSummaries.map(
    (summary) => ({
      ...summary,
      todayAppointmentCount: todayCountBySlug.get(summary.slug) ?? 0,
      lastAppointmentCreatedAt: lastCreatedBySlug.get(summary.slug) ?? null,
    }),
  );

  const allBarbershops = [...enrichedActive, ...inactiveSummaries];

  const fallbackTotalBarbers = demoBarbershops.reduce(
    (total, barbershop) =>
      total + getActiveBarbers(barbershop).length,
    0,
  );

  return {
    data: {
      knownBarbershopsCount: knownBarbershops.length,
      totalBarbersCount:
        totalBarbersResult.error || (totalBarbersResult.count ?? 0) === 0
          ? fallbackTotalBarbers
          : totalBarbersResult.count ?? 0,
      totalAppointmentsCount: totalAppointmentsResult.count ?? 0,
      todayAppointmentsCount: todayAppointmentsCountResult.count ?? 0,
      activeServicesCount: activeServicesResult.count ?? 0,
      todayEstimatedRevenue,
      nextGlobalAppointment,
      mostActiveBarbershopToday,
      barbershops: allBarbershops,
    } satisfies OwnerDashboardMetrics,
    error:
      totalBarbersResult.error ??
      totalAppointmentsResult.error ??
      todayAppointmentsCountResult.error ??
      activeServicesResult.error ??
      null,
  };
}
