"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Copy, Loader2, Plus, Tag, Trash2 } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { useConfirm, useToast } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import type { CouponRow } from "@/lib/supabase";
import { OnboardingTip } from "./OnboardingTip";

type Props = { barbershop: DemoBarbershop };

function couponStatus(coupon: CouponRow) {
  if (!coupon.is_active) return "Pausado";
  const now = Date.now();
  if (coupon.valid_from && now < Date.parse(coupon.valid_from)) return "Próximamente";
  if (coupon.valid_until && now > Date.parse(coupon.valid_until)) return "Vencido";
  if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) return "Agotado";
  return "Vigente";
}

export function AdminCouponsManager({ barbershop }: Props) {
  const toast = useToast();
  const confirm = useConfirm();
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form fields para nuevo cupón
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    "percent",
  );
  const [discountValue, setDiscountValue] = useState(10);
  const [validUntil, setValidUntil] = useState("");
  const [usageLimit, setUsageLimit] = useState("");

  async function load() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setLoadError("Sesión expirada. Volvé a iniciar sesión.");
        toast.error("Sesión expirada");
        return;
      }
      const res = await fetch(
        `/api/admin/coupons?barbershopSlug=${encodeURIComponent(barbershop.slug)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setLoadError(err.error ?? "No pudimos cargar los cupones.");
        toast.error("Error cargando cupones", {
          description: err.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      const data = (await res.json()) as { coupons: CouponRow[] };
      setCoupons(data.coupons);
    } catch {
      setLoadError("No pudimos cargar los cupones. Intentá nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barbershop.slug]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          barbershopSlug: barbershop.slug,
          code: code.trim(),
          description: description.trim() || null,
          discount_type: discountType,
          discount_value: discountValue,
          valid_until: validUntil || null,
          usage_limit: usageLimit ? Number(usageLimit) : null,
          is_active: true,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("No se pudo crear", { description: err.error });
        return;
      }
      toast.success("Cupón creado", { description: code.toUpperCase() });
      // Reset form
      setCode("");
      setDescription("");
      setDiscountValue(10);
      setValidUntil("");
      setUsageLimit("");
      await load();
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleActive(coupon: CouponRow) {
    const { data: sessionData } = await getCurrentSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return;
    const res = await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        id: coupon.id,
        barbershopSlug: barbershop.slug,
        is_active: !coupon.is_active,
      }),
    });
    if (!res.ok) {
      toast.error("No se pudo actualizar");
      return;
    }
    toast.success(coupon.is_active ? "Cupón pausado" : "Cupón activado");
    await load();
  }

  async function handleDelete(coupon: CouponRow) {
    const ok = await confirm({
      title: `Eliminar cupón ${coupon.code}?`,
      message: `Se borrará permanentemente. ${coupon.usage_count > 0 ? `Tiene ${coupon.usage_count} uso(s) registrados.` : ""}`,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;

    const { data: sessionData } = await getCurrentSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return;
    const res = await fetch("/api/admin/coupons", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ id: coupon.id, barbershopSlug: barbershop.slug }),
    });
    if (!res.ok) {
      toast.error("No se pudo eliminar");
      return;
    }
    toast.success("Cupón eliminado");
    await load();
  }

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado", { description: code });
    } catch {
      toast.error("No pudimos copiar el código.");
    }
  }

  return (
    <section aria-label="Cupones" className="mx-auto w-full max-w-5xl space-y-6">
      <header className="relative">
        <p className="text-xs font-semibold tracking-normal text-[color:var(--brand-gold)]">
          Feature Pro
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-normal sm:text-3xl lg:text-3xl">
          Cupones de descuento
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)]">
          Crea cupones con código que tus clientes pueden aplicar al reservar.
          Soporta descuento porcentual o monto fijo, con vencimiento y límite
          de usos.
        </p>
        <OnboardingTip
          id="coupons-first-visit"
          title="Empezá con un código simple"
          description="Probá crear un VERANO20 (20% off) sin vencimiento ni límite. Después lo compartís por WhatsApp/Instagram con tus clientes para tracking de campañas."
          placement="bottom"
          className="left-0 mt-3"
        />
      </header>

      {/* Formulario crear cupón */}
      <section className="border-t border-[color:var(--border-subtle)] pt-5">
        <h2 className="text-lg font-semibold tracking-normal">
          Nuevo cupón
        </h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="coupon-code" className="text-xs font-bold tracking-normal text-[color:var(--brand-gold)]">
                Código <span className="text-[color:var(--danger)]">*</span>
              </label>
              <input
                id="coupon-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                minLength={3}
                maxLength={30}
                placeholder="VERANO20"
                className="mt-2 min-h-11 w-full text-base sm:text-sm rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 font-mono tracking-normal text-white outline-none focus:border-[color:var(--brand-gold)]"
              />
            </div>
            <div>
              <label htmlFor="coupon-description" className="text-xs font-bold tracking-normal text-[color:var(--brand-gold)]">
                Descripción <span className="text-[color:var(--text-muted)]">— opcional</span>
              </label>
              <input
                id="coupon-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={100}
                placeholder="Promo verano"
                className="mt-2 min-h-11 w-full text-base sm:text-sm rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 text-white outline-none focus:border-[color:var(--brand-gold)]"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold tracking-normal text-[color:var(--brand-gold)]">
                Tipo de descuento
              </label>
              <div role="group" aria-label="Tipo de descuento" className="mt-2 inline-flex rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] p-0.5">
                <button
                  type="button"
                  aria-pressed={discountType === "percent"}
                  aria-label="Descuento porcentual"
                  onClick={() => setDiscountType("percent")}
                  className={cn(
                    "min-h-11 rounded-[var(--radius-xs)] px-4 text-xs font-bold tracking-normal transition-colors",
                    discountType === "percent"
                      ? "bg-[color:var(--brand-gold)] text-black"
                      : "text-[color:var(--text-secondary)]",
                  )}
                >
                  %
                </button>
                <button
                  type="button"
                  aria-pressed={discountType === "fixed"}
                  aria-label="Descuento fijo en pesos"
                  onClick={() => setDiscountType("fixed")}
                  className={cn(
                    "min-h-11 rounded-[var(--radius-xs)] px-4 text-xs font-bold tracking-normal transition-colors",
                    discountType === "fixed"
                      ? "bg-[color:var(--brand-gold)] text-black"
                      : "text-[color:var(--text-secondary)]",
                  )}
                >
                  $ ARS
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="coupon-value" className="text-xs font-bold tracking-normal text-[color:var(--brand-gold)]">
                Valor ({discountType === "percent" ? "%" : "ARS"}) <span className="text-[color:var(--danger)]">*</span>
              </label>
              <input
                id="coupon-value"
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                required
                min={1}
                max={discountType === "percent" ? 100 : undefined}
                step={discountType === "percent" ? 1 : 100}
                className="mt-2 min-h-11 w-full text-base sm:text-sm rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 text-white outline-none focus:border-[color:var(--brand-gold)]"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="coupon-expiry" className="text-xs font-bold tracking-normal text-[color:var(--brand-gold)]">
                Vence el <span className="text-[color:var(--text-muted)]">— opcional</span>
              </label>
              <input
                id="coupon-expiry"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-2 min-h-11 w-full text-base sm:text-sm rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 text-white outline-none focus:border-[color:var(--brand-gold)]"
              />
            </div>
            <div>
              <label htmlFor="coupon-limit" className="text-xs font-bold tracking-normal text-[color:var(--brand-gold)]">
                Límite de usos <span className="text-[color:var(--text-muted)]">— opcional</span>
              </label>
              <input
                id="coupon-limit"
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                min={1}
                placeholder="Ej. 50"
                className="mt-2 min-h-11 w-full text-base sm:text-sm rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 text-white outline-none focus:border-[color:var(--brand-gold)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-6 text-sm font-bold tracking-normal text-black transition-colors hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="size-4" />
            {isCreating ? "Creando…" : "Crear cupón"}
          </button>
        </form>
      </section>

      {/* Lista de cupones */}
      <section className="border-t border-[color:var(--border-subtle)] pt-5">
        <h2 className="text-lg font-semibold tracking-normal">
          Cupones existentes
        </h2>
        {loadError ? (
          <div role="alert" className="mt-4 rounded-lg border border-red-400/30 p-4 text-sm">
            <p>{loadError}</p>
            <button type="button" onClick={() => void load()} className="mt-2 min-h-11 px-3 font-semibold text-[color:var(--brand-gold)]">Reintentar</button>
          </div>
        ) : isLoading ? (
          <div role="status" aria-label="Cargando cupones" className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-[color:var(--brand-gold)]" />
          </div>
        ) : coupons.length === 0 ? (
          <p className="mt-6 rounded-[var(--radius-sm)] border border-dashed border-[color:var(--border-subtle)] py-8 text-center text-sm text-[color:var(--text-muted)]">
            No hay cupones creados todavía.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {coupons.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "rounded-[var(--radius-sm)] border bg-[color:var(--surface-0)] p-4",
                  c.is_active
                    ? "border-[color:var(--border-default)]"
                    : "border-[color:var(--border-subtle)]",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Tag className="size-4 shrink-0 text-[color:var(--brand-gold)]" />
                      <code className="break-all font-mono text-base font-semibold tracking-normal text-white">
                        {c.code}
                      </code>
                      <button type="button" title="Copiar código" aria-label={`Copiar código ${c.code}`} onClick={() => void handleCopy(c.code)} className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[color:var(--border-subtle)] text-[color:var(--text-secondary)] hover:text-[color:var(--brand-gold)]"><Copy className="size-4" /></button>
                    </div>
                    {c.description ? (
                      <p className="mt-1 break-words text-xs text-[color:var(--text-secondary)]">
                        {c.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-[color:var(--text-muted)]">
                      <span className="font-bold text-[color:var(--brand-gold)]">
                        {c.discount_type === "percent"
                          ? `${c.discount_value}% OFF`
                          : `$${c.discount_value} OFF`}
                      </span>
                      {c.valid_until ? (
                        <>
                          {" "}
                          · Vence {new Date(c.valid_until).toLocaleDateString("es-AR")}
                        </>
                      ) : null}
                      {c.usage_limit ? (
                        <>
                          {" "}
                          · {c.usage_count}/{c.usage_limit} usos
                        </>
                      ) : (
                        <> · {c.usage_count} usos</>
                      )}
                    </p>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 border-t border-[color:var(--border-subtle)] pt-3">
                    <span className="mr-auto text-xs font-semibold text-[color:var(--text-secondary)]">{couponStatus(c)}</span>
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(c)}
                      className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-3 text-xs font-bold tracking-normal transition-colors hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
                    >
                      {c.is_active ? "Pausar" : "Activar"}
                    </button>
                    <button
                      type="button"
                      aria-label={`Eliminar cupón ${c.code}`}
                      title="Eliminar cupón"
                      onClick={() => void handleDelete(c)}
                      className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 px-3 text-[color:var(--danger)] transition-colors hover:bg-[color:var(--danger-soft)]"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
