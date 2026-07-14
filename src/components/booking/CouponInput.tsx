"use client";

import { useState } from "react";
import { Check, Loader2, Tag, X } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { validatePublicCoupon, type CouponValidation } from "@/lib/public-coupons";

type AppliedCoupon = Extract<CouponValidation, { valid: true }> & { code: string };

type CouponInputProps = {
  barbershopSlug: string;
  servicePrice: number;
  applied: AppliedCoupon | null;
  onApply: (coupon: AppliedCoupon) => void;
  onRemove: () => void;
};

/**
 * Input de cupón de descuento para el booking form.
 * - Cuando no hay cupón aplicado: input + botón "Aplicar"
 * - Cuando hay cupón aplicado: badge gold con código, descuento y "X" para remover
 *
 * Se ENCARGA solo de la UI del cupón. La integración con el insert del
 * appointment la hace el BookingForm parent (lee `applied` y pasa coupon_id
 * + discount_amount al endpoint).
 */
export function CouponInput({
  barbershopSlug,
  servicePrice,
  applied,
  onApply,
  onRemove,
}: CouponInputProps) {
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string>("");

  async function handleApply() {
    const trimmed = code.trim();
    if (trimmed.length < 3) {
      setError("Mínimo 3 caracteres.");
      return;
    }
    setError("");
    setIsValidating(true);
    try {
      const result = await validatePublicCoupon({
        barbershopSlug,
        code: trimmed,
        servicePrice,
      });
      if (!result.valid) {
        setError(result.errorMessage);
        return;
      }
      onApply({ ...result, code: trimmed.toUpperCase() });
      setCode("");
    } finally {
      setIsValidating(false);
    }
  }

  if (applied) {
    return (
      <div className="rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Check
              aria-hidden="true"
              className="size-4 shrink-0 text-[color:var(--brand-gold)]"
            />
            <div className="min-w-0">
              <p className="font-mono text-sm font-black tracking-wider text-white">
                {applied.code}
              </p>
              <p className="text-[11px] text-[color:var(--text-secondary)]">
                {applied.discountType === "percent"
                  ? `${applied.discountValue}% OFF`
                  : `${formatPrice(applied.discountValue)} OFF`}{" "}
                · Ahorrás {formatPrice(applied.discountAmount)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remover cupón"
            className="shrink-0 rounded-[var(--radius-xs)] border border-[color:var(--border-default)] p-1.5 text-[color:var(--text-muted)] transition-colors hover:border-[color:var(--danger)] hover:text-[color:var(--danger)]"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Tag
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[color:var(--text-muted)]"
          />
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleApply();
              }
            }}
            placeholder="Código de cupón"
            maxLength={30}
            className="w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] py-2 pl-9 pr-3 font-mono uppercase tracking-wider text-white outline-none focus:border-[color:var(--brand-gold)] placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-[color:var(--text-muted)]"
          />
        </div>
        <button
          type="button"
          onClick={() => void handleApply()}
          disabled={isValidating || code.trim().length === 0}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] transition-colors hover:bg-gold-grad hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isValidating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            "Aplicar"
          )}
        </button>
      </div>
      {error ? (
        <p className="text-[11px] font-semibold text-[color:var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
