import type { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";

type AdminShellProps = {
  children: ReactNode;
  barbershopSlug: string;
  barbershopName: string;
};

/**
 * Layout shell para todas las páginas de /[slug]/admin/*.
 * Sidebar fijo en desktop (lg+), drawer colapsable en mobile.
 *
 * El sidebar maneja navegación entre Dashboard, Turnero, Reportes y Barberos
 * + footer con quick actions (página pública, nuevo turno, cerrar sesión).
 */
export function AdminShell({
  children,
  barbershopSlug,
  barbershopName,
}: AdminShellProps) {
  return (
    <div className="min-h-screen bg-black text-white lg:flex">
      <AdminSidebar
        barbershopSlug={barbershopSlug}
        barbershopName={barbershopName}
      />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
