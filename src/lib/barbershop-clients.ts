import {
  getSupabaseClient,
  type BarbershopClientRow,
} from "@/lib/supabase";

const clientSelect =
  "id, created_at, updated_at, barbershop_slug, phone_normalized, phone_display, name, notes, tags, deleted_at";

/** Normaliza un teléfono igual que la función SQL: saca todo lo que no son dígitos. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

export async function listClientsByBarbershop(barbershopSlug: string) {
  return getSupabaseClient()
    .from("barbershop_clients")
    .select(clientSelect)
    .eq("barbershop_slug", barbershopSlug)
    .is("deleted_at", null)
    .order("name", { ascending: true });
}

export async function getClientById(clientId: string) {
  return getSupabaseClient()
    .from("barbershop_clients")
    .select(clientSelect)
    .eq("id", clientId)
    .is("deleted_at", null)
    .maybeSingle();
}

export async function getClientByPhone({
  barbershopSlug,
  phoneNormalized,
}: {
  barbershopSlug: string;
  phoneNormalized: string;
}) {
  return getSupabaseClient()
    .from("barbershop_clients")
    .select(clientSelect)
    .eq("barbershop_slug", barbershopSlug)
    .eq("phone_normalized", phoneNormalized)
    .is("deleted_at", null)
    .maybeSingle();
}

export async function updateClientNotes({
  clientId,
  notes,
}: {
  clientId: string;
  notes: string | null;
}) {
  return getSupabaseClient()
    .from("barbershop_clients")
    .update({ notes })
    .eq("id", clientId)
    .select(clientSelect)
    .single();
}

export async function updateClientName({
  clientId,
  name,
}: {
  clientId: string;
  name: string;
}) {
  return getSupabaseClient()
    .from("barbershop_clients")
    .update({ name })
    .eq("id", clientId)
    .select(clientSelect)
    .single();
}

export async function updateClientTags({
  clientId,
  tags,
}: {
  clientId: string;
  tags: string[];
}) {
  return getSupabaseClient()
    .from("barbershop_clients")
    .update({ tags })
    .eq("id", clientId)
    .select(clientSelect)
    .single();
}

export type BarbershopClient = BarbershopClientRow;
