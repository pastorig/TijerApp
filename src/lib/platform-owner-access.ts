import { getSupabaseClient, type PlatformOwnerRow } from "@/lib/supabase";

type PlatformOwnerAccessResult = {
  isAuthenticated: boolean;
  isOwner: boolean;
  owner: PlatformOwnerRow | null;
  error: unknown;
};

export async function getCurrentPlatformOwnerAccess(): Promise<PlatformOwnerAccessResult> {
  const {
    data: { user },
    error: userError,
  } = await getSupabaseClient().auth.getUser();

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
