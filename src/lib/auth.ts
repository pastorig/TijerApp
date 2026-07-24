import { getSupabaseClient } from "@/lib/supabase";

type SignInInput = {
  email: string;
  password: string;
};

export async function getCurrentSession() {
  return getSupabaseClient().auth.getSession();
}

export async function getCurrentUser() {
  return getSupabaseClient().auth.getUser();
}

export async function signInWithEmailAndPassword({
  email,
  password,
}: SignInInput) {
  return getSupabaseClient().auth.signInWithPassword({
    email,
    password,
  });
}

export async function signOut() {
  return getSupabaseClient().auth.signOut();
}

/**
 * Manda el mail de "olvidé mi contraseña". El link del mail vuelve a
 * /nueva-password, donde Supabase deja una sesión de recuperación activa y
 * el usuario puede setear la nueva clave.
 *
 * `redirectTo` tiene que estar permitido en Supabase → Auth → URL
 * Configuration → Redirect URLs, si no el link del mail rebota.
 */
export async function sendPasswordResetEmail(email: string) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tijerapp.com");

  return getSupabaseClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/nueva-password`,
  });
}

/** Setea la contraseña nueva del usuario logueado (sesión de recuperación). */
export async function updateCurrentUserPassword(newPassword: string) {
  return getSupabaseClient().auth.updateUser({ password: newPassword });
}
