"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { getCurrentSession } from "@/lib/auth";

type AdminSettingsFormProps = {
  barbershop: DemoBarbershop;
};

function isValidTimeValue(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function AdminSettingsForm({ barbershop }: AdminSettingsFormProps) {
  const [name, setName] = useState(barbershop.name);
  const [description, setDescription] = useState(barbershop.description);
  const [whatsapp, setWhatsapp] = useState(barbershop.whatsapp);
  const [instagram, setInstagram] = useState(barbershop.instagram);
  const [address, setAddress] = useState(barbershop.address ?? "");
  const [googleReviewsUrl, setGoogleReviewsUrl] = useState(
    barbershop.googleReviewsUrl ?? "",
  );
  const [startTime, setStartTime] = useState(barbershop.workingHours.start);
  const [endTime, setEndTime] = useState(barbershop.workingHours.end);
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState(
    String(barbershop.workingHours.intervalMinutes),
  );
  const [isActive, setIsActive] = useState(barbershop.isActive ?? true);
  const [logoUrl, setLogoUrl] = useState<string | null>(
    barbershop.logoUrl ?? null,
  );
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const publicStatusText = useMemo(
    () =>
      isActive
        ? "La barberia esta visible para reservas publicas."
        : "La barberia quedara oculta en rutas publicas, pero seguira administrable.",
    [isActive],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const intervalValue = Number(slotIntervalMinutes);

    if (!name.trim()) {
      setErrorMessage("El nombre de la barberia es obligatorio.");
      return;
    }

    if (!isValidTimeValue(startTime) || !isValidTimeValue(endTime)) {
      setErrorMessage("Revisa el horario de apertura y cierre.");
      return;
    }

    if (startTime >= endTime) {
      setErrorMessage("El horario de cierre debe ser posterior al de apertura.");
      return;
    }

    if (!Number.isFinite(intervalValue) || intervalValue <= 0) {
      setErrorMessage("El intervalo de turnos debe ser mayor a cero.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setErrorMessage("Tu sesión expiró, volvé a iniciar sesión.");
        return;
      }

      const response = await fetch("/api/admin/barbershop-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          barbershopSlug: barbershop.slug,
          name: name.trim(),
          description: description.trim() || null,
          whatsapp: whatsapp.trim() || null,
          instagram: instagram.trim() || null,
          address: address.trim() || null,
          googleReviewsUrl: googleReviewsUrl.trim() || null,
          workingHoursStart: startTime,
          workingHoursEnd: endTime,
          slotIntervalMinutes: intervalValue,
          isActive,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorMessage(
          payload.error ?? "No pudimos guardar la configuración.",
        );
        return;
      }

      const payload = (await response.json()) as {
        barbershop: {
          name: string;
          description: string | null;
          whatsapp: string | null;
          instagram: string | null;
          address: string | null;
          google_reviews_url: string | null;
          working_hours_start: string;
          working_hours_end: string;
          slot_interval_minutes: number;
          is_active: boolean;
        };
      };
      const fresh = payload.barbershop;
      setName(fresh.name);
      setDescription(fresh.description ?? "");
      setWhatsapp(fresh.whatsapp ?? "");
      setInstagram(fresh.instagram ?? "");
      setAddress(fresh.address ?? "");
      setGoogleReviewsUrl(fresh.google_reviews_url ?? "");
      setStartTime(fresh.working_hours_start);
      setEndTime(fresh.working_hours_end);
      setSlotIntervalMinutes(String(fresh.slot_interval_minutes));
      setIsActive(fresh.is_active ?? true);
      setSuccessMessage("Configuración guardada correctamente.");
    } catch {
      setErrorMessage("No pudimos guardar la configuración.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setErrorMessage("");
    setSuccessMessage("");
    setIsUploadingLogo(true);

    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setErrorMessage("Tu sesión expiró, volvé a iniciar sesión.");
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("barbershopSlug", barbershop.slug);
      if (logoUrl) formData.append("previousLogoUrl", logoUrl);

      const response = await fetch("/api/admin/logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorMessage(payload.error ?? "No pudimos subir el logo.");
        return;
      }
      const payload = (await response.json()) as { logoUrl: string };
      setLogoUrl(payload.logoUrl);
      setSuccessMessage("Logo actualizado.");
    } catch {
      setErrorMessage("No pudimos subir el logo.");
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleRemoveLogo() {
    if (!logoUrl) return;
    const ok = window.confirm("¿Quitar el logo de tu barbería?");
    if (!ok) return;
    setErrorMessage("");
    setSuccessMessage("");
    setIsRemovingLogo(true);

    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setErrorMessage("Tu sesión expiró, volvé a iniciar sesión.");
        return;
      }
      const params = new URLSearchParams({
        barbershopSlug: barbershop.slug,
        currentLogoUrl: logoUrl,
      });
      const response = await fetch(`/api/admin/logo?${params.toString()}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorMessage(payload.error ?? "No pudimos quitar el logo.");
        return;
      }
      setLogoUrl(null);
      setSuccessMessage("Logo eliminado.");
    } catch {
      setErrorMessage("No pudimos quitar el logo.");
    } finally {
      setIsRemovingLogo(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto w-full max-w-5xl px-3 py-5 sm:px-6 sm:py-8 lg:px-12 lg:py-12">
        <div className="flex flex-col gap-4 border-b border-[color:var(--border-default)] pb-5 sm:pb-8">
          <p className="text-sm font-semibold uppercase text-[color:var(--brand-gold)]">
            BarberSync admin
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <h1 className="text-3xl font-black text-balance sm:text-5xl">
                Configuracion de {barbershop.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base sm:leading-7">
                Edita la identidad publica y los horarios base de la barberia.
              </p>
            </div>
            <Link
              href={`/${barbershop.slug}/admin`}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-[color:var(--border-default)] px-4 py-2 text-sm font-bold text-white transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] sm:min-h-11"
            >
              Volver al panel
            </Link>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-start"
        >
          <section className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-4 shadow-2xl shadow-black/20 sm:p-5">
            <p className="text-xs font-bold uppercase text-[color:var(--brand-gold)]">
              Identidad publica
            </p>

            <div className="mt-4 grid gap-3">
              {/* Logo */}
              <div>
                <p className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]">
                  Logo
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-4 rounded-md border border-[color:var(--border-default)] bg-black p-3">
                  <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[color:var(--border-default)] bg-[color:var(--surface-1)]">
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
                        alt={`Logo de ${barbershop.name}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="font-mono text-xs font-bold uppercase text-[color:var(--text-muted)]">
                        Sin logo
                      </span>
                    )}
                  </div>
                  <div className="grid flex-1 gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoChange}
                      disabled={isUploadingLogo || isRemovingLogo}
                      className="block w-full text-xs text-[color:var(--text-muted)] file:mr-3 file:rounded-md file:border file:border-[color:var(--brand-gold)]/40 file:bg-[color:var(--brand-gold-soft)] file:px-3 file:py-2 file:text-[10px] file:font-bold file:uppercase file:tracking-[0.14em] file:text-[color:var(--brand-gold)] hover:file:bg-[color:var(--brand-gold-soft)]/80 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <p className="text-[10px] text-[color:var(--text-subtle)]">
                      PNG, JPG, WebP o SVG. Máx 2MB. Se muestra circular
                      en la landing pública.
                    </p>
                    {logoUrl ? (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        disabled={isUploadingLogo || isRemovingLogo}
                        className="self-start text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--danger)] transition-colors duration-[var(--duration-fast)] hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isRemovingLogo ? "Quitando…" : "Quitar logo"}
                      </button>
                    ) : null}
                    {isUploadingLogo ? (
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--brand-gold)]">
                        Subiendo…
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="settings-name"
                  className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                >
                  Nombre
                </label>
                <input
                  id="settings-name"
                  value={name}
                  disabled={isSaving}
                  onChange={(event) => {
                    setName(event.target.value);
                    setErrorMessage("");
                  }}
                  className="mt-1 min-h-11 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="settings-description"
                  className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                >
                  Descripcion
                </label>
                <textarea
                  id="settings-description"
                  value={description}
                  disabled={isSaving}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setErrorMessage("");
                  }}
                  rows={4}
                  className="mt-1 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 py-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                  placeholder="Reserva tu turno online"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="settings-whatsapp"
                    className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                  >
                    WhatsApp
                  </label>
                  <input
                    id="settings-whatsapp"
                    value={whatsapp}
                    disabled={isSaving}
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
                    htmlFor="settings-instagram"
                    className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                  >
                    Instagram
                  </label>
                  <input
                    id="settings-instagram"
                    value={instagram}
                    disabled={isSaving}
                    onChange={(event) => {
                      setInstagram(event.target.value);
                      setErrorMessage("");
                    }}
                    className="mt-1 min-h-11 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="settings-address"
                  className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                >
                  Dirección — opcional
                </label>
                <input
                  id="settings-address"
                  value={address}
                  disabled={isSaving}
                  onChange={(event) => {
                    setAddress(event.target.value);
                    setErrorMessage("");
                  }}
                  className="mt-1 min-h-11 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                  placeholder="Calle 123, Barrio, Ciudad"
                />
                <p className="mt-1 text-[10px] text-[color:var(--text-subtle)]">
                  Se muestra en la landing pública si la cargás.
                </p>
              </div>

              <div>
                <label
                  htmlFor="settings-google-reviews"
                  className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                >
                  Link a reseñas de Google — opcional
                </label>
                <input
                  id="settings-google-reviews"
                  value={googleReviewsUrl}
                  disabled={isSaving}
                  onChange={(event) => {
                    setGoogleReviewsUrl(event.target.value);
                    setErrorMessage("");
                  }}
                  className="mt-1 min-h-11 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                  placeholder="https://g.page/r/.../review"
                />
                <p className="mt-1 text-[10px] text-[color:var(--text-subtle)]">
                  Si está seteado, después de una reseña de 4-5 estrellas
                  invitamos al cliente a dejarla también en Google.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4">
            <article className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-4 shadow-2xl shadow-black/20 sm:p-5">
              <p className="text-xs font-bold uppercase text-[color:var(--brand-gold)]">
                Horarios base
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="settings-start-time"
                    className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                  >
                    Apertura
                  </label>
                  <input
                    id="settings-start-time"
                    type="time"
                    value={startTime}
                    disabled={isSaving}
                    onChange={(event) => {
                      setStartTime(event.target.value);
                      setErrorMessage("");
                    }}
                    className="mt-1 min-h-11 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="settings-end-time"
                    className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                  >
                    Cierre
                  </label>
                  <input
                    id="settings-end-time"
                    type="time"
                    value={endTime}
                    disabled={isSaving}
                    onChange={(event) => {
                      setEndTime(event.target.value);
                      setErrorMessage("");
                    }}
                    className="mt-1 min-h-11 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="settings-slot-interval"
                    className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                  >
                    Intervalo
                  </label>
                  <input
                    id="settings-slot-interval"
                    type="number"
                    min="5"
                    value={slotIntervalMinutes}
                    disabled={isSaving}
                    onChange={(event) => {
                      setSlotIntervalMinutes(event.target.value);
                      setErrorMessage("");
                    }}
                    className="mt-1 min-h-11 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                    required
                  />
                </div>
              </div>
            </article>

            <article className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-4 shadow-2xl shadow-black/20 sm:p-5">
              <p className="text-xs font-bold uppercase text-[color:var(--brand-gold)]">
                Estado
              </p>

              <label className="mt-4 flex items-start gap-3 rounded-md border border-[color:var(--border-default)] bg-black px-4 py-3">
                <input
                  type="checkbox"
                  checked={isActive}
                  disabled={isSaving}
                  onChange={(event) => {
                    setIsActive(event.target.checked);
                    setErrorMessage("");
                  }}
                  className="mt-1 size-4 accent-[color:var(--brand-gold)]"
                />
                <div>
                  <p className="text-sm font-bold text-white">
                    Barberia activa
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
                    {publicStatusText}
                  </p>
                </div>
              </label>
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
              <p className="rounded-lg border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--success)]">
                {successMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-[color:var(--brand-gold)] px-6 py-3 text-sm font-bold uppercase text-black transition hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </section>
        </form>
      </section>
    </main>
  );
}
