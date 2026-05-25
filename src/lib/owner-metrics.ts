import { demoBarbershops, getActiveBarbers } from "@/data/demo-barbershops";
import { listKnownBarbershops } from "@/lib/barbershops";
import { getLocalDateInputValue } from "@/lib/format";
import { getSupabaseClient } from "@/lib/supabase";

export type OwnerBarbershopSummary = {
  name: string;
  slug: string;
  barberCount: number;
  appointmentCount: number;
  isDemo: boolean;
  isRemovable: boolean;
};

export type OwnerDashboardMetrics = {
  knownBarbershopsCount: number;
  totalBarbersCount: number;
  totalAppointmentsCount: number;
  todayAppointmentsCount: number;
  activeServicesCount: number;
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
  const { data: dbBarbershops } = await getSupabaseClient()
    .from("barbershops")
    .select("slug")
    .eq("is_active", true);
  const dbBarbershopSlugs = new Set(
    (dbBarbershops ?? []).map((barbershop) => barbershop.slug),
  );

  const [
    totalBarbersResult,
    totalAppointmentsResult,
    todayAppointmentsResult,
    activeServicesResult,
    barbershopSummaries,
  ] = await Promise.all([
    getSupabaseClient()
      .from("barbers")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    getSupabaseClient()
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .neq("status", "deleted"),
    getSupabaseClient()
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("appointment_date", today)
      .neq("status", "deleted"),
    getSupabaseClient()
      .from("barber_services")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .is("deleted_at", null),
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
        };
      }),
    ),
  ]);

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
      todayAppointmentsCount: todayAppointmentsResult.count ?? 0,
      activeServicesCount: activeServicesResult.count ?? 0,
      barbershops: barbershopSummaries,
    } satisfies OwnerDashboardMetrics,
    error:
      totalBarbersResult.error ??
      totalAppointmentsResult.error ??
      todayAppointmentsResult.error ??
      activeServicesResult.error ??
      null,
  };
}
