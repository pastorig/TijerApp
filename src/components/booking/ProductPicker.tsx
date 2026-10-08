"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Package, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { MAX_UNIDADES_POR_PRODUCTO } from "@/lib/productos";
import { EASE_SUAVE } from "./BookingMotion";

export type ProductoParaElegir = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  public_url: string | null;
};

type ProductPickerProps = {
  productos: ProductoParaElegir[];
  /** Cuántas unidades de cada producto sumó el cliente (0 o ausente = ninguna). */
  cantidades: Record<string, number>;
  disabled?: boolean;
  onChange: (productId: string, cantidad: number) => void;
};

/**
 * "¿Te llevás algo?" — el paso opcional de la reserva donde el cliente suma
 * productos del catálogo a su turno (feature 035).
 *
 * Es una TIRA que se desliza de costado, no una lista. En el celular, una
 * lista de diez productos empujaría "Tus datos" dos pantallas para abajo, y
 * este paso es opcional: no puede alejar al cliente de terminar la reserva.
 *
 * Sumar son dos toques como mucho: "Sumar" y, si quiere más de uno, el "+".
 */
export function ProductPicker({
  productos,
  cantidades,
  disabled,
  onChange,
}: ProductPickerProps) {
  return (
    <ul
      aria-label="Productos para sumar a tu turno"
      className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
    >
      {productos.map((producto) => {
        const cantidad = cantidades[producto.id] ?? 0;
        const elegido = cantidad > 0;
        return (
          <li
            key={producto.id}
            className={cn(
              "relative flex w-36 shrink-0 snap-start flex-col overflow-hidden rounded-[var(--radius-md)] border transition-colors duration-[var(--duration-base)] sm:w-40",
              elegido
                ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] shadow-[0_0_30px_-12px_rgba(201,162,62,0.65)]"
                : "key-dark border-[color:var(--border-default)]",
            )}
          >
            <div className="relative aspect-square w-full overflow-hidden bg-[color:var(--surface-2)]">
              {producto.public_url ? (
                <Image
                  src={producto.public_url}
                  alt=""
                  fill
                  sizes="160px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-full items-center justify-center text-[color:var(--brand-gold)]/40"
                >
                  <Package className="size-7" />
                </span>
              )}
              {/* La cantidad, arriba de la foto: se ve de un vistazo qué sumó. */}
              <AnimatePresence>
                {elegido ? (
                  <motion.span
                    key="cantidad"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ type: "spring", duration: 0.35, bounce: 0.35 }}
                    className="gloss-gold absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-gold-grad font-mono text-xs font-black tabular-nums text-black"
                    aria-hidden="true"
                  >
                    {cantidad}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="flex flex-1 flex-col gap-1 p-2.5">
              <p className="line-clamp-2 min-h-[2.5em] break-words text-[13px] font-bold leading-tight text-white">
                {producto.name}
              </p>
              <p className="font-mono text-sm font-black tabular-nums text-[color:var(--brand-gold)]">
                {formatPrice(producto.price)}
              </p>

              <div className="mt-auto pt-1.5">
                {elegido ? (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: EASE_SUAVE }}
                    className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/50 bg-black/40"
                  >
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onChange(producto.id, cantidad - 1)}
                      aria-label={
                        cantidad === 1
                          ? `Quitar ${producto.name}`
                          : `Una unidad menos de ${producto.name}`
                      }
                      className="inline-flex size-11 items-center justify-center text-[color:var(--brand-gold)] transition enabled:active:scale-90 disabled:opacity-40"
                    >
                      <Minus className="size-4" aria-hidden="true" />
                    </button>
                    <span
                      aria-live="polite"
                      className="font-mono text-sm font-black tabular-nums text-white"
                    >
                      <span className="sr-only">Cantidad: </span>
                      {cantidad}
                    </span>
                    <button
                      type="button"
                      disabled={disabled || cantidad >= MAX_UNIDADES_POR_PRODUCTO}
                      onClick={() => onChange(producto.id, cantidad + 1)}
                      aria-label={`Una unidad más de ${producto.name}`}
                      className="inline-flex size-11 items-center justify-center text-[color:var(--brand-gold)] transition enabled:active:scale-90 disabled:opacity-30"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </button>
                  </motion.div>
                ) : (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(producto.id, 1)}
                    aria-label={`Sumar ${producto.name} a tu turno`}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/50 text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--brand-gold)] transition duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold)]/15 enabled:active:scale-[0.97] disabled:opacity-40"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Sumar
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
