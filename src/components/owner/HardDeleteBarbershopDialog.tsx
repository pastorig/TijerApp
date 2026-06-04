"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Modal de eliminación DEFINITIVA de barbería.
 *
 * Reemplaza el flujo anterior `ConfirmDialog → window.prompt → ConfirmDialog`
 * que Brave bloqueaba al disparar dialogs custom inmediatamente después de
 * un prompt nativo. Acá toda la confirmación vive en un solo modal:
 *
 *  1. Warning header danger
 *  2. Input donde el owner escribe el slug exacto
 *  3. Checkbox opcional para liberar también el user admin de Auth
 *  4. Botón Eliminar disabled hasta que el slug typeado matchea
 *
 * Pattern: el parent debe pasar `key={slug}` para forzar remount entre
 * aperturas — el state interno arranca limpio sin necesidad de resetear
 * con efectos.
 */

export function HardDeleteBarbershopDialog({
  slug,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  /** Slug a eliminar. Si null → modal cerrado. */
  slug: string | null;
  isSubmitting: boolean;
  onCancel: () => void;
  /** Recibe el flag de removeAdminUser. La eliminación la dispara el parent. */
  onConfirm: (removeAdminUser: boolean) => void | Promise<void>;
}) {
  const [typedSlug, setTypedSlug] = useState("");
  const [removeAdminUser, setRemoveAdminUser] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const panelRef = useRef<HTMLFormElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Animación de entrada
  useEffect(() => {
    if (!slug) return;
    const id = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [slug]);

  // Focus inicial en Cancelar para evitar eliminación accidental con Enter
  useEffect(() => {
    if (isVisible) {
      const id = window.setTimeout(() => cancelButtonRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [isVisible]);

  // Escape + focus trap
  useEffect(() => {
    if (!slug) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        event.preventDefault();
        onCancel();
      }
      if (event.key === "Tab" && panelRef.current) {
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
  }, [slug, isSubmitting, onCancel]);

  const slugMatches = typedSlug === slug;
  const canSubmit = !isSubmitting && slugMatches;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    void onConfirm(removeAdminUser);
  }

  if (!slug || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hard-delete-dialog-title"
      className={cn(
        "fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm transition-opacity duration-200 sm:items-center sm:p-4",
        isVisible ? "opacity-100" : "opacity-0",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onCancel();
      }}
    >
      <form
        ref={panelRef}
        onSubmit={handleSubmit}
        className={cn(
          "relative w-full max-w-lg overflow-hidden rounded-t-[var(--radius-lg)] border border-[color:var(--danger)]/40 bg-[color:var(--surface-0)] shadow-2xl transition-all duration-200 ease-[var(--ease-out-soft,cubic-bezier(0.16,1,0.3,1))] sm:rounded-[var(--radius-lg)]",
          isVisible
            ? "translate-y-0 scale-100 opacity-100 sm:translate-y-0"
            : "translate-y-4 scale-95 opacity-0 sm:translate-y-2",
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-[color:var(--border-subtle)] px-5 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--danger)]/50 bg-[color:var(--danger-soft)]/60 text-[color:var(--danger)]">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="hard-delete-dialog-title"
              className="text-base font-bold text-white sm:text-lg"
            >
              Eliminar definitivamente
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--text-secondary)]">
              Vas a borrar para siempre la barbería{" "}
              <span className="font-mono font-bold text-white">
                {slug}
              </span>
              : todos los turnos, barberos, servicios, horarios, clientes y
              fotos.
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--danger)]">
              Esta acción NO se puede deshacer.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Cerrar"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-[color:var(--text-subtle)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--surface-1)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">
          <div>
            <label
              htmlFor="hard-delete-slug-input"
              className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
            >
              Para confirmar, escribí el slug:{" "}
              <span className="font-mono text-[color:var(--brand-gold)]">
                {slug}
              </span>
            </label>
            <input
              id="hard-delete-slug-input"
              type="text"
              value={typedSlug}
              onChange={(e) => setTypedSlug(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={slug}
              disabled={isSubmitting}
              className={cn(
                "mt-2 block w-full rounded-[var(--radius-sm)] border bg-[color:var(--surface-1)] px-3 py-2.5 font-mono text-sm text-white placeholder:text-[color:var(--text-subtle)] focus:outline-none disabled:opacity-50",
                slugMatches
                  ? "border-[color:var(--success)]/60"
                  : typedSlug.length > 0
                    ? "border-[color:var(--danger)]/40"
                    : "border-white/[0.08]",
              )}
            />
            {typedSlug.length > 0 && !slugMatches ? (
              <p className="mt-1 text-xs text-[color:var(--danger)]">
                El slug no coincide
              </p>
            ) : null}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-white/[0.06] bg-[color:var(--surface-1)] px-3 py-2.5">
            <input
              type="checkbox"
              checked={removeAdminUser}
              onChange={(e) => setRemoveAdminUser(e.target.checked)}
              disabled={isSubmitting}
              className="mt-0.5 size-4 accent-[color:var(--brand-gold)]"
            />
            <div>
              <p className="text-xs font-bold text-white">
                También liberar el email del admin
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-[color:var(--text-muted)]">
                Si lo activás, también se borra el user de Supabase Auth y
                el email queda libre para reuso. Si no, el user queda
                registrado pero sin barbería asociada.
              </p>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-[color:var(--border-subtle)] p-4 sm:flex-row sm:justify-end sm:gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-transparent px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-secondary)] transition-all duration-[var(--duration-fast)] hover:border-[color:var(--border-strong)] hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--danger)] px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-all duration-[var(--duration-fast)] hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Eliminando…" : "Eliminar para siempre"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
