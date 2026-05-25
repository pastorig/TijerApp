"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getDemoBarbershopBySlug } from "@/data/demo-barbershops";
import { getCurrentUserAdminBarbershops } from "@/lib/barbershop-access";
import { signInWithEmailAndPassword } from "@/lib/auth";
import type { BarbershopAdminRow } from "@/lib/supabase";

export function GlobalLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignedBarbershops, setAssignedBarbershops] = useState<
    BarbershopAdminRow[]
  >([]);
  const [hasCheckedAssignments, setHasCheckedAssignments] = useState(false);

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
    <main className="min-h-screen bg-stone-950 text-stone-50">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
        <div className="rounded-lg border border-stone-800 bg-stone-900/70 p-6 shadow-2xl shadow-black/30">
          <p className="text-sm font-semibold uppercase text-amber-300">
            BarberSync
          </p>
          <h1 className="mt-3 text-4xl font-black text-stone-50">
            Iniciar sesion
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-300">
            Accede al panel de administracion de tus barberias asignadas.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="global-email"
                className="text-sm font-bold uppercase text-stone-300"
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
                className="mt-2 min-h-12 w-full rounded-md border border-stone-700 bg-stone-950 px-4 text-base text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                placeholder="admin@barberia.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="global-password"
                className="text-sm font-bold uppercase text-stone-300"
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
                className="mt-2 min-h-12 w-full rounded-md border border-stone-700 bg-stone-950 px-4 text-base text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                placeholder="Tu contrasena"
                required
              />
            </div>

            {errorMessage ? (
              <p
                role="alert"
                className="rounded-md border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200"
              >
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-amber-300 px-6 py-3 text-sm font-bold uppercase text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          {hasCheckedAssignments && assignedBarbershops.length === 0 ? (
            <div className="mt-5 rounded-md border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">
              No tenes barberias asignadas.
            </div>
          ) : null}

          {assignedBarbershops.length > 1 ? (
            <section className="mt-5 rounded-md border border-stone-800 bg-stone-950 p-3">
              <p className="text-xs font-bold uppercase text-amber-300">
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
                      href={`/${admin.barbershop_slug}/admin`}
                      className="rounded-md border border-stone-800 bg-stone-900 px-3 py-3 text-sm font-semibold text-stone-100 transition hover:border-amber-300 hover:text-amber-200"
                    >
                      {barbershop?.name ?? admin.barbershop_slug}
                      <span className="mt-1 block text-xs font-normal text-stone-500">
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
