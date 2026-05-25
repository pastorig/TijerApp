import {
  getSupabaseClient,
  type BarberServiceInsert,
  type BarberServiceUpdate,
} from "@/lib/supabase";

type BarberServiceLookupInput = {
  barbershopSlug: string;
  barberId: string;
};

type UpdateBarberServiceInput = {
  serviceId: string;
  values: BarberServiceUpdate;
};

type ToggleBarberServiceActiveInput = {
  serviceId: string;
  isActive: boolean;
};

const barberServicesSelect =
  "id, created_at, barbershop_slug, barber_id, name, price, duration_minutes, is_active, deleted_at";

export async function listServicesByBarber({
  barbershopSlug,
  barberId,
}: BarberServiceLookupInput) {
  const { data, error } = await getSupabaseClient()
    .from("barber_services")
    .select(barberServicesSelect)
    .eq("barbershop_slug", barbershopSlug)
    .eq("barber_id", barberId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  return { data, error };
}

export async function listActiveServicesByBarber({
  barbershopSlug,
  barberId,
}: BarberServiceLookupInput) {
  const { data, error } = await getSupabaseClient()
    .from("barber_services")
    .select(barberServicesSelect)
    .eq("barbershop_slug", barbershopSlug)
    .eq("barber_id", barberId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  return { data, error };
}

export async function createBarberService(service: BarberServiceInsert) {
  return getSupabaseClient()
    .from("barber_services")
    .insert(service)
    .select()
    .single();
}

export async function updateBarberService({
  serviceId,
  values,
}: UpdateBarberServiceInput) {
  return getSupabaseClient()
    .from("barber_services")
    .update(values)
    .eq("id", serviceId)
    .select()
    .single();
}

export async function toggleBarberServiceActive({
  serviceId,
  isActive,
}: ToggleBarberServiceActiveInput) {
  return updateBarberService({
    serviceId,
    values: {
      is_active: isActive,
    },
  });
}

export async function deleteBarberServiceLogically(serviceId: string) {
  return updateBarberService({
    serviceId,
    values: {
      is_active: false,
      deleted_at: new Date().toISOString(),
    },
  });
}
