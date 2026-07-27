"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { getCurrentPlatformOwnerAccess } from "@/lib/platform-owner-access";
import {
  getCurrentSession,
  signInWithEmailAndPassword,
  signOut,
} from "@/lib/auth";
import {
  AUTH_BUTTON_CLASS,
  AUTH_FIELD_CLASS,
  AUTH_LABEL_CLASS,
  AuthShell,
} from "@/components/auth/AuthShell";

type OwnerLoginFormProps = {
  errorCode?: string;
};

export function OwnerLoginForm({ errorCode = "" }: OwnerLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage("Ingresá email y contraseña.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { error } = await signInWithEmailAndPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage("Email o contraseña incorrectos.");
        return;
      }

      const ownerAccess = await getCurrentPlatformOwnerAccess();

      if (!ownerAccess.isOwner) {
        const { data } = await getCurrentSession();
        const accessToken = data.session?.access_token;

        if (accessToken) {
          const bootstrapResponse = await fetch("/api/owner/bootstrap", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (bootstrapResponse.ok) {
            router.replace("/owner");
            return;
          }
        }

        await signOut();
        setErrorMessage(
          "Ese usuario no tiene acceso owner. Usá un owner real de TijerApp.",
        );
        return;
      }

      router.replace("/owner");
    } catch {
      setErrorMessage("No pudimos iniciar sesión. Intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Owner"
      title="Panel de plataforma"
      subtitle="Accedé al panel general de TijerApp. Cada barbería mantiene su propio correo admin por separado."
      panelTitle="El control de toda la plataforma."
      panelSubtitle="Barberías, planes, cobros y métricas del negocio, en una sola vista."
      footer={
        <>
          ¿Querés entrar al panel de una barbería? Usá el{" "}
          <Link
            href="/login"
            className="font-semibold text-[color:var(--brand-gold)] hover:brightness-125"
          >
            acceso admin
          </Link>
          .
        </>
      }
    >
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="owner-email" className={AUTH_LABEL_CLASS}>
            Email owner
          </label>
          <input
            id="owner-email"
            type="email"
            value={email}
            disabled={isSubmitting}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrorMessage("");
            }}
            className={AUTH_FIELD_CLASS}
            placeholder="owner@tijerapp.com"
            autoComplete="email"
            inputMode="email"
            required
          />
        </div>

        <div>
          <label htmlFor="owner-password" className={AUTH_LABEL_CLASS}>
            Contraseña
          </label>
          <div className="relative">
            <input
              id="owner-password"
              type={showPassword ? "text" : "password"}
              value={password}
              disabled={isSubmitting}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrorMessage("");
              }}
              className={`${AUTH_FIELD_CLASS} pr-11`}
              placeholder="Tu contraseña"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={isSubmitting}
              aria-label={
                showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--brand-gold)] disabled:opacity-50"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        {errorCode === "not-owner" ? (
          <p className="rounded-md border border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--danger)]">
            Tu sesión es válida, pero no tiene permisos owner.
          </p>
        ) : null}

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-md border border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--danger)]"
          >
            {errorMessage}
          </p>
        ) : null}

        <button type="submit" disabled={isSubmitting} className={AUTH_BUTTON_CLASS}>
          {isSubmitting ? "Ingresando…" : "Ingresar al owner"}
        </button>
      </form>
    </AuthShell>
  );
}
