"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  type Barber,
  getActiveBarbers,
  getBarberDisplayName,
  type DemoBarbershop,
} from "@/data/demo-barbershops";
import {
  createPendingAppointment,
  listOccupiedAppointmentTimes,
  validateAppointmentTimeIsAvailable,
} from "@/lib/appointments";
import { listActiveServicesByBarber } from "@/lib/barber-services";
import { listActiveBarbersByBarbershop } from "@/lib/barbers";
import {
  formatDateForDisplay,
  formatPrice,
  getLocalDateInputValue,
} from "@/lib/format";
import type { BarberRow, BarberServiceRow } from "@/lib/supabase";
import { createWhatsAppBookingLink } from "@/lib/whatsapp";

type BookingFormProps = {
  barbershop: DemoBarbershop;
};

type BookingBarber = Barber;
type BookingService = BookingBarber["services"][number];

function getTodayInputValue() {
  return getLocalDateInputValue();
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
  const demoActiveBarbers = useMemo(
    () => getActiveBarbers(barbershop),
    [barbershop],
  );
  const fallbackServices = useMemo(
    () => demoActiveBarbers[0]?.services ?? [],
    [demoActiveBarbers],
  );
  const initialBarber = demoActiveBarbers[0];
  const [activeBarbers, setActiveBarbers] =
    useState<BookingBarber[]>(demoActiveBarbers);
  const [isLoadingBarbers, setIsLoadingBarbers] = useState(true);
  const [selectedBarberId, setSelectedBarberId] = useState(
    initialBarber?.id ?? "",
  );
  const [selectedServiceId, setSelectedServiceId] = useState(
    initialBarber?.services[0]?.id ?? "",
  );
  const [selectedBarberServices, setSelectedBarberServices] = useState<
    BookingService[]
  >(initialBarber?.services ?? []);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue());
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [occupiedTimes, setOccupiedTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);

  const timeSlots = useMemo(
    () =>
      buildTimeSlots(
        barbershop.workingHours.start,
        barbershop.workingHours.end,
        barbershop.workingHours.intervalMinutes,
      ),
    [barbershop.workingHours],
  );

  const selectedBarber = activeBarbers.find(
    (barber) => barber.id === selectedBarberId,
  );
  const selectedBarberName = selectedBarber
    ? getBarberDisplayName(selectedBarber)
    : "";
  const availableServices = selectedBarberServices;
  const selectedService =
    availableServices.find((service) => service.id === selectedServiceId) ??
    availableServices[0];
  const isSubmitDisabled =
    isSaving ||
    isLoadingBarbers ||
    isLoadingServices ||
    !selectedBarber ||
    availableServices.length === 0;
  const compactSummary = [
    selectedService?.name,
    selectedBarberName,
    selectedTime,
    clientName.trim(),
  ]
    .filter(Boolean)
    .join(" · ");
  const occupiedTimeSet = useMemo(
    () => new Set(occupiedTimes),
    [occupiedTimes],
  );

  function handleBarberChange(barberId: string) {
    const barber = activeBarbers.find(
      (currentBarber) => currentBarber.id === barberId,
    );

    setSelectedBarberId(barberId);
    setSelectedBarberServices(barber?.services ?? []);
    setSelectedServiceId("");
    setFormError("");
  }

  function handleServiceChange(serviceId: string) {
    setSelectedServiceId(serviceId);
    setFormError("");
  }

  useEffect(() => {
    let isMounted = true;

    async function loadRealBarbers() {
      setIsLoadingBarbers(true);

      try {
        const { data, error } = await listActiveBarbersByBarbershop(
          barbershop.slug,
        );

        if (!isMounted) {
          return;
        }

        if (error) {
          setActiveBarbers(demoActiveBarbers);
          setFormError(
            "No pudimos cargar los barberos reales. Mostramos la demo temporalmente.",
          );
          return;
        }

        const nextBarbers =
          data && data.length > 0
            ? data.map((barber: BarberRow) => {
                const demoBarber = demoActiveBarbers.find(
                  (currentBarber) => currentBarber.id === barber.id,
                );

                return {
                  id: barber.id,
                  name: barber.name,
                  role: barber.role ?? undefined,
                  displayName: barber.display_name ?? undefined,
                  whatsapp: barber.whatsapp ?? undefined,
                  isActive: barber.is_active,
                  services: demoBarber?.services ?? fallbackServices,
                };
              })
            : demoActiveBarbers;

        setActiveBarbers(nextBarbers);
        setSelectedBarberId((currentBarberId) => {
          const nextSelectedBarber =
            nextBarbers.find((barber) => barber.id === currentBarberId) ??
            nextBarbers[0];

          setSelectedBarberServices(nextSelectedBarber?.services ?? []);
          setSelectedServiceId("");

          return nextSelectedBarber?.id ?? "";
        });
      } catch {
        if (isMounted) {
          setActiveBarbers(demoActiveBarbers);
          setFormError(
            "No pudimos cargar los barberos reales. Mostramos la demo temporalmente.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingBarbers(false);
        }
      }
    }

    loadRealBarbers();

    return () => {
      isMounted = false;
    };
  }, [barbershop.slug, demoActiveBarbers, fallbackServices]);

  useEffect(() => {
    let isMounted = true;

    async function loadRealServices() {
      if (!selectedBarber) {
        setSelectedBarberServices([]);
        setSelectedServiceId("");
        return;
      }

      setIsLoadingServices(true);

      try {
        const { data, error } = await listActiveServicesByBarber({
          barbershopSlug: barbershop.slug,
          barberId: selectedBarber.id,
        });

        if (!isMounted) {
          return;
        }

        if (error) {
          setSelectedBarberServices(selectedBarber.services);
          setSelectedServiceId(selectedBarber.services[0]?.id ?? "");
          setFormError(
            "No pudimos cargar los servicios reales. Mostramos la demo temporalmente.",
          );
          return;
        }

        const nextServices =
          data && data.length > 0
            ? data.map((service: BarberServiceRow) => ({
                id: service.id,
                name: service.name,
                price: service.price,
                durationMinutes: service.duration_minutes,
              }))
            : selectedBarber.services;

        setSelectedBarberServices(nextServices);
        setSelectedServiceId(nextServices[0]?.id ?? "");
      } catch {
        if (isMounted) {
          setSelectedBarberServices(selectedBarber.services);
          setSelectedServiceId(selectedBarber.services[0]?.id ?? "");
          setFormError(
            "No pudimos cargar los servicios reales. Mostramos la demo temporalmente.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingServices(false);
        }
      }
    }

    loadRealServices();

    return () => {
      isMounted = false;
    };
  }, [barbershop.slug, selectedBarber]);

  useEffect(() => {
    let isMounted = true;

    async function loadOccupiedTimes() {
      if (!selectedDate || !selectedBarberId) {
        if (isMounted) {
          setOccupiedTimes([]);
          setIsLoadingTimes(false);
        }
        return;
      }

      setIsLoadingTimes(true);

      try {
        const { data, error } = await listOccupiedAppointmentTimes({
          barbershopSlug: barbershop.slug,
          barberId: selectedBarberId,
          appointmentDate: selectedDate,
        });

        if (!isMounted) {
          return;
        }

        if (error) {
          setOccupiedTimes([]);
          setFormError("No pudimos actualizar la disponibilidad de horarios.");
          return;
        }

        setOccupiedTimes(data);

        if (selectedTime && data.includes(selectedTime)) {
          setSelectedTime("");
          setFormError("Ese horario acaba de ocuparse. Elegi otro.");
        }
      } catch {
        if (isMounted) {
          setOccupiedTimes([]);
          setFormError("No pudimos actualizar la disponibilidad de horarios.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingTimes(false);
        }
      }
    }

    loadOccupiedTimes();

    return () => {
      isMounted = false;
    };
  }, [barbershop.slug, selectedBarberId, selectedDate, selectedTime]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !selectedBarber ||
      !selectedService ||
      !selectedDate ||
      !selectedTime ||
      !clientName.trim() ||
      !clientPhone.trim()
    ) {
      setFormError(
        "Completa barbero, servicio, fecha, horario, nombre y telefono.",
      );
      return;
    }

    setFormError("");
    setIsSaving(true);

    try {
      const { isAvailable, error } = await validateAppointmentTimeIsAvailable({
        barbershopSlug: barbershop.slug,
        barberId: selectedBarber.id,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
      });

      if (error) {
        setFormError(
          "No pudimos validar la disponibilidad. Intentá nuevamente.",
        );
        return;
      }

      if (!isAvailable) {
        setOccupiedTimes((currentTimes) =>
          currentTimes.includes(selectedTime)
            ? currentTimes
            : [...currentTimes, selectedTime],
        );
        setSelectedTime("");
        setFormError("Ese horario ya fue reservado. Elegi otro horario.");
        return;
      }
    } catch {
      setFormError("No pudimos validar la disponibilidad. Intentá nuevamente.");
      return;
    } finally {
      setIsSaving(false);
    }

    setIsSaving(true);

    const appointment = {
      barbershop_slug: barbershop.slug,
      barber_id: selectedBarber.id,
      barber_name: selectedBarberName,
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
      barberName: selectedBarberName,
      date: formatDateForDisplay(selectedDate),
      time: selectedTime,
      comment,
    });

    window.open(whatsappLink, "_blank", "noopener,noreferrer");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5 pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-8 lg:pb-0"
    >
      <section className="space-y-4 sm:space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase text-amber-300">
            Reserva online
          </p>
          <h1 className="mt-2 text-3xl font-black text-balance text-stone-50 sm:mt-3 sm:text-6xl">
            {barbershop.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300 sm:mt-4 sm:text-lg sm:leading-8">
            Elegi el servicio, la fecha y el horario. Guardamos tu reserva y
            despues abrimos WhatsApp con el mensaje listo.
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {isLoadingBarbers ? (
            <div className="rounded-md border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm font-semibold text-stone-300">
              Cargando barberos disponibles...
            </div>
          ) : null}

          {activeBarbers.length > 1 ? (
            <div>
              <label
                htmlFor="barber"
                className="text-sm font-bold uppercase text-stone-300"
              >
                Barbero
              </label>
              <select
                id="barber"
                value={selectedBarberId}
                disabled={isSaving}
                onChange={(event) => handleBarberChange(event.target.value)}
                className="mt-1.5 min-h-10 w-full rounded-md border border-stone-700 bg-stone-900 px-3 text-base text-stone-50 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20 sm:mt-2 sm:min-h-12 sm:px-4"
                required
              >
                {activeBarbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {getBarberDisplayName(barber)}
                  </option>
                ))}
              </select>
            </div>
          ) : selectedBarber ? (
            <div className="rounded-md border border-stone-800 bg-stone-900/60 px-3 py-2">
              <p className="text-[11px] font-bold uppercase text-stone-500">
                Barbero
              </p>
              <p className="text-sm font-semibold text-stone-100">
                {selectedBarberName}
              </p>
            </div>
          ) : null}

          <div>
            <label
              htmlFor="service"
              className="text-sm font-bold uppercase text-stone-300"
            >
              Servicio
            </label>
            {isLoadingServices ? (
              <p className="mt-1.5 text-xs text-stone-400 sm:mt-2 sm:text-sm">
                Actualizando servicios del barbero...
              </p>
            ) : null}
            <select
              id="service"
              value={selectedService?.id ?? ""}
              disabled={
                isSaving ||
                isLoadingBarbers ||
                isLoadingServices ||
                !selectedBarber ||
                availableServices.length === 0
              }
              onChange={(event) => handleServiceChange(event.target.value)}
              className="mt-1.5 min-h-10 w-full rounded-md border border-stone-700 bg-stone-900 px-3 text-base text-stone-50 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20 sm:mt-2 sm:min-h-12 sm:px-4"
              required
            >
              {availableServices.length === 0 ? (
                <option value="">Sin servicios disponibles</option>
              ) : null}
              {availableServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {formatPrice(service.price)}
                </option>
              ))}
            </select>
            {!isLoadingServices &&
            !isLoadingBarbers &&
            selectedBarber &&
            availableServices.length === 0 ? (
              <p className="mt-2 text-xs font-semibold text-red-200">
                Este barbero no tiene servicios activos configurados.
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
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
                className="mt-1.5 min-h-10 w-full rounded-md border border-stone-700 bg-stone-900 px-3 text-base text-stone-50 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20 sm:mt-2 sm:min-h-12 sm:px-4"
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
              {isLoadingTimes ? (
                <p className="mt-1.5 text-xs text-stone-400 sm:mt-2 sm:text-sm">
                  Actualizando horarios disponibles...
                </p>
              ) : null}
              <select
                id="time"
                value={selectedTime}
                disabled={isSaving || isLoadingTimes || isLoadingServices}
                onChange={(event) => {
                  setSelectedTime(event.target.value);
                  setFormError("");
                }}
                className="mt-1.5 min-h-10 w-full rounded-md border border-stone-700 bg-stone-900 px-3 text-base text-stone-50 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20 sm:mt-2 sm:min-h-12 sm:px-4"
                required
              >
                <option value="">Seleccioná un horario</option>
                {timeSlots.map((slot) => (
                  <option
                    disabled={occupiedTimeSet.has(slot)}
                    key={slot}
                    value={slot}
                  >
                    {occupiedTimeSet.has(slot) ? `${slot} - Ocupado` : slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <label
                htmlFor="clientName"
                className="text-[11px] font-bold uppercase text-stone-400 sm:text-sm sm:text-stone-300"
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
                placeholder="Nombre"
                className="mt-1 min-h-9 w-full rounded-md border border-stone-700 bg-stone-900 px-2.5 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20 sm:mt-2 sm:min-h-12 sm:px-4 sm:text-base"
                required
              />
            </div>

            <div>
              <label
                htmlFor="clientPhone"
                className="text-[11px] font-bold uppercase text-stone-400 sm:text-sm sm:text-stone-300"
              >
                Tel
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
                placeholder="Teléfono"
                className="mt-1 min-h-9 w-full rounded-md border border-stone-700 bg-stone-900 px-2.5 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20 sm:mt-2 sm:min-h-12 sm:px-4 sm:text-base"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="comment"
              className="text-[11px] font-bold uppercase text-stone-400 sm:text-sm sm:text-stone-300"
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
              placeholder="Preferencia o detalle"
              rows={2}
              className="mt-1 w-full rounded-md border border-stone-700 bg-stone-900 px-2.5 py-2 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20 sm:mt-2 sm:px-4 sm:py-3 sm:text-base"
            />
          </div>
        </div>
      </section>

      <aside className="border border-stone-800 bg-stone-900/70 p-4 shadow-2xl shadow-black/30 sm:p-6">
        <p className="text-xs font-bold uppercase text-amber-300">Resumen</p>
        <h2 className="mt-1 text-xl font-black text-stone-100 sm:mt-2 sm:text-2xl">
          Tu turno seleccionado
        </h2>

        <dl className="mt-4 space-y-2 text-sm sm:mt-6 sm:space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-2 sm:pb-4">
            <dt className="text-stone-400">Barbero</dt>
            <dd className="text-right font-semibold text-stone-100">
              {selectedBarberName || "Sin seleccionar"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-2 sm:pb-4">
            <dt className="text-stone-400">Servicio</dt>
            <dd className="text-right font-semibold text-stone-100">
              {selectedService?.name ?? "Sin seleccionar"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-2 sm:pb-4">
            <dt className="text-stone-400">Precio</dt>
            <dd className="font-mono font-bold text-amber-300">
              {selectedService ? formatPrice(selectedService.price) : "-"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-2 sm:pb-4">
            <dt className="text-stone-400">Duración</dt>
            <dd className="font-semibold text-stone-100">
              {selectedService
                ? `${selectedService.durationMinutes} minutos`
                : "-"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-2 sm:pb-4">
            <dt className="text-stone-400">Fecha</dt>
            <dd className="font-semibold text-stone-100">
              {selectedDate || "Sin seleccionar"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-2 sm:pb-4">
            <dt className="text-stone-400">Horario</dt>
            <dd className="font-semibold text-stone-100">
              {selectedTime || "Sin seleccionar"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-2 sm:pb-4">
            <dt className="text-stone-400">Cliente</dt>
            <dd className="text-right font-semibold text-stone-100">
              {clientName || "Sin completar"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-2 sm:pb-4">
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
            className="mt-4 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 sm:mt-6 sm:px-4 sm:py-3"
          >
            {formError}
          </p>
        ) : null}

        <p className="mt-4 text-xs leading-5 text-stone-400 sm:mt-6 sm:text-sm sm:leading-6">
          Al reservar, se guarda el turno y se abre WhatsApp para confirmar el
          mensaje.
        </p>

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="mt-5 hidden min-h-11 w-full items-center justify-center rounded-md bg-amber-300 px-5 py-2.5 text-sm font-bold uppercase text-stone-950 transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-stone-950 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-amber-300 lg:inline-flex lg:min-h-12 lg:px-6 lg:py-3"
        >
          {isSaving ? "Guardando..." : "Reservar turno"}
        </button>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-800 bg-stone-950/95 px-3 py-3 shadow-2xl shadow-black/40 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase text-stone-500">
              Tu turno
            </p>
            <p className="truncate text-sm font-semibold text-stone-100">
              {compactSummary || "Completá los datos para reservar"}
            </p>
          </div>
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-amber-300 px-4 py-2 text-xs font-bold uppercase text-stone-950 transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-stone-950 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-amber-300"
          >
            {isSaving ? "Guardando..." : "Reservar turno"}
          </button>
        </div>
      </div>
    </form>
  );
}
