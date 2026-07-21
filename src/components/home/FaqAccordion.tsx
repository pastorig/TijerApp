"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
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
                  "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-[var(--duration-fast)]",
                  isOpen
                    ? "border-[color:var(--brand-gold)] text-[color:var(--brand-gold)]"
                    : "border-[color:var(--border-default)] text-[color:var(--text-muted)]",
                )}
              >
                {isOpen ? (
                  <Minus className="size-3.5" />
                ) : (
                  <Plus className="size-3.5" />
                )}
              </span>
            </button>
            {isOpen ? (
              <div
                id={`${idPrefix}-answer-${index}`}
                className="border-t border-[color:var(--border-subtle)] px-5 py-4"
              >
                <p className="text-sm leading-7 text-[color:var(--text-secondary)]">
                  {item.answer}
                </p>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
