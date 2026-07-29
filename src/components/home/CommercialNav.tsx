import Link from "next/link";
import { Button, Logo } from "@/components/ui";
import { CommercialNavMobileMenu } from "./CommercialNavMobileMenu";

/**
 * Nav de las páginas comerciales (home, producto, precios).
 *
 * En celular solo viven el logo, el CTA principal y el botón de menú: los
 * cuatro links en fila pedían 442px de ancho a 375px de viewport, así que
 * "Empezá gratis" quedaba cortado fuera de pantalla. Desde `sm` se muestran
 * todos los links y el menú lateral desaparece.
 */
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
        <div className="flex items-center gap-1.5 sm:gap-1">
          <Link
            href="/producto"
            className="hidden min-h-9 items-center justify-center rounded-[var(--radius-sm)] px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)] sm:inline-flex sm:px-3 sm:tracking-[0.14em]"
          >
            Producto
          </Link>
          <Link
            href="/precios"
            className="hidden min-h-9 items-center justify-center rounded-[var(--radius-sm)] px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)] sm:inline-flex sm:px-3 sm:tracking-[0.14em]"
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
          <Button
            as="link"
            href="/login"
            variant="secondary"
            size="sm"
            className="hidden sm:inline-flex"
          >
            Iniciar sesión
          </Button>
          {/* Único CTA que sobrevive en celular. min-h-11 para que sea un
              target táctil cómodo; desde sm vuelve al alto compacto. */}
          <Button
            as="link"
            href="/registro"
            size="sm"
            className="min-h-11 sm:min-h-9"
          >
            Empezá gratis
          </Button>
          <CommercialNavMobileMenu />
        </div>
      </div>
    </nav>
  );
}
