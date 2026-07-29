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

/**
 * Usuario de la sesión guardada localmente, sin pegarle a la red.
 *
 * `auth.getUser()` hace un request a Supabase para validar el token; si la red
 * está lenta o caída, devuelve error y quien lo llame concluye "no está
 * logueado". En la PWA eso pasaba seguido: al reabrir la app desde el ícono hay
 * un instante de red mala y el barbero terminaba pateado al login con la sesión
 * intacta en el storage.
 *
 * `auth.getSession()` lee del storage local (y refresca solo si hace falta y
 * puede), así que sirve para decidir **qué UI mostrar**. Para autorizar de
 * verdad no alcanza y no se usa para eso: los datos los protege RLS y los
 * endpoints `/api/*` validan el token server-side con `getUser()`, que es donde
 * corresponde no confiar en el cliente.
 */
export async function getUserFromLocalSession() {
  const { data, error } = await getSupabaseClient().auth.getSession();
  return { user: data.session?.user ?? null, error };
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
