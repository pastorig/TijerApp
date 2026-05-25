"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentSession } from "@/lib/auth";
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
  barbershops: [],
};

export function OwnerDashboard() {
  const [metrics, setMetrics] = useState<OwnerDashboardMetrics>(emptyMetrics);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
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
    const shouldDelete = window.confirm(
      `Eliminar logicamente la barberia ${slug}? Dejara de estar disponible en BarberSync.`,
    );

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

  async function handleResetAdminAccess(slug: string) {
    const shouldReset = window.confirm(
      `Generar una nueva contrasena temporal para el admin de ${slug}?`,
    );

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
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-8 lg:px-12 lg:py-12">
        <div className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-4 shadow-2xl shadow-black/25 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-[color:var(--brand-gold)] sm:text-sm">
                BarberSync
              </p>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">
                Owner
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base sm:leading-7">
                Vista central de barberias conocidas, operacion general y
                accesos de plataforma. El owner administra BarberSync en
                general; cada barberia mantiene su propio correo admin.
              </p>
            </div>
            <Link
              href="/owner/create-barbershop"
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-[color:var(--brand-gold)] px-4 py-2 text-sm font-bold uppercase text-black transition hover:bg-[color:var(--brand-gold-hi)]"
            >
              Crear barberia
            </Link>
          </div>
        </div>

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
                    Barberias
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    Listado general
                  </h2>
                </div>
                <div className="rounded-md border border-[color:var(--border-default)] bg-black px-3 py-2 text-xs text-[color:var(--text-muted)]">
                  {metrics.barbershops.length} conocidas
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {metrics.barbershops.map((barbershop) => {
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
          </>
        ) : null}
      </section>
    </main>
  );
}
