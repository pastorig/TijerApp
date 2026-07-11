"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { signInWithEmailAndPassword } from "@/lib/auth";
import { Button, Field, Input, Logo } from "@/components/ui";

type AdminLoginFormProps = {
  barbershop: DemoBarbershop;
};

export function AdminLoginForm({ barbershop }: AdminLoginFormProps) {
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

      router.replace(`/${barbershop.slug}/admin`);
    } catch {
      setErrorMessage("No pudimos iniciar sesión. Intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-8 sm:py-6 lg:px-12">
        <Link
          href={`/${barbershop.slug}`}
          className="inline-flex min-w-0 items-center gap-1 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)] sm:tracking-[0.2em]"
        >
          <ArrowLeft className="size-3.5 shrink-0" />
          <span className="truncate">{barbershop.name}</span>
        </Link>
        <Logo variant="mark" size="sm" className="shrink-0" />
      </nav>

      <section className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-md flex-col justify-center px-5 pb-20 pt-8 sm:px-8">
        <div className="animate-fade-up">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
            Acceso administrador
          </p>
          <h1 className="mt-4 text-3xl font-black uppercase leading-[0.95] tracking-tight text-balance sm:text-4xl">
            Panel de {barbershop.name}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
            Iniciá sesión para gestionar turnos, confirmaciones y cancelaciones
            de tu barbería.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <Field label="Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                value={email}
                disabled={isSubmitting}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="admin@barberia.com"
                autoComplete="email"
                inputMode="email"
                required
              />
            </Field>

            <Field label="Contraseña" htmlFor="password" required>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrorMessage("");
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="pr-11"
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
            </Field>

            {errorMessage ? (
              <div
                role="alert"
                className="border-l-2 border-[color:var(--danger)] pl-4 text-sm font-semibold text-[color:var(--danger)]"
              >
                {errorMessage}
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={isSubmitting}
              className="mt-2"
            >
              {isSubmitting ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
