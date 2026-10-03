"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ExternalLink, X } from "lucide-react";
import { Logo } from "@/components/ui";
import { cn } from "@/lib/cn";
import { hasFeature } from "@/lib/plans";
import { useCurrentPlan } from "./PlanContext";
import { getAdminNavGroups, groupDefaultHref, groupIsActive, visibleItems } from "./admin-nav";
import styles from "./AdminShell.module.css";

type SidebarProps = {
  barbershopSlug: string;
  barbershopName: string;
  open: boolean;
  onClose: () => void;
};

export function AdminSidebar(props: SidebarProps) {
  const { open, onClose } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    if (desktop.matches) {
      onClose();
      return;
    }
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex="0"]',
      )).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", containFocus);
    const handleResize = () => {
      if (desktop.matches) onClose();
    };
    desktop.addEventListener("change", handleResize);
    return () => {
      desktop.removeEventListener("change", handleResize);
      dialog.removeEventListener("keydown", containFocus);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open, onClose]);

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-white/10 bg-[#101012] lg:flex">
        <SidebarContent {...props} mobile={false} />
      </aside>
      <dialog
        ref={dialogRef}
        id="admin-navigation-drawer"
        aria-label="Navegacion principal"
        onCancel={onClose}
        onClose={onClose}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
        }}
        className={cn(styles.drawer, "fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(288px,calc(100vw-48px))] max-w-none border-r border-white/10 bg-[#101012] p-0 text-white backdrop:bg-black/70")}
      >
        <div className="flex h-full flex-col">
          <SidebarContent {...props} mobile />
        </div>
      </dialog>
    </>
  );
}

function SidebarContent({
  barbershopSlug,
  barbershopName,
  onClose,
  mobile,
}: SidebarProps & { mobile: boolean }) {
  const pathname = usePathname();
  const plan = useCurrentPlan();
  const canUse = (feature: Parameters<typeof hasFeature>[1]) => hasFeature(plan.tier, feature);
  const groups = getAdminNavGroups(barbershopSlug).filter(group => visibleItems(group, canUse).length > 0);

  return (
    <>
      <div className="flex min-h-20 items-center justify-between gap-2 px-5">
        <Link href={`/${barbershopSlug}/admin`} onClick={onClose} aria-label="TijerApp, inicio del panel" className={cn(styles.focus, "inline-flex min-h-11 items-center rounded-md")}>
          <Logo size="md" />
        </Link>
        {mobile ? (
          <button type="button" onClick={onClose} aria-label="Cerrar menu" className={cn(styles.focus, "inline-flex size-11 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-white/5 hover:text-white")}>
            <X className="size-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="mx-5 border-t border-white/10" />
      <nav aria-label="Administracion" className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-3 px-3 text-xs font-medium text-neutral-400">Tu espacio de trabajo</p>
        <ul className="grid gap-1">
          {groups.map(group => {
            const active = groupIsActive(group, pathname, canUse);
            const Icon = group.icon;
            return (
              <li key={group.key}>
                <Link
                  href={groupDefaultHref(group, canUse)}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={cn(styles.focus, "relative flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150",
                    active ? "bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold-hi)]" : "text-neutral-300 hover:bg-white/5 hover:text-white")}
                >
                  {active ? <span aria-hidden="true" className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-[color:var(--brand-gold)]" /> : null}
                  <Icon className={cn("size-[18px] shrink-0", active ? "text-[color:var(--brand-gold)]" : "text-neutral-400")} aria-hidden="true" />
                  <span className="min-w-0 flex-1">{group.label}</span>
                  {active ? <ChevronRight className="size-4 shrink-0 opacity-70" aria-hidden="true" /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-white/10 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
        <p className="break-words text-sm font-semibold text-white">{barbershopName}</p>
        <p className="mt-1 text-xs text-neutral-400">Plan {plan.tier === "pro" ? "Pro" : plan.tier === "esencial" ? "Esencial" : "Solo"}</p>
        <Link href={`/${barbershopSlug}`} target="_blank" rel="noopener noreferrer" className={cn(styles.focus, "mt-2 flex min-h-11 items-center gap-2 rounded-md text-sm text-neutral-300 transition-colors hover:text-[color:var(--brand-gold-hi)]")}>
          <ExternalLink className="size-4" aria-hidden="true" /> Pagina publica
        </Link>
      </div>
    </>
  );
}
