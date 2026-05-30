"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Sistema de toasts global para feedback de acciones.
 *
 * Uso:
 *   const toast = useToast();
 *   toast.success("Cliente guardado");
 *   toast.error("No pudimos guardar");
 *   toast.info("Acción completada");
 *
 *   // Auto-promise:
 *   await toast.promise(saveClient(), {
 *     loading: "Guardando...",
 *     success: "Cliente guardado",
 *     error: "No pudimos guardar",
 *   });
 *
 * Patrón:
 * - Portal al body, posicionado bottom-right (desktop) / top-center (mobile)
 * - Auto-dismiss: 4s success/info, 6s error, infinito loading
 * - Click en X o en el toast lo cierra
 * - Hover pausa el timer (no se va mientras leés)
 * - Stack vertical max 4 visibles
 * - Animaciones: slide-in-right desktop, slide-up-sheet mobile
 */

export type ToastVariant = "success" | "error" | "info" | "loading";

type ToastBase = {
  id: string;
  variant: ToastVariant;
  message: string;
  description?: string;
  createdAt: number;
  /** Si está, anula el default (4s success, 6s error, ∞ loading). */
  durationMs?: number;
};

type ToastApi = {
  success: (message: string, opts?: { description?: string; durationMs?: number }) => string;
  error: (message: string, opts?: { description?: string; durationMs?: number }) => string;
  info: (message: string, opts?: { description?: string; durationMs?: number }) => string;
  loading: (message: string, opts?: { description?: string }) => string;
  dismiss: (id: string) => void;
  /**
   * Helper para promises. Devuelve la promise sin modificar — útil para
   * chainear errores en el caller. Si la promise resuelve con un valor,
   * `success` puede ser una función que recibe ese valor.
   */
  promise: <T>(
    promise: Promise<T>,
    opts: {
      loading: string;
      success: string | ((value: T) => string);
      error: string | ((err: unknown) => string);
    },
  ) => Promise<T>;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast tiene que usarse dentro de <ToastProvider>");
  }
  return ctx;
}

const MAX_TOASTS = 4;
const DEFAULT_DURATION: Record<ToastVariant, number | null> = {
  success: 4000,
  info: 4000,
  error: 6000,
  loading: null,
};

let toastIdCounter = 0;
function nextToastId(): string {
  toastIdCounter += 1;
  return `toast-${toastIdCounter}-${Date.now().toString(36)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastBase[]>([]);
  // Tracking de hover por id para pausar el auto-dismiss timer
  const [hoveringIds, setHoveringIds] = useState<Set<string>>(new Set());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (
      variant: ToastVariant,
      message: string,
      opts?: { description?: string; durationMs?: number },
    ): string => {
      const id = nextToastId();
      const toast: ToastBase = {
        id,
        variant,
        message,
        description: opts?.description,
        createdAt: Date.now(),
        durationMs: opts?.durationMs,
      };
      setToasts((current) => {
        // Si superamos el max, sacamos el más viejo.
        const next = [...current, toast];
        if (next.length > MAX_TOASTS) {
          return next.slice(next.length - MAX_TOASTS);
        }
        return next;
      });
      return id;
    },
    [],
  );

  const api: ToastApi = {
    success: (message, opts) => push("success", message, opts),
    error: (message, opts) => push("error", message, opts),
    info: (message, opts) => push("info", message, opts),
    loading: (message, opts) => push("loading", message, opts),
    dismiss,
    promise: async <T,>(
      promise: Promise<T>,
      opts: {
        loading: string;
        success: string | ((value: T) => string);
        error: string | ((err: unknown) => string);
      },
    ): Promise<T> => {
      const loadingId = push("loading", opts.loading);
      try {
        const value = await promise;
        dismiss(loadingId);
        const msg =
          typeof opts.success === "function" ? opts.success(value) : opts.success;
        push("success", msg);
        return value;
      } catch (err) {
        dismiss(loadingId);
        const msg =
          typeof opts.error === "function" ? opts.error(err) : opts.error;
        push("error", msg);
        throw err;
      }
    },
  };

  // Auto-dismiss timers — recalcula cada vez que cambian los toasts.
  useEffect(() => {
    const timers: number[] = [];
    for (const toast of toasts) {
      if (hoveringIds.has(toast.id)) continue;
      const duration =
        toast.durationMs ?? DEFAULT_DURATION[toast.variant];
      if (duration === null) continue;
      const elapsed = Date.now() - toast.createdAt;
      const remaining = Math.max(0, duration - elapsed);
      const id = window.setTimeout(() => dismiss(toast.id), remaining);
      timers.push(id);
    }
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [toasts, hoveringIds, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastsViewport
        toasts={toasts}
        onDismiss={dismiss}
        onHoverChange={(id, hovering) => {
          setHoveringIds((current) => {
            const next = new Set(current);
            if (hovering) next.add(id);
            else next.delete(id);
            return next;
          });
        }}
      />
    </ToastContext.Provider>
  );
}

function ToastsViewport({
  toasts,
  onDismiss,
  onHoverChange,
}: {
  toasts: ToastBase[];
  onDismiss: (id: string) => void;
  onHoverChange: (id: string, hovering: boolean) => void;
}) {
  if (typeof document === "undefined") return null;
  if (toasts.length === 0) return null;

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 top-2 z-[110] flex flex-col items-center gap-2 px-3 sm:bottom-4 sm:left-auto sm:right-4 sm:top-auto sm:inset-x-auto sm:items-end sm:max-w-sm"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
          onHoverChange={(hovering) => onHoverChange(toast.id, hovering)}
        />
      ))}
    </div>,
    document.body,
  );
}

function ToastItem({
  toast,
  onDismiss,
  onHoverChange,
}: {
  toast: ToastBase;
  onDismiss: () => void;
  onHoverChange: (hovering: boolean) => void;
}) {
  const variantStyles: Record<
    ToastVariant,
    {
      iconBg: string;
      icon: React.ReactNode;
      border: string;
      barColor: string;
    }
  > = {
    success: {
      iconBg:
        "border-[color:var(--success)]/40 bg-[color:var(--success-soft)] text-[color:var(--success)]",
      icon: <CheckCircle2 className="size-4" />,
      border: "border-[color:var(--success)]/30",
      barColor: "bg-[color:var(--success)]",
    },
    error: {
      iconBg:
        "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
      icon: <AlertTriangle className="size-4" />,
      border: "border-[color:var(--danger)]/30",
      barColor: "bg-[color:var(--danger)]",
    },
    info: {
      iconBg:
        "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]",
      icon: <Info className="size-4" />,
      border: "border-[color:var(--brand-gold)]/30",
      barColor: "bg-[color:var(--brand-gold)]",
    },
    loading: {
      iconBg:
        "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]",
      icon: <Loader2 className="size-4 animate-spin" />,
      border: "border-[color:var(--border-default)]",
      barColor: "bg-[color:var(--brand-gold)]",
    },
  };
  const style = variantStyles[toast.variant];

  return (
    <div
      role={toast.variant === "error" ? "alert" : "status"}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onClick={onDismiss}
      className={cn(
        "pointer-events-auto relative w-full max-w-sm cursor-pointer overflow-hidden rounded-[var(--radius-md)] border bg-[color:var(--surface-1)] shadow-2xl ring-1 ring-black/40 animate-slide-right sm:w-auto sm:min-w-[280px]",
        style.border,
      )}
    >
      {/* Barra vertical de color a la izquierda — refuerza el variant */}
      <div
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-[3px]", style.barColor)}
      />

      <div className="flex items-start gap-3 px-4 py-3 pl-5">
        <div
          aria-hidden="true"
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border",
            style.iconBg,
          )}
        >
          {style.icon}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-bold text-white">{toast.message}</p>
          {toast.description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--text-secondary)]">
              {toast.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          aria-label="Cerrar"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-[color:var(--text-subtle)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--surface-2)] hover:text-white"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
