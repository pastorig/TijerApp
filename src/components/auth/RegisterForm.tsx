"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { signInWithEmailAndPassword } from "@/lib/auth";
import {
  AUTH_BUTTON_CLASS,
  AUTH_FIELD_CLASS,
  AUTH_LABEL_CLASS,
  AuthShell,
} from "./AuthShell";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Registro self-serve. Crea la barbería vía /api/registro y, si sale bien,
 * loguea al barbero con las credenciales que acaba de elegir y lo manda
 * directo a su panel — sin confirmar email, para no perderlo en el camino.
 */
export function RegisterForm() {
  const router = useRouter();
  const [barbershopName, setBarbershopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(
        `La contraseña tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barbershopName,
          ownerName,
          whatsapp,
          email,
          password,
          website,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        slug?: string | null;
        existingAccount?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.slug) {
        setErrorMessage(data.error ?? "No pudimos crear tu cuenta.");
        return;
      }

      // El email ya tenía cuenta: su barbería quedó creada, pero la contraseña
      // válida es la vieja. Lo mandamos al login en vez de fallar el sign-in.
      if (data.existingAccount) {
        router.replace("/login");
        return;
      }

      const { error } = await signInWithEmailAndPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // La barbería existe igual; que entre por la puerta normal.
        router.replace("/login");
        return;
      }

      router.replace(`/${data.slug}/admin`);
    } catch {
      setErrorMessage("No pudimos crear tu cuenta. Probá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Empezá gratis"
      subtitle="14 días de prueba con todo incluido. Sin tarjeta."
      footer={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-[color:var(--brand-gold)] hover:brightness-125"
          >
            Iniciá sesión
          </Link>
        </>
      }
    >
      <ul className="mt-5 grid gap-1.5">
        {[
          "Tus clientes reservan solos, 24/7",
          "Cancelás cuando quieras",
          "Listo en menos de un minuto",
        ].map((perk) => (
          <li
            key={perk}
            className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]"
          >
            <Check
              aria-hidden="true"
              className="size-3.5 shrink-0 text-[color:var(--brand-gold)]"
            />
            {perk}
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="reg-barbershop" className={AUTH_LABEL_CLASS}>
            Nombre de tu barbería
          </label>
          <input
            id="reg-barbershop"
            value={barbershopName}
            disabled={isSubmitting}
            onChange={(event) => {
              setBarbershopName(event.target.value);
              setErrorMessage("");
            }}
            className={AUTH_FIELD_CLASS}
            placeholder="Ej: Leo Cuts"
            autoComplete="organization"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reg-owner" className={AUTH_LABEL_CLASS}>
              Tu nombre
            </label>
            <input
              id="reg-owner"
              value={ownerName}
              disabled={isSubmitting}
              onChange={(event) => {
                setOwnerName(event.target.value);
                setErrorMessage("");
              }}
              className={AUTH_FIELD_CLASS}
              placeholder="Ej: Leo"
              autoComplete="name"
              required
            />
          </div>
          <div>
            <label htmlFor="reg-whatsapp" className={AUTH_LABEL_CLASS}>
              WhatsApp
            </label>
            <input
              id="reg-whatsapp"
              value={whatsapp}
              disabled={isSubmitting}
              onChange={(event) => {
                setWhatsapp(event.target.value);
                setErrorMessage("");
              }}
              className={AUTH_FIELD_CLASS}
              placeholder="+54 9 ..."
              inputMode="tel"
              autoComplete="tel"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="reg-email" className={AUTH_LABEL_CLASS}>
            Email
          </label>
          <input
            id="reg-email"
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

        <div>
          <label htmlFor="reg-password" className={AUTH_LABEL_CLASS}>
            Contraseña
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              value={password}
              disabled={isSubmitting}
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

        {/* Honeypot: oculto para humanos, tentador para bots. */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="reg-website">No completar</label>
          <input
            id="reg-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
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
          {isSubmitting ? "Creando tu barbería…" : "Crear mi barbería"}
        </button>

        <p className="text-center text-[11px] leading-5 text-[color:var(--text-subtle)]">
          Al crear tu cuenta arrancás el trial de 14 días. No te pedimos tarjeta.
        </p>
      </form>
    </AuthShell>
  );
}
