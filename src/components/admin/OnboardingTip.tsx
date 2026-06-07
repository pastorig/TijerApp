"use client";

import { useEffect, useState } from "react";
import { Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/cn";

type OnboardingTipProps = {
  /** Identificador único del tip. Se guarda en localStorage para no repetir. */
  id: string;
  title: string;
  description: string;
  /** Posición del tip relativo a su contenedor. */
  placement?: "top" | "bottom" | "left" | "right";
  className?: string;
};

const STORAGE_KEY = "tijerapp:dismissed-tips";

/**
 * Tooltip contextual dismissible para onboarding. Se muestra UNA sola vez
 * por user y se persiste en localStorage. Pensado para guiar al barbero
 * en su primera interacción con cada sección del admin.
 *
 * Uso:
 *   <OnboardingTip
 *     id="turnero-drag-drop"
 *     title="Arrastrá los turnos"
 *     description="Mantené apretado un card y movelo a otro horario o barbero."
 *     placement="bottom"
 *   />
 *
 * El user puede cerrar con X o el tip aparece dismiss automático tras 15s
 * de visibilidad acumulada (no implementado en MVP — solo manual).
 */
export function OnboardingTip({
  id,
  title,
  description,
  placement = "bottom",
  className,
}: OnboardingTipProps) {
  // Lazy init: leemos localStorage al primer render para evitar flicker.
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const dismissed = JSON.parse(raw) as string[];
      return Array.isArray(dismissed) && dismissed.includes(id);
    } catch {
      return false;
    }
  });

  // Visible con animación delay para que no aparezca instant al cargar
  // — feel más curado, menos invasivo.
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    if (isDismissed) return;
    const t = window.setTimeout(() => setIsVisible(true), 400);
    return () => window.clearTimeout(t);
  }, [isDismissed]);

  function handleDismiss() {
    setIsVisible(false);
    setIsDismissed(true);
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const dismissed = (raw ? (JSON.parse(raw) as string[]) : []).filter(
        Boolean,
      );
      if (!dismissed.includes(id)) dismissed.push(id);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
    } catch {
      /* noop */
    }
  }

  if (isDismissed) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "pointer-events-auto absolute z-30 max-w-xs transition-all duration-300",
        placement === "top" && "bottom-full mb-2",
        placement === "bottom" && "top-full mt-2",
        placement === "left" && "right-full mr-2 top-0",
        placement === "right" && "left-full ml-2 top-0",
        isVisible
          ? "opacity-100 translate-y-0"
          : placement === "bottom"
            ? "opacity-0 -translate-y-1"
            : "opacity-0 translate-y-1",
        className,
      )}
    >
      <div className="relative rounded-[var(--radius-md)] border border-[color:var(--brand-gold)]/40 bg-[color:var(--surface-1)] p-3 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6),0_0_20px_-8px_rgba(201,162,62,0.4)]">
        <div className="flex items-start gap-2">
          <Lightbulb
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-gold)]"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white">{title}</p>
            <p className="mt-1 text-[11px] leading-5 text-[color:var(--text-secondary)]">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar tip"
            className="shrink-0 rounded-full p-0.5 text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-white"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Util para resetear todos los tips dismissed. Útil para un botón
 * "Ver tutorial de nuevo" en Settings.
 */
export function resetOnboardingTips(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
