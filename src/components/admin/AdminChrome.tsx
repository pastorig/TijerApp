"use client";

import { useState, type ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminSubtabs } from "./AdminSubtabs";
import { AdminTopBar } from "./AdminTopBar";
import { PlanStatusBanner } from "./PlanStatusBanner";

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

  return (
    <div className="min-h-screen bg-black text-white lg:flex">
      <AdminSidebar
        barbershopSlug={barbershopSlug}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <main className="min-w-0 flex-1">
        <AdminTopBar
          barbershopSlug={barbershopSlug}
          barbershopName={barbershopName}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        <PlanStatusBanner barbershopSlug={barbershopSlug} />
        <AdminSubtabs barbershopSlug={barbershopSlug} />
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
