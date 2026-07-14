"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { hasFeature } from "@/lib/plans";
import { AdminUserMenu } from "./AdminUserMenu";
import { useCurrentPlan } from "./PlanContext";
import { getActiveGroup } from "./admin-nav";

/**
 * Barra superior del admin. Sticky (top-0). A la IZQUIERDA muestra el nombre de
 * la sección activa (Agenda, Caja, etc.) — te dice siempre en qué sección
 * estás. A la DERECHA, el chip de la barbería con el menú de sesión. En mobile,
 * el botón que abre el drawer del sidebar queda antes del nombre de sección.
 *
 * Junto con AdminSubtabs (sticky top-14, justo debajo) forman el encabezado
 * fijo del admin: nombre de sección + subpestañas quedan pineados al scrollear.
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
  const pathname = usePathname();
  const plan = useCurrentPlan();
  const activeGroup = getActiveGroup(barbershopSlug, pathname, (feature) =>
    hasFeature(plan.tier, feature),
  );
  const SectionIcon = activeGroup?.icon;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[color:var(--border-subtle)] bg-black/95 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Abrir menú"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] lg:hidden"
      >
        <Menu className="size-4" />
      </button>

      {activeGroup ? (
        <div className="flex min-w-0 items-center gap-2">
          {SectionIcon ? (
            <SectionIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-[color:var(--brand-gold)]"
            />
          ) : null}
          <p className="truncate text-sm font-bold tracking-tight text-white sm:text-base">
            {activeGroup.label}
          </p>
        </div>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <AdminUserMenu
          barbershopSlug={barbershopSlug}
          barbershopName={barbershopName}
        />
      </div>
    </header>
  );
}
