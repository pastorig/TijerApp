"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import styles from "./AdminShell.module.css";
import { hasFeature } from "@/lib/plans";
import { useCurrentPlan } from "./PlanContext";
import {
  getAdminNavGroups,
  groupIsActive,
  itemIsActive,
  visibleItems,
} from "./admin-nav";

/**
 * Subpestañas del grupo activo. Se renderiza arriba del contenido (dentro del
 * <main>). Cada subpestaña es un link a una ruta existente. Solo aparece si el
 * grupo activo tiene 2+ items visibles según el plan (ej. Dashboard, que está
 * solo, no muestra subpestañas).
 */
export function AdminSubtabs({ barbershopSlug }: { barbershopSlug: string }) {
  const pathname = usePathname();
  const plan = useCurrentPlan();
  const canUse = (feature: Parameters<typeof hasFeature>[1]) =>
    hasFeature(plan.tier, feature);

  const groups = getAdminNavGroups(barbershopSlug);
  const activeGroup = groups.find((group) =>
    groupIsActive(group, pathname, canUse),
  );
  if (!activeGroup) return null;

  const items = visibleItems(activeGroup, canUse);
  if (items.length < 2) return null;

  return (
    <nav aria-label={`Secciones de ${activeGroup.label}`} className="sticky top-[var(--admin-header-height)] z-30 border-b border-white/10 bg-[#101012]/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
        {items.map((item) => {
          const active = itemIsActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                styles.focus,
                "inline-flex min-h-12 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150",
                active
                  ? "border-[color:var(--brand-gold)] text-[color:var(--brand-gold)]"
                  : "border-transparent text-[color:var(--text-muted)] hover:text-white",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
