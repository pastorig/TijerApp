"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getCurrentPlatformOwnerAccess } from "@/lib/platform-owner-access";
import {
  getCurrentSession,
  signInWithEmailAndPassword,
  signOut,
} from "@/lib/auth";
import { Logo } from "@/components/ui";

type OwnerLoginFormProps = {
  errorCode?: string;
};

export function OwnerLoginForm({ errorCode = "" }: OwnerLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage("Ingresa email y contrasena.");
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
        setErrorMessage("Email o contrasena incorrectos.");
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
          "Ese usuario no tiene acceso owner. Usa un owner real de TijerApp.",
        );
        return;
      }

      router.replace("/owner");
    } catch {
      setErrorMessage("No pudimos iniciar sesion. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 border-b border-[color:var(--border-subtle)] bg-black/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <Link href="/" aria-label="Ir al inicio" className="inline-flex">
          <Logo size="sm" />
        </Link>
      </header>
      <section className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-md flex-col justify-center px-6 py-10">
        <div className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-6 shadow-2xl shadow-black/30">
          <Logo size="md" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
            Owner
          </p>
          <h1 className="mt-2 text-4xl font-black text-white">
            Iniciar sesion
          </h1>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">
            Accede al panel general de la plataforma. Cada barberia mantiene su
            propio correo admin por separado.
          </p>
          {errorCode === "not-owner" ? (
            <p className="mt-3 rounded-md border border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--danger)]">
              Tu sesion es valida, pero no tiene permisos owner.
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="owner-email"
                className="text-sm font-bold uppercase text-[color:var(--text-secondary)]"
              >
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
                className="mt-2 min-h-12 w-full rounded-md border border-[color:var(--border-default)] bg-black px-4 text-base text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                placeholder="owner@tijerapp.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="owner-password"
                className="text-sm font-bold uppercase text-[color:var(--text-secondary)]"
              >
                Contrasena
              </label>
              <input
                id="owner-password"
                type="password"
                value={password}
                disabled={isSubmitting}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorMessage("");
                }}
                className="mt-2 min-h-12 w-full rounded-md border border-[color:var(--border-default)] bg-black px-4 text-base text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                placeholder="Tu contrasena"
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
              disabled={isSubmitting}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[color:var(--brand-gold)] px-6 py-3 text-sm font-bold uppercase text-black transition hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Ingresando..." : "Ingresar al owner"}
            </button>
          </form>

          <div className="mt-5 rounded-md border border-[color:var(--border-default)] bg-black px-4 py-3 text-xs leading-5 text-[color:var(--text-muted)]">
            Si queres entrar al panel de una barberia, usa el acceso admin
            general desde{" "}
            <Link href="/login" className="font-semibold text-[color:var(--brand-gold)]">
              /login
            </Link>
            .
          </div>
        </div>
      </section>
    </main>
  );
}
