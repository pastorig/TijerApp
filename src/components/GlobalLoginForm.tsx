"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getDemoBarbershopBySlug } from "@/data/demo-barbershops";
import { getCurrentUserAdminBarbershops } from "@/lib/barbershop-access";
import { signInWithEmailAndPassword } from "@/lib/auth";
import type { BarbershopAdminRow } from "@/lib/supabase";
import { Logo } from "@/components/ui";

type GlobalLoginFormProps = {
  nextPath?: string;
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
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedBarbershops, setAssignedBarbershops] = useState<
    BarbershopAdminRow[]
  >([]);
  const [hasCheckedAssignments, setHasCheckedAssignments] = useState(false);
  const requestedBarbershopSlug = getBarbershopSlugFromNextPath(nextPath);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage("Ingresa email y contrasena.");
      return;
    }

    setErrorMessage("");
    setHasCheckedAssignments(false);
    setAssignedBarbershops([]);
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

      const {
        data,
        error: accessError,
      } = await getCurrentUserAdminBarbershops();

      if (accessError) {
        setErrorMessage("No pudimos cargar tus barberias asignadas.");
        return;
      }

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

      setAssignedBarbershops(data);
      setHasCheckedAssignments(true);
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
          <h1 className="mt-4 text-4xl font-black text-white">
            Iniciar sesion
          </h1>
          <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">
            Accede al panel de administracion de tus barberias asignadas.
          </p>
          {requestedBarbershopSlug ? (
            <p className="mt-3 rounded-md border border-[color:var(--border-default)] bg-black px-3 py-2 text-xs font-semibold text-[color:var(--text-secondary)]">
              Destino solicitado: /{requestedBarbershopSlug}/admin
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="global-email"
                className="text-sm font-bold uppercase text-[color:var(--text-secondary)]"
              >
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
                className="mt-2 min-h-12 w-full rounded-md border border-[color:var(--border-default)] bg-black px-4 text-base text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                placeholder="admin@barberia.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="global-password"
                className="text-sm font-bold uppercase text-[color:var(--text-secondary)]"
              >
                Contrasena
              </label>
              <input
                id="global-password"
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
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          {hasCheckedAssignments && assignedBarbershops.length === 0 ? (
            <div className="mt-5 rounded-md border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--brand-gold)]">
              No tenes barberias asignadas.
            </div>
          ) : null}

          {assignedBarbershops.length > 1 ? (
            <section className="mt-5 rounded-md border border-[color:var(--border-default)] bg-black p-3">
              <p className="text-xs font-bold uppercase text-[color:var(--brand-gold)]">
                Elegi barberia
              </p>
              <div className="mt-3 grid gap-2">
                {assignedBarbershops.map((admin) => {
                  const barbershop = getDemoBarbershopBySlug(
                    admin.barbershop_slug,
                  );

                  return (
                    <Link
                      key={admin.barbershop_slug}
                      href={
                        nextPath &&
                        admin.barbershop_slug === requestedBarbershopSlug
                          ? nextPath
                          : `/${admin.barbershop_slug}/admin`
                      }
                      className="rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-3 py-3 text-sm font-semibold text-white transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
                    >
                      {barbershop?.name ?? admin.barbershop_slug}
                      <span className="mt-1 block text-xs font-normal text-[color:var(--text-subtle)]">
                        Rol: {admin.role}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
