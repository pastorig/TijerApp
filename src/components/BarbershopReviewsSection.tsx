import { Quote, Star } from "lucide-react";
import type { PublicReview } from "@/lib/appointment-reviews";
import { cn } from "@/lib/cn";

type BarbershopReviewsSectionProps = {
  reviews: PublicReview[];
  barbershopSlug: string;
  googleReviewsUrl?: string;
};

function formatRelativeDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return "Hoy";
    if (diffDays < 2) return "Ayer";
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem`;
    if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function BarbershopReviewsSection({
  reviews,
  googleReviewsUrl,
}: BarbershopReviewsSectionProps) {
  // Calculamos rating promedio para el header
  const avgRating =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const totalCount = reviews.length;

  return (
    <section
      id="resenas"
      className="border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]/40"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <header className="mb-6 sm:mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Lo que dicen
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
            Reseñas reales
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={cn(
                    "size-5",
                    n <= Math.round(avgRating)
                      ? "fill-[color:var(--brand-gold)] text-[color:var(--brand-gold)]"
                      : "text-[color:var(--text-subtle)]",
                  )}
                />
              ))}
            </div>
            <p className="font-mono text-sm font-bold tabular-nums text-white">
              {avgRating.toFixed(1)}
            </p>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              · {totalCount} {totalCount === 1 ? "reseña" : "reseñas"}
            </span>
          </div>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="relative flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5 transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--border-default)]"
            >
              <Quote
                className="size-7 text-[color:var(--brand-gold)]/20"
                aria-hidden="true"
              />
              <div className="flex items-center gap-0.5">
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
              <p className="text-sm leading-relaxed text-[color:var(--text-secondary)]">
                “{review.comment}”
              </p>
              <div className="mt-auto flex flex-wrap items-baseline justify-between gap-2 border-t border-[color:var(--border-subtle)] pt-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {review.customer_first_name}
                  </p>
                  {review.service_name ? (
                    <p className="truncate text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                      {review.service_name}
                      {review.barber_name ? ` · ${review.barber_name}` : ""}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 font-mono text-[10px] text-[color:var(--text-subtle)]">
                  {formatRelativeDate(review.created_at)}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {googleReviewsUrl ? (
          <div className="mt-8 text-center">
            <a
              href={googleReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
            >
              Ver más en Google →
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
