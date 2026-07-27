import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui";
import { HeroShowcase } from "@/components/home/ui/HeroShowcase";

/**
 * Marco visual compartido de TODAS las pantallas de autenticación (login de
 * barbería, login global, login owner, registro, recuperar y nueva contraseña).
 *
 * Layout "split premium":
 *  - Desktop (lg+): dos columnas. Izquierda = el formulario en una card con
 *    profundidad; derecha = un panel de marca con grid de fondo, glow dorado y
 *    una mini-viz del producto real (reusa HeroShowcase de la home) para que la
 *    puerta de entrada muestre lo que la barbería va a manejar.
 *  - Mobile: una sola columna con el formulario (el panel se oculta para no
 *    pesar en el celu, que es donde más entran los barberos). La card premium +
 *    el glow dorado mantienen el nivel.
 *
 * Todas las props visuales nuevas son opcionales → las pantallas viejas que ya
 * usaban AuthShell (registro, recuperar, nueva contraseña) siguen andando sin
 * tocarlas, y ganan el layout nuevo gratis.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  eyebrow,
  backLink,
  panelTitle = "Tu barbería, en orden.",
  panelSubtitle = "Agenda, reservas online y reportes en un solo lugar. Así se ve por dentro.",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Kicker dorado arriba del título (ej. "Acceso administrador", "Owner"). */
  eyebrow?: string;
  /** Link de "volver" arriba a la izquierda (ej. ← a la landing de la barbería). */
  backLink?: { href: string; label: string };
  /** Título del panel de marca (columna derecha en desktop). */
  panelTitle?: string;
  /** Bajada del panel de marca. */
  panelSubtitle?: string;
}) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-black text-white">
      {/* Glow dorado ambiente, igual que la landing */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 45% at 25% 0%, color-mix(in oklab, var(--brand-gold) 12%, transparent) 0%, transparent 70%)",
        }}
      />

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* ─────────── Columna izquierda: formulario ─────────── */}
        <div className="flex flex-col px-5 py-5 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between gap-3">
            {backLink ? (
              <Link
                href={backLink.href}
                className="inline-flex min-w-0 items-center gap-1 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)] sm:tracking-[0.2em]"
              >
                <ArrowLeft className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{backLink.label}</span>
              </Link>
            ) : (
              <Link href="/" aria-label="Ir al inicio" className="inline-flex">
                <Logo size="sm" />
              </Link>
            )}
            {/* En mobile, cuando el panel de marca no se ve, mostramos el
                isotipo a la derecha para no perder la marca del todo. */}
            <Logo
              variant="mark"
              size="sm"
              className={backLink ? "shrink-0" : "shrink-0 lg:hidden"}
            />
          </div>

          <div className="flex flex-1 flex-col justify-center py-10">
            <div className="mx-auto w-full max-w-md animate-fade-up">
              <div className="card-premium p-6 sm:p-7">
                {eyebrow ? (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
                    {eyebrow}
                  </p>
                ) : null}
                <h1 className="mt-3 text-2xl font-black uppercase leading-[1.05] tracking-tight text-balance text-white sm:text-3xl">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">
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
            </div>
          </div>
        </div>

        {/* ─────────── Columna derecha: panel de marca (solo lg+) ─────────── */}
        <aside className="relative hidden overflow-hidden border-l border-[color:var(--border-subtle)] bg-grid-faint lg:flex lg:flex-col lg:justify-center">
          {/* Glow dorado del panel */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(55% 50% at 65% 35%, rgba(201,162,62,0.16), transparent 70%)",
            }}
          />
          <div className="relative px-10 py-16 xl:px-16">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
              TijerApp
            </p>
            <h2 className="mt-4 max-w-md text-4xl font-black uppercase leading-[0.95] tracking-tight text-balance text-white xl:text-5xl">
              {panelTitle}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[color:var(--text-secondary)]">
              {panelSubtitle}
            </p>

            <div className="mt-12">
              <HeroShowcase />
            </div>
          </div>
        </aside>
      </div>
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
