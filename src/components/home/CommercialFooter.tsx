import Link from "next/link";
import { Logo } from "@/components/ui";

export function CommercialFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[color:var(--border-subtle)] bg-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8 sm:py-12 lg:px-12">
        <div className="grid gap-8 sm:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Logo variant="wordmark" size="md" />
            <p className="mt-3 max-w-xs text-sm leading-6 text-[color:var(--text-muted)]">
              Plataforma SaaS de turnos para barberías. Pensada para usarla
              mientras se trabaja.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
              Producto
            </p>
            <ul className="mt-3 grid gap-2">
              <li>
                <Link
                  href="/producto"
                  className="text-sm text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
                >
                  Qué incluye
                </Link>
              </li>
              <li>
                <Link
                  href="/sv-barber"
                  className="text-sm text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
                >
                  Demo en vivo
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
                >
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
              Contacto
            </p>
            <ul className="mt-3 grid gap-2">
              <li>
                <Link
                  href="/#contacto"
                  className="text-sm text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
                >
                  Formulario
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/5493571549321"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <Link
                  href="/#faq"
                  className="text-sm text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
                >
                  Preguntas frecuentes
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[color:var(--border-subtle)] pt-6 sm:flex-row">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
            © {year} BarberSync · Todos los derechos reservados
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
            Hecho en Argentina 🇦🇷
          </p>
        </div>
      </div>
    </footer>
  );
}
