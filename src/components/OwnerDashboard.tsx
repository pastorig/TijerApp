"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Clock3,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useConfirm } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import {
  getOwnerDashboardMetrics,
  type OwnerDashboardMetrics,
} from "@/lib/owner-metrics";

const emptyMetrics: OwnerDashboardMetrics = {
  knownBarbershopsCount: 0,
  totalBarbersCount: 0,
  totalAppointmentsCount: 0,
  todayAppointmentsCount: 0,
  activeServicesCount: 0,
  todayEstimatedRevenue: 0,
  nextGlobalAppointment: null,
  mostActiveBarbershopToday: null,
  barbershops: [],
};

export function OwnerDashboard() {
  const confirm = useConfirm();
  const [metrics, setMetrics] = useState<OwnerDashboardMetrics>(emptyMetrics);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [hardDeletingSlug, setHardDeletingSlug] = useState<string | null>(null);
  const [reactivatingSlug, setReactivatingSlug] = useState<string | null>(null);
  const [resettingAccessSlug, setResettingAccessSlug] = useState<string | null>(
    null,
  );
  const [resetCredentialsBySlug, setResetCredentialsBySlug] = useState<
    Record<string, { email: string; temporaryPassword: string }>
  >({});

  useEffect(() => {
    let isMounted = true;

    async function loadMetrics() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const metricsResult = await getOwnerDashboardMetrics();

        if (!isMounted) {
          return;
        }

        if (metricsResult.error) {
          setErrorMessage("No pudimos cargar las metricas owner.");
          setMetrics(metricsResult.data);
          return;
        }

        setMetrics(metricsResult.data);
      } catch {
        if (isMounted) {
          setErrorMessage("No pudimos cargar las metricas owner.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMetrics();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleDeleteBarbershop(slug: string) {
    const shouldDelete = await confirm({
      title: "Desactivar barbería",
      message: `${slug} deja de estar disponible en BarberSync. Los datos se conservan; podés reactivarla después.`,
      confirmLabel: "Desactivar",
      cancelLabel: "Volver",
      danger: true,
    });

    if (!shouldDelete) {
      return;
    }

    setErrorMessage("");
    setDeletingSlug(slug);

    try {
      const { data } = await getCurrentSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        setErrorMessage("La sesion no es valida. Ingresa nuevamente.");
        return;
      }

      const response = await fetch("/api/owner/delete-barbershop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ slug }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorMessage(result.error ?? "No pudimos eliminar la barberia.");
        return;
      }

      setMetrics((currentMetrics) => ({
        ...currentMetrics,
        knownBarbershopsCount: Math.max(currentMetrics.knownBarbershopsCount - 1, 0),
        barbershops: currentMetrics.barbershops.filter(
          (barbershop) => barbershop.slug !== slug,
        ),
      }));
    } catch {
      setErrorMessage("No pudimos eliminar la barberia.");
    } finally {
      setDeletingSlug(null);
    }
  }

  async function handleHardDeleteBarbershop(slug: string) {
    // Doble confirmación: ireversible.
    const firstConfirm = await confirm({
      title: "Eliminar DEFINITIVAMENTE",
      message: `Vas a borrar para siempre la barbería ${slug}: todos los turnos, barberos, servicios y horarios. Esto NO se puede deshacer.`,
      confirmLabel: "Continuar",
      cancelLabel: "Volver",
      danger: true,
    });
    if (!firstConfirm) return;

    const secondConfirm = window.prompt(
      `Para confirmar, escribí exactamente el slug: ${slug}`,
    );
    if (secondConfirm !== slug) {
      setErrorMessage(
        secondConfirm === null
          ? ""
          : "El slug no coincide. Eliminación cancelada.",
      );
      return;
    }

    const removeAdminUser = await confirm({
      title: "¿Liberar email del admin?",
      message:
        "Confirmar = elimina el user de Supabase Auth y libera el email para reuso. Volver = el user queda registrado pero sin barbería asociada.",
      confirmLabel: "Liberar email",
      cancelLabel: "No liberar",
    });

    setErrorMessage("");
    setHardDeletingSlug(slug);

    try {
      const { data } = await getCurrentSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        setErrorMessage("La sesión no es válida. Ingresá nuevamente.");
        return;
      }

      const response = await fetch("/api/owner/hard-delete-barbershop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ slug, removeAdminUser }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorMessage(
          result.error ?? "No pudimos eliminar definitivamente la barbería.",
        );
        return;
      }

      setMetrics((currentMetrics) => ({
        ...currentMetrics,
        knownBarbershopsCount: Math.max(
          currentMetrics.knownBarbershopsCount - 1,
          0,
        ),
        barbershops: currentMetrics.barbershops.filter(
          (barbershop) => barbershop.slug !== slug,
        ),
      }));
    } catch {
      setErrorMessage("No pudimos eliminar definitivamente la barbería.");
    } finally {
      setHardDeletingSlug(null);
    }
  }

  async function handleReactivateBarbershop(slug: string) {
    setErrorMessage("");
    setReactivatingSlug(slug);

    try {
      const { data } = await getCurrentSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        setErrorMessage("La sesión no es válida. Ingresá nuevamente.");
        return;
      }

      const response = await fetch("/api/owner/reactivate-barbershop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ slug }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorMessage(result.error ?? "No pudimos reactivar la barbería.");
        return;
      }

      // Marcamos como activa en el state local.
      setMetrics((currentMetrics) => ({
        ...currentMetrics,
        barbershops: currentMetrics.barbershops.map((barbershop) =>
          barbershop.slug === slug
            ? { ...barbershop, isActive: true }
            : barbershop,
        ),
      }));
    } catch {
      setErrorMessage("No pudimos reactivar la barbería.");
    } finally {
      setReactivatingSlug(null);
    }
  }

  async function handleResetAdminAccess(slug: string) {
    const shouldReset = await confirm({
      title: "Generar contraseña temporal",
      message: `Se genera una contraseña temporal nueva para el admin de ${slug}. La anterior deja de funcionar.`,
      confirmLabel: "Generar nueva",
      cancelLabel: "Volver",
    });

    if (!shouldReset) {
      return;
    }

    setErrorMessage("");
    setResettingAccessSlug(slug);

    try {
      const { data } = await getCurrentSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        setErrorMessage("La sesion no es valida. Ingresa nuevamente.");
        return;
      }

      const response = await fetch("/api/owner/reset-barbershop-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ slug }),
      });

      const result = (await response.json()) as {
        error?: string;
        email?: string;
        temporaryPassword?: string;
      };

      if (!response.ok || !result.email || !result.temporaryPassword) {
        setErrorMessage(result.error ?? "No pudimos resetear el acceso admin.");
        return;
      }

      setResetCredentialsBySlug((currentValues) => ({
        ...currentValues,
        [slug]: {
          email: result.email ?? "",
          temporaryPassword: result.temporaryPassword ?? "",
        },
      }));
    } catch {
      setErrorMessage("No pudimos resetear el acceso admin.");
    } finally {
      setResettingAccessSlug(null);
    }
  }

  const summaryCards = [
    {
      label: "Barberias",
      value: metrics.knownBarbershopsCount,
    },
    {
      label: "Barberos",
      value: metrics.totalBarbersCount,
    },
    {
      label: "Reservas totales",
      value: metrics.totalAppointmentsCount,
    },
    {
      label: "Reservas de hoy",
      value: metrics.todayAppointmentsCount,
    },
    {
      label: "Servicios activos",
      value: metrics.activeServicesCount,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="animate-fade-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
          Owner BarberSync
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
              Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
              Vista central de barberías, operación general y accesos de
              plataforma. Cada barbería mantiene su propio correo admin.
            </p>
          </div>
          <Link
            href="/owner/create-barbershop"
            className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)]"
          >
            Crear barbería
          </Link>
        </div>
      </header>

      {/* ─────────────── PLATFORM PULSE — qué está ocurriendo ─────────────── */}
      {!isLoading && !errorMessage ? (
        <PlatformPulse metrics={metrics} />
      ) : null}

      <section>
        {/* Bloque legacy del dashboard owner. Se mantiene la lógica interna
            intacta; el shell ahora trae el sidebar y la nav. */}

        {isLoading ? (
          <div className="mt-4 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-5 text-[color:var(--text-secondary)] sm:mt-6">
            Cargando dashboard owner...
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-lg border border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] p-5 text-sm font-semibold text-[color:var(--danger)] sm:mt-6">
            {errorMessage}
          </div>
        ) : null}

        {!isLoading ? (
          <>
            <section className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-3 lg:grid-cols-5">
              {summaryCards.map((card) => (
                <article
                  key={card.label}
                  className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-3 shadow-lg shadow-black/20 sm:p-4"
                >
                  <p className="text-[11px] font-bold uppercase text-[color:var(--text-subtle)]">
                    {card.label}
                  </p>
                  <p className="mt-2 font-mono text-2xl font-black text-[color:var(--brand-gold)] sm:text-3xl">
                    {card.value}
                  </p>
                </article>
              ))}
            </section>

            <section className="mt-5 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-3 shadow-xl shadow-black/20 sm:mt-8 sm:p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-[color:var(--brand-gold)]">
                    Barberias activas
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    Listado general
                  </h2>
                </div>
                <div className="rounded-md border border-[color:var(--border-default)] bg-black px-3 py-2 text-xs text-[color:var(--text-muted)]">
                  {metrics.barbershops.filter((b) => b.isActive).length} activas
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {metrics.barbershops.filter((b) => b.isActive).map((barbershop) => {
                  const resetCredentials =
                    resetCredentialsBySlug[barbershop.slug];

                  return (
                  <article
                    key={barbershop.slug}
                    className="rounded-lg border border-[color:var(--border-default)] bg-black/80 p-4"
                  >
                    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div>
                        <h3 className="text-lg font-black text-white sm:text-xl">
                          {barbershop.name}
                        </h3>
                        <p className="mt-1 text-xs font-semibold uppercase text-[color:var(--text-subtle)]">
                          /{barbershop.slug}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-md">
                          <div className="rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-3 py-2">
                            <p className="text-[10px] font-bold uppercase text-[color:var(--text-subtle)]">
                              Barberos
                            </p>
                            <p className="mt-1 font-mono text-lg font-black text-[color:var(--brand-gold)]">
                              {barbershop.barberCount}
                            </p>
                          </div>
                          <div className="rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-3 py-2">
                            <p className="text-[10px] font-bold uppercase text-[color:var(--text-subtle)]">
                              Reservas
                            </p>
                            <p className="mt-1 font-mono text-lg font-black text-[color:var(--brand-gold)]">
                              {barbershop.appointmentCount}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:w-56">
                        <Link
                          href={`/${barbershop.slug}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-md border border-[color:var(--border-default)] px-3 py-2 text-center text-xs font-bold uppercase text-white transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
                        >
                          Pagina publica
                        </Link>
                        <Link
                          href={`/${barbershop.slug}/admin`}
                          className="inline-flex min-h-10 items-center justify-center rounded-md bg-[color:var(--brand-gold)] px-3 py-2 text-center text-xs font-bold uppercase text-black transition hover:bg-[color:var(--brand-gold-hi)]"
                        >
                          Abrir admin
                        </Link>
                        <button
                          type="button"
                          disabled={resettingAccessSlug === barbershop.slug}
                          onClick={() => handleResetAdminAccess(barbershop.slug)}
                          className="col-span-2 inline-flex min-h-10 items-center justify-center rounded-md border border-[color:var(--brand-gold)]/30 px-3 py-2 text-center text-xs font-bold uppercase text-[color:var(--brand-gold)] transition hover:bg-[color:var(--brand-gold-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {resettingAccessSlug === barbershop.slug
                            ? "Reseteando acceso..."
                            : "Resetear acceso admin"}
                        </button>
                        {barbershop.isRemovable ? (
                          <button
                            type="button"
                            disabled={deletingSlug === barbershop.slug}
                            onClick={() => handleDeleteBarbershop(barbershop.slug)}
                            className="col-span-2 inline-flex min-h-10 items-center justify-center rounded-md border border-[color:var(--danger)]/40 px-3 py-2 text-center text-xs font-bold uppercase text-[color:var(--danger)] transition hover:bg-[color:var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingSlug === barbershop.slug
                              ? "Eliminando..."
                              : "Eliminar barberia"}
                          </button>
                        ) : (
                          <div className="col-span-2 rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-3 py-2 text-center text-[11px] font-bold uppercase text-[color:var(--text-subtle)]">
                            {barbershop.isDemo ? "Barberia demo" : "Sin eliminacion"}
                          </div>
                        )}
                      </div>
                    </div>
                    {resetCredentials ? (
                      <div className="mt-4 rounded-md border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-3 py-3 text-xs text-[color:var(--success)]">
                        <p className="font-bold uppercase text-[color:var(--success)]">
                          Acceso admin actualizado
                        </p>
                        <p className="mt-2">
                          Email:{" "}
                          <span className="font-mono font-semibold">
                            {resetCredentials.email}
                          </span>
                        </p>
                        <p className="mt-1">
                          Contrasena temporal:{" "}
                          <span className="font-mono font-black">
                            {resetCredentials.temporaryPassword}
                          </span>
                        </p>
                      </div>
                    ) : null}
                  </article>
                  );
                })}
              </div>
            </section>

            {/* Sección Inactivas — solo aparece si hay barberías soft-deleted */}
            {metrics.barbershops.some((b) => !b.isActive) ? (
              <section className="mt-5 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-3 shadow-xl shadow-black/20 sm:mt-8 sm:p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-[color:var(--text-subtle)]">
                      Soft-deleted
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-[color:var(--text-secondary)]">
                      Barberías inactivas
                    </h2>
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                      Siguen ocupando su slug. Reactivá para volver a usarlas o
                      eliminá definitivamente para liberar el slug.
                    </p>
                  </div>
                  <div className="rounded-md border border-[color:var(--border-default)] bg-black px-3 py-2 text-xs text-[color:var(--text-muted)]">
                    {metrics.barbershops.filter((b) => !b.isActive).length}{" "}
                    inactivas
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {metrics.barbershops
                    .filter((b) => !b.isActive)
                    .map((barbershop) => (
                      <article
                        key={barbershop.slug}
                        className="rounded-lg border border-dashed border-[color:var(--border-default)] bg-black/40 p-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                          <div>
                            <h3 className="text-base font-bold text-[color:var(--text-secondary)] line-through decoration-[color:var(--text-subtle)]">
                              {barbershop.name}
                            </h3>
                            <p className="mt-1 text-xs font-semibold uppercase text-[color:var(--text-subtle)]">
                              /{barbershop.slug}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:w-72">
                            <button
                              type="button"
                              disabled={reactivatingSlug === barbershop.slug}
                              onClick={() =>
                                handleReactivateBarbershop(barbershop.slug)
                              }
                              className="inline-flex min-h-10 items-center justify-center rounded-md border border-[color:var(--success)]/40 px-3 py-2 text-center text-xs font-bold uppercase text-[color:var(--success)] transition hover:bg-[color:var(--success-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {reactivatingSlug === barbershop.slug
                                ? "Reactivando..."
                                : "Reactivar"}
                            </button>
                            <button
                              type="button"
                              disabled={hardDeletingSlug === barbershop.slug}
                              onClick={() =>
                                handleHardDeleteBarbershop(barbershop.slug)
                              }
                              className="inline-flex min-h-10 items-center justify-center rounded-md border border-[color:var(--danger)]/40 px-3 py-2 text-center text-xs font-bold uppercase text-[color:var(--danger)] transition hover:bg-[color:var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {hardDeletingSlug === barbershop.slug
                                ? "Eliminando..."
                                : "Eliminar def."}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */

function PlatformPulse({ metrics }: { metrics: OwnerDashboardMetrics }) {
  const activeBarbershops = metrics.barbershops.filter((b) => b.isActive);
  const activeBarbershopsCount = activeBarbershops.length;
  const totalToday = metrics.todayAppointmentsCount;

  // Determinar "salud" general de la plataforma — verde si hay actividad,
  // amber si no hay reservas hoy, gris si no hay barberías activas.
  const pulseTone: "success" | "warning" | "neutral" =
    activeBarbershopsCount === 0
      ? "neutral"
      : totalToday === 0
        ? "warning"
        : "success";

  const pulseLabel =
    activeBarbershopsCount === 0
      ? "Sin barberías activas"
      : totalToday === 0
        ? "Sin reservas hoy"
        : "Plataforma activa";

  const pulseHint =
    activeBarbershopsCount === 0
      ? "Creá la primera barbería para empezar"
      : totalToday === 0
        ? `${activeBarbershopsCount} barbería${activeBarbershopsCount === 1 ? "" : "s"} sin actividad hoy`
        : `${totalToday} reserva${totalToday === 1 ? "" : "s"} hoy en ${activeBarbershopsCount} barbería${activeBarbershopsCount === 1 ? "" : "s"}`;

  const toneClasses: Record<typeof pulseTone, string> = {
    success: "border-[color:var(--success)]/30 bg-[color:var(--success-soft)]",
    warning: "border-amber-400/30 bg-amber-400/[0.06]",
    neutral: "border-white/[0.04] bg-[color:var(--surface-1)]",
  };
  const iconColor: Record<typeof pulseTone, string> = {
    success: "text-[color:var(--success)]",
    warning: "text-amber-300",
    neutral: "text-[color:var(--text-subtle)]",
  };
  const dotColor: Record<typeof pulseTone, string> = {
    success: "bg-[color:var(--success)]",
    warning: "bg-amber-400",
    neutral: "bg-[color:var(--text-subtle)]",
  };

  return (
    <section className="mt-6 space-y-3 sm:mt-8">
      {/* Status principal */}
      <div
        className={cn(
          "flex items-start gap-3 rounded-[var(--radius-sm)] border px-4 py-3",
          toneClasses[pulseTone],
        )}
      >
        <div className="flex shrink-0 items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              "relative inline-flex size-2 rounded-full",
              dotColor[pulseTone],
            )}
          >
            {pulseTone === "success" ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -inset-1 inline-flex animate-ping rounded-full opacity-30",
                  dotColor[pulseTone],
                )}
              />
            ) : null}
          </span>
          <Activity
            className={cn("size-4", iconColor[pulseTone])}
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold tracking-tight text-white sm:text-sm">
            {pulseLabel}
          </p>
          <p className="mt-0.5 text-[11px] text-[color:var(--text-secondary)] sm:text-xs">
            {pulseHint}
          </p>
        </div>
        {metrics.todayEstimatedRevenue > 0 ? (
          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              Ingresos est. hoy
            </p>
            <p className="mt-0.5 font-mono text-base font-black tabular-nums text-[color:var(--brand-gold)]">
              {formatPrice(metrics.todayEstimatedRevenue)}
            </p>
          </div>
        ) : null}
      </div>

      {/* Cards laterales: próximo global + top barbería */}
      {metrics.nextGlobalAppointment || metrics.mostActiveBarbershopToday ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {metrics.nextGlobalAppointment ? (
            <Link
              href={`/${metrics.nextGlobalAppointment.barbershopSlug}/admin/turnero`}
              className="group flex items-center gap-3 rounded-[var(--radius-sm)] border border-white/[0.04] bg-[color:var(--surface-1)] px-4 py-3 transition-all duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)]/40 hover:bg-[color:var(--brand-gold-soft)]"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]">
                <Clock3 className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Próxima reserva global
                </p>
                <p className="mt-0.5 text-sm font-bold text-white">
                  <span className="font-mono">
                    {metrics.nextGlobalAppointment.appointmentTime.slice(0, 5)}
                  </span>{" "}
                  · {metrics.nextGlobalAppointment.customerName}
                </p>
                <p className="truncate text-[11px] text-[color:var(--text-secondary)]">
                  en {metrics.nextGlobalAppointment.barbershopName}
                </p>
              </div>
              <ArrowUpRight
                className="size-4 shrink-0 text-[color:var(--text-subtle)] transition-colors group-hover:text-[color:var(--brand-gold)]"
                aria-hidden="true"
              />
            </Link>
          ) : null}

          {metrics.mostActiveBarbershopToday ? (
            <Link
              href={`/${metrics.mostActiveBarbershopToday.slug}/admin`}
              className="group flex items-center gap-3 rounded-[var(--radius-sm)] border border-white/[0.04] bg-[color:var(--surface-1)] px-4 py-3 transition-all duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)]/40 hover:bg-[color:var(--brand-gold-soft)]"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--success)]/30 bg-[color:var(--success-soft)] text-[color:var(--success)]">
                <TrendingUp className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  Top del día
                </p>
                <p className="mt-0.5 truncate text-sm font-bold text-white">
                  {metrics.mostActiveBarbershopToday.name}
                </p>
                <p className="text-[11px] text-[color:var(--text-secondary)]">
                  {metrics.mostActiveBarbershopToday.count} reserva
                  {metrics.mostActiveBarbershopToday.count === 1 ? "" : "s"} hoy
                </p>
              </div>
              <ArrowUpRight
                className="size-4 shrink-0 text-[color:var(--text-subtle)] transition-colors group-hover:text-[color:var(--brand-gold)]"
                aria-hidden="true"
              />
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* Estado vacío — solo ingresos mobile (cuando no hay próxima ni top) */}
      {!metrics.nextGlobalAppointment &&
      !metrics.mostActiveBarbershopToday &&
      metrics.todayEstimatedRevenue === 0 &&
      activeBarbershopsCount > 0 ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-white/[0.04] bg-[color:var(--surface-1)] px-4 py-3 text-[11px] text-[color:var(--text-muted)] sm:text-xs">
          <Sparkles
            className="size-4 shrink-0 text-[color:var(--text-subtle)]"
            aria-hidden="true"
          />
          Esperando primera reserva del día
        </div>
      ) : null}
    </section>
  );
}
