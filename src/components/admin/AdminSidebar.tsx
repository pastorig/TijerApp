"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Logo } from "@/components/ui";
import { cn } from "@/lib/cn";
import { hasFeature } from "@/lib/plans";
import { useCurrentPlan } from "./PlanContext";
import {
  getAdminNavGroups,
  groupDefaultHref,
  groupIsActive,
  visibleItems,
} from "./admin-nav";

/**
 * Sidebar del admin. Muestra los GRUPOS (pestañas) — un ítem por grupo. Al
 * entrar a un grupo, AdminSubtabs (en el contenido) muestra sus subpestañas.
 *
 * Drawer controlado por AdminChrome (open/onClose) en mobile; fijo en desktop.
 * Las acciones de sesión y la identidad de la barbería viven en la barra
 * superior (AdminTopBar / AdminUserMenu), no acá.
 */
export function AdminSidebar({
  barbershopSlug,
  open,
  onClose,
}: {
  barbershopSlug: string;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const plan = useCurrentPlan();
  const canUse = (feature: Parameters<typeof hasFeature>[1]) =>
    hasFeature(plan.tier, feature);

  const groups = getAdminNavGroups(barbershopSlug).filter(
    (group) => visibleItems(group, canUse).length > 0,
  );

  return (
    <>
      {/* Backdrop del drawer (mobile) */}
      {open ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-out-soft)]",
          "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border-subtle)] px-5 py-5">
          <Link
            href={`/${barbershopSlug}/admin`}
            onClick={onClose}
            className="inline-flex"
          >
            <Logo size="md" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)] lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Grupos */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="grid gap-1">
            {groups.map((group) => {
              const active = groupIsActive(group, pathname, canUse);
              const Icon = group.icon;
              return (
                <li key={group.key}>
                  <Link
                    href={groupDefaultHref(group, canUse)}
                    onClick={onClose}
                    className={cn(
                      "inline-flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-semibold transition-colors duration-[var(--duration-fast)]",
                      active
                        ? "bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
                        : "text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-1)] hover:text-white",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        active
                          ? "text-[color:var(--brand-gold)]"
                          : "text-[color:var(--text-muted)]",
                      )}
                    />
                    <span className="truncate">{group.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
