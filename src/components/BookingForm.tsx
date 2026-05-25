"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { createPendingAppointment } from "@/lib/appointments";
import { formatDateForDisplay, formatPrice } from "@/lib/format";
import { createWhatsAppBookingLink } from "@/lib/whatsapp";

type BookingFormProps = {
  barbershop: DemoBarbershop;
};

function getTodayInputValue() {
  return new Date().toISOString().split("T")[0];
}

function buildTimeSlots(start: string, end: string, intervalMinutes: number) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const slots: string[] = [];
  const current = new Date(2026, 0, 1, startHour, startMinute);
  const limit = new Date(2026, 0, 1, endHour, endMinute);

  while (current < limit) {
    slots.push(
      current.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    );
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }

  return slots;
}

export function BookingForm({ barbershop }: BookingFormProps) {
  const [selectedServiceId, setSelectedServiceId] = useState(
    barbershop.services[0]?.id ?? "",
  );
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue());
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const timeSlots = useMemo(
    () =>
      buildTimeSlots(
        barbershop.workingHours.start,
        barbershop.workingHours.end,
        barbershop.workingHours.intervalMinutes,
      ),
    [barbershop.workingHours],
  );

  const selectedService = barbershop.services.find(
    (service) => service.id === selectedServiceId,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !selectedService ||
      !selectedDate ||
      !selectedTime ||
      !clientName.trim() ||
      !clientPhone.trim()
    ) {
      setFormError("Completá servicio, fecha, horario, nombre y teléfono.");
      return;
    }

    setFormError("");
    setIsSaving(true);

    const appointment = {
      barbershop_slug: barbershop.slug,
      customer_name: clientName.trim(),
      customer_phone: clientPhone.trim(),
      service_name: selectedService.name,
      service_price: selectedService.price,
      service_duration_minutes: selectedService.durationMinutes,
      appointment_date: selectedDate,
      appointment_time: selectedTime,
      comment: comment.trim(),
    };

    try {
      const { error } = await createPendingAppointment(appointment);

      if (error) {
        setFormError(
          "No pudimos guardar la reserva. Revisá los datos e intentá nuevamente.",
        );
        return;
      }
    } catch {
      setFormError(
        "No pudimos guardar la reserva. Revisá los datos e intentá nuevamente.",
      );
      return;
    } finally {
      setIsSaving(false);
    }

    const whatsappLink = createWhatsAppBookingLink({
      barbershopName: barbershop.name,
      barbershopWhatsapp: barbershop.whatsapp,
      clientName: appointment.customer_name,
      clientPhone: appointment.customer_phone,
      serviceName: selectedService.name,
      date: formatDateForDisplay(selectedDate),
      time: selectedTime,
      comment,
    });

    window.open(whatsappLink, "_blank", "noopener,noreferrer");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start"
    >
      <section className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase text-amber-300">
            Reserva online
          </p>
          <h1 className="mt-3 text-4xl font-black text-balance text-stone-50 sm:text-6xl">
            {barbershop.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-300">
            Elegi el servicio, la fecha y el horario. Guardamos tu reserva y
            despues abrimos WhatsApp con el mensaje listo.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="service"
              className="text-sm font-bold uppercase text-stone-300"
            >
              Servicio
            </label>
            <select
              id="service"
              value={selectedServiceId}
              disabled={isSaving}
              onChange={(event) => {
                setSelectedServiceId(event.target.value);
                setFormError("");
              }}
              className="mt-2 min-h-12 w-full rounded-md border border-stone-700 bg-stone-900 px-4 text-base text-stone-50 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
              required
            >
              {barbershop.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {formatPrice(service.price)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="date"
                className="text-sm font-bold uppercase text-stone-300"
              >
                Fecha
              </label>
              <input
                id="date"
                type="date"
                value={selectedDate}
                disabled={isSaving}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setFormError("");
                }}
                className="mt-2 min-h-12 w-full rounded-md border border-stone-700 bg-stone-900 px-4 text-base text-stone-50 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                required
              />
            </div>

            <div>
              <label
                htmlFor="time"
                className="text-sm font-bold uppercase text-stone-300"
              >
                Horario
              </label>
              <select
                id="time"
                value={selectedTime}
                disabled={isSaving}
                onChange={(event) => {
                  setSelectedTime(event.target.value);
                  setFormError("");
                }}
                className="mt-2 min-h-12 w-full rounded-md border border-stone-700 bg-stone-900 px-4 text-base text-stone-50 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                required
              >
                <option value="">Seleccioná un horario</option>
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="clientName"
                className="text-sm font-bold uppercase text-stone-300"
              >
                Nombre
              </label>
              <input
                id="clientName"
                type="text"
                value={clientName}
                disabled={isSaving}
                onChange={(event) => {
                  setClientName(event.target.value);
                  setFormError("");
                }}
                placeholder="Tu nombre"
                className="mt-2 min-h-12 w-full rounded-md border border-stone-700 bg-stone-900 px-4 text-base text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                required
              />
            </div>

            <div>
              <label
                htmlFor="clientPhone"
                className="text-sm font-bold uppercase text-stone-300"
              >
                Teléfono
              </label>
              <input
                id="clientPhone"
                type="tel"
                value={clientPhone}
                disabled={isSaving}
                onChange={(event) => {
                  setClientPhone(event.target.value);
                  setFormError("");
                }}
                placeholder="Tu teléfono"
                className="mt-2 min-h-12 w-full rounded-md border border-stone-700 bg-stone-900 px-4 text-base text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="comment"
              className="text-sm font-bold uppercase text-stone-300"
            >
              Comentario opcional
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(event) => {
                setComment(event.target.value);
                setFormError("");
              }}
              disabled={isSaving}
              placeholder="Detalle o preferencia para el turno"
              rows={4}
              className="mt-2 w-full rounded-md border border-stone-700 bg-stone-900 px-4 py-3 text-base text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
            />
          </div>
        </div>
      </section>

      <aside className="border border-stone-800 bg-stone-900/70 p-6 shadow-2xl shadow-black/30">
        <p className="text-xs font-bold uppercase text-amber-300">Resumen</p>
        <h2 className="mt-2 text-2xl font-black text-stone-100">
          Tu turno seleccionado
        </h2>

        <dl className="mt-6 space-y-4 text-sm">
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-4">
            <dt className="text-stone-400">Servicio</dt>
            <dd className="text-right font-semibold text-stone-100">
              {selectedService?.name ?? "Sin seleccionar"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-4">
            <dt className="text-stone-400">Precio</dt>
            <dd className="font-mono font-bold text-amber-300">
              {selectedService ? formatPrice(selectedService.price) : "-"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-4">
            <dt className="text-stone-400">Duración</dt>
            <dd className="font-semibold text-stone-100">
              {selectedService
                ? `${selectedService.durationMinutes} minutos`
                : "-"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-4">
            <dt className="text-stone-400">Fecha</dt>
            <dd className="font-semibold text-stone-100">
              {selectedDate || "Sin seleccionar"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-4">
            <dt className="text-stone-400">Horario</dt>
            <dd className="font-semibold text-stone-100">
              {selectedTime || "Sin seleccionar"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-4">
            <dt className="text-stone-400">Cliente</dt>
            <dd className="text-right font-semibold text-stone-100">
              {clientName || "Sin completar"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-4">
            <dt className="text-stone-400">Teléfono</dt>
            <dd className="text-right font-semibold text-stone-100">
              {clientPhone || "Sin completar"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-stone-400">Comentario</dt>
            <dd className="max-w-48 text-right font-semibold text-stone-100">
              {comment || "Sin comentario"}
            </dd>
          </div>
        </dl>

        {formError ? (
          <p
            role="alert"
            className="mt-6 rounded-md border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200"
          >
            {formError}
          </p>
        ) : null}

        <p className="mt-6 text-sm leading-6 text-stone-400">
          Al reservar, se guarda el turno y se abre WhatsApp para confirmar el
          mensaje.
        </p>

        <button
          type="submit"
          disabled={isSaving}
          className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-amber-300 px-6 py-3 text-sm font-bold uppercase text-stone-950 transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-stone-950 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-amber-300"
        >
          {isSaving ? "Guardando..." : "Reservar turno"}
        </button>
      </aside>
    </form>
  );
}
