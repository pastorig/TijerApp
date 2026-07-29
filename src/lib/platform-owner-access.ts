import { getUserFromLocalSession } from "@/lib/auth";
import { getSupabaseClient, type PlatformOwnerRow } from "@/lib/supabase";

type PlatformOwnerAccessResult = {
  isAuthenticated: boolean;
  isOwner: boolean;
  owner: PlatformOwnerRow | null;
  error: unknown;
};

export async function getCurrentPlatformOwnerAccess(): Promise<PlatformOwnerAccessResult> {
  // Sesión local, sin request de red: ver `getUserFromLocalSession`. El guard
  // del admin llama a esto en paralelo con el chequeo de la barbería, así que
  // eran DOS round-trips antes de mostrar nada, y cualquiera de los dos que
  // fallara mandaba al login.
  const { user, error: userError } = await getUserFromLocalSession();

  if (userError || !user) {
    return {
      isAuthenticated: false,
      isOwner: false,
      owner: null,
      error: userError,
    };
  }

  const { data, error } = await getSupabaseClient()
    .from("platform_owners")
    .select("user_id, created_at, role")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    isAuthenticated: true,
    isOwner: Boolean(data) && !error,
    owner: data ?? null,
    error,
  };
}
