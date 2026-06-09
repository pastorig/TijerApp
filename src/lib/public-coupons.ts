import { getSupabaseClient } from "@/lib/supabase";

/**
 * Helper público para validar un cupón desde el cliente (sin auth).
 * Usa la RPC validate_coupon_for_booking que verifica:
 *   - Existe el código en la barbería
 *   - Está activo (is_active=true)
 *   - Dentro de la ventana valid_from / valid_until
 *   - No superó usage_limit
 * Si valid=true devuelve el descuento calculado sobre service_price.
 */
export type CouponValidation =
  | {
      valid: true;
      couponId: string;
      discountType: "percent" | "fixed";
      discountValue: number;
      discountAmount: number;
      finalPrice: number;
    }
  | {
      valid: false;
      errorCode: "not_found" | "inactive" | "not_yet_valid" | "expired" | "limit_reached" | "unknown";
      errorMessage: string;
    };

export async function validatePublicCoupon(input: {
  barbershopSlug: string;
  code: string;
  servicePrice: number;
}): Promise<CouponValidation> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("validate_coupon_for_booking", {
    p_barbershop_slug: input.barbershopSlug,
    p_code: input.code.trim().toUpperCase(),
    p_service_price: input.servicePrice,
  });

  if (error || !data) {
    return {
      valid: false,
      errorCode: "unknown",
      errorMessage: "No pudimos validar el cupón.",
    };
  }

  const row = (data as Array<{
    is_valid: boolean;
    error_code: string | null;
    coupon_id: string | null;
    discount_type: "percent" | "fixed" | null;
    discount_value: number | null;
    discount_amount: number | null;
    final_price: number | null;
  }>)[0];

  if (!row || !row.is_valid) {
    const code = (row?.error_code ?? "unknown") as CouponValidation extends {
      errorCode: infer K;
    }
      ? K
      : never;
    return {
      valid: false,
      errorCode: code,
      errorMessage:
        code === "not_found"
          ? "Código inválido."
          : code === "inactive"
            ? "Ese cupón está pausado."
            : code === "not_yet_valid"
              ? "El cupón todavía no está vigente."
              : code === "expired"
                ? "El cupón venció."
                : code === "limit_reached"
                  ? "El cupón llegó al límite de usos."
                  : "No pudimos aplicar el cupón.",
    };
  }

  return {
    valid: true,
    couponId: row.coupon_id ?? "",
    discountType: row.discount_type ?? "percent",
    discountValue: row.discount_value ?? 0,
    discountAmount: row.discount_amount ?? 0,
    finalPrice: row.final_price ?? input.servicePrice,
  };
}
