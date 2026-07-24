import Link from "next/link";
import { Logo } from "@/components/ui";

/**
 * Marco visual compartido de las pantallas de autenticación (login,
 * recuperar contraseña, nueva contraseña — y más adelante el registro).
 *
 * Centraliza el fondo con glow dorado, el header con el logo y la tarjeta
 * centrada, para que todas las puertas de entrada se vean iguales y con el
 * mismo nivel premium que la landing.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-black text-white">
      {/* Glow dorado superior, igual que la landing */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 45% at 50% 0%, color-mix(in oklab, var(--brand-gold) 12%, transparent) 0%, transparent 70%)",
        }}
      />

      <header className="px-4 py-4 sm:px-6">
        <Link href="/" aria-label="Ir al inicio" className="inline-flex">
          <Logo size="sm" />
        </Link>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-md flex-col justify-center px-4 pb-10 sm:px-6">
        <div className="card-premium p-6 sm:p-7">
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
              {subtitle}
            </p>
          ) : null}

          {children}
        </div>

        {footer ? (
          <div className="mt-5 text-center text-sm text-[color:var(--text-secondary)]">
            {footer}
          </div>
        ) : null}
      </section>
    </main>
  );
}

/** Clases compartidas de los inputs de auth (mismo look en las 3 pantallas). */
export const AUTH_FIELD_CLASS =
  "mt-2 min-h-12 w-full rounded-md border border-[color:var(--border-default)] bg-black px-4 text-base text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]";

export const AUTH_LABEL_CLASS =
  "text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--text-muted)]";

export const AUTH_BUTTON_CLASS =
  "inline-flex min-h-12 w-full items-center justify-center rounded-md bg-gold-grad px-6 text-sm font-bold uppercase tracking-[0.1em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60";
