"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentUserStaffBarbershops } from "@/lib/staff-access-client";
import { resolvePostLoginDestination } from "@/lib/staff-routing";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { signInWithEmailAndPassword } from "@/lib/auth";
import {
  AUTH_BUTTON_CLASS,
  AUTH_FIELD_CLASS,
  AUTH_LABEL_CLASS,
  AuthShell,
} from "@/components/auth/AuthShell";

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

      // Un empleado que entra por el login de la barbería va a SU agenda, no
      // al panel: el panel le rebotaría igual, y rebotarlo después de entrar
      // bien se lee como "no me anda el usuario".
      const { data: staff } = await getCurrentUserStaffBarbershops();
      const destino = resolvePostLoginDestination({
        barbershopSlug: barbershop.slug,
        isAdmin: !staff.some((a) => a.barbershopSlug === barbershop.slug),
        isStaff: staff.some((a) => a.barbershopSlug === barbershop.slug),
      });
      router.replace(
        destino.kind === "sin-acceso"
          ? `/${barbershop.slug}/admin`
          : destino.path,
      );
    } catch {
      setErrorMessage("No pudimos iniciar sesión. Intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Acceso administrador"
      title={`Panel de ${barbershop.name}`}
      subtitle="Iniciá sesión para gestionar turnos, confirmaciones y cancelaciones de tu barbería."
      backLink={{ href: `/${barbershop.slug}`, label: barbershop.name }}
      panelTitle="Tu barbería, en orden."
      panelSubtitle="Agenda multi-barbero, reservas online y reportes en un solo lugar. Así se ve por dentro."
    >
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="admin-email" className={AUTH_LABEL_CLASS}>
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            value={email}
            disabled={isSubmitting}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrorMessage("");
            }}
            className={AUTH_FIELD_CLASS}
            placeholder="admin@barberia.com"
            autoComplete="email"
            inputMode="email"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="admin-password" className={AUTH_LABEL_CLASS}>
              Contraseña
            </label>
            <Link
              href="/recuperar"
              className="text-[11px] font-semibold text-[color:var(--brand-gold)] hover:brightness-125"
            >
              ¿La olvidaste?
            </Link>
          </div>
          <div className="relative">
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              value={password}
              disabled={isSubmitting}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrorMessage("");
              }}
              className={`${AUTH_FIELD_CLASS} pr-11`}
              placeholder="••••••••"
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

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-md border border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--danger)]"
          >
            {errorMessage}
          </p>
        ) : null}

        <button type="submit" disabled={isSubmitting} className={AUTH_BUTTON_CLASS}>
          {isSubmitting ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </AuthShell>
  );
}
