"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";

export function HomeContact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      setErrorMessage("Necesitamos tu nombre.");
      return;
    }
    if (!trimmedMessage) {
      setErrorMessage("Necesitamos un mensaje para responderte.");
      return;
    }
    if (!trimmedEmail && !trimmedPhone) {
      setErrorMessage(
        "Dejanos al menos un email o un teléfono para responderte.",
      );
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contact-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail || null,
          phone: trimmedPhone || null,
          message: trimmedMessage,
          source: "home",
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorMessage(
          payload.error ??
            "No pudimos enviar tu mensaje. Probá de nuevo o escribinos por WhatsApp.",
        );
        return;
      }
      setSuccess(true);
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch {
      setErrorMessage(
        "No pudimos enviar tu mensaje. Probá de nuevo o escribinos por WhatsApp.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <section
        id="contacto"
        className="border-t border-[color:var(--border-subtle)]"
      >
        <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-8 sm:py-24 lg:px-12">
          <div
            aria-hidden="true"
            className="mx-auto flex size-14 items-center justify-center rounded-full border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] text-[color:var(--success)]"
          >
            <CheckCircle2 className="size-7" />
          </div>
          <h2 className="mt-6 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            Recibimos tu mensaje
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[color:var(--text-secondary)] sm:text-lg">
            Te respondemos en las próximas 24 a 48 hs por el canal que dejaste.
            Si querés, también podés escribirnos directo por WhatsApp.
          </p>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="mt-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-gold)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold-hi)]"
          >
            Enviar otro mensaje
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      id="contacto"
      className="border-t border-[color:var(--border-subtle)]"
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <header>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
              Contacto
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
              ¿Listo para sumar tu barbería?
            </h2>
            <p className="mt-4 text-base leading-7 text-[color:var(--text-secondary)] sm:text-lg">
              Contanos un poco sobre tu local y te respondemos en menos de
              48 hs con la mejor forma de empezar.
            </p>
            <a
              href="https://wa.me/5493571624511"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--success)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--success-soft)]/80"
            >
              <MessageCircle className="size-4" />
              Escribinos por WhatsApp
            </a>
          </header>

          <form
            onSubmit={handleSubmit}
            className="rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-5 sm:p-6"
          >
            <div className="grid gap-4">
              <div>
                <label
                  htmlFor="contact-name"
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
                >
                  Nombre y barbería *
                </label>
                <input
                  id="contact-name"
                  value={name}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setName(event.target.value);
                    setErrorMessage("");
                  }}
                  placeholder="Juan — Barbería Las Heras"
                  className="mt-2 min-h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
                  Dejanos al menos un contacto *
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="contact-email"
                    className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
                  >
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setErrorMessage("");
                    }}
                    placeholder="vos@barbería.com"
                    className="mt-2 min-h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-phone"
                    className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
                  >
                    Teléfono / WhatsApp
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    value={phone}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setErrorMessage("");
                    }}
                    placeholder="+54 9 11 0000 0000"
                    className="mt-2 min-h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)]"
                >
                  Mensaje *
                </label>
                <textarea
                  id="contact-message"
                  value={message}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setMessage(event.target.value);
                    setErrorMessage("");
                  }}
                  rows={4}
                  placeholder="Contanos cuántos barberos sos, dónde está tu local, etc."
                  className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                />
              </div>

              {errorMessage ? (
                <p
                  role="alert"
                  className="rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--danger)]"
                >
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] bg-gold-grad px-5 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Enviando…" : "Enviar mensaje"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
