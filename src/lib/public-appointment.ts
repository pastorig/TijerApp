import { getSupabaseClient } from "@/lib/supabase";

/**
 * Cliente público para el flow de confirmar/cancelar turno via token.
 * Estos endpoints usan RPCs `security definer` en Supabase, así que NO
 * dependen de RLS — el token es la única credencial.
 */

export type PublicAppointmentByToken = {
  id: string;
  barbershop_slug: string;
  barbershop_name: string;
  barber_name: string;
  customer_name: string;
  service_name: string;
  service_price: number;
  service_duration_minutes: number;
  appointment_date: string; // "YYYY-MM-DD"
  appointment_time: string; // "HH:MM" o "HH:MM:SS"
  comment: string | null;
  status: "pending" | "confirmed" | "cancelled" | "deleted";
  // Si se aplicó un cupón al reservar, el RPC devuelve el código,
  // el monto del descuento y el precio final. Si no, son null.
  coupon_code: string | null;
  discount_amount: number | null;
  final_price: number;
};

export async function getPublicAppointmentByToken(token: string) {
  const { data, error } = await getSupabaseClient().rpc(
    "get_public_appointment_by_token",
    { p_token: token },
  );

  if (error) {
    return { data: null, error };
  }

  // El RPC devuelve un array (returns table) — agarramos la primera fila.
  const row = (data as PublicAppointmentByToken[] | null)?.[0] ?? null;

  return { data: row, error: null };
}

type ActionResult = {
  ok: boolean;
  status: PublicAppointmentByToken["status"] | null;
  reason: string;
};

function parseActionResult(raw: unknown): ActionResult {
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    return {
      ok: Boolean(obj.ok),
      status:
        (obj.status as ActionResult["status"]) ?? null,
      reason: typeof obj.reason === "string" ? obj.reason : "unknown",
    };
  }
  return { ok: false, status: null, reason: "unknown" };
}

export async function confirmAppointmentByToken(token: string) {
  const { data, error } = await getSupabaseClient().rpc(
    "confirm_appointment_by_token",
    { p_token: token },
  );

  if (error) {
    return { ok: false, status: null, reason: error.message };
  }

  return parseActionResult(data);
}

export async function cancelAppointmentByToken(token: string) {
  const { data, error } = await getSupabaseClient().rpc(
    "cancel_appointment_by_token",
    { p_token: token },
  );

  if (error) {
    return { ok: false, status: null, reason: error.message };
  }

  return parseActionResult(data);
}
