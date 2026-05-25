"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ShieldOff } from "lucide-react";
import { requireBarbershopAccess } from "@/lib/barbershop-access";
import { getCurrentPlatformOwnerAccess } from "@/lib/platform-owner-access";
import { Logo } from "@/components/ui";

type AdminAuthGuardProps = {
  barbershopSlug: string;
  children: ReactNode;
};

export function AdminAuthGuard({
  barbershopSlug,
  children,
}: AdminAuthGuardProps) {
  const router = useRouter();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [accessError, setAccessError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      const [access, ownerAccess] = await Promise.all([
        requireBarbershopAccess(barbershopSlug),
        getCurrentPlatformOwnerAccess(),
      ]);

      if (!isMounted) {
        return;
      }

      if (!access.isAuthenticated && !ownerAccess.isAuthenticated) {
        router.replace(`/login?next=/${barbershopSlug}/admin`);
        return;
      }

      if (ownerAccess.isOwner) {
        setIsAuthorized(true);
        setIsCheckingAccess(false);
        return;
      }

      if (!access.hasAccess) {
        setAccessError(
          access.error
            ? "No pudimos validar tus permisos. Intentá nuevamente."
            : "",
        );
        setIsUnauthorized(true);
        setIsCheckingAccess(false);
        return;
      }

      setIsAuthorized(true);
      setIsCheckingAccess(false);
    }

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [barbershopSlug, router]);

  if (isCheckingAccess) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-5 py-10">
          <Logo variant="mark" size="lg" className="mb-6 opacity-40" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
            Verificando acceso…
          </p>
        </div>
      </main>
    );
  }

  if (isUnauthorized || !isAuthorized) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center">
          <div className="inline-flex size-14 items-center justify-center rounded-full border border-[color:var(--danger)]/30 text-[color:var(--danger)]">
            <ShieldOff className="size-6" />
          </div>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--danger)]">
            Acceso restringido
          </p>
          <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl">
            No autorizado
          </h1>
          <p className="mt-4 text-sm leading-6 text-[color:var(--text-secondary)]">
            Tu usuario no tiene permisos para administrar esta barbería.
          </p>
          {accessError ? (
            <p className="mt-6 border-l-2 border-[color:var(--danger)] pl-4 text-left text-xs font-semibold text-[color:var(--danger)]">
              {accessError}
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  return children;
}
