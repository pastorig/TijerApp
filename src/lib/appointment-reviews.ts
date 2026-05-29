import { getSupabaseClient } from "@/lib/supabase";

export type AppointmentReviewRow = {
  id: string;
  appointment_id: string;
  barbershop_slug: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type AppointmentReviewWithContext = AppointmentReviewRow & {
  customer_name: string | null;
  customer_phone: string | null;
  service_name: string | null;
  barber_name: string | null;
  appointment_date: string | null;
};

export type ReviewContext = {
  appointment_id: string;
  barbershop_slug: string;
  barbershop_name: string | null;
  google_reviews_url: string | null;
  customer_name: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  already_submitted: boolean;
  is_in_future: boolean;
};

/**
 * Pide a la RPC pública el contexto del turno para mostrar el formulario
 * de reseña. Devuelve null si no se encuentra el token.
 */
export async function getReviewContextByToken(token: string) {
  const { data, error } = await getSupabaseClient().rpc(
    "get_appointment_review_context_by_token",
    { p_token: token },
  );
  if (error) return { data: null, error };
  const row = Array.isArray(data) ? data[0] : data;
  return { data: (row as ReviewContext | null) ?? null, error: null };
}

/**
 * Envía la reseña vía RPC pública. Devuelve { ok, reason }.
 */
export async function submitReviewByToken({
  token,
  rating,
  comment,
}: {
  token: string;
  rating: number;
  comment: string;
}) {
  const { data, error } = await getSupabaseClient().rpc(
    "submit_appointment_review_by_token",
    { p_token: token, p_rating: rating, p_comment: comment },
  );
  if (error) return { ok: false, reason: "rpc_error", error };
  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: Boolean(row?.ok),
    reason: (row?.reason as string | null) ?? null,
    error: null,
  };
}

/**
 * Lista reseñas de una barbería con el contexto del turno asociado.
 * Pensado para uso admin (depende de RLS).
 */
export async function listReviewsByBarbershop(barbershopSlug: string) {
  return getSupabaseClient()
    .from("appointment_reviews")
    .select(
      `
      id,
      appointment_id,
      barbershop_slug,
      rating,
      comment,
      created_at,
      appointments:appointment_id (
        customer_name,
        customer_phone,
        service_name,
        barber_name,
        appointment_date
      )
      `,
    )
    .eq("barbershop_slug", barbershopSlug)
    .order("created_at", { ascending: false });
}
