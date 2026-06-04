"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Share, Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * iOSInstallTooltip — modal que se muestra cuando el usuario en iOS Safari
 * intenta "instalar" la app. En iOS no existe el `beforeinstallprompt`
 * event ni un prompt nativo programático, así que tenemos que explicar
 * manualmente cómo agregar a inicio.
 *
 * Usa el mismo patrón portal/animación que ConfirmDialog y CancelAppointmentDialog.
 */

export function IOSInstallTooltip({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const id = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-tooltip-title"
      className={cn(
        "fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm transition-opacity duration-200 sm:items-center sm:p-4",
        isVisible ? "opacity-100" : "opacity-0",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-t-[var(--radius-lg)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--surface-0)] shadow-2xl transition-all duration-200 ease-[var(--ease-out-soft,cubic-bezier(0.16,1,0.3,1))] sm:rounded-[var(--radius-lg)]",
          isVisible
            ? "translate-y-0 scale-100 opacity-100 sm:translate-y-0"
            : "translate-y-4 scale-95 opacity-0 sm:translate-y-2",
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-[color:var(--border-subtle)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2
              id="ios-install-tooltip-title"
              className="text-base font-bold text-white sm:text-lg"
            >
              Instalar TijerApp en tu iPhone
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--text-secondary)]">
              iOS Safari no permite instalar la app desde un botón. Seguí
              estos 2 pasos:
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-[color:var(--text-subtle)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--surface-1)] hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-3 px-5 py-4">
          <Step
            number={1}
            icon={<Share className="size-5" aria-hidden="true" />}
            title="Tocá el botón Compartir"
            description="Está en la barra inferior del navegador, con el icono de la flecha hacia arriba."
          />
          <Step
            number={2}
            icon={<Plus className="size-5" aria-hidden="true" />}
            title="Elegí 'Agregar a inicio'"
            description="Bajá en el menú hasta encontrarlo. Confirmá el nombre TijerApp y listo, el icono aparece en tu pantalla."
          />
        </div>

        {/* Footer */}
        <div className="border-t border-[color:var(--border-subtle)] p-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-all duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)] active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Step({
  number,
  icon,
  title,
  description,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-white/[0.06] bg-[color:var(--surface-1)] p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--brand-gold)]">
          Paso {number}
        </p>
        <p className="mt-0.5 text-sm font-bold text-white">{title}</p>
        <p className="mt-1 text-xs leading-snug text-[color:var(--text-secondary)]">
          {description}
        </p>
      </div>
    </div>
  );
}
