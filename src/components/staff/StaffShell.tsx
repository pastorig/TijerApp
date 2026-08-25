"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CalendarDays, LogOut, ShieldOff, Wallet } from "lucide-react";
import { getCurrentUserStaffBarbershops } from "@/lib/staff-access-client";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/ui";

/**
 * El marco de las pantallas del empleado: guard + navegación.
 *
 * El guard de acá es **comodidad, no seguridad**. Lo que de verdad protege los
 * datos es que el empleado no está en `barbershop_admins` (RLS lo frena) y que
 * cada endpoint de `/api/staff/*` resuelve su barbero en el servidor. Si este
 * componente fallara, no se filtraría nada: las pantallas quedarían vacías.
 *
 * Se chequea en cada carga y no solo al entrar, así revocarle el acceso a
 * alguien lo saca aunque tenga la app abierta.
 */
export function StaffShell({
  barbershopSlug,
  barbershopName,
  children,
}: {
  barbershopSlug: string;
  barbershopName: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [estado, setEstado] = useState<"chequeando" | "ok" | "sin-acceso">(
    "chequeando",
  );

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const { data } = await getCurrentUserStaffBarbershops();
      if (!vivo) return;
      const tiene = data.some((a) => a.barbershopSlug === barbershopSlug);
      setEstado(tiene ? "ok" : "sin-acceso");
    })();
    return () => {
      vivo = false;
    };
  }, [barbershopSlug]);

  if (estado === "chequeando") {
    return (
      <div className="grid min-h-screen place-items-center bg-[color:var(--surface-0)]">
        <Logo className="h-8 w-auto animate-pulse opacity-60" />
      </div>
    );
  }

  if (estado === "sin-acceso") {
    return (
      <div className="grid min-h-screen place-items-center bg-[color:var(--surface-0)] px-6">
        <div className="max-w-sm text-center">
          <ShieldOff className="mx-auto size-8 text-[color:var(--text-muted)]" />
          <h1 className="mt-4 text-lg font-black text-white">
            No tenés acceso a esta barbería
          </h1>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            Si trabajás acá, pedile al dueño que te dé acceso desde Equipo.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="bg-gold-grad mt-5 min-h-10 rounded-[var(--radius-sm)] px-4 text-xs font-bold uppercase tracking-[0.14em] text-black"
          >
            Ir al login
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      href: `/${barbershopSlug}/mi-agenda`,
      label: "Mi agenda",
      icon: CalendarDays,
    },
    {
      href: `/${barbershopSlug}/mi-agenda/ganancias`,
      label: "Mis ganancias",
      icon: Wallet,
    },
  ];

  return (
    <div className="min-h-screen bg-[color:var(--surface-0)]">
      <header className="sticky top-0 z-20 border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <p className="truncate text-sm font-black uppercase tracking-tight text-white">
            {barbershopName}
          </p>
          <button
            type="button"
            onClick={() => void signOut().then(() => router.replace("/login"))}
            aria-label="Salir"
            className="rounded-full p-2 text-[color:var(--text-muted)] hover:text-white"
          >
            <LogOut className="size-4" />
          </button>
        </div>
        <nav className="mx-auto flex w-full max-w-2xl gap-1 px-4 pb-2">
          {tabs.map((tab) => {
            const activo = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                  activo
                    ? "bg-gold-grad text-black"
                    : "border border-[color:var(--border-subtle)] text-[color:var(--text-secondary)]",
                )}
              >
                <tab.icon className="size-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}
