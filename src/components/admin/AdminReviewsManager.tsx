"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  MessageCircle,
  Phone,
  Star,
  Users,
} from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { listReviewsByBarbershop } from "@/lib/appointment-reviews";
import { cn } from "@/lib/cn";
import { formatDateForDisplay, normalizeDateValue } from "@/lib/format";

type AdminReviewsManagerProps = {
  barbershop: DemoBarbershop;
};

type ReviewWithContext = {
  id: string;
  appointment_id: string;
  barbershop_slug: string;
  rating: number;
  comment: string | null;
  created_at: string;
  appointments: {
    customer_name: string | null;
    customer_phone: string | null;
    service_name: string | null;
    barber_name: string | null;
    appointment_date: string | null;
  } | null;
};

export function AdminReviewsManager({ barbershop }: AdminReviewsManagerProps) {
  const [reviews, setReviews] = useState<ReviewWithContext[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const { data, error } = await listReviewsByBarbershop(barbershop.slug);
        if (!isMounted) return;
        if (error) {
          setErrorMessage("No pudimos cargar las reseñas.");
          return;
        }
        setReviews((data ?? []) as unknown as ReviewWithContext[]);
      } catch {
        if (isMounted) setErrorMessage("No pudimos cargar las reseñas.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [barbershop.slug, reloadKey]);

  const stats = useMemo(() => {
    if (reviews.length === 0) {
      return { count: 0, avg: 0, fiveStarPct: 0, distribution: [0, 0, 0, 0, 0] };
    }
    const distribution = [0, 0, 0, 0, 0];
    let sum = 0;
    for (const r of reviews) {
      const idx = Math.max(0, Math.min(4, r.rating - 1));
      distribution[idx]++;
      sum += r.rating;
    }
    const avg = sum / reviews.length;
    const fiveStarPct = Math.round((distribution[4] / reviews.length) * 100);
    return { count: reviews.length, avg, fiveStarPct, distribution };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (ratingFilter === "all") return reviews;
    return reviews.filter((r) => r.rating === ratingFilter);
  }, [reviews, ratingFilter]);

  return (
    <div className="space-y-6 ">
      <header className="">
        <p className="text-xs font-semibold normal-case tracking-normal text-[color:var(--brand-gold)] sm:tracking-normal">
          Reseñas
        </p>
        <h1 className="mt-2 text-2xl font-semibold normal-case tracking-normal text-balance text-white sm:text-3xl">
          Lo que dicen tus clientes
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
          Reseñas que tus clientes dejaron desde el link de WhatsApp post-corte.
        </p>
      </header>

      {errorMessage ? (
        <div
          role="alert"
          className="border-l-2 border-[color:var(--danger)] pl-4 text-sm font-semibold text-[color:var(--danger)]"
        >
          {errorMessage}
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-3 flex min-h-11 items-center rounded-lg border border-[color:var(--border-default)] px-4 text-white">Reintentar</button>
        </div>
      ) : null}

      {isLoading ? (
        <ul role="status" aria-label="Cargando reseñas" className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              aria-hidden="true"
              className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-3 w-16 rounded" />
              </div>
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-3/4 rounded" />
            </li>
          ))}
        </ul>
      ) : errorMessage ? null : reviews.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[color:var(--border-subtle)] p-6 text-center">
          <Users className="mx-auto size-8 text-[color:var(--text-subtle)]" />
          <p className="mt-3 text-sm font-bold text-white">
            Sin reseñas todavía
          </p>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            Pedile reseña a un cliente desde la agenda → botón WhatsApp post-corte.
          </p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label="Reseñas"
              value={String(stats.count)}
              hilight
            />
            <KpiCard
              label="Promedio"
              value={stats.avg.toFixed(1)}
              suffix={
                <Star className="size-4 fill-[color:var(--brand-gold)] text-[color:var(--brand-gold)]" />
              }
            />
            <KpiCard
              label="5 estrellas"
              value={`${stats.fiveStarPct}%`}
            />
            <KpiCard
              label="1-2 estrellas"
              value={String(stats.distribution[0] + stats.distribution[1])}
              danger={
                stats.distribution[0] + stats.distribution[1] > 0
              }
            />
          </section>

          {/* Distribución */}
          <section className="border-y border-[color:var(--border-subtle)] py-4">
            <p className="text-xs font-bold normal-case tracking-normal text-[color:var(--brand-gold)]">
              Distribución
            </p>
            <div className="mt-4 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution[star - 1];
                const pct = stats.count > 0 ? (count / stats.count) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setRatingFilter(star)}
                      aria-label={`Filtrar ${star} estrellas`}
                      aria-pressed={ratingFilter === star}
                      className="flex min-h-11 w-12 shrink-0 items-center gap-1 text-xs font-bold text-white transition-colors hover:text-[color:var(--brand-gold)]"
                    >
                      {star}
                      <Star className="size-3 fill-[color:var(--brand-gold)] text-[color:var(--brand-gold)]" />
                    </button>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--surface-0)]">
                      <div
                        className="h-full rounded-full bg-[color:var(--brand-gold)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-[color:var(--text-muted)]">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Filtros */}
          <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
            {(["all", 5, 4, 3, 2, 1] as const).map((value) => {
              const isActive = ratingFilter === value;
              const count =
                value === "all"
                  ? reviews.length
                  : stats.distribution[(value as number) - 1];
              if (value !== "all" && count === 0) return null;
              const label = value === "all" ? "Todas" : `${value}★`;
              return (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setRatingFilter(value)}
                  aria-pressed={isActive}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-xs)] border px-2.5 py-1 text-xs font-bold normal-case tracking-normal transition-colors duration-[var(--duration-fast)]",
                    isActive
                      ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)] text-black"
                      : "border-[color:var(--border-default)] text-[color:var(--text-secondary)] hover:border-[color:var(--brand-gold)]/50 hover:text-[color:var(--brand-gold)]",
                  )}
                >
                  {label}
                  <span
                    className={cn(
                      "rounded-[var(--radius-xs)] px-1 font-mono text-xs tabular-nums",
                      isActive
                        ? "bg-black/10 text-black"
                        : "text-[color:var(--text-subtle)]",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Listado */}
          {filteredReviews.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">
              Sin reseñas en este filtro.
            </p>
          ) : (
            <ul className="grid gap-3">
              {filteredReviews.map((review) => {
                const appointment = review.appointments;
                const customerName = appointment?.customer_name ?? "Cliente";
                const phone = appointment?.customer_phone ?? "";
                const whatsappLink = phone
                  ? `https://wa.me/${phone.replace(/\D/g, "")}`
                  : null;
                return (
                  <li
                    key={review.id}
                    className="rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                        <p className="break-words text-sm font-bold text-white sm:text-base">
                          {customerName}
                        </p>
                        <div role="img" aria-label={`${review.rating} de 5 estrellas`} className="flex shrink-0 items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={cn(
                                "size-3.5",
                                n <= review.rating
                                  ? "fill-[color:var(--brand-gold)] text-[color:var(--brand-gold)]"
                                  : "text-[color:var(--text-subtle)]",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-[color:var(--text-subtle)]">
                        {formatDateForDisplay(
                          normalizeDateValue(review.created_at.slice(0, 10)),
                        )}
                      </span>
                    </div>

                    {review.comment ? (
                      <div className="mt-3 border-l-2 border-[color:var(--brand-gold)]/50 pl-3">
                      <p id={`review-comment-${review.id}`} className={cn("break-words text-sm leading-6 text-[color:var(--text-secondary)]", review.comment.length > 220 && !expandedComments[review.id] && "line-clamp-3")}>
                        “{review.comment}”
                      </p>
                      {review.comment.length > 220 ? <button type="button" aria-expanded={Boolean(expandedComments[review.id])} aria-controls={`review-comment-${review.id}`} onClick={() => setExpandedComments((current) => ({ ...current, [review.id]: !current[review.id] }))} className="min-h-11 text-sm font-semibold text-[color:var(--brand-gold)]">{expandedComments[review.id] ? "Ver menos" : "Leer completa"}</button> : null}
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--text-muted)]">
                      {appointment?.service_name ? (
                        <span className="break-words">
                          {appointment.service_name}
                        </span>
                      ) : null}
                      {appointment?.barber_name ? (
                        <span className="break-words">
                          {appointment.barber_name}
                        </span>
                      ) : null}
                      {appointment?.appointment_date ? (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <CalendarDays className="size-3" aria-hidden="true" />
                          {formatDateForDisplay(
                            normalizeDateValue(appointment.appointment_date),
                          )}
                        </span>
                      ) : null}
                      {phone ? (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Phone className="size-3" aria-hidden="true" />
                          {phone}
                        </span>
                      ) : null}
                      {whatsappLink ? (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-1 text-[color:var(--success)] transition-colors hover:underline"
                        >
                          <MessageCircle className="size-3" aria-hidden="true" />
                          WhatsApp
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  hilight,
  danger,
}: {
  label: string;
  value: string;
  suffix?: React.ReactNode;
  hilight?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-3 sm:p-4",
        hilight && "border-[color:var(--brand-gold)]/30",
      )}
    >
      <p className="text-xs font-semibold normal-case tracking-normal text-[color:var(--text-muted)]">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-1.5">
        <p
          className={cn(
            "font-mono text-2xl font-semibold tabular-nums sm:text-3xl",
            hilight
              ? "text-[color:var(--brand-gold)]"
              : danger
                ? "text-[color:var(--danger)]"
                : "text-white",
          )}
        >
          {value}
        </p>
        {suffix}
      </div>
    </div>
  );
}
