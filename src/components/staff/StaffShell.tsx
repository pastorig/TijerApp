"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CalendarDays, LogOut, ShieldOff, UserCog, Wallet } from "lucide-react";
import { InitialsAvatar } from "@/components/booking/InitialsAvatar";
import { getCurrentUserStaffBarbershops } from "@/lib/staff-access-client";
import { signOut } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { Button, Card, Logo } from "@/components/ui";
import {
  PERMISOS_POR_DEFECTO,
  type StaffPermissions,
} from "@/lib/staff-permissions";

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
 *
 * ── Por qué se parece tanto al panel del dueño ──────────────────────────────
 * Porque es el mismo producto. La barra de arriba (56px, sticky, ícono dorado
 * de la sección) y las pestañas con borde inferior son las de `AdminTopBar` y
 * `AdminSubtabs`. Un barbero que también es dueño pasa de una a la otra sin
 * sentir que cambió de aplicación. El contenido usa el mismo ancho y los
 * mismos márgenes: antes quedaba en una columna de celular en una pantalla de
 * escritorio.
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
  // Los permisos salen de la MISMA consulta que ya resolvía "¿tenés acceso?"
  // (feature 019): saber qué pestañas mostrar no cuesta un pedido más.
  const [permisos, setPermisos] = useState<StaffPermissions>(
    PERMISOS_POR_DEFECTO,
  );

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const { data } = await getCurrentUserStaffBarbershops();
      if (!vivo) return;
      const acceso = data.find((a) => a.barbershopSlug === barbershopSlug);
      if (acceso) setPermisos(acceso.permisos);
      setEstado(acceso ? "ok" : "sin-acceso");
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
        <Card className="max-w-sm text-center">
          <ShieldOff className="mx-auto size-8 text-[color:var(--text-muted)]" />
          <h1 className="mt-4 text-lg font-black text-white">
            No tenés acceso a esta barbería
          </h1>
          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
            Si trabajás acá, pedile al dueño que te dé acceso desde Equipo.
          </p>
          <Button
            size="sm"
            className="mt-5"
            onClick={() => router.replace("/login")}
          >
            Ir al login
          </Button>
        </Card>
      </div>
    );
  }

  const tabs = [
    {
      href: `/${barbershopSlug}/mi-agenda`,
      label: "Mi agenda",
      icon: CalendarDays,
    },
    // Ganancias desaparece si el dueño no la habilitó. La ruta igual existe y
    // se defiende sola: sacar el link no alcanza si alguien la tiene guardada.
    ...(permisos.verGanancias
      ? [
          {
            href: `/${barbershopSlug}/mi-agenda/ganancias`,
            label: "Ganancias",
            icon: Wallet,
          },
        ]
      : []),
    {
      href: `/${barbershopSlug}/mi-agenda/cuenta`,
      label: "Mi cuenta",
      icon: UserCog,
    },
  ];

  const seccion = tabs.find((tab) => tab.href === pathname) ?? tabs[0];
  const SeccionIcon = seccion.icon;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Barra superior — misma altura, mismo sticky y mismo blur que el panel. */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[color:var(--border-subtle)] bg-black/95 px-4 backdrop-blur-md sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <SeccionIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-[color:var(--brand-gold)]"
          />
          <p className="truncate text-sm font-bold tracking-tight text-white sm:text-base">
            {seccion.label}
          </p>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          {/* El nombre de la barbería es contexto, no navegación: un empleado
              tiene una sola. En pantalla chica se queda solo el avatar. */}
          <span className="flex min-w-0 items-center gap-2">
            <InitialsAvatar name={barbershopName} className="size-8 text-[11px]" />
            <span className="hidden max-w-[14rem] truncate text-xs font-semibold text-[color:var(--text-secondary)] sm:inline">
              {barbershopName}
            </span>
          </span>
          <button
            type="button"
            onClick={() => void signOut().then(() => router.replace("/login"))}
            aria-label="Salir"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* Pestañas — las subpestañas del panel, tal cual. */}
      <div className="sticky top-14 z-30 border-b border-[color:var(--border-subtle)] bg-black/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-4 sm:px-8 lg:px-12">
          {tabs.map((tab) => {
            const activo = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-3 text-sm font-semibold transition-colors duration-[var(--duration-fast)]",
                  activo
                    ? "border-[color:var(--brand-gold)] text-[color:var(--brand-gold)]"
                    : "border-transparent text-[color:var(--text-muted)] hover:text-white",
                )}
              >
                <tab.icon className="size-4 shrink-0" aria-hidden="true" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
        {children}
      </div>
    </div>
  );
}
