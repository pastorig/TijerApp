"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { hasFeature } from "@/lib/plans";
import { AdminUserMenu } from "./AdminUserMenu";
import { FounderBadge } from "./FounderBadge";
import { useCurrentPlan } from "./PlanContext";
import { getActiveGroup, itemIsActive, visibleItems } from "./admin-nav";
import { cn } from "@/lib/cn";
import styles from "./AdminShell.module.css";

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
  drawerOpen,
  onOpenDrawer,
}: {
  barbershopSlug: string;
  barbershopName: string;
  drawerOpen: boolean;
  onOpenDrawer: () => void;
}) {
  const pathname = usePathname();
  const plan = useCurrentPlan();
  const activeGroup = getActiveGroup(barbershopSlug, pathname, (feature) =>
    hasFeature(plan.tier, feature),
  );
  const SectionIcon = activeGroup?.icon;
  const activeItem = activeGroup
    ? visibleItems(activeGroup, (feature) => hasFeature(plan.tier, feature)).find((item) => itemIsActive(item, pathname))
    : undefined;
  const title = activeGroup?.key === "inicio" ? "Inicio" : activeItem?.label ?? activeGroup?.label;

  return (
    <header className="sticky top-0 z-40 flex h-[var(--admin-header-height)] items-center gap-3 border-b border-white/10 bg-[#101012]/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Abrir menu"
        aria-controls="admin-navigation-drawer"
        aria-expanded={drawerOpen}
        aria-haspopup="dialog"
        className={cn(styles.focus, "inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-white/10 text-neutral-300 transition-colors duration-150 hover:bg-white/5 hover:text-white lg:hidden")}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      {activeGroup ? (
        <div className="flex min-w-0 items-center gap-3">
          {SectionIcon ? (
            <SectionIcon
              aria-hidden="true"
              className="hidden size-[18px] shrink-0 text-[color:var(--brand-gold)] sm:block"
            />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-xs text-neutral-400">{activeGroup.key === "inicio" ? "Panel de administracion" : activeGroup.label}</p>
            <p className="truncate text-sm font-semibold text-white">{title}</p>
          </div>
        </div>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <FounderBadge barbershopSlug={barbershopSlug} />
        <AdminUserMenu
          barbershopSlug={barbershopSlug}
          barbershopName={barbershopName}
        />
      </div>
    </header>
  );
}
