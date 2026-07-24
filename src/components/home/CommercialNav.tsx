import Link from "next/link";
import { Button, Logo } from "@/components/ui";

export function CommercialNav() {
  return (
    <nav className="sticky top-0 z-20 border-b border-[color:var(--border-subtle)] bg-black/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-8 sm:py-4 lg:px-12">
        <Link
          href="/"
          aria-label="Ir al inicio de TijerApp"
          className="inline-flex shrink-0"
        >
          <Logo variant="mark" size="md" className="sm:hidden" />
          <Logo size="md" className="hidden sm:inline-flex" />
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Link
            href="/producto"
            className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-sm)] px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)] sm:px-3 sm:tracking-[0.14em]"
          >
            Producto
          </Link>
          <Link
            href="/precios"
            className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-sm)] px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)] sm:px-3 sm:tracking-[0.14em]"
          >
            Precios
          </Link>
          <Button
            as="link"
            href="/primebarber"
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            Demo
          </Button>
          <Button as="link" href="/login" variant="secondary" size="sm">
            Iniciar sesión
          </Button>
          <Button as="link" href="/registro" size="sm">
            Empezá gratis
          </Button>
        </div>
      </div>
    </nav>
  );
}
