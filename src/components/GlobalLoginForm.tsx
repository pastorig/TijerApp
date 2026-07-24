"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Store } from "lucide-react";
import { getCurrentUserAdminBarbershops } from "@/lib/barbershop-access";
import { signInWithEmailAndPassword } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabase";
import {
  AUTH_BUTTON_CLASS,
  AUTH_FIELD_CLASS,
  AUTH_LABEL_CLASS,
  AuthShell,
} from "@/components/auth/AuthShell";

type GlobalLoginFormProps = {
  nextPath?: string;
};

/** Barbería que administra el usuario, ya con su nombre real para mostrar. */
type BarbershopChoice = {
  slug: string;
  name: string;
  role: string;
};

function getBarbershopSlugFromNextPath(nextPath?: string) {
  if (!nextPath) {
    return "";
  }

  const match = nextPath.match(/^\/([^/]+)\/admin(?:\/.*)?$/);
  return match?.[1] ?? "";
}

export function GlobalLoginForm({ nextPath = "" }: GlobalLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [choices, setChoices] = useState<BarbershopChoice[]>([]);
  const [hasCheckedAssignments, setHasCheckedAssignments] = useState(false);
  const requestedBarbershopSlug = getBarbershopSlugFromNextPath(nextPath);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage("Ingresá tu email y contraseña.");
      return;
    }

    setErrorMessage("");
    setHasCheckedAssignments(false);
    setChoices([]);
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

      const { data, error: accessError } =
        await getCurrentUserAdminBarbershops();

      if (accessError) {
        setErrorMessage("No pudimos cargar tus barberías.");
        return;
      }

      // Si venía de una URL puntual de admin y tiene acceso, respetamos ese
      // destino (ej. lo mandamos a /mi-barberia/admin/turnero, no al home).
      if (
        nextPath &&
        requestedBarbershopSlug &&
        data.some(
          (adminAccess) =>
            adminAccess.barbershop_slug === requestedBarbershopSlug,
        )
      ) {
        router.replace(nextPath);
        return;
      }

      if (data.length === 1) {
        router.replace(`/${data[0].barbershop_slug}/admin`);
        return;
      }

      // Administra varias: hay que elegir. Buscamos los nombres reales — antes
      // esto salía de los datos demo, así que a un cliente real le mostraba el
      // slug ("leocuts") en vez del nombre ("Leo Cuts").
      const slugs = data.map((adminAccess) => adminAccess.barbershop_slug);
      const { data: shops } = await getSupabaseClient()
        .from("barbershops")
        .select("slug, name")
        .in("slug", slugs);

      const nameBySlug = new Map(
        (shops ?? []).map((shop) => [shop.slug, shop.name]),
      );

      setChoices(
        data.map((adminAccess) => ({
          slug: adminAccess.barbershop_slug,
          name:
            nameBySlug.get(adminAccess.barbershop_slug) ??
            adminAccess.barbershop_slug,
          role: adminAccess.role,
        })),
      );
      setHasCheckedAssignments(true);
    } catch {
      setErrorMessage("No pudimos iniciar sesión. Probá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle="Entrá al panel de tu barbería."
      footer={
        <>
          ¿Problemas para entrar?{" "}
          <Link
            href="/#contacto"
            className="font-semibold text-[color:var(--brand-gold)] hover:brightness-125"
          >
            Escribinos
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="global-email" className={AUTH_LABEL_CLASS}>
            Email
          </label>
          <input
            id="global-email"
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
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="global-password" className={AUTH_LABEL_CLASS}>
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
              id="global-password"
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
              className="absolute inset-y-0 right-0 top-2 inline-flex w-11 items-center justify-center text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--brand-gold)] disabled:opacity-50"
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

      {hasCheckedAssignments && choices.length === 0 ? (
        <div className="mt-5 rounded-md border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--brand-gold)]">
          Tu cuenta todavía no tiene una barbería asignada. Escribinos y lo
          resolvemos.
        </div>
      ) : null}

      {choices.length > 1 ? (
        <section className="mt-6 border-t border-[color:var(--border-subtle)] pt-5">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--brand-gold)]">
            Elegí tu barbería
          </p>
          <div className="mt-3 grid gap-2">
            {choices.map((choice) => (
              <Link
                key={choice.slug}
                href={
                  nextPath && choice.slug === requestedBarbershopSlug
                    ? nextPath
                    : `/${choice.slug}/admin`
                }
                className="flex items-center gap-3 rounded-md border border-[color:var(--border-default)] bg-black px-3 py-3 transition hover:border-[color:var(--brand-gold)]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[color:var(--border-default)] text-[color:var(--text-muted)]">
                  <Store aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-white">
                    {choice.name}
                  </span>
                  <span className="block text-xs text-[color:var(--text-subtle)]">
                    {choice.role}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </AuthShell>
  );
}
