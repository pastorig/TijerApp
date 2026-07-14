"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Confirmación branded — reemplaza window.confirm() en todo el admin.
 *
 * Uso:
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: "Eliminar cliente",
 *     message: "Esta acción no se puede deshacer.",
 *     danger: true,
 *     confirmLabel: "Eliminar",
 *     cancelLabel: "Cancelar",
 *   });
 *   if (!ok) return;
 *
 * Funcionalidades:
 * - Animación de entrada (fade + scale-up del panel, fade del backdrop)
 * - Enter = confirmar, Escape = cancelar
 * - Focus trap dentro del modal (Tab no se escapa al body)
 * - Variante "danger" con colores rojos para acciones destructivas
 * - Portal al body para evitar problemas de z-index/stacking
 * - Backdrop blur + overlay oscuro
 * - Mobile-friendly (sheet desde abajo en pantallas chicas)
 */

export type ConfirmOptions = {
  title: string;
  message?: string;
  /** Cuerpo del mensaje como nodos React (para destacar partes). Sobrescribe `message`. */
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Si true, botón confirmar en rojo + icono de alerta. */
  danger?: boolean;
};

type ConfirmContextValue = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm tiene que usarse dentro de <ConfirmProvider>");
  }
  return ctx;
}

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  // Animación: la primera ronda monta el componente, después flag a true para
  // disparar las clases de entrada. Salida: flag false → wait 200ms → unmount.
  const [isVisible, setIsVisible] = useState(false);

  const confirm = useCallback<ConfirmContextValue>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  useEffect(() => {
    if (pending) {
      // Pequeño delay para que React monte primero el DOM, después aplique
      // las clases de entrada (de lo contrario salta sin animar).
      const id = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(id);
    }
  }, [pending]);

  function handleConfirm() {
    if (!pending) return;
    pending.resolve(true);
    closeDialog();
  }

  function handleCancel() {
    if (!pending) return;
    pending.resolve(false);
    closeDialog();
  }

  function closeDialog() {
    setIsVisible(false);
    window.setTimeout(() => setPending(null), 180);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending ? (
        <ConfirmDialogView
          pending={pending}
          isVisible={isVisible}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialogView({
  pending,
  isVisible,
  onConfirm,
  onCancel,
}: {
  pending: PendingConfirm;
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus en el botón confirmar al abrir
  useEffect(() => {
    if (isVisible) {
      const id = window.setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 50);
      return () => window.clearTimeout(id);
    }
  }, [isVisible]);

  // Keyboard handlers + focus trap
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        onConfirm();
        return;
      }
      if (event.key === "Tab" && panelRef.current) {
        // Focus trap: ciclar entre los elementos focuseables del panel.
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel, onConfirm]);

  // SSR-safety: portal solo en cliente
  if (typeof document === "undefined") return null;

  const danger = Boolean(pending.danger);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className={cn(
        "fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm transition-opacity duration-200 sm:items-center sm:p-4",
        isVisible ? "opacity-100" : "opacity-0",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-t-[var(--radius-lg)] border bg-[color:var(--surface-0)] shadow-2xl transition-all duration-200 ease-[var(--ease-out-soft,cubic-bezier(0.16,1,0.3,1))] sm:rounded-[var(--radius-lg)]",
          danger
            ? "border-[color:var(--danger)]/30"
            : "border-[color:var(--border-default)]",
          isVisible
            ? "translate-y-0 scale-100 opacity-100 sm:translate-y-0"
            : "translate-y-4 scale-95 opacity-0 sm:translate-y-2",
        )}
      >
        {/* Header con icon */}
        <div className="flex items-start gap-4 border-b border-[color:var(--border-subtle)] px-5 py-4">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full border",
              danger
                ? "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)]/50 text-[color:var(--danger)]"
                : "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]",
            )}
          >
            {danger ? (
              <AlertTriangle className="size-5" aria-hidden="true" />
            ) : (
              <HelpCircle className="size-5" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-dialog-title"
              className="text-base font-bold text-white sm:text-lg"
            >
              {pending.title}
            </h2>
            {pending.body ? (
              <div className="mt-1.5 text-sm text-[color:var(--text-secondary)]">
                {pending.body}
              </div>
            ) : pending.message ? (
              <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--text-secondary)]">
                {pending.message}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-[color:var(--text-subtle)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--surface-1)] hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Footer con botones */}
        <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-transparent px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-secondary)] transition-all duration-[var(--duration-fast)] hover:border-[color:var(--border-strong)] hover:text-white active:scale-95"
          >
            {pending.cancelLabel ?? "Cancelar"}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] px-5 text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-[var(--duration-fast)] active:scale-95",
              danger
                ? "bg-[color:var(--danger)] text-white hover:brightness-110"
                : "bg-gold-grad text-black hover:bg-[color:var(--brand-gold-hi)]",
            )}
          >
            {pending.confirmLabel ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
