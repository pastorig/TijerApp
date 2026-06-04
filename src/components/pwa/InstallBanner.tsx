"use client";

import { useSyncExternalStore } from "react";
import { Download, X } from "lucide-react";
import { useState } from "react";
import { useInstallPrompt } from "@/lib/pwa/useInstallPrompt";
import { IOSInstallTooltip } from "./iOSInstallTooltip";

/**
 * InstallBanner — banner discreto mobile-only que se muestra arriba del
 * hero en la landing pública de cada barbería.
 *
 * Reglas:
 * - Solo aparece si `canInstall` (browser soporta prompt o es iOS) y no
 *   está ya instalada.
 * - Solo en mobile (md:hidden) — en desktop hay menos fricción para
 *   instalar via el icon ⊕ del browser.
 * - Dismissable via botón ×. Al cerrar, no vuelve a aparecer por 30 días
 *   (persistido en localStorage).
 */

const DISMISSED_KEY = "tijerapp:install_banner_dismissed";
const COOLDOWN_DAYS = 30;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

// Evento custom para que el banner re-evalúe el localStorage en la misma
// tab cuando el usuario lo dismisseá. El evento nativo `storage` solo se
// dispara en OTRAS tabs, no en la que escribe — así que sin esto, el
// banner no se ocultaría hasta el próximo refresh.
const DISMISS_CHANGE_EVENT = "tijerapp-install-banner-dismiss-changed";

function subscribeDismissed(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(DISMISS_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(DISMISS_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getDismissedSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (Number.isNaN(dismissedAt)) return false;
    return Date.now() - dismissedAt < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function getDismissedServerSnapshot(): boolean {
  return false;
}

function persistDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    window.dispatchEvent(new Event(DISMISS_CHANGE_EVENT));
  } catch {
    // ignore (incognito mode, quota, etc.)
  }
}

export function InstallBanner({
  barbershopName,
}: {
  barbershopName: string;
}) {
  const { canInstall, isiOS, promptInstall } = useInstallPrompt();
  const isDismissed = useSyncExternalStore(
    subscribeDismissed,
    getDismissedSnapshot,
    getDismissedServerSnapshot,
  );
  const [showiOSTooltip, setShowiOSTooltip] = useState(false);

  if (!canInstall || isDismissed) return null;

  async function handleInstall() {
    if (isiOS) {
      setShowiOSTooltip(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      // ya está instalada — el Provider va a marcarla y canInstall se hará false
      return;
    }
    // dismissed: tratamos como "no quiere ahora" y entra al cooldown
    persistDismissed();
  }

  function handleClose() {
    persistDismissed();
  }

  return (
    <>
      <div
        role="region"
        aria-label="Instalar TijerApp"
        className="md:hidden border-b border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/40 bg-black text-[color:var(--brand-gold)]">
            <Download className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold leading-tight text-white">
              Guardá {barbershopName} en tu pantalla
            </p>
            <p className="mt-0.5 text-[10px] leading-tight text-[color:var(--text-secondary)]">
              Reservá tu turno con un solo tap
            </p>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)] active:scale-95"
          >
            Instalar
          </button>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar"
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
