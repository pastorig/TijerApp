"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { updateBarbershopSettings } from "@/lib/barbershops";

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
  const [startTime, setStartTime] = useState(barbershop.workingHours.start);
  const [endTime, setEndTime] = useState(barbershop.workingHours.end);
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState(
    String(barbershop.workingHours.intervalMinutes),
  );
  const [isActive, setIsActive] = useState(barbershop.isActive ?? true);
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
      const { data, error } = await updateBarbershopSettings({
        slug: barbershop.slug,
        values: {
          name: name.trim(),
          description: description.trim() || null,
          whatsapp: whatsapp.trim() || null,
          instagram: instagram.trim() || null,
          address: address.trim() || null,
          working_hours_start: startTime,
          working_hours_end: endTime,
          slot_interval_minutes: intervalValue,
          is_active: isActive,
        },
      });

      if (error || !data) {
        setErrorMessage("No pudimos guardar la configuracion.");
        return;
      }

      setName(data.name);
      setDescription(data.description);
      setWhatsapp(data.whatsapp);
      setInstagram(data.instagram);
      setAddress(data.address ?? "");
      setStartTime(data.workingHours.start);
      setEndTime(data.workingHours.end);
      setSlotIntervalMinutes(String(data.workingHours.intervalMinutes));
      setIsActive(data.isActive ?? true);
      setSuccessMessage("Configuracion guardada correctamente.");
    } catch {
      setErrorMessage("No pudimos guardar la configuracion.");
    } finally {
      setIsSaving(false);
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
