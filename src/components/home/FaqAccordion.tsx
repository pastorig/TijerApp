"use client";

import { useState } from "react";
import { Minus } from "lucide-react";
import { cn } from "@/lib/cn";

export type FaqItem = {
  question: string;
  answer: string;
};

/**
 * Acordeón de preguntas frecuentes. Solo la lista — cada página pone su
 * propio `<section>` y encabezado, así se puede reusar con distinto copy.
 *
 * Se extrajo de HomeFaq cuando el FAQ de /precios (que era un `<dl>` plano
 * con todas las respuestas abiertas) pasó a ser desplegable: mismo patrón
 * en los dos lados, una sola implementación.
 *
 * `idPrefix` evita colisiones de id si algún día conviven dos FAQ en la
 * misma página.
 */
export function FaqAccordion({
  items,
  idPrefix = "faq",
  defaultOpenIndex = 0,
}: {
  items: FaqItem[];
  idPrefix?: string;
  defaultOpenIndex?: number | null;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpenIndex);

  return (
    <ul className="grid gap-2">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <li
            key={item.question}
            className={cn(
              "rounded-[var(--radius-md)] border transition-colors duration-[var(--duration-fast)]",
              isOpen
                ? "border-[color:var(--brand-gold)]/40 bg-[color:var(--surface-1)]"
                : "border-[color:var(--border-subtle)] bg-[color:var(--surface-1)]/60 hover:border-[color:var(--brand-gold)]/30",
            )}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              aria-controls={`${idPrefix}-answer-${index}`}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-sm font-bold text-white sm:text-base">
                {item.question}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors duration-[var(--duration-fast)]",
                  isOpen
                    ? "border-[color:var(--brand-gold)] text-[color:var(--brand-gold)]"
                    : "border-[color:var(--border-default)] text-[color:var(--text-muted)]",
                )}
              >
                {/* Un "+" hecho con dos rayas: al abrir, la vertical gira
                    hasta acostarse y queda el "−". */}
                <span className="relative block size-3.5">
                  <Minus className="absolute inset-0 size-3.5" />
                  <Minus
                    className={cn(
                      "absolute inset-0 size-3.5 transition-transform duration-300 ease-out",
                      isOpen ? "rotate-0" : "rotate-90",
                    )}
                  />
                </span>
              </span>
            </button>
            {/* La respuesta queda siempre en la página (también la leen los
                buscadores) y se despliega animando la fila de una grilla, que
                es la forma de animar un alto que no se conoce de antemano.
                Cerrada, queda fuera del alcance de los lectores de pantalla. */}
            <div
              id={`${idPrefix}-answer-${index}`}
              aria-hidden={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                isOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div className="border-t border-[color:var(--border-subtle)] px-5 py-4">
                  <p className="text-sm leading-7 text-[color:var(--text-secondary)]">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
