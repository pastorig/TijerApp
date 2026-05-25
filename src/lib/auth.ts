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
