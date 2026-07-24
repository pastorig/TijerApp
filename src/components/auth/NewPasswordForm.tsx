"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { getCurrentSession, updateCurrentUserPassword } from "@/lib/auth";
import {
  AUTH_BUTTON_CLASS,
  AUTH_FIELD_CLASS,
  AUTH_LABEL_CLASS,
  AuthShell,
} from "./AuthShell";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Paso 2 de "olvidé mi contraseña": el usuario llega acá desde el link del
 * mail. Supabase deja una sesión de recuperación activa al abrir ese link,
 * así que alcanza con updateUser({ password }).
 *
 * Si alguien entra de prepo (sin link válido) no hay sesión → se lo avisamos
 * en vez de dejarlo tipear una contraseña que no se va a poder guardar.
 */
export function NewPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // null = todavía chequeando; el link del mail se procesa de forma async.
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const { data } = await getCurrentSession();
      if (!cancelled) setHasSession(Boolean(data.session));
    }
    // Pequeño margen para que el SDK procese el token del hash de la URL.
    const timer = setTimeout(check, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(
        `La contraseña tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const { error } = await updateCurrentUserPassword(password);
      if (error) {
        setErrorMessage(
          "No pudimos actualizar la contraseña. Pedí el link de nuevo.",
        );
        return;
      }
      // Ya queda logueado con la contraseña nueva: lo mandamos al login, que
      // resuelve a qué barbería va.
      router.replace("/login");
    } catch {
      setErrorMessage("No pudimos actualizar la contraseña. Probá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (hasSession === false) {
    return (
      <AuthShell
        title="Link vencido"
        subtitle="Este link ya no sirve o se abrió en otro navegador."
        footer={
          <Link
            href="/recuperar"
            className="font-semibold text-[color:var(--brand-gold)] hover:brightness-125"
          >
            Pedir un link nuevo
          </Link>
        }
      >
        <p className="mt-6 text-sm leading-6 text-[color:var(--text-secondary)]">
          Abrí el link desde el mismo dispositivo donde recibiste el mail, o
          pedí uno nuevo.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Nueva contraseña"
      subtitle="Elegí una contraseña nueva para entrar a tu panel."
    >
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="new-password" className={AUTH_LABEL_CLASS}>
            Contraseña nueva
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              value={password}
              disabled={isSubmitting || hasSession === null}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrorMessage("");
              }}
              className={`${AUTH_FIELD_CLASS} pr-11`}
              placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={
                showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              className="absolute inset-y-0 right-0 top-2 inline-flex w-11 items-center justify-center text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--brand-gold)]"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className={AUTH_LABEL_CLASS}>
            Repetila
          </label>
          <input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            disabled={isSubmitting || hasSession === null}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setErrorMessage("");
            }}
            className={AUTH_FIELD_CLASS}
            placeholder="La misma de arriba"
            autoComplete="new-password"
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

        <button
          type="submit"
          disabled={isSubmitting || hasSession === null}
          className={AUTH_BUTTON_CLASS}
        >
          {isSubmitting ? "Guardando…" : "Guardar y entrar"}
        </button>
      </form>
    </AuthShell>
  );
}
