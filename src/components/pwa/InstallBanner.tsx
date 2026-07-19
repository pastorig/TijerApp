"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import { useInstallPrompt } from "@/lib/pwa/useInstallPrompt";
import {
  dismissInstallPrompt,
  useShouldOfferInstall,
} from "@/lib/pwa/installPromptFrequency";
import { IOSInstallTooltip } from "./iOSInstallTooltip";

/**
 * InstallBanner — barra para ofrecer instalar la app (PWA).
 *
 * Reglas:
 * - Solo si el browser puede instalar (o es iOS, donde mostramos las
 *   instrucciones manuales) y la app NO está ya instalada.
 * - Mobile Y desktop: en desktop instalar es igual de útil (el barbero
 *   trabaja desde la compu) y el prompt nativo de Chromium está disponible.
 * - Frecuencia (ver installPromptFrequency): aparece en las primeras visitas
 *   y después solo cada 4 días si la siguen cerrando sin instalar.
 */

export function InstallBanner({
  barbershopName,
}: {
  /** Nombre a mostrar. Si no se pasa, se ofrece instalar TijerApp. */
  barbershopName?: string;
}) {
  const { canInstall, isiOS, promptInstall } = useInstallPrompt();
  const shouldOffer = useShouldOfferInstall();
  const [showiOSTooltip, setShowiOSTooltip] = useState(false);

  if (!canInstall || !shouldOffer) return null;

  const label = barbershopName ?? "TijerApp";

  async function handleInstall() {
    if (isiOS) {
      setShowiOSTooltip(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      // Instalada: el Provider marca isInstalled y canInstall pasa a false.
      return;
    }
    // Rechazó el prompt nativo → lo tratamos como "ahora no".
    dismissInstallPrompt();
  }

  return (
    <>
      <div
        role="region"
        aria-label="Instalar la app"
        className="border-b border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] px-4 py-3"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/40 bg-black text-[color:var(--brand-gold)]">
            <Download className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold leading-tight text-white sm:text-sm">
              Guardá {label} en tu pantalla
            </p>
            <p className="mt-0.5 text-[10px] leading-tight text-[color:var(--text-secondary)] sm:text-xs">
              <span className="sm:hidden">Entrá con un solo tap</span>
              <span className="hidden sm:inline">
                Se abre como una app, sin buscar el link en el navegador.
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-gold-grad px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)] active:scale-95 sm:px-4 sm:text-[11px]"
          >
            Instalar
          </button>
          <button
            type="button"
            onClick={dismissInstallPrompt}
            aria-label="Ahora no"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-[color:var(--text-subtle)] transition-colors duration-[var(--duration-fast)] hover:bg-black/20 hover:text-white"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <IOSInstallTooltip
        isOpen={showiOSTooltip}
        onClose={() => setShowiOSTooltip(false)}
      />
    </>
  );
}
