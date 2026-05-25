import {
  getSupabaseClient,
  type AppointmentInsert,
} from "@/lib/supabase";

type AppointmentDraft = Omit<AppointmentInsert, "status">;

export async function createPendingAppointment(appointment: AppointmentDraft) {
  return getSupabaseClient()
    .from("appointments")
    .insert({ ...appointment, status: "pending" });
}

export async function listAppointmentsByBarbershop(barbershopSlug: string) {
  const { data, error } = await getSupabaseClient()
    .from("appointments")
    .select(
      "id, barbershop_slug, customer_name, customer_phone, service_name, service_price, service_duration_minutes, appointment_date, appointment_time, comment, status, created_at",
    )
    .eq("barbershop_slug", barbershopSlug)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });

  return { data, error };
}
