"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus, Tag, Trash2 } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { useConfirm, useToast } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import type { CouponRow } from "@/lib/supabase";

type Props = { barbershop: DemoBarbershop };

export function AdminCouponsManager({ barbershop }: Props) {
  const toast = useToast();
  const confirm = useConfirm();
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

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
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Sesión expirada");
        return;
      }
      const res = await fetch(
        `/api/admin/coupons?barbershopSlug=${encodeURIComponent(barbershop.slug)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("Error cargando cupones", {
          description: err.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      const data = (await res.json()) as { coupons: CouponRow[] };
      setCoupons(data.coupons);
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

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
          Feature Pro
        </p>
        <h1 className="mt-2 text-2xl font-black uppercase leading-tight tracking-tight sm:text-3xl lg:text-4xl">
          Cupones de descuento
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)]">
          Crea cupones con código que tus clientes pueden aplicar al reservar.
          Soporta descuento porcentual o monto fijo, con vencimiento y límite
          de usos.
        </p>
      </header>

      {/* Formulario crear cupón */}
      <section className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5 sm:p-6">
        <h2 className="text-lg font-black uppercase tracking-tight">
          Nuevo cupón
        </h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
                Código <span className="text-[color:var(--danger)]">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                minLength={3}
                maxLength={30}
                placeholder="VERANO20"
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 font-mono uppercase tracking-wider text-white outline-none focus:border-[color:var(--brand-gold)]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
                Descripción <span className="text-[color:var(--text-muted)]">— opcional</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={100}
                placeholder="Promo verano"
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 text-white outline-none focus:border-[color:var(--brand-gold)]"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
                Tipo de descuento
              </label>
              <div className="mt-2 inline-flex rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] p-0.5">
                <button
                  type="button"
                  onClick={() => setDiscountType("percent")}
                  className={cn(
                    "min-h-10 rounded-[var(--radius-xs)] px-4 text-xs font-bold uppercase tracking-[0.14em] transition-colors",
                    discountType === "percent"
                      ? "bg-[color:var(--brand-gold)] text-black"
                      : "text-[color:var(--text-secondary)]",
                  )}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("fixed")}
                  className={cn(
                    "min-h-10 rounded-[var(--radius-xs)] px-4 text-xs font-bold uppercase tracking-[0.14em] transition-colors",
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
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
                Valor <span className="text-[color:var(--danger)]">*</span>
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                required
                min={1}
                max={discountType === "percent" ? 100 : undefined}
                step={discountType === "percent" ? 1 : 100}
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 text-white outline-none focus:border-[color:var(--brand-gold)]"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
                Vence el <span className="text-[color:var(--text-muted)]">— opcional</span>
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 text-white outline-none focus:border-[color:var(--brand-gold)]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
                Límite de usos <span className="text-[color:var(--text-muted)]">— opcional</span>
              </label>
              <input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                min={1}
                placeholder="Ej. 50"
                className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 text-white outline-none focus:border-[color:var(--brand-gold)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-6 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="size-4" />
            {isCreating ? "Creando…" : "Crear cupón"}
          </button>
        </form>
      </section>

      {/* Lista de cupones */}
      <section className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5 sm:p-6">
        <h2 className="text-lg font-black uppercase tracking-tight">
          Cupones existentes
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
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
                    : "border-[color:var(--border-subtle)] opacity-60",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Tag className="size-4 shrink-0 text-[color:var(--brand-gold)]" />
                      <code className="font-mono text-lg font-black tracking-wider text-white">
                        {c.code}
                      </code>
                    </div>
                    {c.description ? (
                      <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
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
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(c)}
                      className="inline-flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-3 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
                    >
                      {c.is_active ? "Pausar" : "Activar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(c)}
                      className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 px-3 text-[color:var(--danger)] transition-colors hover:bg-[color:var(--danger-soft)]"
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
    </main>
  );
}
