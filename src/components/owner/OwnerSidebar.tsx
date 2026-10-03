"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CreditCard, Inbox, LayoutDashboard, LogOut, Menu, Plus, X } from "lucide-react";
import { Logo, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";
import { signOut } from "@/lib/auth";
import styles from "../admin/AdminShell.module.css";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/owner", icon: LayoutDashboard, exact: true },
  { label: "Planes", href: "/owner/planes", icon: CreditCard },
  { label: "Crear barbería", href: "/owner/create-barbershop", icon: Plus },
  { label: "Mensajes", href: "/owner/mensajes", icon: Inbox },
];

export function OwnerSidebar() {
  const router = useRouter();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeMenu = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    if (desktop.matches) {
      const frame = window.requestAnimationFrame(closeMenu);
      return () => window.cancelAnimationFrame(frame);
    }
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    function containFocus(event: KeyboardEvent) {
      if (event.key !== "Tab" || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex="0"]',
      )).filter(element => element.getClientRects().length > 0);
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
    }
    const resize = () => { if (desktop.matches) closeMenu(); };
    dialog.addEventListener("keydown", containFocus);
    desktop.addEventListener("change", resize);
    return () => {
      dialog.removeEventListener("keydown", containFocus);
      desktop.removeEventListener("change", resize);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [isOpen, closeMenu]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/");
    } catch {
      setIsSigningOut(false);
      toast.error("No pudimos cerrar la sesión. Intentá nuevamente.");
    }
  }

  const content = (mobile: boolean) => (
    <OwnerSidebarContent mobile={mobile} onClose={closeMenu} onSignOut={handleSignOut} isSigningOut={isSigningOut} />
  );

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-black/95 px-4 backdrop-blur-md lg:hidden">
        <button type="button" onClick={() => setIsOpen(true)} aria-label="Abrir menú owner" aria-expanded={isOpen} aria-controls="owner-navigation-drawer" className={cn(styles.focus, "inline-flex size-11 items-center justify-center rounded-md border border-white/10 text-neutral-300 hover:text-white")}>
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <div className="flex flex-col items-center gap-1"><Logo size="sm" /><span className="text-xs text-neutral-400">Panel owner</span></div>
        <div className="size-11" aria-hidden="true" />
      </header>
      <aside aria-label="Panel owner" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-white/10 bg-[#101012] lg:flex">{content(false)}</aside>
      <dialog
        ref={dialogRef}
        id="owner-navigation-drawer"
        aria-label="Navegación owner"
        onCancel={closeMenu}
        onClose={closeMenu}
        onClick={event => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeMenu();
        }}
        className={cn(styles.drawer, "fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(288px,calc(100vw-48px))] max-w-none border-r border-white/10 bg-[#101012] p-0 text-white backdrop:bg-black/70")}
      ><div className="flex h-full flex-col">{content(true)}</div></dialog>
    </>
  );
}

function OwnerSidebarContent({ mobile, onClose, onSignOut, isSigningOut }: {
  mobile: boolean;
  onClose: () => void;
  onSignOut: () => void;
  isSigningOut: boolean;
}) {
  const pathname = usePathname();
  return (
    <>
      <div className="flex min-h-20 items-center justify-between gap-2 px-5">
        <Link href="/owner" onClick={onClose} aria-label="TijerApp, inicio owner" className={cn(styles.focus, "inline-flex min-h-11 items-center rounded-md")}><Logo size="md" /></Link>
        {mobile ? <button type="button" onClick={onClose} aria-label="Cerrar menú owner" className={cn(styles.focus, "inline-flex size-11 items-center justify-center rounded-md text-neutral-400 hover:text-white")}><X className="size-5" aria-hidden="true" /></button> : null}
      </div>
      <div className="mx-5 border-t border-white/10" />
      <nav aria-label="Gestión de la plataforma" className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-3 px-3 text-xs font-medium text-neutral-400">Owner TijerApp</p>
        <ul className="grid gap-1">{NAV_ITEMS.map(item => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return <li key={item.href}><Link href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={cn(styles.focus, "relative flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150", active ? "bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold-hi)]" : "text-neutral-300 hover:bg-white/5 hover:text-white")}>
            {active ? <span aria-hidden="true" className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-[color:var(--brand-gold)]" /> : null}
            <Icon className="size-[18px] shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1">{item.label}</span>
          </Link></li>;
        })}</ul>
      </nav>
      <div className="border-t border-white/10 px-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        <p className="mb-2 px-3 text-xs text-neutral-400">Administración de la plataforma</p>
        <button type="button" onClick={onSignOut} disabled={isSigningOut} className={cn(styles.focus, "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-neutral-300 hover:bg-white/5 hover:text-[color:var(--danger)] disabled:opacity-50")}><LogOut className="size-4 shrink-0" aria-hidden="true" /><span>{isSigningOut ? "Cerrando…" : "Cerrar sesión"}</span></button>
      </div>
    </>
  );
}
