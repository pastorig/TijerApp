import {
  demoBarbershops,
  getDemoBarbershopBySlug,
  type Barber,
  type DemoBarbershop,
} from "@/data/demo-barbershops";
import { listActiveBarbersByBarbershop } from "@/lib/barbers";
import { listActiveServicesByBarbershop } from "@/lib/barber-services";
import {
  getSupabaseClient,
  type BarbershopRow,
  type BarbershopUpdate,
} from "@/lib/supabase";

const defaultWorkingHours = {
  start: "16:00",
  end: "21:00",
  intervalMinutes: 30,
};

const barbershopSelectFields =
  "id, created_at, slug, name, description, whatsapp, instagram, address, logo_url, google_reviews_url, working_hours_start, working_hours_end, slot_interval_minutes, is_active";

function mapBarbershopRowToDemoBarbershop(
  barbershop: BarbershopRow,
  dbBarbers?: Barber[],
): DemoBarbershop {
  const fallbackDemo = getDemoBarbershopBySlug(barbershop.slug);

  return {
    id: barbershop.id,
    slug: barbershop.slug,
    name: barbershop.name,
    description:
      barbershop.description?.trim() ||
      fallbackDemo?.description ||
      "Reserva tu turno online",
    instagram: barbershop.instagram?.trim() || fallbackDemo?.instagram || "",
    whatsapp: barbershop.whatsapp?.trim() || fallbackDemo?.whatsapp || "",
    address: barbershop.address?.trim() || undefined,
    logoUrl: barbershop.logo_url?.trim() || undefined,
    googleReviewsUrl: barbershop.google_reviews_url?.trim() || undefined,
    barbers:
      dbBarbers && dbBarbers.length > 0
        ? dbBarbers
        : fallbackDemo?.barbers ?? [],
    isActive: barbershop.is_active,
    workingHours: {
      start:
        barbershop.working_hours_start?.trim() ||
        fallbackDemo?.workingHours.start ||
        defaultWorkingHours.start,
      end:
        barbershop.working_hours_end?.trim() ||
        fallbackDemo?.workingHours.end ||
        defaultWorkingHours.end,
      intervalMinutes:
        barbershop.slot_interval_minutes ||
        fallbackDemo?.workingHours.intervalMinutes ||
        defaultWorkingHours.intervalMinutes,
    },
  };
}

const activeDbBarbershopsQuery = () =>
  getSupabaseClient()
    .from("barbershops")
    .select(barbershopSelectFields)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

/**
 * Trae todos los barberos activos de una barbería junto a sus servicios
 * activos. Se usa para que la landing pública y el admin vean los datos
 * reales de la DB (no el fallback hardcoded en demo-barbershops.ts).
 */
async function loadBarbersWithServices(slug: string): Promise<Barber[]> {
  const [barbersResult, servicesResult] = await Promise.all([
    listActiveBarbersByBarbershop(slug),
    listActiveServicesByBarbershop(slug),
  ]);
  const dbBarbers = barbersResult.data ?? [];
  const dbServices = servicesResult.data ?? [];
  return dbBarbers.map((barber) => ({
    id: barber.id,
    name: barber.name,
    displayName: barber.display_name ?? undefined,
    role: barber.role ?? undefined,
    whatsapp: barber.whatsapp ?? undefined,
    isActive: barber.is_active,
    isOwner: barber.is_owner,
    services: dbServices
      .filter((service) => service.barber_id === barber.id)
      .map((service) => ({
        id: service.id,
        name: service.name,
        price: service.price,
        durationMinutes: service.duration_minutes,
      })),
  }));
}

export async function listKnownBarbershops() {
  const { data, error } = await activeDbBarbershopsQuery();

  if (error) {
    return {
      data: demoBarbershops,
      error,
    };
  }

  const mergedBySlug = new Map<string, DemoBarbershop>();

  demoBarbershops.forEach((barbershop) => {
    mergedBySlug.set(barbershop.slug, barbershop);
  });

  (data ?? []).forEach((barbershop) => {
    mergedBySlug.set(
      barbershop.slug,
      mapBarbershopRowToDemoBarbershop(barbershop),
    );
  });

  return {
    data: Array.from(mergedBySlug.values()),
    error: null,
  };
}

export async function resolveBarbershopBySlug(slug: string) {
  const fallbackDemo = getDemoBarbershopBySlug(slug);

  const [bshopResult, dbBarbers] = await Promise.all([
    getSupabaseClient()
      .from("barbershops")
      .select(barbershopSelectFields)
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle(),
    loadBarbersWithServices(slug),
  ]);

  if (bshopResult.data) {
    return {
      data: mapBarbershopRowToDemoBarbershop(bshopResult.data, dbBarbers),
      error: null,
    };
  }

  return {
    data: fallbackDemo ? { ...fallbackDemo, isActive: true } : null,
    error: bshopResult.error,
  };
}

export async function resolveManagedBarbershopBySlug(slug: string) {
  const fallbackDemo = getDemoBarbershopBySlug(slug);

  const [bshopResult, dbBarbers] = await Promise.all([
    getSupabaseClient()
      .from("barbershops")
      .select(barbershopSelectFields)
      .eq("slug", slug)
      .maybeSingle(),
    loadBarbersWithServices(slug),
  ]);

  if (bshopResult.data) {
    return {
      data: mapBarbershopRowToDemoBarbershop(bshopResult.data, dbBarbers),
      error: null,
    };
  }

  return {
    data: fallbackDemo ? { ...fallbackDemo, isActive: true } : null,
    error: bshopResult.error,
  };
}

type UpdateBarbershopSettingsInput = {
  slug: string;
  values: {
    name: string;
    description: string | null;
    whatsapp: string | null;
    instagram: string | null;
    address: string | null;
    logo_url?: string | null;
    google_reviews_url?: string | null;
    working_hours_start: string;
    working_hours_end: string;
    slot_interval_minutes: number;
    is_active: boolean;
  };
};

export async function updateBarbershopSettings({
  slug,
  values,
}: UpdateBarbershopSettingsInput) {
  const updateValues: BarbershopUpdate = {
    name: values.name,
    description: values.description,
    whatsapp: values.whatsapp,
    instagram: values.instagram,
    address: values.address,
    working_hours_start: values.working_hours_start,
    working_hours_end: values.working_hours_end,
    slot_interval_minutes: values.slot_interval_minutes,
    is_active: values.is_active,
  };
  if (values.logo_url !== undefined) {
    updateValues.logo_url = values.logo_url;
  }
  if (values.google_reviews_url !== undefined) {
    updateValues.google_reviews_url = values.google_reviews_url;
  }

  const { data, error } = await getSupabaseClient()
    .from("barbershops")
    .update(updateValues)
    .eq("slug", slug)
    .select(barbershopSelectFields)
    .single();

  return {
    data: data ? mapBarbershopRowToDemoBarbershop(data) : null,
    error,
  };
}
