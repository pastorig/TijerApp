"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Sparkles, Star } from "lucide-react";
import { submitReviewByToken } from "@/lib/appointment-reviews";
import { cn } from "@/lib/cn";

type ReviewFormClientProps = {
  token: string;
  barbershopName: string;
  barbershopSlug: string;
  googleReviewsUrl: string | null;
  customerName: string;
  serviceName: string;
  appointmentDate: string;
  alreadySubmitted: boolean;
  isInFuture: boolean;
  status: string;
};

export function ReviewFormClient({
  token,
  barbershopName,
  barbershopSlug,
  googleReviewsUrl,
  customerName,
  serviceName,
  appointmentDate,
  alreadySubmitted,
  isInFuture,
  status,
}: ReviewFormClientProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRating, setSubmittedRating] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const isInvalidStatus = status === "cancelled" || status === "deleted";
  const isBlocked =
    isInvalidStatus || isInFuture || alreadySubmitted || submittedRating !== null;

  const firstName = useMemo(
    () => customerName.split(/\s+/)[0] ?? customerName,
    [customerName],
  );

  async function handleSubmit() {
    if (rating < 1 || rating > 5) {
      setErrorMessage("Elegí cuántas estrellas le ponés.");
      return;
    }
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const { ok, reason } = await submitReviewByToken({
        token,
        rating,
        comment: comment.trim(),
      });
      if (!ok) {
        if (reason === "already_submitted") {
          setErrorMessage("Ya dejaste una reseña para este turno.");
        } else if (reason === "too_early") {
          setErrorMessage("Todavía no podés reseñar (el turno no ocurrió).");
        } else if (reason === "invalid_status") {
          setErrorMessage("Este turno no permite reseñas.");
        } else if (reason === "invalid_rating") {
          setErrorMessage("La puntuación debe ser entre 1 y 5.");
        } else {
          setErrorMessage("No pudimos guardar la reseña. Intentá de nuevo.");
        }
        return;
      }
      setSubmittedRating(rating);
    } catch {
      setErrorMessage("No pudimos guardar la reseña. Intentá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Estados bloqueados ──────────────────────────────────────
  if (alreadySubmitted && submittedRating === null) {
    return (
      <BlockedState
        title="Ya dejaste tu reseña"
        description="Gracias por tu opinión. Si querés cambiarla, escribinos por WhatsApp."
        barbershopSlug={barbershopSlug}
      />
    );
  }

  if (isInFuture) {
    return (
      <BlockedState
        title="Todavía es muy temprano"
        description="Vas a poder dejar tu reseña una vez que pasó el turno."
        barbershopSlug={barbershopSlug}
      />
    );
  }

  if (isInvalidStatus) {
    return (
      <BlockedState
        title="Este turno no permite reseñas"
        description="Si creés que es un error, contactanos."
        barbershopSlug={barbershopSlug}
      />
    );
  }

  // ─── Éxito ────────────────────────────────────────────────────
  if (submittedRating !== null) {
    const isHighRating = submittedRating >= 4;
    return (
      <section className="animate-fade-up">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-[color:var(--success)]/40 bg-[color:var(--success-soft)]">
          <Check className="size-8 text-[color:var(--success)]" />
        </div>
        <h1 className="mt-6 text-center text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
          ¡Gracias, {firstName}!
        </h1>
        <p className="mt-3 text-center text-sm text-[color:var(--text-secondary)] sm:text-base">
          Tu opinión ya quedó guardada.
        </p>

        <div className="mt-6 flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn(
                "size-7",
                n <= submittedRating
                  ? "fill-[color:var(--brand-gold)] text-[color:var(--brand-gold)]"
                  : "text-[color:var(--text-subtle)]",
              )}
            />
          ))}
        </div>

        {isHighRating && googleReviewsUrl ? (
          <div className="mt-8 rounded-[var(--radius-md)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] p-5 text-center">
            <Sparkles
              aria-hidden="true"
              className="mx-auto size-6 text-[color:var(--brand-gold)]"
            />
            <p className="mt-3 text-sm font-bold text-white">
              ¿Nos ayudás compartiéndola en Google también?
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-secondary)]">
              Nos hace crecer un montón.
            </p>
            <a
              href={googleReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)]"
            >
              Dejar reseña en Google
            </a>
          </div>
        ) : null}

        <div className="mt-8 text-center">
          <Link
            href={`/${barbershopSlug}`}
            className="inline-flex items-center text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
          >
            Volver a {barbershopName}
          </Link>
        </div>
      </section>
    );
  }

  // ─── Formulario ───────────────────────────────────────────────
  return (
    <section className="animate-fade-up">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)]">
          Reseña
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
          ¿Cómo te fue, {firstName}?
        </h1>
        <p className="mt-3 text-sm text-[color:var(--text-secondary)] sm:text-base">
          Contanos qué tal estuvo tu turno de{" "}
          <span className="text-white">{serviceName}</span> del{" "}
          <span className="font-mono text-white">{appointmentDate}</span>.
        </p>
      </header>

      <div className="mt-8 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
          Tu puntuación
        </p>
        <div
          className="mt-3 flex items-center gap-1.5"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const isActive = (hoverRating || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
                onMouseEnter={() => setHoverRating(n)}
                onFocus={() => setHoverRating(n)}
                onClick={() => setRating(n)}
                disabled={isBlocked || isSubmitting}
                className="rounded-[var(--radius-xs)] p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)] disabled:cursor-not-allowed"
              >
                <Star
                  className={cn(
                    "size-9 transition-colors",
                    isActive
                      ? "fill-[color:var(--brand-gold)] text-[color:var(--brand-gold)]"
                      : "text-[color:var(--text-subtle)]",
                  )}
                />
              </button>
            );
          })}
        </div>

        <label
          htmlFor="review-comment"
          className="mt-6 block text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
        >
          Comentario (opcional)
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isBlocked || isSubmitting}
          rows={4}
          maxLength={500}
          placeholder="Algo que quieras destacar o mejorar…"
          className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
        />

        {errorMessage ? (
          <p
            role="alert"
            className="mt-4 border-l-2 border-[color:var(--danger)] pl-3 text-sm font-semibold text-[color:var(--danger)]"
          >
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isBlocked || isSubmitting || rating < 1}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-5 text-[12px] font-bold uppercase tracking-[0.16em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Guardando…" : "Enviar reseña"}
        </button>
      </div>
    </section>
  );
}

function BlockedState({
  title,
  description,
  barbershopSlug,
}: {
  title: string;
  description: string;
  barbershopSlug: string;
}) {
  return (
    <section className="animate-fade-up text-center">
      <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-[color:var(--text-secondary)] sm:text-base">
        {description}
      </p>
      <Link
        href={`/${barbershopSlug}`}
        className="mt-8 inline-flex items-center text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
