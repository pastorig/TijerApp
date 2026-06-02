"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui";
import { cn } from "@/lib/cn";
import { signOut } from "@/lib/auth";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/owner",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Crear barbería",
    href: "/owner/create-barbershop",
    icon: Plus,
  },
  {
    label: "Mensajes",
    href: "/owner/mensajes",
    icon: Inbox,
  },
];

export function OwnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/");
    } catch {
      setIsSigningOut(false);
    }
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[color:var(--border-subtle)] bg-black/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir menú"
          className="inline-flex size-10 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
        >
          <Menu className="size-4" />
        </button>
        <Logo size="sm" />
        <div className="size-10" aria-hidden="true" />
      </div>

      {isOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-out-soft)]",
          "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border-subtle)] px-5 py-5">
          <Link
            href="/owner"
            onClick={() => setIsOpen(false)}
            className="inline-flex"
          >
            <Logo size="md" />
          </Link>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar menú"
            className="inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)] lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="border-b border-[color:var(--border-subtle)] px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Panel
          </p>
          <p className="mt-1 truncate text-sm font-bold text-[color:var(--brand-gold)]">
            Owner TijerApp
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="grid gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
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
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-[color:var(--border-subtle)] px-3 py-4">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--danger)] disabled:opacity-50"
          >
            <LogOut className="size-3.5 shrink-0" />
            <span className="truncate">
              {isSigningOut ? "Cerrando…" : "Cerrar sesión"}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
