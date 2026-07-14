"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, LogOut, Plus } from "lucide-react";
import { InitialsAvatar } from "@/components/booking/InitialsAvatar";
import { InstallButton } from "@/components/pwa/InstallButton";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/cn";

/**
 * Chip del usuario/barbería en la barra superior. Al tocarlo abre un menú con
 * las acciones que antes vivían en el footer del sidebar: página pública,
 * nuevo turno público, instalar app y cerrar sesión. Cierra con click afuera
 * o Escape (mismo patrón que el UserMenu de EstetiApp).
 */
export function AdminUserMenu({
  barbershopSlug,
  barbershopName,
}: {
  barbershopSlug: string;
  barbershopName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } catch {
      setIsSigningOut(false);
    }
  }

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-white";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full p-1 pr-1.5 transition-colors hover:bg-[color:var(--surface-1)]"
      >
        <InitialsAvatar name={barbershopName} className="size-8 text-[11px]" />
        <span className="hidden max-w-[140px] truncate text-sm font-semibold text-white sm:block">
          {barbershopName}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[color:var(--text-muted)] transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-scale-in absolute right-0 z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-1.5 shadow-2xl"
        >
          <div className="border-b border-[color:var(--border-subtle)] px-3 pb-2 pt-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              Barbería
            </p>
            <p className="truncate text-sm font-bold text-white">
              {barbershopName}
            </p>
          </div>

          <div className="py-1">
            <Link
              href={`/${barbershopSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <ExternalLink className="size-4 shrink-0 text-[color:var(--text-muted)]" />
              Ver página pública
            </Link>
            <Link
              href={`/${barbershopSlug}/reservar`}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <Plus className="size-4 shrink-0 text-[color:var(--text-muted)]" />
              Nuevo turno público
            </Link>
            <InstallButton
              variant="sidebar-item"
              className={cn(itemClass, "normal-case tracking-normal")}
            />
          </div>

          <div className="my-1 border-t border-[color:var(--border-subtle)]" />

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-semibold text-[color:var(--danger)] transition-colors hover:bg-[color:var(--danger-soft)] disabled:opacity-50"
          >
            <LogOut className="size-4 shrink-0" />
            {isSigningOut ? "Cerrando…" : "Cerrar sesión"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
