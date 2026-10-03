"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarCheck,
  Clock,
  MessageSquare,
  Store,
  type LucideIcon,
} from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { useConfirm, useToast } from "@/components/ui";
import { PushNotificationsCard } from "@/components/push/PushNotificationsCard";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";

type AdminSettingsFormProps = {
  barbershop: DemoBarbershop;
};

function isValidTimeValue(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

/** Clases compartidas de los campos (menos verborragia en el JSX). */
const FIELD_CLASS =
  "mt-1 min-h-11 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]";
const LABEL_CLASS =
  "text-[11px] font-bold uppercase text-[color:var(--text-muted)]";
const HELP_CLASS = "mt-1 text-[10px] leading-4 text-[color:var(--text-subtle)]";

/** Secciones del panel master-detail. */
type SectionKey =
  | "identidad"
  | "horarios"
  | "reservas"
  | "mensajes"
  | "notificaciones";

const SECTIONS: {
  key: SectionKey;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  { key: "identidad", label: "Identidad", hint: "Logo, nombre y contacto", icon: Store },
  { key: "horarios", label: "Horarios", hint: "Apertura y anticipación", icon: Clock },
  { key: "reservas", label: "Reservas", hint: "Confirmación y lista de espera", icon: CalendarCheck },
  { key: "mensajes", label: "Mensajes", hint: "WhatsApp al cliente", icon: MessageSquare },
  { key: "notificaciones", label: "Notificaciones", hint: "Avisos push al equipo", icon: Bell },
];

/** Encabezado de una sección dentro del panel (ícono en pastilla + título). */
function SectionHeading({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[color:var(--border-subtle)] pb-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]">
        <Icon aria-hidden="true" className="size-4.5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-black uppercase tracking-tight text-white">
          {title}
        </h2>
        <p className="truncate text-[11px] leading-tight text-[color:var(--text-muted)]">
          {hint}
        </p>
      </div>
    </div>
  );
}

/**
 * Fila de toggle con switch tipo pill. Reemplaza los checkboxes crudos para
 * que la sección de config se vea más prolija y menos vertical (se acomodan
 * en grilla 2×2).
 */
function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-full flex-col gap-2 rounded-lg border bg-black p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
        checked
          ? "border-[color:var(--brand-gold)]/50"
          : "border-[color:var(--border-default)] hover:border-[color:var(--brand-gold)]/40"
      }`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-white">{label}</span>
        <span
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
            checked ? "bg-gold-grad" : "bg-[color:var(--border-default)]"
          }`}
        >
          <span
            className={`inline-block size-4 rounded-full bg-white shadow transition-transform duration-[var(--duration-fast)] ${
              checked ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </span>
      </span>
      <span className="text-xs leading-5 text-[color:var(--text-muted)]">
        {description}
      </span>
    </button>
  );
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
  const [requireClientEmail, setRequireClientEmail] = useState(
    barbershop.requireClientEmail ?? false,
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
  const [activeSection, setActiveSection] = useState<SectionKey>("identidad");

  const publicStatusText = useMemo(
    () =>
      isActive
        ? "La barbería está visible para reservas públicas."
        : "La barbería quedará oculta en rutas públicas, pero seguirá administrable.",
    [isActive],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // El intervalo ya no se edita en la UI (la grilla sigue la duración del
    // servicio de cada barbero). Se sigue enviando para preservar el valor
    // guardado; si faltara, el backend lo defaultea a 30.
    const intervalValue = Number(slotIntervalMinutes);

    // Como solo se ve una sección por vez, ante un error de validación
    // saltamos a la sección que lo contiene para que no quede oculto.
    if (!name.trim()) {
      setActiveSection("identidad");
      setErrorMessage("El nombre de la barbería es obligatorio.");
      return;
    }

    if (!isValidTimeValue(startTime) || !isValidTimeValue(endTime)) {
      setActiveSection("horarios");
      setErrorMessage("Revisá el horario de apertura y cierre.");
      return;
    }

    if (startTime >= endTime) {
      setActiveSection("horarios");
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
          requireClientEmail,
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
          require_client_email: boolean;
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
      setRequireClientEmail(fresh.require_client_email ?? false);
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
      message:
        "El logo deja de aparecer en la landing pública. Podés subir uno nuevo cuando quieras.",
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

  const defaultWaTemplate =
    "Hola {nombre}! Te escribo de {barberia} 👋 Es por tu turno del {fecha} a las {hora}hs.";
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://tijerapp.com"
  ).replace(/\/$/, "");

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        {/* ── Header compacto ── */}
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)]">
              Ajustes
            </p>
            <h1 className="mt-1 truncate text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
              Configuración
            </h1>
            <p className="mt-1 text-xs leading-5 text-[color:var(--text-secondary)] sm:text-sm">
              {barbershop.name} · identidad, horarios y reservas.
            </p>
          </div>
          <Link
            href={`/${barbershop.slug}/admin`}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-[color:var(--border-default)] px-3 py-2 text-xs font-bold text-white transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">Volver al panel</span>
          </Link>
        </header>

        {/* ── Chips de sección (mobile): tira horizontal sticky ── */}
        <div className="sticky top-0 z-20 -mx-4 mt-4 border-b border-[color:var(--border-subtle)] bg-black/95 px-4 py-2.5 backdrop-blur-sm lg:hidden">
          <div className="flex gap-2 touch-pan-x snap-x scroll-smooth overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECTIONS.map((s) => {
              const on = s.key === activeSection;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActiveSection(s.key)}
                  className={cn(
                    "inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition",
                    on
                      ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]"
                      : "border-[color:var(--border-default)] text-[color:var(--text-secondary)]",
                  )}
                >
                  <s.icon aria-hidden="true" className="size-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 lg:mt-6">
          <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-6 lg:items-start">
            {/* ── Rail (desktop) ── */}
            <nav className="hidden lg:block">
              <div className="sticky top-6 flex flex-col gap-1">
                {SECTIONS.map((s) => {
                  const on = s.key === activeSection;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setActiveSection(s.key)}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                        on
                          ? "border-[color:var(--brand-gold)]/50 bg-[color:var(--brand-gold-soft)]"
                          : "border-transparent hover:border-[color:var(--border-default)] hover:bg-[color:var(--surface-1)]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-md border transition",
                          on
                            ? "border-[color:var(--brand-gold)]/40 bg-black text-[color:var(--brand-gold)]"
                            : "border-[color:var(--border-default)] bg-black text-[color:var(--text-muted)] group-hover:text-white",
                        )}
                      >
                        <s.icon aria-hidden="true" className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block truncate text-sm font-bold",
                            on ? "text-white" : "text-[color:var(--text-secondary)]",
                          )}
                        >
                          {s.label}
                        </span>
                        <span className="block truncate text-[10px] leading-tight text-[color:var(--text-muted)]">
                          {s.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* ── Panel: sección activa ── */}
            <div className="min-w-0">
              {activeSection === "notificaciones" ? (
                <PushNotificationsCard barbershopSlug={barbershop.slug} />
              ) : (
                <div className="card-premium p-4 sm:p-5">
                  {/* IDENTIDAD */}
                  {activeSection === "identidad" && (
                    <div className="grid gap-4">
                      <SectionHeading
                        icon={Store}
                        title="Identidad pública"
                        hint="Lo que ve el cliente en tu landing"
                      />

                      {/* Logo */}
                      <div>
                        <p className={LABEL_CLASS}>Logo</p>
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
                        <label htmlFor="settings-name" className={LABEL_CLASS}>
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
                          className={FIELD_CLASS}
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="settings-description"
                          className={LABEL_CLASS}
                        >
                          Descripción
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
                            className={LABEL_CLASS}
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
                            className={FIELD_CLASS}
                            placeholder="+54..."
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="settings-instagram"
                            className={LABEL_CLASS}
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
                            className={FIELD_CLASS}
                            placeholder="https://instagram.com/..."
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="settings-address" className={LABEL_CLASS}>
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
                          className={FIELD_CLASS}
                          placeholder="Calle 123, Barrio, Ciudad"
                        />
                        <p className={HELP_CLASS}>
                          Se muestra en la landing pública si la cargás.
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="settings-google-reviews"
                          className={LABEL_CLASS}
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
                          className={FIELD_CLASS}
                          placeholder="https://g.page/r/.../review"
                        />
                        <p className={HELP_CLASS}>
                          Si está seteado, después de una reseña de 4-5 estrellas
                          invitamos al cliente a dejarla también en Google.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* HORARIOS */}
                  {activeSection === "horarios" && (
                    <div className="grid gap-4">
                      <SectionHeading
                        icon={Clock}
                        title="Horarios base"
                        hint="Apertura, cierre y anticipación mínima"
                      />

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="settings-start-time"
                            className={LABEL_CLASS}
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
                            className={FIELD_CLASS}
                            required
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="settings-end-time"
                            className={LABEL_CLASS}
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
                            className={FIELD_CLASS}
                            required
                          />
                        </div>
                      </div>

                      {/* Anticipación mínima para reservar */}
                      <div>
                        <label
                          htmlFor="settings-min-notice"
                          className={LABEL_CLASS}
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
                          className={FIELD_CLASS}
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
                          Con cuánto tiempo mínimo pueden reservarte. Ej: &quot;1
                          hora antes&quot; → a las 15:20 ya no pueden tomar el turno
                          de las 16:00 (el más cercano pasa a ser el siguiente
                          disponible). Solo afecta los turnos de hoy.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* RESERVAS */}
                  {activeSection === "reservas" && (
                    <div className="grid gap-4">
                      <SectionHeading
                        icon={CalendarCheck}
                        title="Reservas y operación"
                        hint="Visibilidad, confirmación y lista de espera"
                      />

                      <div className="grid gap-3 sm:grid-cols-2">
                        <ToggleRow
                          label="Barbería activa"
                          description={publicStatusText}
                          checked={isActive}
                          disabled={isSaving}
                          onChange={(value) => {
                            setIsActive(value);
                            setErrorMessage("");
                          }}
                        />
                        <ToggleRow
                          label="Auto-confirmar reservas"
                          description={
                            autoConfirmAppointments
                              ? "Las reservas entrantes se marcan como confirmadas automáticamente. No tenés que confirmar a mano desde el panel."
                              : "Las reservas entran como pendientes y tenés que confirmarlas a mano. Activá esto si confiás en el flujo (pocos no-shows)."
                          }
                          checked={autoConfirmAppointments}
                          disabled={isSaving}
                          onChange={(value) => {
                            setAutoConfirmAppointments(value);
                            setErrorMessage("");
                          }}
                        />
                        <ToggleRow
                          label="Lista de espera"
                          description={
                            waitlistEnabled
                              ? "Cuando no hay turnos para una fecha, el cliente puede anotarse y le avisás si se libera un lugar."
                              : "Desactivada. Si no hay turnos, el cliente solo ve un aviso de que no hay disponibilidad (sin anotarse)."
                          }
                          checked={waitlistEnabled}
                          disabled={isSaving}
                          onChange={(value) => {
                            setWaitlistEnabled(value);
                            setErrorMessage("");
                          }}
                        />
                        <ToggleRow
                          label="Pedir email obligatorio"
                          description={
                            requireClientEmail
                              ? "El cliente no puede reservar sin dejar su email. Asegura que le lleguen la confirmación y los recordatorios."
                              : "El email es opcional al reservar. Algunos clientes podrían no recibir recordatorios por mail."
                          }
                          checked={requireClientEmail}
                          disabled={isSaving}
                          onChange={(value) => {
                            setRequireClientEmail(value);
                            setErrorMessage("");
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* MENSAJES */}
                  {activeSection === "mensajes" && (
                    <div className="grid gap-3">
                      <SectionHeading
                        icon={MessageSquare}
                        title="Mensaje de WhatsApp"
                        hint="El texto que se carga al escribirle a un cliente"
                      />
                      <p className="text-xs leading-5 text-[color:var(--text-muted)]">
                        Se usa solo cuando le escribís a un cliente por su turno
                        (desde &quot;Próximo turno&quot; o el turnero). Dejalo vacío
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
                        placeholder={defaultWaTemplate}
                        className="w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 py-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                      />

                      <div className="flex flex-wrap gap-1.5">
                        {["{nombre}", "{barberia}", "{fecha}", "{hora}"].map(
                          (ph) => (
                            <button
                              key={ph}
                              type="button"
                              disabled={isSaving}
                              onClick={() =>
                                setWhatsappMessageTemplate(
                                  (prev) =>
                                    `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${ph}`,
                                )
                              }
                              className="rounded-full border border-[color:var(--border-default)] bg-black px-2.5 py-1 font-mono text-[10px] text-[color:var(--brand-gold)] transition hover:border-[color:var(--brand-gold)] disabled:opacity-50"
                            >
                              {ph}
                            </button>
                          ),
                        )}
                      </div>
                      <p className="text-[10px] leading-4 text-[color:var(--text-subtle)]">
                        Tocá un dato para insertarlo. El link para
                        confirmar/cancelar el turno se agrega siempre
                        automáticamente al final.
                      </p>

                      {/* Preview en vivo */}
                      <div className="rounded-md border border-[color:var(--border-subtle)] bg-black p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                          Vista previa
                        </p>
                        <p className="mt-1.5 whitespace-pre-line text-xs leading-5 text-[color:var(--text-secondary)]">
                          {(whatsappMessageTemplate.trim() || defaultWaTemplate)
                            .replaceAll("{nombre}", "Juan")
                            .replaceAll("{barberia}", name || barbershop.name)
                            .replaceAll("{fecha}", "jueves 18/06")
                            .replaceAll("{hora}", "17:30")}
                          {"\n\nPodés confirmar o cancelar tu turno desde este link:\n"}
                          <span className="text-[color:var(--brand-gold)]">
                            {`${siteUrl}/r/…`}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Barra de guardar sticky ── (no aplica en Notificaciones) */}
          {activeSection !== "notificaciones" && (
            <div className="sticky bottom-0 z-20 -mx-4 mt-4 flex flex-col gap-2 border-t border-[color:var(--border-default)] bg-black/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-b-xl">
            <div className="min-w-0">
              {errorMessage ? (
                <p
                  role="alert"
                  className="truncate text-sm font-semibold text-[color:var(--danger)]"
                >
                  {errorMessage}
                </p>
              ) : successMessage ? (
                <p className="truncate text-sm font-semibold text-[color:var(--success)]">
                  {successMessage}
                </p>
              ) : (
                <p className="hidden text-xs text-[color:var(--text-muted)] sm:block">
                  Los cambios aplican a todas las secciones.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-gold-grad px-6 text-sm font-bold uppercase text-black transition hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
