"use client";

import { useCallback, useState, type ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminSubtabs } from "./AdminSubtabs";
import { AdminTopBar } from "./AdminTopBar";
import { PlanStatusBanner } from "./PlanStatusBanner";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import styles from "./AdminShell.module.css";

/**
 * Chrome del admin: layout + estado del drawer del sidebar (mobile). Recibe el
 * contenido de la página como children. Composición:
 *
 *   ┌── sidebar (grupos) ──┬── AdminTopBar (chip usuario/sesión) ──┐
 *   │                      │  PlanStatusBanner                     │
 *   │                      │  AdminSubtabs (subpestañas del grupo) │
 *   │                      │  {children}                           │
 *   └──────────────────────┴───────────────────────────────────────┘
 */
export function AdminChrome({
  barbershopSlug,
  barbershopName,
  children,
}: {
  barbershopSlug: string;
  barbershopName: string;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <div className={`${styles.chrome} min-h-screen bg-[#09090b] text-white lg:flex`}>
      <a href="#admin-content" className="sr-only fixed left-4 top-3 z-50 rounded-md bg-white px-4 py-3 text-sm font-semibold text-black focus:not-sr-only">
        Ir al contenido
      </a>
      <AdminSidebar
        barbershopSlug={barbershopSlug}
        barbershopName={barbershopName}
        open={drawerOpen}
        onClose={closeDrawer}
      />

      <main className="min-w-0 flex-1">
        <AdminTopBar
          barbershopSlug={barbershopSlug}
          barbershopName={barbershopName}
          drawerOpen={drawerOpen}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        <PlanStatusBanner barbershopSlug={barbershopSlug} />
        {/* Ofrecer instalar la app (desktop y mobile). Se autorregula: solo
            aparece las primeras visitas y después cada 4 días. */}
        <InstallBanner />
        <AdminSubtabs barbershopSlug={barbershopSlug} />
        <div id="admin-content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-5 outline-none sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
