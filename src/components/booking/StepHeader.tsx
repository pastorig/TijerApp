"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { EASE_SUAVE } from "./BookingMotion";

type StepHeaderProps = {
  /** Número del paso (1, 2, 3…). */
  number: number;
  title: string;
  subtitle?: string;
  /** true cuando el paso ya tiene una selección hecha. */
  done?: boolean;
  /**
   * true cuando todavía no se puede usar porque falta un paso de arriba.
   *
   * Sin esto los cuatro pasos se ven igual de disponibles, y el que baja
   * directo a la fecha no tiene forma de darse cuenta de que le falta algo.
   */
  locked?: boolean;
};

/**
 * Encabezado de paso para el flujo de reserva: número en círculo + título +
 * subtítulo opcional. Da orden y guía visual sin ser un wizard.
 *
 * Cuando el paso se completa, el círculo da un salto corto y el número se
 * cambia por un tilde: es la confirmación de que la elección quedó tomada.
 */
export function StepHeader({
  number,
  title,
  subtitle,
  done,
  locked,
}: StepHeaderProps) {
  // `locked` gana sobre `done`: el paso de la fecha arranca con hoy puesto, así
  // que se pintaba como completado incluso mientras seguía cerrado — justo el
  // paso donde se pierde la gente.
  const completo = Boolean(done) && !locked;

  return (
    <div className="flex items-center gap-3">
      <motion.span
        aria-hidden="true"
        // `initial={false}`: lo que ya viene completo al cargar no salta.
        initial={false}
        animate={{ scale: completo ? [1, 1.22, 1] : 1 }}
        transition={{ duration: 0.36, ease: EASE_SUAVE }}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-black tabular-nums transition-colors",
          locked
            ? "border-[color:var(--border-default)] bg-[color:var(--surface-1)] text-[color:var(--text-subtle)]"
            : done
              ? "border-[color:var(--brand-gold)] bg-gold-grad text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_0_14px_-4px_rgba(201,162,62,0.7)]"
              : "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={completo ? "tilde" : "numero"}
            initial={{ opacity: 0, scale: 0.5, rotate: completo ? -45 : 0 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.14, ease: EASE_SUAVE }}
            className="flex items-center justify-center"
          >
            {completo ? <Check className="size-3.5" strokeWidth={3.5} /> : number}
          </motion.span>
        </AnimatePresence>
      </motion.span>
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-bold",
            locked ? "text-[color:var(--text-muted)]" : "text-white",
          )}
        >
          {title}
        </p>
        {subtitle ? (
          <p className="text-[11px] leading-4 text-[color:var(--text-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
