"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Modal de cancelación con motivo.
 *
 * Distinto del ConfirmDialog genérico: éste pide al admin que registre por
 * qué cancela. El motivo es opcional excepto cuando elige "Otro" — ahí
 * pedimos texto para que no se contamine el dataset con "Otro" sin más
 * info. El valor que se guarda en `cancellation_reason` es:
 *   - Si eligió un preset: el label del preset (+ opcionalmente notas)
 *   - Si eligió "Otro": el texto libre que cargó
 *   - Si no eligió nada: null
 *
 * Pensado para alimentar reportes futuros (% de no-shows, motivos top,
 * etc.) sin meternos en taxonomías rígidas — el texto siempre queda
 * accesible.
 */

export type CancellationContext = {
  customerName: string;
  appointmentDate: string; // ya formateada para display
  appointmentTime: string; // ya formateada para display
};

/** Presets visibles en el modal — orden por frecuencia esperada. */
const REASON_PRESETS = [
  { key: "no_show", label: "Cliente no vino", isDanger: true },
  { key: "client_cancelled", label: "Cliente avisó", isDanger: false },
  { key: "rescheduled", label: "Reprogramado", isDanger: false },
  { key: "load_error", label: "Error al cargar", isDanger: false },
  { key: "shop_closed", label: "Cierre imprevisto", isDanger: false },
  { key: "other", label: "Otro motivo", isDanger: false },
] as const;

type ReasonKey = (typeof REASON_PRESETS)[number]["key"];

export function CancelAppointmentDialog({
  context,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  /** Si null/undefined → modal cerrado. */
  context: CancellationContext | null;
  isSubmitting: boolean;
  onCancel: () => void;
  /** Recibe el motivo final ya armado (o null si no se cargó nada). */
  onConfirm: (cancellationReason: string | null) => void | Promise<void>;
}) {
  // El parent debe pasar key={context?.appointmentId} para forzar remount
  // entre apariciones — así el state interno arranca limpio sin necesidad
  // de resetear con efectos (lo que viola react-hooks/set-state-in-effect).
  const [selectedKey, setSelectedKey] = useState<ReasonKey | null>(null);
  const [notes, setNotes] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const panelRef = useRef<HTMLFormElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Animación de entrada: en el primer frame post-mount activamos
  // isVisible para que las clases hagan el fade+scale-up.
  useEffect(() => {
    if (!context) return;
    const id = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [context]);

  // Focus en el botón "Volver" al abrir — no en confirmar para evitar
  // cancelaciones accidentales con Enter
  useEffect(() => {
    if (isVisible) {
      const id = window.setTimeout(() => cancelButtonRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [isVisible]);

  // Escape para cerrar + focus trap
  useEffect(() => {
    if (!context) return;
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
  }, [context, isSubmitting, onCancel]);

  // Construcción del valor final que va a DB
  const finalReason = useMemo(() => {
    if (!selectedKey) return null;
    const preset = REASON_PRESETS.find((p) => p.key === selectedKey);
    if (!preset) return null;
    const trimmedNotes = notes.trim();
    if (selectedKey === "other") {
      return trimmedNotes || null;
    }
    return trimmedNotes ? `${preset.label} — ${trimmedNotes}` : preset.label;
  }, [selectedKey, notes]);

  const needsNotes = selectedKey === "other";
  const canSubmit = !isSubmitting && (!needsNotes || notes.trim().length > 0);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    void onConfirm(finalReason);
  }

  if (!context || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
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
          "relative w-full max-w-lg overflow-hidden rounded-t-[var(--radius-lg)] border border-[color:var(--danger)]/30 bg-[color:var(--surface-0)] shadow-2xl transition-all duration-200 ease-[var(--ease-out-soft,cubic-bezier(0.16,1,0.3,1))] sm:rounded-[var(--radius-lg)]",
          isVisible
            ? "translate-y-0 scale-100 opacity-100 sm:translate-y-0"
            : "translate-y-4 scale-95 opacity-0 sm:translate-y-2",
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-[color:var(--border-subtle)] px-5 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)]/50 text-[color:var(--danger)]">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="cancel-dialog-title"
              className="text-base font-bold text-white sm:text-lg"
            >
              Cancelar turno
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--text-secondary)]">
              <span className="font-semibold text-white">
                {context.customerName}
              </span>
              {" — "}
              {context.appointmentDate} · {context.appointmentTime}
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              El cliente no recibe aviso automático — avisale por WhatsApp
              después.
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

        {/* Body — selector de motivo */}
        <div className="space-y-3 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Motivo (opcional)
          </p>
          <div
            role="radiogroup"
            aria-label="Motivo de cancelación"
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          >
            {REASON_PRESETS.map((preset) => {
              const isActive = selectedKey === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setSelectedKey(preset.key)}
                  className={cn(
                    "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border px-3 text-xs font-semibold transition-all duration-[var(--duration-fast)] press-shrink",
                    isActive
                      ? preset.isDanger
                        ? "border-[color:var(--danger)]/60 bg-[color:var(--danger-soft)] text-[color:var(--danger)]"
                        : "border-[color:var(--brand-gold)]/60 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
                      : "border-white/[0.06] bg-[color:var(--surface-1)] text-[color:var(--text-secondary)] hover:border-white/[0.12] hover:text-white",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Notas — siempre visible cuando hay preset elegido */}
          {selectedKey ? (
            <div className="mt-2">
              <label
                htmlFor="cancel-notes"
                className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
              >
                {needsNotes ? "Describí el motivo" : "Nota adicional (opcional)"}
              </label>
              <textarea
                id="cancel-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  needsNotes
                    ? "Ej: doble carga manual"
                    : "Ej: avisó por WhatsApp ayer"
                }
                rows={2}
                maxLength={240}
                required={needsNotes}
                className="mt-1.5 block w-full resize-none rounded-[var(--radius-sm)] border border-white/[0.06] bg-[color:var(--surface-1)] px-3 py-2 text-sm text-white placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]/60 focus:outline-none"
              />
              <p className="mt-1 text-right font-mono text-[10px] text-[color:var(--text-subtle)]">
                {notes.length}/240
              </p>
            </div>
          ) : null}
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
            {isSubmitting ? "Cancelando…" : "Cancelar turno"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
