import {
  getSupabaseClient,
  type BarberInsert,
  type BarberUpdate,
} from "@/lib/supabase";

type CreateBarberInput = BarberInsert;
type UpdateBarberInput = {
  barberId: string;
  values: BarberUpdate;
};
type ToggleBarberActiveInput = {
  barberId: string;
  isActive: boolean;
};

export async function listBarbersByBarbershop(barbershopSlug: string) {
  const { data, error } = await getSupabaseClient()
    .from("barbers")
    .select(
      "id, created_at, barbershop_slug, name, display_name, role, whatsapp, is_active, is_owner, deleted_at, commission_percent",
    )
    .eq("barbershop_slug", barbershopSlug)
    .is("deleted_at", null)
    .order("is_owner", { ascending: false })
    .order("created_at", { ascending: true });

  return { data, error };
}

export async function listActiveBarbersByBarbershop(barbershopSlug: string) {
  const { data, error } = await getSupabaseClient()
    .from("barbers")
    .select(
      "id, created_at, barbershop_slug, name, display_name, role, whatsapp, is_active, is_owner, deleted_at, commission_percent",
    )
    .eq("barbershop_slug", barbershopSlug)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("is_owner", { ascending: false })
    .order("created_at", { ascending: true });

  return { data, error };
}

export async function createBarber(barber: CreateBarberInput) {
  return getSupabaseClient().from("barbers").insert(barber).select().single();
}

export async function updateBarber({ barberId, values }: UpdateBarberInput) {
  return getSupabaseClient()
    .from("barbers")
    .update(values)
    .eq("id", barberId)
    .select()
    .single();
}

export async function toggleBarberActive({
  barberId,
  isActive,
}: ToggleBarberActiveInput) {
  return updateBarber({
    barberId,
    values: {
      is_active: isActive,
    },
  });
}

export async function deleteBarber(barberId: string) {
  return updateBarber({
    barberId,
    values: {
      is_active: false,
      deleted_at: new Date().toISOString(),
    },
  });
}

/**
 * Marca un barbero como "cabeza" de la barbería. Desmarca primero al resto
 * para respetar el partial unique index (un solo owner por barbershop_slug).
 */
export async function setBarberAsOwner({
  barberId,
  barbershopSlug,
}: {
  barberId: string;
  barbershopSlug: string;
}) {
  const supabase = getSupabaseClient();

  // 1) Desmarcar a todos los owners actuales de esta barbería.
  const { error: unsetError } = await supabase
    .from("barbers")
    .update({ is_owner: false })
    .eq("barbershop_slug", barbershopSlug)
    .eq("is_owner", true);
  if (unsetError) return { data: null, error: unsetError };

  // 2) Marcar al elegido como owner.
  return supabase
    .from("barbers")
    .update({ is_owner: true })
    .eq("id", barberId)
    .select(
      "id, created_at, barbershop_slug, name, display_name, role, whatsapp, is_active, is_owner, deleted_at, commission_percent",
    )
    .single();
}
