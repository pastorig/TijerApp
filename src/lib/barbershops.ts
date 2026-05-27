import {
  demoBarbershops,
  getDemoBarbershopBySlug,
  type DemoBarbershop,
} from "@/data/demo-barbershops";
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
  "id, created_at, slug, name, description, whatsapp, instagram, address, working_hours_start, working_hours_end, slot_interval_minutes, is_active";

function mapBarbershopRowToDemoBarbershop(
  barbershop: BarbershopRow,
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
    barbers: fallbackDemo?.barbers ?? [],
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

  const { data, error } = await getSupabaseClient()
    .from("barbershops")
    .select(barbershopSelectFields)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (data) {
    return {
      data: mapBarbershopRowToDemoBarbershop(data),
      error: null,
    };
  }

  return {
    data: fallbackDemo ? { ...fallbackDemo, isActive: true } : null,
    error,
  };
}

export async function resolveManagedBarbershopBySlug(slug: string) {
  const fallbackDemo = getDemoBarbershopBySlug(slug);

  const { data, error } = await getSupabaseClient()
    .from("barbershops")
    .select(barbershopSelectFields)
    .eq("slug", slug)
    .maybeSingle();

  if (data) {
    return {
      data: mapBarbershopRowToDemoBarbershop(data),
      error: null,
    };
  }

  return {
    data: fallbackDemo ? { ...fallbackDemo, isActive: true } : null,
    error,
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
