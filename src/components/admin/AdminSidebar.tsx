"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Clock,
  Contact,
  ExternalLink,
  Image as ImageIcon,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Plus,
  Settings,
  Star,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui";
import { cn } from "@/lib/cn";
import { signOut } from "@/lib/auth";

type AdminSidebarProps = {
  barbershopSlug: string;
  barbershopName: string;
};

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** Match exacto si true; sino prefix. */
  exact?: boolean;
};

export function AdminSidebar({
  barbershopSlug,
  barbershopName,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: `/${barbershopSlug}/admin`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Turnero",
      href: `/${barbershopSlug}/admin/turnero`,
      icon: CalendarDays,
    },
    {
      label: "Recordatorios",
      href: `/${barbershopSlug}/admin/recordatorios`,
      icon: Bell,
    },
    {
      label: "Lista de espera",
      href: `/${barbershopSlug}/admin/lista-espera`,
      icon: Clock,
    },
    {
      label: "Reportes",
      href: `/${barbershopSlug}/admin/reportes`,
      icon: LineChart,
    },
    {
      label: "Cierre de caja",
      href: `/${barbershopSlug}/admin/cierre`,
      icon: Wallet,
    },
    {
      label: "Barberos",
      href: `/${barbershopSlug}/admin/barbers`,
      icon: Users,
    },
    {
      label: "Clientes",
      href: `/${barbershopSlug}/admin/clientes`,
      icon: Contact,
    },
    {
      label: "Reseñas",
      href: `/${barbershopSlug}/admin/resenas`,
      icon: Star,
    },
    {
      label: "Galería",
      href: `/${barbershopSlug}/admin/galeria`,
      icon: ImageIcon,
    },
    {
      label: "Configuración",
      href: `/${barbershopSlug}/admin/settings`,
      icon: Settings,
    },
  ];

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } catch {
      setIsSigningOut(false);
    }
  }

  return (
    <>
      {/* Mobile: top bar con hamburger + logo */}
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

      {/* Mobile drawer overlay */}
      {isOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      {/* Sidebar: drawer en mobile, fijo en desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-out-soft)]",
          "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border-subtle)] px-5 py-5">
          <Link
            href={`/${barbershopSlug}/admin`}
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

        {/* Barbería actual */}
        <div className="border-b border-[color:var(--border-subtle)] px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Barbería
          </p>
          <p className="mt-1 truncate text-sm font-bold text-white">
            {barbershopName}
          </p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="grid gap-1">
            {navItems.map((item) => {
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

        {/* Footer: quick actions */}
        <div className="border-t border-[color:var(--border-subtle)] px-3 py-4">
          <ul className="grid gap-1">
            <li>
              <Link
                href={`/${barbershopSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="inline-flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--brand-gold)]"
              >
                <ExternalLink className="size-3.5 shrink-0" />
                <span className="truncate">Página pública</span>
              </Link>
            </li>
            <li>
              <Link
                href={`/${barbershopSlug}/reservar`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="inline-flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--brand-gold)]"
              >
                <Plus className="size-3.5 shrink-0" />
                <span className="truncate">Nuevo turno público</span>
              </Link>
            </li>
            <li>
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
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}
