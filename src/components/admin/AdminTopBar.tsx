"use client";

import { Menu } from "lucide-react";
import { Logo } from "@/components/ui";
import { AdminUserMenu } from "./AdminUserMenu";

/**
 * Barra superior del admin. Sticky. A la derecha, el chip de la barbería con
 * el menú de sesión (AdminUserMenu). En mobile, a la izquierda el botón que
 * abre el drawer del sidebar + el logo.
 */
export function AdminTopBar({
  barbershopSlug,
  barbershopName,
  onOpenDrawer,
}: {
  barbershopSlug: string;
  barbershopName: string;
  onOpenDrawer: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[color:var(--border-subtle)] bg-black/95 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Abrir menú"
        className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] lg:hidden"
      >
        <Menu className="size-4" />
      </button>

      <div className="lg:hidden">
        <Logo size="sm" />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <AdminUserMenu
          barbershopSlug={barbershopSlug}
          barbershopName={barbershopName}
        />
      </div>
    </header>
  );
}
