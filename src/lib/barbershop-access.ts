import { getUserFromLocalSession } from "@/lib/auth";
import { getSupabaseClient, type BarbershopAdminRow } from "@/lib/supabase";

type BarbershopAccessResult = {
  isAuthenticated: boolean;
  hasAccess: boolean;
  admin: BarbershopAdminRow | null;
  error: unknown;
};

export async function getCurrentUserAdminBarbershops() {
  // Sesión local, sin request de red: ver `getUserFromLocalSession`. Con
  // `getUser()` cualquier hipo de conexión se leía como "no logueado", y en la
  // PWA eso pateaba al barbero al login con la sesión intacta en el storage.
  const { user, error: userError } = await getUserFromLocalSession();

  if (userError || !user) {
    return {
      data: [],
      user: null,
      error: userError,
    };
  }

  const { data, error } = await getSupabaseClient()
    .from("barbershop_admins")
    .select("user_id, barbershop_slug, role")
    .eq("user_id", user.id)
    .order("barbershop_slug", { ascending: true });

  return {
    data: data ?? [],
    user,
    error,
  };
}

export async function userHasAccessToBarbershop(
  barbershopSlug: string,
): Promise<BarbershopAccessResult> {
  // Sesión local, sin request de red: ver `getUserFromLocalSession`. Con
  // `getUser()` cualquier hipo de conexión se leía como "no logueado", y en la
  // PWA eso pateaba al barbero al login con la sesión intacta en el storage.
  const { user, error: userError } = await getUserFromLocalSession();

  if (userError || !user) {
    return {
      isAuthenticated: false,
      hasAccess: false,
      admin: null,
      error: userError,
    };
  }

  const { data, error } = await getSupabaseClient()
    .from("barbershop_admins")
    .select("user_id, barbershop_slug, role")
    .eq("user_id", user.id)
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();

  return {
    isAuthenticated: true,
    hasAccess: Boolean(data) && !error,
    admin: data ?? null,
    error,
  };
}

export async function requireBarbershopAccess(barbershopSlug: string) {
  return userHasAccessToBarbershop(barbershopSlug);
}
