"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/cn";
import { useInstallPrompt } from "@/lib/pwa/useInstallPrompt";
import { IOSInstallTooltip } from "./iOSInstallTooltip";

/**
 * InstallButton — botón "Instalar app" que dispara el prompt nativo del
 * browser (Chromium) o el tooltip iOS según el contexto.
 *
 * Si la app ya está instalada o el browser no la soporta, no renderiza nada.
 *
 * Variantes:
 * - "sidebar-item": pensado para usarse adentro de la nav del admin
 *   (footer del AdminSidebar). Estilo neutro, hover gold.
 * - "card-cta": botón más prominente, gold con fondo, para usar dentro
 *   de un banner o card de promoción.
 */

type InstallButtonVariant = "sidebar-item" | "card-cta";

export function InstallButton({
  variant = "sidebar-item",
  className,
}: {
  variant?: InstallButtonVariant;
  className?: string;
}) {
  const { canInstall, isiOS, promptInstall } = useInstallPrompt();
  const [showiOSTooltip, setShowiOSTooltip] = useState(false);

  if (!canInstall) return null;

  async function handleClick() {
    if (isiOS) {
      setShowiOSTooltip(true);
      return;
    }
    await promptInstall();
  }

  const variantClasses: Record<InstallButtonVariant, string> = {
    "sidebar-item":
      "inline-flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--brand-gold)]",
    "card-cta":
      "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-all duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)] active:scale-95",
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(variantClasses[variant], className)}
      >
        <Download
          className={cn(
            "shrink-0",
            variant === "sidebar-item" ? "size-3.5" : "size-4",
          )}
          aria-hidden="true"
        />
        <span className="truncate">Instalar app</span>
      </button>

      <IOSInstallTooltip
        isOpen={showiOSTooltip}
        onClose={() => setShowiOSTooltip(false)}
      />
    </>
  );
}
