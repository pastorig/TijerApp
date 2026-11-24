"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getCurrentSession, signOut } from "@/lib/auth";
import { resolverDestinoTrasIngresar } from "@/lib/destino-post-login";
import {
  AUTH_BUTTON_CLASS,
  AUTH_FIELD_CLASS,
  AUTH_LABEL_CLASS,
  AuthShell,
} from "./AuthShell";

/**
 * Último paso de quien entró con Google y todavía no tiene barbería (feature
 * 040). Pide lo mismo que el registro de siempre menos mail y clave: el mail
 * lo trae Google y no hay clave.
 *
 * Mientras no lo complete, cada ingreso con Google lo trae acá (lo decide
 * `destino-post-login`): nunca ve un panel vacío.
 */
export function CompletarRegistroForm() {
  const router = useRouter();
  const [estado, setEstado] = useState<"revisando" | "listo">("revisando");
  const [email, setEmail] = useState("");
  const [barbershopName, setBarbershopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const { data } = await getCurrentSession();
      const user = data.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      // Si ya tiene barbería o es empleado, no tiene nada que completar.
      const destino = await resolverDestinoTrasIngresar();
      if (cancelado) return;
      if (destino.kind === "ir") {
        router.replace(destino.path);
        return;
      }
      if (destino.kind === "elegir") {
        router.replace("/login");
        return;
      }
      setEmail(user.email ?? "");
      const nombre =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        "";
      setOwnerName((actual) => actual || nombre);
      setEstado("listo");
    })();
    return () => {
      cancelado = true;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!barbershopName.trim() || !ownerName.trim() || !whatsapp.trim()) {
      setErrorMessage("Completá los tres datos.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const { data } = await getCurrentSession();
      const token = data.session?.access_token;
      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/registro/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ barbershopName, ownerName, whatsapp }),
      });
      const result = (await response.json()) as { ok?: boolean; slug?: string; error?: string };

      if (!response.ok || !result.ok || !result.slug) {
        setErrorMessage(result.error ?? "No pudimos crear tu barbería. Probá de nuevo.");
        return;
      }
      router.replace(`/${result.slug}/admin`);
    } catch {
      setErrorMessage("No pudimos crear tu barbería. Probá de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Último paso"
      title="Creá tu barbería"
      subtitle="14 días de prueba con todo incluido. Sin tarjeta."
      footer={
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.replace("/login");
          }}
          className="font-semibold text-[color:var(--brand-gold)] hover:brightness-125"
        >
          Ya tengo cuenta con otro mail
        </button>
      }
    >
      {estado === "revisando" ? (
        <p className="mt-6 text-sm text-[color:var(--text-secondary)]">Un segundo…</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {email ? (
            <p className="text-xs text-[color:var(--text-muted)]">
              Entraste con <span className="font-semibold text-white">{email}</span>
            </p>
          ) : null}

          <div>
            <label htmlFor="completar-barbershop" className={AUTH_LABEL_CLASS}>
              Nombre de tu barbería
            </label>
            <input
              id="completar-barbershop"
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

          <div>
            <label htmlFor="completar-owner" className={AUTH_LABEL_CLASS}>
              Tu nombre
            </label>
            <input
              id="completar-owner"
              value={ownerName}
              disabled={isSubmitting}
              onChange={(event) => {
                setOwnerName(event.target.value);
                setErrorMessage("");
              }}
              className={AUTH_FIELD_CLASS}
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label htmlFor="completar-whatsapp" className={AUTH_LABEL_CLASS}>
              WhatsApp
            </label>
            <input
              id="completar-whatsapp"
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

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-md border border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--danger)]"
            >
              {errorMessage}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting} className={AUTH_BUTTON_CLASS}>
            {isSubmitting ? "Creando…" : "Crear mi barbería"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
