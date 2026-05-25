"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getCurrentPlatformOwnerAccess } from "@/lib/platform-owner-access";

type OwnerAuthGuardProps = {
  children: ReactNode;
};

export function OwnerAuthGuard({ children }: OwnerAuthGuardProps) {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const ownerAccess = await getCurrentPlatformOwnerAccess();

      if (!isMounted) {
        return;
      }

      if (!ownerAccess.isAuthenticated) {
        router.replace("/owner/login");
        return;
      }

      if (!ownerAccess.isOwner) {
        router.replace("/owner/login?error=not-owner");
        return;
      }

      setIsAuthenticated(true);
      setIsCheckingSession(false);
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isCheckingSession || !isAuthenticated) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-6 text-[color:var(--text-secondary)]">
            Verificando acceso owner...
          </div>
        </div>
      </main>
    );
  }

  return children;
}
