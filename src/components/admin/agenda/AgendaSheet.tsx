"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/cn";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Hoja del calendario de la agenda: sube desde abajo en el celular y entra de
 * costado en la compu. La usan el detalle de un turno y la lista del "+N".
 *
 * Maneja lo que un diálogo tiene que manejar: foco atrapado adentro, Escape
 * para cerrar, el foco vuelve a donde estaba al cerrar y la página no
 * scrollea por detrás. Con "reducir movimiento" aparece sin animación.
 */
export function AgendaSheet({
  open,
  onClose,
  title,
  subtitle,
  badges,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badges?: React.ReactNode;
  children: React.ReactNode;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // El panel ya está montado cuando corre el efecto: se enfoca directo (con
    // requestAnimationFrame el foco no llegaba si la pestaña estaba en segundo plano).
    panelRef.current?.focus();

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  const hidden = isDesktop ? { x: "100%" } : { y: "100%" };
  const shown = isDesktop ? { x: 0 } : { y: 0 };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="agenda-sheet-backdrop"
            aria-hidden="true"
            className="fixed inset-0 z-50 bg-black/70"
            onClick={onClose}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          <motion.div
            key="agenda-sheet-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={cn(
              "fixed z-50 flex flex-col border-[color:var(--border-default)] bg-[color:var(--surface-1)] shadow-elevated outline-none",
              isDesktop
                ? "inset-y-0 right-0 w-full max-w-md border-l"
                : "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[var(--radius-lg)] border-t pb-[env(safe-area-inset-bottom)]",
            )}
            initial={reduceMotion ? false : hidden}
            animate={shown}
            exit={reduceMotion ? { ...hidden, transition: { duration: 0 } } : hidden}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {!isDesktop ? (
              <span
                aria-hidden="true"
                className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[color:var(--border-strong)]"
              />
            ) : null}
            <header className="flex shrink-0 items-start gap-3 border-b border-[color:var(--border-subtle)] px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold text-white">{title}</h2>
                {subtitle ? (
                  <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">{subtitle}</p>
                ) : null}
                {badges ? <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-white"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

/** Etiqueta chica para el encabezado de la hoja ("Encimado", "Sobreturno"). */
export function AgendaBadge({
  tone,
  icon,
  children,
}: {
  tone: "danger" | "gold";
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-sm)] border px-2 py-0.5 text-xs font-semibold",
        tone === "danger"
          ? "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] text-[color:var(--danger)]"
          : "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold-hi)]",
      )}
    >
      {icon}
      {children}
    </span>
  );
}
