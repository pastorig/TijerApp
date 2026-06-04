"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownAZ,
  ArrowUpRight,
  ChevronDown,
  Clock3,
  ExternalLink,
  Key,
  MoreVertical,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  TrendingUp,
  X,
} from "lucide-react";
import { useConfirm } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import {
  getOwnerDashboardMetrics,
  type OwnerBarbershopSummary,
  type OwnerDashboardMetrics,
  type OwnerWeeklyRankingEntry,
} from "@/lib/owner-metrics";
import { HardDeleteBarbershopDialog } from "@/components/owner/HardDeleteBarbershopDialog";

/**
 * Salud de una barbería basada en su actividad reciente.
 * - active: tiene reservas hoy O última actividad ≤ 3 días
 * - quiet: sin reservas hoy, última actividad entre 4 y 14 días
 * - inactive: sin actividad > 14 días o nunca registró nada
 */
type HealthStatus = "active" | "quiet" | "inactive";

function getHealthStatus(
  barbershop: OwnerBarbershopSummary,
): { status: HealthStatus; label: string; daysSinceLast: number | null } {
  if (barbershop.todayAppointmentCount > 0) {
    return { status: "active", label: "Activa", daysSinceLast: 0 };
  }
  if (!barbershop.lastAppointmentCreatedAt) {
    return { status: "inactive", label: "Sin actividad", daysSinceLast: null };
  }
  const last = new Date(barbershop.lastAppointmentCreatedAt).getTime();
  const days = Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
  if (days <= 3) return { status: "active", label: "Activa", daysSinceLast: days };
  if (days <= 14)
    return { status: "quiet", label: "Sin reservas hoy", daysSinceLast: days };
  return { status: "inactive", label: "Inactiva", daysSinceLast: days };
}

const HEALTH_PILL: Record<
  HealthStatus,
  { dot: string; classes: string }
> = {
  active: {
    dot: "bg-[color:var(--success)]",
    classes:
      "border-[color:var(--success)]/40 bg-[color:var(--success-soft)] text-[color:var(--success)]",
  },
  quiet: {
    dot: "bg-amber-400",
    classes: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  },
  inactive: {
    dot: "bg-[color:var(--danger)]",
    classes:
      "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
  },
};

/**
 * Modos de ordenamiento del listado de barberías activas.
 * - activity: más activas primero (turnos hoy desc, luego última actividad)
 * - historic: por reservas históricas totales desc
 * - alpha: alfabético por nombre
 */
type SortMode = "activity" | "historic" | "alpha";

const SORT_LABELS: Record<SortMode, { label: string; icon: typeof Activity }> = {
  activity: { label: "Más activas", icon: Activity },
  historic: { label: "Históricas", icon: TrendingUp },
  alpha: { label: "A–Z", icon: ArrowDownAZ },
};

const emptyMetrics: OwnerDashboardMetrics = {
  knownBarbershopsCount: 0,
  totalBarbersCount: 0,
  totalAppointmentsCount: 0,
  todayAppointmentsCount: 0,
  activeServicesCount: 0,
  todayEstimatedRevenue: 0,
  nextGlobalAppointment: null,
  mostActiveBarbershopToday: null,
  weeklyRanking: [],
  barbershops: [],
};

export function OwnerDashboard() {
  const confirm = useConfirm();
  const [metrics, setMetrics] = useState<OwnerDashboardMetrics>(emptyMetrics);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [hardDeletingSlug, setHardDeletingSlug] = useState<string | null>(null);
  // Slug actualmente en el modal de hard delete (null = modal cerrado).
  // Se separa de `hardDeletingSlug` que es el flag de "fetch en vuelo"
  // para poder mostrar el estado "Eliminando…" sin cerrar el modal.
  const [pendingHardDeleteSlug, setPendingHardDeleteSlug] = useState<
    string | null
  >(null);
  const [reactivatingSlug, setReactivatingSlug] = useState<string | null>(null);
  const [resettingAccessSlug, setResettingAccessSlug] = useState<string | null>(
    null,
  );
  const [resetCredentialsBySlug, setResetCredentialsBySlug] = useState<
    Record<string, { email: string; temporaryPassword: string }>
  >({});
  const [sortMode, setSortMode] = useState<SortMode>("activity");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const activeBarbershops = useMemo(
    () => metrics.barbershops.filter((b) => b.isActive),
    [metrics.barbershops],
  );

  const inactiveBarbershops = useMemo(
    () => metrics.barbershops.filter((b) => !b.isActive),
    [metrics.barbershops],
  );

  // Normaliza para búsqueda accent-insensitive (José ~ Jose).
  // ̀-ͯ cubre los combining diacritical marks de Unicode.
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");

  const normalizedSearch = useMemo(
    () => normalize(searchQuery.trim()),
    [searchQuery],
  );

  const sortedActiveBarbershops = useMemo(() => {
    const filtered = normalizedSearch
      ? activeBarbershops.filter((b) =>
          normalize(`${b.name} ${b.slug}`).includes(normalizedSearch),
        )
      : activeBarbershops;
    const list = [...filtered];
    if (sortMode === "alpha") {
      list.sort((a, b) => a.name.localeCompare(b.name, "es"));
    } else if (sortMode === "historic") {
      list.sort((a, b) => b.appointmentCount - a.appointmentCount);
    } else {
      // activity: hoy desc; empate por última actividad (más reciente primero)
      list.sort((a, b) => {
        if (b.todayAppointmentCount !== a.todayAppointmentCount) {
          return b.todayAppointmentCount - a.todayAppointmentCount;
        }
        const aLast = a.lastAppointmentCreatedAt
          ? new Date(a.lastAppointmentCreatedAt).getTime()
          : 0;
        const bLast = b.lastAppointmentCreatedAt
          ? new Date(b.lastAppointmentCreatedAt).getTime()
          : 0;
        return bLast - aLast;
      });
    }
    return list;
  }, [activeBarbershops, sortMode, normalizedSearch]);

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
      message: `${slug} deja de estar disponible en TijerApp. Los datos se conservan; podés reactivarla después.`,
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

  // Abre el modal de hard delete. Toda la confirmación (slug typing,
  // checkbox liberar email) vive en el modal — el patrón anterior con
  // ConfirmDialog → window.prompt → ConfirmDialog era frágil en Brave
  // (bloqueaba el segundo dialog custom después del prompt nativo).
  function handleHardDeleteBarbershop(slug: string) {
    setErrorMessage("");
    setPendingHardDeleteSlug(slug);
  }

  async function handleConfirmHardDelete(removeAdminUser: boolean) {
    const slug = pendingHardDeleteSlug;
    if (!slug) return;

    setHardDeletingSlug(slug);

    try {
      const { data } = await getCurrentSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        setErrorMessage("La sesión no es válida. Ingresá nuevamente.");
        setPendingHardDeleteSlug(null);
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
      setPendingHardDeleteSlug(null);
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

  // Totales de plataforma — métricas cumulativas/históricas.
  // Las "live metrics" del día (reservas hoy, próxima, top) viven en PlatformPulse.
  const platformTotals = [
    {
      label: "Barberías",
      value: metrics.knownBarbershopsCount,
      hint: `${metrics.barbershops.filter((b) => b.isActive).length} activas`,
    },
    {
      label: "Barberos",
      value: metrics.totalBarbersCount,
    },
    {
      label: "Servicios",
      value: metrics.activeServicesCount,
      hint: "activos",
    },
    {
      label: "Reservas totales",
      value: metrics.totalAppointmentsCount,
      hint: "histórico",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="animate-fade-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
          Owner TijerApp
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
            {/* WEEKLY RANKING — últimos 7 días, podio + lista */}
            {metrics.weeklyRanking.length > 0 ? (
              <WeeklyRanking ranking={metrics.weeklyRanking} />
            ) : null}

            {/* PLATFORM TOTALS — métricas históricas, ribbon compacto */}
            <section className="mt-6 sm:mt-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
                Totales de plataforma
              </p>
              <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-[var(--radius-sm)] border border-white/[0.04] bg-[color:var(--surface-1)] sm:grid-cols-4">
                {platformTotals.map((card, i) => (
                  <div
                    key={card.label}
                    className={cn(
                      "flex flex-col items-start gap-1 px-4 py-3",
                      // Borders selectivos para tabla
                      i > 0 && i < 2 ? "border-l border-white/[0.04]" : "",
                      "sm:border-l sm:border-white/[0.04]",
                      i === 0 ? "sm:border-l-0" : "",
                      i >= 2 ? "border-t border-white/[0.04] sm:border-t-0" : "",
                    )}
                  >
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      {card.label}
                    </p>
                    <p className="font-mono text-2xl font-black tabular-nums leading-none text-[color:var(--brand-gold)] sm:text-3xl">
                      {card.value}
                    </p>
                    {card.hint ? (
                      <p className="text-[10px] text-[color:var(--text-subtle)]">
                        {card.hint}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 sm:mt-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)]">
                    Barberías activas
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    {normalizedSearch ? (
                      <>
                        <span className="font-mono text-[color:var(--text-secondary)]">
                          {sortedActiveBarbershops.length}
                        </span>{" "}
                        de{" "}
                        <span className="font-mono">
                          {activeBarbershops.length}
                        </span>{" "}
                        coinciden
                      </>
                    ) : (
                      <>
                        {activeBarbershops.length}{" "}
                        {activeBarbershops.length === 1
                          ? "barbería operando"
                          : "barberías operando"}
                      </>
                    )}
                  </p>
                </div>

                {/* Segmented control — ordenamiento. Solo se muestra si hay 2+ */}
                {activeBarbershops.length >= 2 ? (
                  <div
                    role="radiogroup"
                    aria-label="Ordenar barberías"
                    className="inline-flex self-start overflow-hidden rounded-[var(--radius-sm)] border border-white/[0.06] bg-[color:var(--surface-1)]"
                  >
                    {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => {
                      const Icon = SORT_LABELS[mode].icon;
                      const isActive = sortMode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          onClick={() => setSortMode(mode)}
                          className={cn(
                            "inline-flex min-h-9 items-center gap-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-[var(--duration-fast)] press-shrink",
                            isActive
                              ? "bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
                              : "text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]",
                          )}
                        >
                          <Icon className="size-3.5" aria-hidden="true" />
                          <span className="hidden sm:inline">
                            {SORT_LABELS[mode].label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              {/* Buscador — aparece con 3+ activas para no estorbar en empty states */}
              {activeBarbershops.length >= 3 ? (
                <div className="relative mt-3">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--text-subtle)]"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    inputMode="search"
                    autoComplete="off"
                    placeholder="Buscar barbería por nombre o slug…"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="block w-full rounded-[var(--radius-sm)] border border-white/[0.06] bg-[color:var(--surface-1)] py-2.5 pl-9 pr-9 text-sm text-white placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]/60 focus:outline-none focus:ring-0"
                    aria-label="Buscar barbería"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Limpiar búsqueda"
                      className="absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--text-muted)] transition-colors hover:bg-white/[0.04] hover:text-[color:var(--text-secondary)] press-shrink"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              ) : null}

              {/* Empty state — búsqueda sin resultados */}
              {normalizedSearch && sortedActiveBarbershops.length === 0 ? (
                <div className="mt-3 flex flex-col items-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-white/[0.06] bg-[color:var(--surface-1)] px-4 py-8 text-center">
                  <Search
                    className="size-5 text-[color:var(--text-subtle)]"
                    aria-hidden="true"
                  />
                  <p className="text-xs text-[color:var(--text-muted)]">
                    No hay barberías que coincidan con{" "}
                    <span className="font-mono text-[color:var(--text-secondary)]">
                      “{searchQuery}”
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] hover:underline"
                  >
                    Limpiar búsqueda
                  </button>
                </div>
              ) : null}

              <div className="mt-3 grid gap-2.5">
                {sortedActiveBarbershops
                  .map((barbershop) => {
                    const resetCredentials =
                      resetCredentialsBySlug[barbershop.slug];
                    const health = getHealthStatus(barbershop);
                    const isResetting =
                      resettingAccessSlug === barbershop.slug;
                    const isDeleting = deletingSlug === barbershop.slug;
                    const isBusy = isResetting || isDeleting;

                    return (
                      <article
                        key={barbershop.slug}
                        className="overflow-hidden rounded-[var(--radius-md)] border border-white/[0.06] bg-[color:var(--surface-1)] hover-lift"
                      >
                        <div className="p-4 sm:p-5">
                          {/* Header: nombre + health badge + kebab */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-lg font-black tracking-tight text-white sm:text-xl">
                                  {barbershop.name}
                                </h3>
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                                    HEALTH_PILL[health.status].classes,
                                  )}
                                  title={
                                    health.daysSinceLast === null
                                      ? "Nunca registró actividad"
                                      : health.daysSinceLast === 0
                                        ? "Con reservas hoy"
                                        : `Última actividad hace ${health.daysSinceLast} día${health.daysSinceLast === 1 ? "" : "s"}`
                                  }
                                >
                                  <span
                                    aria-hidden="true"
                                    className={cn(
                                      "inline-block size-1.5 rounded-full",
                                      HEALTH_PILL[health.status].dot,
                                    )}
                                  />
                                  {health.label}
                                </span>
                              </div>
                              <p className="mt-1 font-mono text-[11px] text-[color:var(--text-subtle)]">
                                /{barbershop.slug}
                                {barbershop.isDemo ? " · demo" : ""}
                              </p>
                            </div>
                            <OwnerCardKebab
                              barbershopSlug={barbershop.slug}
                              isDemo={barbershop.isDemo}
                              isRemovable={barbershop.isRemovable}
                              isResetting={isResetting}
                              isDeleting={isDeleting}
                              onResetAccess={() =>
                                handleResetAdminAccess(barbershop.slug)
                              }
                              onDelete={() =>
                                handleDeleteBarbershop(barbershop.slug)
                              }
                            />
                          </div>

                          {/* Stats inline */}
                          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px] text-[color:var(--text-secondary)]">
                            <span className="inline-flex items-baseline gap-1.5">
                              <span className="font-mono text-base font-black tabular-nums text-white">
                                {barbershop.barberCount}
                              </span>
                              <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                                {barbershop.barberCount === 1
                                  ? "barbero"
                                  : "barberos"}
                              </span>
                            </span>
                            <span className="text-[color:var(--text-subtle)]">·</span>
                            <span className="inline-flex items-baseline gap-1.5">
                              <span className="font-mono text-base font-black tabular-nums text-white">
                                {barbershop.appointmentCount}
                              </span>
                              <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                                reservas
                              </span>
                            </span>
                            {barbershop.todayAppointmentCount > 0 ? (
                              <>
                                <span className="text-[color:var(--text-subtle)]">·</span>
                                <span className="inline-flex items-baseline gap-1.5">
                                  <span className="font-mono text-base font-black tabular-nums text-[color:var(--brand-gold)]">
                                    {barbershop.todayAppointmentCount}
                                  </span>
                                  <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--brand-gold)]/80">
                                    hoy
                                  </span>
                                </span>
                              </>
                            ) : null}
                          </div>

                          {/* Primary CTA: Abrir Admin + secondary Pública */}
                          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <Link
                              href={`/${barbershop.slug}/admin`}
                              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-all duration-[var(--duration-fast)] press-shrink hover:bg-[color:var(--brand-gold-hi)] hover:shadow-[0_0_0_3px_var(--brand-gold-ring)]"
                            >
                              Abrir admin
                              <ArrowUpRight
                                className="size-4"
                                aria-hidden="true"
                              />
                            </Link>
                            <Link
                              href={`/${barbershop.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-white/[0.06] bg-[color:var(--surface-0)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] press-shrink hover:border-[color:var(--brand-gold)]/40 hover:text-[color:var(--brand-gold)]"
                            >
                              <ExternalLink
                                className="size-3.5"
                                aria-hidden="true"
                              />
                              Pública
                            </Link>
                          </div>

                          {/* Busy state */}
                          {isBusy ? (
                            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                              {isResetting
                                ? "Reseteando acceso…"
                                : "Eliminando…"}
                            </p>
                          ) : null}
                        </div>

                        {resetCredentials ? (
                          <div className="border-t border-[color:var(--success)]/30 bg-[color:var(--success-soft)] px-4 py-3 text-xs text-[color:var(--success)] sm:px-5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em]">
                              Acceso admin actualizado
                            </p>
                            <p className="mt-1.5">
                              Email:{" "}
                              <span className="font-mono font-semibold">
                                {resetCredentials.email}
                              </span>
                            </p>
                            <p className="mt-0.5">
                              Contraseña temporal:{" "}
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

            {/* Sección Inactivas — colapsable, closed por default para reducir ruido */}
            {inactiveBarbershops.length > 0 ? (
              <section className="mt-5 overflow-hidden rounded-[var(--radius-md)] border border-white/[0.06] bg-[color:var(--surface-1)] sm:mt-8">
                <button
                  type="button"
                  onClick={() => setShowInactive((v) => !v)}
                  aria-expanded={showInactive}
                  aria-controls="inactive-barbershops-list"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-[var(--duration-fast)] hover:bg-white/[0.02] sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-subtle)]">
                      Soft-deleted
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-[color:var(--text-secondary)]">
                      Barberías inactivas
                      <span className="ml-2 font-mono text-xs text-[color:var(--text-muted)]">
                        ({inactiveBarbershops.length})
                      </span>
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-5 shrink-0 text-[color:var(--text-muted)] transition-transform duration-[var(--duration-fast)]",
                      showInactive ? "rotate-180" : "",
                    )}
                    aria-hidden="true"
                  />
                </button>

                {showInactive ? (
                  <div
                    id="inactive-barbershops-list"
                    className="border-t border-white/[0.04] px-4 py-3 sm:px-5"
                  >
                    <p className="text-xs text-[color:var(--text-muted)]">
                      Siguen ocupando su slug. Reactivá para volver a usarlas o
                      eliminá definitivamente para liberar el slug.
                    </p>
                    <div className="mt-3 grid gap-2.5">
                      {inactiveBarbershops.map((barbershop) => (
                        <article
                          key={barbershop.slug}
                          className="rounded-[var(--radius-sm)] border border-dashed border-white/[0.08] bg-[color:var(--surface-0)] p-3 sm:p-4"
                        >
                          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                            <div>
                              <h3 className="text-base font-bold text-[color:var(--text-secondary)] line-through decoration-[color:var(--text-subtle)]">
                                {barbershop.name}
                              </h3>
                              <p className="mt-1 font-mono text-[11px] text-[color:var(--text-subtle)]">
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
                                className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--success)]/40 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--success)] transition-colors duration-[var(--duration-fast)] press-shrink hover:bg-[color:var(--success-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {reactivatingSlug === barbershop.slug
                                  ? "Reactivando…"
                                  : "Reactivar"}
                              </button>
                              <button
                                type="button"
                                disabled={hardDeletingSlug === barbershop.slug}
                                onClick={() =>
                                  handleHardDeleteBarbershop(barbershop.slug)
                                }
                                className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--danger)] transition-colors duration-[var(--duration-fast)] press-shrink hover:bg-[color:var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {hardDeletingSlug === barbershop.slug
                                  ? "Eliminando…"
                                  : "Eliminar def."}
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}
      </section>

      <HardDeleteBarbershopDialog
        key={pendingHardDeleteSlug ?? "closed"}
        slug={pendingHardDeleteSlug}
        isSubmitting={
          hardDeletingSlug !== null &&
          hardDeletingSlug === pendingHardDeleteSlug
        }
        onCancel={() => {
          if (hardDeletingSlug) return; // no cerrar mientras envía
          setPendingHardDeleteSlug(null);
        }}
        onConfirm={handleConfirmHardDelete}
      />
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

/**
 * Menú contextual de acciones secundarias para cada card de barbería activa.
 * El CTA primario (Abrir admin) y el secundario (Pública) viven fuera de este menú.
 */
function OwnerCardKebab({
  barbershopSlug,
  isDemo,
  isRemovable,
  isResetting,
  isDeleting,
  onResetAccess,
  onDelete,
}: {
  barbershopSlug: string;
  isDemo: boolean;
  isRemovable: boolean;
  isResetting: boolean;
  isDeleting: boolean;
  onResetAccess: () => void;
  onDelete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const disabled = isResetting || isDeleting;
  const itemCount = 1 + (isRemovable ? 1 : 0);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        disabled={disabled}
        aria-label={`Más acciones (${itemCount})`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Más acciones"
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] border transition-all duration-[var(--duration-fast)] press-shrink disabled:cursor-not-allowed disabled:opacity-40",
          isOpen
            ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
            : "border-white/[0.06] bg-[color:var(--surface-0)] text-[color:var(--text-muted)] hover:border-[color:var(--brand-gold)]/40 hover:text-[color:var(--brand-gold)]",
        )}
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1.5 w-56 origin-top-right animate-scale-in overflow-hidden rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] shadow-2xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onResetAccess();
            }}
            disabled={isResetting}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-[color:var(--brand-gold)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-soft)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Key className="size-4 shrink-0" aria-hidden="true" />
            {isResetting ? "Reseteando…" : "Resetear acceso admin"}
          </button>
          {isRemovable ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onDelete();
              }}
              disabled={isDeleting}
              className="flex w-full items-center gap-2 border-t border-[color:var(--border-default)] px-3 py-2.5 text-left text-xs font-semibold text-[color:var(--danger)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="size-4 shrink-0" aria-hidden="true" />
              {isDeleting ? "Eliminando…" : "Eliminar barbería"}
            </button>
          ) : (
            <div className="border-t border-[color:var(--border-default)] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
              {isDemo ? `Demo · /${barbershopSlug}` : "Sin eliminación"}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */

/**
 * Ranking semanal — top barberías por reservas (últimos 7 días).
 * Top-3 con podio visual (gold/silver/bronze), resto en lista compacta.
 * Se oculta entera si no hay datos en la ventana.
 */
function WeeklyRanking({ ranking }: { ranking: OwnerWeeklyRankingEntry[] }) {
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3, 8); // hasta top-8

  const PODIUM: Array<{
    medal: string;
    accent: string;
    accentBg: string;
    border: string;
    label: string;
  }> = [
    {
      medal: "🥇",
      accent: "text-[color:var(--brand-gold)]",
      accentBg: "bg-[color:var(--brand-gold-soft)]",
      border: "border-[color:var(--brand-gold)]/40",
      label: "1°",
    },
    {
      medal: "🥈",
      accent: "text-slate-200",
      accentBg: "bg-slate-400/10",
      border: "border-slate-400/30",
      label: "2°",
    },
    {
      medal: "🥉",
      accent: "text-amber-700",
      accentBg: "bg-amber-700/10",
      border: "border-amber-700/30",
      label: "3°",
    },
  ];

  return (
    <section className="mt-6 sm:mt-8 animate-fade-up">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)]">
            Ranking semanal
          </p>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            Top barberías por reservas, últimos 7 días
          </p>
        </div>
        <Trophy
          className="size-5 shrink-0 text-[color:var(--brand-gold)]/70"
          aria-hidden="true"
        />
      </div>

      {/* Podio top-3 — grid responsivo */}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {top3.map((entry, i) => {
          const meta = PODIUM[i];
          return (
            <Link
              key={entry.slug}
              href={`/${entry.slug}/admin`}
              className={cn(
                "group flex items-center gap-3 rounded-[var(--radius-sm)] border bg-[color:var(--surface-1)] p-3 transition-all duration-[var(--duration-fast)] hover-lift press-shrink",
                meta.border,
              )}
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full text-lg",
                  meta.accentBg,
                )}
                aria-hidden="true"
              >
                {meta.medal}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-[0.18em]",
                    meta.accent,
                  )}
                >
                  {meta.label} · {entry.count} reserva
                  {entry.count === 1 ? "" : "s"}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold text-white">
                  {entry.name}
                </p>
                <p className="font-mono text-[10px] text-[color:var(--text-subtle)]">
                  /{entry.slug}
                </p>
              </div>
              <ArrowUpRight
                className="size-4 shrink-0 text-[color:var(--text-subtle)] transition-colors group-hover:text-[color:var(--brand-gold)]"
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>

      {/* Resto (4° al 8°) — lista compacta */}
      {rest.length > 0 ? (
        <ul className="mt-2 divide-y divide-white/[0.04] overflow-hidden rounded-[var(--radius-sm)] border border-white/[0.04] bg-[color:var(--surface-1)]">
          {rest.map((entry, i) => (
            <li key={entry.slug}>
              <Link
                href={`/${entry.slug}/admin`}
                className="group flex items-center gap-3 px-3 py-2 transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-soft)]/30"
              >
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-subtle)]">
                  {i + 4}°
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[color:var(--text-secondary)] group-hover:text-white">
                  {entry.name}
                </span>
                <span className="font-mono text-[11px] font-bold tabular-nums text-[color:var(--brand-gold)]">
                  {entry.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
