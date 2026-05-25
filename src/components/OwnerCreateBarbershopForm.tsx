"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getCurrentSession } from "@/lib/auth";

type ServiceInput = {
  id: string;
  name: string;
  price: string;
  durationMinutes: string;
};

function createEmptyService(id: string): ServiceInput {
  return {
    id,
    name: "",
    price: "",
    durationMinutes: "30",
  };
}

function buildSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function OwnerCreateBarbershopForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [firstBarberName, setFirstBarberName] = useState("");
  const [services, setServices] = useState<ServiceInput[]>([
    createEmptyService("service-1"),
  ]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createdSlug, setCreatedSlug] = useState("");
  const [createdAdminEmail, setCreatedAdminEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleAddService() {
    setServices((currentServices) => [
      ...currentServices,
      createEmptyService(`service-${currentServices.length + 1}`),
    ]);
  }

  function handleRemoveService(serviceId: string) {
    setServices((currentServices) =>
      currentServices.length === 1
        ? currentServices
        : currentServices.filter((service) => service.id !== serviceId),
    );
  }

  function handleServiceChange(
    serviceId: string,
    field: keyof Omit<ServiceInput, "id">,
    value: string,
  ) {
    setServices((currentServices) =>
      currentServices.map((service) =>
        service.id === serviceId ? { ...service, [field]: value } : service,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !slug.trim() || !adminEmail.trim() || !firstBarberName.trim()) {
      setErrorMessage("Completa nombre, slug, email admin y primer barbero.");
      return;
    }

    const invalidService = services.find(
      (service) =>
        !service.name.trim() ||
        !service.price.trim() ||
        !service.durationMinutes.trim(),
    );

    if (invalidService) {
      setErrorMessage("Completa todos los servicios iniciales.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setCreatedSlug("");
    setCreatedAdminEmail("");
    setTemporaryPassword("");
    setIsSubmitting(true);

    try {
      const { data } = await getCurrentSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        setErrorMessage("La sesion no es valida. Ingresa nuevamente.");
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/owner/create-barbershop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: buildSlug(slug),
          description: description.trim(),
          whatsapp: whatsapp.trim(),
          instagram: instagram.trim(),
          adminEmail: adminEmail.trim(),
          firstBarberName: firstBarberName.trim(),
          initialServices: services.map((service) => ({
            name: service.name.trim(),
            price: Number(service.price),
            durationMinutes: Number(service.durationMinutes),
          })),
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        message?: string;
        slug?: string;
        adminEmail?: string;
        temporaryPassword?: string | null;
      };

      if (!response.ok) {
        setErrorMessage(result.error ?? "No pudimos crear la barberia.");
        return;
      }

      setSuccessMessage(result.message ?? "Barberia creada correctamente.");
      setCreatedSlug(result.slug ?? "");
      setCreatedAdminEmail(result.adminEmail ?? "");
      setTemporaryPassword(result.temporaryPassword ?? "");
      setName("");
      setSlug("");
      setDescription("");
      setWhatsapp("");
      setInstagram("");
      setAdminEmail("");
      setFirstBarberName("");
      setServices([createEmptyService("service-1")]);
    } catch {
      setErrorMessage("No pudimos crear la barberia.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6 sm:py-8 lg:px-12 lg:py-12">
        <div className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-4 shadow-2xl shadow-black/25 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-[color:var(--brand-gold)] sm:text-sm">
                BarberSync Owner
              </p>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">
                Crear barberia
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base sm:leading-7">
                Alta privada de barberias con su admin, primer barbero y
                servicios iniciales.
              </p>
            </div>
            <Link
              href="/owner"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-[color:var(--border-default)] px-4 py-2 text-sm font-bold text-white transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
            >
              Volver al owner
            </Link>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-start"
        >
          <section className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-4 shadow-xl shadow-black/20 sm:p-5">
            <p className="text-xs font-bold uppercase text-[color:var(--brand-gold)]">
              Datos de la barberia
            </p>
            <div className="mt-4 grid gap-3">
              <div>
                <label
                  htmlFor="barbershop-name"
                  className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                >
                  Nombre
                </label>
                <input
                  id="barbershop-name"
                  value={name}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    setName(nextName);
                    if (!slug.trim()) {
                      setSlug(buildSlug(nextName));
                    }
                    setErrorMessage("");
                  }}
                  className="mt-1 min-h-11 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                  placeholder="Gino Barber"
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="barbershop-slug"
                    className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                  >
                    Slug
                  </label>
                  <input
                    id="barbershop-slug"
                    value={slug}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setSlug(buildSlug(event.target.value));
                      setErrorMessage("");
                    }}
                    className="mt-1 min-h-11 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                    placeholder="gino-barber"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="admin-email"
                    className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                  >
                    Email admin
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    value={adminEmail}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setAdminEmail(event.target.value);
                      setErrorMessage("");
                    }}
                    className="mt-1 min-h-11 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                    placeholder="admin@barberia.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="barbershop-description"
                  className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                >
                  Descripcion
                </label>
                <textarea
                  id="barbershop-description"
                  value={description}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setErrorMessage("");
                  }}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 py-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                  placeholder="Descripcion breve de la barberia"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="barbershop-whatsapp"
                    className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                  >
                    WhatsApp
                  </label>
                  <input
                    id="barbershop-whatsapp"
                    value={whatsapp}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setWhatsapp(event.target.value);
                      setErrorMessage("");
                    }}
                    className="mt-1 min-h-11 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                    placeholder="+54..."
                  />
                </div>
                <div>
                  <label
                    htmlFor="barbershop-instagram"
                    className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                  >
                    Instagram
                  </label>
                  <input
                    id="barbershop-instagram"
                    value={instagram}
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setInstagram(event.target.value);
                      setErrorMessage("");
                    }}
                    className="mt-1 min-h-11 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4">
            <article className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-4 shadow-xl shadow-black/20 sm:p-5">
              <p className="text-xs font-bold uppercase text-[color:var(--brand-gold)]">
                Primer barbero
              </p>
              <div className="mt-4">
                <label
                  htmlFor="first-barber-name"
                  className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                >
                  Nombre
                </label>
                <input
                  id="first-barber-name"
                  value={firstBarberName}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setFirstBarberName(event.target.value);
                    setErrorMessage("");
                  }}
                  className="mt-1 min-h-11 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                  placeholder="Gino"
                  required
                />
              </div>
            </article>

            <article className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-4 shadow-xl shadow-black/20 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-[color:var(--brand-gold)]">
                    Servicios iniciales
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                    Precio y duracion del primer set.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddService}
                  className="inline-flex min-h-9 items-center justify-center rounded-md border border-[color:var(--border-default)] px-3 py-2 text-[11px] font-bold uppercase text-white transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
                >
                  Agregar
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {services.map((service, index) => (
                  <div
                    key={service.id}
                    className="rounded-md border border-[color:var(--border-default)] bg-black p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-bold uppercase text-[color:var(--text-subtle)]">
                        Servicio {index + 1}
                      </p>
                      <button
                        type="button"
                        disabled={services.length === 1}
                        onClick={() => handleRemoveService(service.id)}
                        className="text-[11px] font-bold uppercase text-[color:var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <input
                        value={service.name}
                        disabled={isSubmitting}
                        onChange={(event) =>
                          handleServiceChange(
                            service.id,
                            "name",
                            event.target.value,
                          )
                        }
                        className="min-h-10 rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                        placeholder="Corte"
                        required
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min="1"
                          value={service.price}
                          disabled={isSubmitting}
                          onChange={(event) =>
                            handleServiceChange(
                              service.id,
                              "price",
                              event.target.value,
                            )
                          }
                          className="min-h-10 rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                          placeholder="8500"
                          required
                        />
                        <input
                          type="number"
                          min="1"
                          value={service.durationMinutes}
                          disabled={isSubmitting}
                          onChange={(event) =>
                            handleServiceChange(
                              service.id,
                              "durationMinutes",
                              event.target.value,
                            )
                          }
                          className="min-h-10 rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                          placeholder="30"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            {errorMessage ? (
              <p
                role="alert"
                className="rounded-lg border border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--danger)]"
              >
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <div className="rounded-lg border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--success)]">
                <p>{successMessage}</p>
                {createdAdminEmail ? (
                  <p className="mt-2 text-xs font-medium text-[color:var(--success)]">
                    Admin asignado: {createdAdminEmail}
                  </p>
                ) : null}
                {temporaryPassword ? (
                  <div className="mt-3 rounded-md border border-[color:var(--success)]/40 bg-black/50 px-3 py-3 text-xs text-[color:var(--success)]">
                    <p className="font-bold uppercase text-[color:var(--success)]">
                      Usuario creado automaticamente
                    </p>
                    <p className="mt-2">
                      Contrasena temporal:{" "}
                      <span className="font-mono font-black">
                        {temporaryPassword}
                      </span>
                    </p>
                    <p className="mt-2 text-[11px] leading-5 text-[color:var(--success)]/90">
                      Comparti esta clave temporal con la barberia o reseteala
                      luego desde el panel owner si hace falta.
                    </p>
                  </div>
                ) : null}
                {createdSlug ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/${createdSlug}`}
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-[color:var(--success)]/40 px-3 py-2 text-[11px] font-bold uppercase text-[color:var(--success)]"
                    >
                      Ver pagina publica
                    </Link>
                    <Link
                      href={`/${createdSlug}/admin`}
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-[color:var(--success)]/40 px-3 py-2 text-[11px] font-bold uppercase text-[color:var(--success)]"
                    >
                      Abrir admin como owner
                    </Link>
                    <Link
                      href={`/login?next=/${createdSlug}/admin`}
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-[color:var(--success)]/40 px-3 py-2 text-[11px] font-bold uppercase text-[color:var(--success)]"
                    >
                      Login admin
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-[color:var(--brand-gold)] px-6 py-3 text-sm font-bold uppercase text-black transition hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creando..." : "Crear barberia"}
            </button>
          </section>
        </form>
      </section>
    </main>
  );
}
