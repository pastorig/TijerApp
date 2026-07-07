"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { useConfirm, useToast } from "@/components/ui";
import { PushNotificationsCard } from "@/components/push/PushNotificationsCard";
import { getCurrentSession } from "@/lib/auth";

type AdminSettingsFormProps = {
  barbershop: DemoBarbershop;
};

function isValidTimeValue(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function AdminSettingsForm({ barbershop }: AdminSettingsFormProps) {
  const confirm = useConfirm();
  const toast = useToast();
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
  const [autoConfirmAppointments, setAutoConfirmAppointments] = useState(
    barbershop.autoConfirmAppointments ?? false,
  );
  const [waitlistEnabled, setWaitlistEnabled] = useState(
    barbershop.waitlistEnabled ?? true,
  );
  const [whatsappMessageTemplate, setWhatsappMessageTemplate] = useState(
    barbershop.whatsappMessageTemplate ?? "",
  );
  const [minBookingNoticeMinutes, setMinBookingNoticeMinutes] = useState(
    barbershop.minBookingNoticeMinutes ?? 0,
  );
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

    // El intervalo ya no se edita en la UI (la grilla sigue la duración del
    // servicio de cada barbero). Se sigue enviando para preservar el valor
    // guardado; si faltara, el backend lo defaultea a 30.
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
          autoConfirmAppointments,
          waitlistEnabled,
          minBookingNoticeMinutes,
          whatsappMessageTemplate: whatsappMessageTemplate.trim() || null,
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
          auto_confirm_appointments: boolean;
          waitlist_enabled: boolean;
          min_booking_notice_minutes: number;
          whatsapp_message_template: string | null;
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
      setAutoConfirmAppointments(fresh.auto_confirm_appointments ?? false);
      setWaitlistEnabled(fresh.waitlist_enabled ?? true);
      setMinBookingNoticeMinutes(fresh.min_booking_notice_minutes ?? 0);
      setWhatsappMessageTemplate(fresh.whatsapp_message_template ?? "");
      setSuccessMessage("Configuración guardada correctamente.");
      toast.success("Configuración guardada");
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
      toast.success("Logo actualizado");
    } catch {
      setErrorMessage("No pudimos subir el logo.");
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleRemoveLogo() {
    if (!logoUrl) return;
    const ok = await confirm({
      title: "Quitar logo",
      message: "El logo deja de aparecer en la landing pública. Podés subir uno nuevo cuando quieras.",
      confirmLabel: "Quitar",
      cancelLabel: "Volver",
      danger: true,
    });
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
      toast.success("Logo eliminado");
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
            TijerApp admin
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

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
              </div>

              {/* Anticipación mínima para reservar */}
              <div className="mt-4">
                <label
                  htmlFor="settings-min-notice"
                  className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                >
                  Anticipación mínima para reservar
                </label>
                <select
                  id="settings-min-notice"
                  value={minBookingNoticeMinutes}
                  disabled={isSaving}
                  onChange={(event) => {
                    setMinBookingNoticeMinutes(Number(event.target.value));
                    setErrorMessage("");
                  }}
                  className="mt-1 min-h-11 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                >
                  <option value={0}>Sin restricción</option>
                  <option value={30}>30 minutos antes</option>
                  <option value={60}>1 hora antes</option>
                  <option value={90}>1 hora y media antes</option>
                  <option value={120}>2 horas antes</option>
                  <option value={180}>3 horas antes</option>
                  <option value={1440}>1 día antes</option>
                </select>
                <p className="mt-1 text-[10px] leading-4 text-[color:var(--text-subtle)]">
                  Con cuánto tiempo mínimo pueden reservarte. Ej: &quot;1 hora
                  antes&quot; → a las 15:20 ya no pueden tomar el turno de las
                  16:00 (el más cercano pasa a ser el siguiente disponible).
                  Solo afecta los turnos de hoy.
                </p>
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

              <label className="mt-3 flex items-start gap-3 rounded-md border border-[color:var(--border-default)] bg-black px-4 py-3">
                <input
                  type="checkbox"
                  checked={autoConfirmAppointments}
                  disabled={isSaving}
                  onChange={(event) => {
                    setAutoConfirmAppointments(event.target.checked);
                    setErrorMessage("");
                  }}
                  className="mt-1 size-4 accent-[color:var(--brand-gold)]"
                />
                <div>
                  <p className="text-sm font-bold text-white">
                    Auto-confirmar reservas
                    {autoConfirmAppointments ? (
                      <span className="ml-2 inline-flex items-center rounded-full border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--success)]">
                        Activado
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
                    {autoConfirmAppointments
                      ? "Las reservas entrantes se marcan como confirmadas automáticamente. No vas a tener que confirmar a mano desde el panel."
                      : "Las reservas entran como pendientes y tenés que confirmarlas a mano. Activá esto si confías en el flujo (pocos no-shows, clientela conocida)."}
                  </p>
                </div>
              </label>

              <label className="mt-3 flex items-start gap-3 rounded-md border border-[color:var(--border-default)] bg-black px-4 py-3">
                <input
                  type="checkbox"
                  checked={waitlistEnabled}
                  disabled={isSaving}
                  onChange={(event) => {
                    setWaitlistEnabled(event.target.checked);
                    setErrorMessage("");
                  }}
                  className="mt-1 size-4 accent-[color:var(--brand-gold)]"
                />
                <div>
                  <p className="text-sm font-bold text-white">
                    Lista de espera
                    {waitlistEnabled ? (
                      <span className="ml-2 inline-flex items-center rounded-full border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--success)]">
                        Activada
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
                    {waitlistEnabled
                      ? "Cuando no hay turnos para una fecha, el cliente puede anotarse en lista de espera y le avisás si se libera un lugar."
                      : "Desactivada. Si no hay turnos, el cliente solo ve un aviso de que no hay disponibilidad (sin opción de anotarse). Útil si la lista de espera te trae confusión con los clientes."}
                  </p>
                </div>
              </label>
            </article>

            <article className="rounded-lg border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-4 shadow-2xl shadow-black/20 sm:p-5">
              <p className="text-xs font-bold uppercase text-[color:var(--brand-gold)]">
                Mensaje de WhatsApp al cliente
              </p>
              <p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">
                El texto que se carga solo cuando le escribís a un cliente por su
                turno (desde &quot;Próximo turno&quot; o el turnero). Dejalo vacío
                para usar el mensaje por defecto.
              </p>

              <textarea
                id="settings-wa-template"
                value={whatsappMessageTemplate}
                disabled={isSaving}
                onChange={(event) => {
                  setWhatsappMessageTemplate(event.target.value);
                  setErrorMessage("");
                }}
                rows={3}
                placeholder="Hola {nombre}! Te escribo de {barberia} 👋 Es por tu turno del {fecha} a las {hora}hs."
                className="mt-3 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 py-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
              />

              <div className="mt-2 flex flex-wrap gap-1.5">
                {["{nombre}", "{barberia}", "{fecha}", "{hora}"].map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    disabled={isSaving}
                    onClick={() =>
                      setWhatsappMessageTemplate(
                        (prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${ph}`,
                      )
                    }
                    className="rounded-full border border-[color:var(--border-default)] bg-black px-2.5 py-1 font-mono text-[10px] text-[color:var(--brand-gold)] transition hover:border-[color:var(--brand-gold)] disabled:opacity-50"
                  >
                    {ph}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-4 text-[color:var(--text-subtle)]">
                Tocá un dato para insertarlo. El link para confirmar/cancelar el
                turno se agrega siempre automáticamente al final.
              </p>

              {/* Preview en vivo */}
              <div className="mt-3 rounded-md border border-[color:var(--border-subtle)] bg-black p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  Vista previa
                </p>
                <p className="mt-1.5 whitespace-pre-line text-xs leading-5 text-[color:var(--text-secondary)]">
                  {(whatsappMessageTemplate.trim() ||
                    "Hola {nombre}! Te escribo de {barberia} 👋 Es por tu turno del {fecha} a las {hora}hs.")
                    .replaceAll("{nombre}", "Juan")
                    .replaceAll("{barberia}", name || barbershop.name)
                    .replaceAll("{fecha}", "jueves 18/06")
                    .replaceAll("{hora}", "17:30")}
                  {"\n\nPodés confirmar o cancelar tu turno desde este link:\n"}
                  <span className="text-[color:var(--brand-gold)]">
                    {`${(process.env.NEXT_PUBLIC_SITE_URL || "https://tijerapp.vercel.app").replace(/\/$/, "")}/r/…`}
                  </span>
                </p>
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

        {/* Push notifications — independiente del form principal */}
        <section className="mt-8">
          <PushNotificationsCard barbershopSlug={barbershop.slug} />
        </section>
      </section>
    </main>
  );
}
