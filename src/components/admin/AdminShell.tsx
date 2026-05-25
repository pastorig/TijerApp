import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui";

type AdminShellProps = {
  children: ReactNode;
  /** Slug de la barbería — para los links del nav. */
  barbershopSlug: string;
  /** Nombre visible — usado en el "← Volver a SV Barber". */
  barbershopName?: string;
  /** Ruta del link de back. Default: `/${slug}` (página pública). */
  backHref?: string;
  /** Texto del link de back. Default: "← {nombre}". */
  backLabel?: string;
};

export function AdminShell({
  children,
  barbershopSlug,
  barbershopName,
  backHref,
  backLabel,
}: AdminShellProps) {
  const href = backHref ?? `/${barbershopSlug}`;
  const label = backLabel ?? `← ${barbershopName ?? "Volver"}`;

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-8 sm:py-6 lg:px-12">
        <Link
          href={href}
          className="inline-flex min-w-0 items-center gap-1 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)] sm:tracking-[0.2em]"
        >
          <ArrowLeft className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{label.replace(/^←\s*/, "")}</span>
        </Link>
        <Logo variant="mark" size="sm" className="shrink-0" />
      </nav>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        {children}
      </div>
    </main>
  );
}
