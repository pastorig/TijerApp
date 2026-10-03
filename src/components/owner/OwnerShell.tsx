import type { ReactNode } from "react";
import { OwnerSidebar } from "./OwnerSidebar";

type OwnerShellProps = {
  children: ReactNode;
};

/**
 * Layout shell para todas las páginas /owner/*.
 * Sidebar fijo en desktop, drawer en mobile (mismo patrón que AdminShell).
 */
export function OwnerShell({ children }: OwnerShellProps) {
  return (
    <div className="min-h-screen bg-black text-white lg:flex">
      <OwnerSidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-8 sm:py-6 lg:px-10 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
