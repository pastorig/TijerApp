"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useLockDocumentScroll } from "@/hooks/useLockDocumentScroll";
import { AdminBottomNav } from "./AdminBottomNav";
import { AdminSidebar } from "./AdminSidebar";
import { AdminSubtabs } from "./AdminSubtabs";
import { AdminTopBar } from "./AdminTopBar";
import { PlanStatusBanner } from "./PlanStatusBanner";
import { InstallBanner } from "@/components/pwa/InstallBanner";

/**
 * Chrome del admin: layout + estado del drawer del sidebar. Recibe el
 * contenido de la página como children. Composición:
 *
 *   ┌── sidebar (grupos) ──┬── AdminTopBar (chip usuario/sesión) ──┐
 *   │                      │  PlanStatusBanner                     │
 *   │                      │  AdminSubtabs (subpestañas del grupo) │
 *   │                      │  {children}                           │
 *   └──────────────────────┴───────────────────────────────────────┘
 *
 * En el celular (< 768 px, feature 041) el panel mide la pantalla y el scroll
 * va por adentro de `<main>` (`tj-panel` / `tj-panel-scroll`): así la barra de
 * abajo queda apoyada en el borde también en el iPhone instalado. La
 * hamburguesa queda para la tablet (768-1023 px).
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
  // Estable entre renders: el menú del celular depende de esta función para
  // abrirse y cerrarse, y una nueva en cada render lo reabriría.
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  useLockDocumentScroll();

  return (
    <div className="tj-panel min-h-screen bg-black text-white lg:flex">
      <AdminSidebar
        barbershopSlug={barbershopSlug}
        barbershopName={barbershopName}
        open={drawerOpen}
        onClose={closeDrawer}
      />

      <main className="tj-panel-scroll min-w-0 flex-1">
        <AdminTopBar
          barbershopSlug={barbershopSlug}
          barbershopName={barbershopName}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        <PlanStatusBanner barbershopSlug={barbershopSlug} />
        {/* Ofrecer instalar la app (desktop y mobile). Se autorregula: solo
            aparece las primeras visitas y después cada 4 días. */}
        <InstallBanner />
        <AdminSubtabs barbershopSlug={barbershopSlug} />
        <div className="tj-panel-contenido mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          {children}
        </div>
      </main>

      <AdminBottomNav barbershopSlug={barbershopSlug} />
    </div>
  );
}
