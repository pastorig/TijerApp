"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { sendPasswordResetEmail } from "@/lib/auth";
import {
  AUTH_BUTTON_CLASS,
  AUTH_FIELD_CLASS,
  AUTH_LABEL_CLASS,
  AuthShell,
} from "./AuthShell";

/**
 * Paso 1 de "olvidé mi contraseña": pide el email y dispara el mail con el
 * link de recuperación.
 *
 * Siempre mostramos el mismo mensaje de éxito, exista o no una cuenta con ese
 * email: si dijéramos "ese email no existe" le estaríamos confirmando a
 * cualquiera qué direcciones tienen cuenta.
 */
export function RecoverPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Ingresá tu email.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const { error } = await sendPasswordResetEmail(email.trim());
      if (error) {
        setErrorMessage("No pudimos enviar el mail. Probá de nuevo.");
        return;
      }
      setIsSent(true);
    } catch {
      setErrorMessage("No pudimos enviar el mail. Probá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <AuthShell
        title="Revisá tu mail"
        subtitle={`Si hay una cuenta con ${email.trim()}, te llegó un link para crear una contraseña nueva.`}
        footer={
          <Link
            href="/login"
            className="font-semibold text-[color:var(--brand-gold)] hover:brightness-125"
          >
            Volver a iniciar sesión
          </Link>
        }
      >
        <div className="mt-6 flex items-start gap-3 rounded-md border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] p-4">
          <MailCheck
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-[color:var(--brand-gold)]"
          />
          <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
            El link vence en una hora. Si no lo ves, fijate en spam o correo no
            deseado.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Poné tu email y te mandamos un link para crear una nueva."
      footer={
        <Link
          href="/login"
          className="font-semibold text-[color:var(--brand-gold)] hover:brightness-125"
        >
          Volver a iniciar sesión
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="recover-email" className={AUTH_LABEL_CLASS}>
            Email
          </label>
          <input
            id="recover-email"
            type="email"
            value={email}
            disabled={isSubmitting}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrorMessage("");
            }}
            className={AUTH_FIELD_CLASS}
            placeholder="tu@barberia.com"
            autoComplete="email"
            required
          />
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-md border border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--danger)]"
          >
            {errorMessage}
          </p>
        ) : null}

        <button type="submit" disabled={isSubmitting} className={AUTH_BUTTON_CLASS}>
          {isSubmitting ? "Enviando…" : "Enviarme el link"}
        </button>
      </form>
    </AuthShell>
  );
}
