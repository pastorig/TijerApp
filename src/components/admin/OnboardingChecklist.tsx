"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Copy,
  EyeOff,
  ImagePlus,
  Rocket,
  Scissors,
  Share2,
  Sparkles,
  Store,
  Clock3,
} from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { cn } from "@/lib/cn";
import {
  getOnboardingSteps,
  type OnboardingStep,
  type OnboardingStepId,
} from "@/lib/onboarding-steps";
import { whatsAppShareLink } from "@/lib/whatsapp";
import { useToast } from "@/components/ui";
import { useIsReadOnly } from "./PlanContext";

const STEP_ICONS: Record<OnboardingStepId, typeof Scissors> = {
  servicios: Scissors,
  horarios: Clock3,
  contacto: Store,
  logo: ImagePlus,
  prueba: Sparkles,
  compartir: Share2,
};

/** Una clave por barbería: un admin de dos locales no debería perder la guía
 *  de una al ocultar la de la otra. */
function hiddenStorageKey(slug: string) {
  return `tijerapp:onboarding-hidden:${slug}`;
}

function readHidden(slug: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(hiddenStorageKey(slug)) === "1";
  } catch {
    return false;
  }
}

/**
 * OnboardingChecklist — la guía de primeros pasos del panel.
 *
 * El avance se deriva del estado real de la barbería (ver `onboarding-steps.ts`):
 * el barbero no marca nada a mano, y una barbería que ya estaba configurada la
 * ve terminada sin ningún backfill.
 *
 * Tres estados:
 *  - **incompleta**: la lista de pasos, arriba de todo, con acceso directo a cada uno.
 *  - **terminada**: colapsa a un bloque bajo con el link público y compartir.
 *  - **oculta**: solo queda un botón para volver a abrirla.
 *
 * Con el plan vencido el panel es de lectura: se muestra el link (que sigue
 * sirviendo) pero no los accesos de configuración, que no llevarían a nada.
 */
export function OnboardingChecklist({
  barbershop,
  appointmentCount,
}: {
  barbershop: DemoBarbershop;
  appointmentCount: number;
}) {
  const toast = useToast();
  const isReadOnly = useIsReadOnly();

  // Lazy init para que no haya parpadeo de la guía al montar.
  const [isHidden, setIsHidden] = useState<boolean>(() =>
    readHidden(barbershop.slug),
  );

  const progress = useMemo(
    () => getOnboardingSteps(barbershop, appointmentCount),
    [barbershop, appointmentCount],
  );

  const publicUrl = useMemo(() => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tijerapp.com");
    return `${origin}${progress.publicPath}`;
  }, [progress.publicPath]);

  function persistHidden(hidden: boolean) {
    setIsHidden(hidden);
    try {
      if (hidden) {
        window.localStorage.setItem(hiddenStorageKey(barbershop.slug), "1");
      } else {
        window.localStorage.removeItem(hiddenStorageKey(barbershop.slug));
      }
    } catch {
      /* noop: ocultar la guía es una comodidad, no vale romper por esto */
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("No pudimos copiar el link. Copialo a mano.");
    }
  }

  const shareHref = whatsAppShareLink(
    `Reservá tu turno en ${barbershop.name}: ${publicUrl}`,
  );

  if (isHidden) {
    return (
      <button
        type="button"
        onClick={() => persistHidden(false)}
        className="mb-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[color:var(--text-muted)] transition-colors hover:border-[color:var(--brand-gold-ring)] hover:text-white"
      >
        <Rocket aria-hidden="true" className="size-3.5" />
        Ver primeros pasos
      </button>
    );
  }

  // ── Terminada: bloque bajo con el link, sin reclamar atención ─────────────
  if (progress.isComplete) {
    return (
      <section
        aria-label="Tu link público"
        className="card-premium mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)]">
            Tu link para compartir
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-white">
            {publicUrl}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] px-3 text-xs font-semibold text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--brand-gold-ring)] hover:text-white"
          >
            <Copy aria-hidden="true" className="size-3.5" />
            Copiar
          </button>
          <a
            href={shareHref}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gold-grad inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] px-3 text-xs font-bold text-black"
          >
            <Share2 aria-hidden="true" className="size-3.5" />
            Compartir
          </a>
        </div>
      </section>
    );
  }

  // ── Incompleta: la guía completa ──────────────────────────────────────────
  return (
    <section
      aria-label="Primeros pasos"
      className="card-premium mb-6 p-4 sm:p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)]">
            <Rocket aria-hidden="true" className="size-3.5" />
            Primeros pasos
          </p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-white sm:text-xl">
            Dejá tu barbería lista para compartir
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm font-black tabular-nums text-white">
            {progress.requiredDone}
            <span className="text-[color:var(--text-muted)]">
              /{progress.requiredTotal}
            </span>
          </span>
          <button
            type="button"
            onClick={() => persistHidden(true)}
            aria-label="Ocultar primeros pasos"
            className="rounded-full p-1.5 text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-white"
          >
            <EyeOff aria-hidden="true" className="size-4" />
          </button>
        </div>
      </header>

      <ol className="mt-4 flex flex-col gap-2">
        {progress.steps.map((step) => (
          <StepRow
            key={step.id}
            step={step}
            isReadOnly={isReadOnly}
            publicUrl={publicUrl}
            shareHref={shareHref}
            onCopy={copyLink}
          />
        ))}
      </ol>
    </section>
  );
}

function StepRow({
  step,
  isReadOnly,
  publicUrl,
  shareHref,
  onCopy,
}: {
  step: OnboardingStep;
  isReadOnly: boolean;
  publicUrl: string;
  shareHref: string;
  onCopy: () => void;
}) {
  const Icon = STEP_ICONS[step.id];

  const body = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
          step.done
            ? "border-[color:var(--success)]/40 bg-[color:var(--success-soft)] text-[color:var(--success)]"
            : "border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]",
        )}
      >
        {step.done ? (
          <Check className="size-4" />
        ) : (
          <Icon className="size-4" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-bold",
            step.done
              ? "text-[color:var(--text-muted)] line-through decoration-[color:var(--text-subtle)]"
              : "text-white",
          )}
        >
          {step.title}
          {step.optional ? (
            <span className="ml-2 align-middle text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">
              opcional
            </span>
          ) : null}
        </span>
        {!step.done ? (
          <span className="mt-0.5 block text-xs leading-5 text-[color:var(--text-muted)]">
            {step.hint}
          </span>
        ) : null}
      </span>
    </>
  );

  const rowClass = cn(
    "flex min-h-14 items-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-3 text-left transition-colors",
    !step.done && "hover:border-[color:var(--brand-gold-ring)]",
  );

  // El paso de compartir se resuelve acá mismo: copiar o mandar por WhatsApp.
  if (step.id === "compartir") {
    return (
      <li className={cn(rowClass, "flex-wrap")}>
        {body}
        <span className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] px-2.5 text-[11px] font-semibold text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--brand-gold-ring)] hover:text-white sm:flex-none"
          >
            <Copy aria-hidden="true" className="size-3" />
            Copiar
          </button>
          <a
            href={shareHref}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gold-grad inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-[11px] font-bold text-black sm:flex-none"
          >
            <Share2 aria-hidden="true" className="size-3" />
            WhatsApp
          </a>
        </span>
        <span className="sr-only">{publicUrl}</span>
      </li>
    );
  }

  // Con el plan vencido no se puede configurar nada: el paso queda informativo,
  // sin un botón que lleve a una pantalla donde todo va a fallar.
  if (step.done || isReadOnly || !step.href) {
    return <li className={rowClass}>{body}</li>;
  }

  return (
    <li>
      <Link href={step.href} className={cn(rowClass, "w-full")}>
        {body}
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 text-[color:var(--text-muted)]"
        />
      </Link>
    </li>
  );
}
