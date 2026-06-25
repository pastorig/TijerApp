import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export type AppointmentDeposit = {
  status: "pending" | "paid" | "expired" | "failed" | null;
  amount: number | null;
  expiresAt: string | null;
  /** true si la seña sigue pendiente y no venció (se puede pagar). */
  payable: boolean;
};

/**
 * Lee el estado de la seña de un turno por su confirmation_token. Usa el
 * service_role (server-only) porque los campos de seña no están en el RPC
 * público. Devuelve null si el turno no tiene seña (deposit_status null).
 */
export async function getAppointmentDepositByToken(
  token: string,
): Promise<AppointmentDeposit | null> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("appointments")
    .select("deposit_status, deposit_amount, deposit_expires_at")
    .eq("confirmation_token", token)
    .maybeSingle();

  const row = data as {
    deposit_status: AppointmentDeposit["status"];
    deposit_amount: number | null;
    deposit_expires_at: string | null;
  } | null;

  if (!row || !row.deposit_status) {
    return null;
  }

  const notExpired = row.deposit_expires_at
    ? new Date(row.deposit_expires_at) > new Date()
    : true;

  return {
    status: row.deposit_status,
    amount: row.deposit_amount,
    expiresAt: row.deposit_expires_at,
    payable: row.deposit_status === "pending" && notExpired,
  };
}
