"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  type Barber,
  getActiveBarbers,
  getBarberDisplayName,
  type DemoBarbershop,
} from "@/data/demo-barbershops";
import {
  createPendingAppointment,
  validateAppointmentTimeIsAvailable,
} from "@/lib/appointments";
import { getBarberDayAvailability } from "@/lib/barber-availability";
import type { AvailabilitySlot } from "@/lib/availability";
import { listActiveServicesByBarber } from "@/lib/barber-services";
import { listActiveBarbersByBarbershop } from "@/lib/barbers";
import { cn } from "@/lib/cn";
import {
  formatDateForDisplay,
  formatPrice,
  getLocalDateInputValue,
} from "@/lib/format";
import type { BarberRow, BarberServiceRow } from "@/lib/supabase";
import { createWhatsAppBookingLink } from "@/lib/whatsapp";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";

type BookingFormProps = {
  barbershop: DemoBarbershop;
};

type BookingBarber = Barber;
type BookingService = BookingBarber["services"][number];

function getTodayInputValue() {
  return getLocalDateInputValue();
}

const SLOT_REASON_TITLE: Record<AvailabilitySlot["reason"], string> = {
  available: "",
  occupied: "Ocupado",
  blocked: "Bloqueado",
  past: "Horario pasado",
  "outside-hours": "Fuera de horario",
};

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
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>(
    [],
  );
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);

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
    !selectedService ||
    availableServices.length === 0;
  const compactSummary = [
    selectedService?.name,
    selectedBarberName,
    selectedTime,
    clientName.trim(),
  ]
    .filter(Boolean)
    .join(" · ");

  function handleBarberChange(barberId: string) {
    const barber = activeBarbers.find(
      (currentBarber) => currentBarber.id === barberId,
    );

    setSelectedBarberId(barberId);
    setSelectedBarberServices(barber?.services ?? []);
    setSelectedServiceId("");
    setSelectedTime("");
    setFormError("");
  }

  function handleServiceChange(serviceId: string) {
    setSelectedServiceId(serviceId);
    setSelectedTime("");
    setFormError("");
  }

  function handleSlotSelect(slot: AvailabilitySlot) {
    if (!slot.isAvailable) return;
    setSelectedTime(slot.time);
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

        const nextSelectedBarber =
          nextBarbers.find((barber) => barber.id === selectedBarberId) ??
          nextBarbers[0];

        setActiveBarbers(nextBarbers);
        setSelectedBarberId(nextSelectedBarber?.id ?? "");
        setSelectedBarberServices(nextSelectedBarber?.services ?? []);
        setSelectedServiceId(nextSelectedBarber?.services[0]?.id ?? "");
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
  }, [barbershop.slug, demoActiveBarbers, fallbackServices, selectedBarberId]);

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
        setSelectedServiceId(
          nextServices.find((service) => service.id === selectedServiceId)?.id ??
            nextServices[0]?.id ??
            "",
        );
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
  }, [barbershop.slug, selectedBarber, selectedServiceId]);

  useEffect(() => {
    let isMounted = true;

    async function loadAvailability() {
      if (!selectedDate || !selectedBarberId || !selectedService) {
        if (isMounted) {
          setAvailabilitySlots([]);
          setIsLoadingTimes(false);
        }
        return;
      }

      setIsLoadingTimes(true);

      try {
        const { data, error } = await getBarberDayAvailability({
          barbershopSlug: barbershop.slug,
          barberId: selectedBarberId,
          appointmentDate: selectedDate,
          appointmentDurationMinutes: selectedService.durationMinutes,
          barbershopIntervalMinutes: barbershop.workingHours.intervalMinutes,
          workingHours: barbershop.workingHours,
        });

        if (!isMounted) {
          return;
        }

        if (error) {
          setAvailabilitySlots([]);
          setFormError("No pudimos actualizar la disponibilidad de horarios.");
          return;
        }

        setAvailabilitySlots(data);

        if (
          selectedTime &&
          data.some((slot) => slot.time === selectedTime && !slot.isAvailable)
        ) {
          setSelectedTime("");
          setFormError("Ese horario acaba de ocuparse. Elegí otro.");
        }
      } catch {
        if (isMounted) {
          setAvailabilitySlots([]);
          setFormError("No pudimos actualizar la disponibilidad de horarios.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingTimes(false);
        }
      }
    }

    loadAvailability();

    return () => {
      isMounted = false;
    };
  }, [
    barbershop.slug,
    barbershop.workingHours,
    selectedBarberId,
    selectedDate,
    selectedService,
    selectedTime,
  ]);

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
        "Completá barbero, servicio, fecha, horario, nombre y teléfono.",
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
        appointmentDurationMinutes: selectedService.durationMinutes,
        barbershopIntervalMinutes: barbershop.workingHours.intervalMinutes,
        workingHours: barbershop.workingHours,
      });

      if (error) {
        setFormError("No pudimos validar la disponibilidad. Intentá nuevamente.");
        return;
      }

      if (!isAvailable) {
        setAvailabilitySlots((currentSlots) =>
          currentSlots.map((slot) =>
            slot.time === selectedTime
              ? { ...slot, isAvailable: false, reason: "occupied" }
              : slot,
          ),
        );
        setSelectedTime("");
        setFormError("Ese horario ya fue reservado. Elegí otro.");
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
        // 23505 = unique_violation de Postgres. El índice parcial
        // `appointments_unique_active_slot` rechazó porque ya existe un turno
        // activo (pending/confirmed) en ese slot. Race condition cerrada por
        // la DB — el cliente recibe un mensaje claro y un slot recargado.
        if (error.code === "23505") {
          setAvailabilitySlots((currentSlots) =>
            currentSlots.map((slot) =>
              slot.time === selectedTime
                ? { ...slot, isAvailable: false, reason: "occupied" }
                : slot,
            ),
          );
          setSelectedTime("");
          setFormError(
            "Ese horario acaba de ocuparse. Elegí otro disponible.",
          );
          return;
        }

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

  const summaryRows: Array<{ label: string; value: string }> = [
    { label: "Barbero", value: selectedBarberName || "—" },
    { label: "Servicio", value: selectedService?.name ?? "—" },
    {
      label: "Duración",
      value: selectedService ? `${selectedService.durationMinutes} min` : "—",
    },
    {
      label: "Fecha",
      value: selectedDate ? formatDateForDisplay(selectedDate) : "—",
    },
    { label: "Horario", value: selectedTime || "—" },
    { label: "Cliente", value: clientName || "—" },
    { label: "Teléfono", value: clientPhone || "—" },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-10 pb-32 sm:gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-20 lg:pb-0"
    >
      <section className="space-y-8 sm:space-y-10">
        <div className="animate-fade-up">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
            Reserva online
          </p>
          <h1 className="mt-4 text-[2rem] font-black uppercase leading-[0.95] tracking-tight text-balance break-words sm:mt-6 sm:text-5xl lg:text-6xl">
            {barbershop.name}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-[color:var(--text-secondary)] sm:mt-6 sm:text-base">
            Elegí el servicio, la fecha y el horario. Guardamos tu reserva y
            abrimos WhatsApp con el mensaje listo.
          </p>
        </div>

        <div className="space-y-7">
          {isLoadingBarbers ? (
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
              Cargando barberos…
            </p>
          ) : null}

          {activeBarbers.length > 1 ? (
            <Field label="Barbero" htmlFor="barber" required>
              <Select
                id="barber"
                value={selectedBarberId}
                disabled={isSaving}
                onChange={(event) => handleBarberChange(event.target.value)}
                required
              >
                {activeBarbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {getBarberDisplayName(barber)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : selectedBarber ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
                Barbero
              </p>
              <p className="mt-2 text-lg font-bold text-white">
                {selectedBarberName}
              </p>
            </div>
          ) : null}

          <Field
            label="Servicio"
            htmlFor="service"
            required
            hint={isLoadingServices ? "Actualizando servicios…" : undefined}
            error={
              !isLoadingServices &&
              !isLoadingBarbers &&
              selectedBarber &&
              availableServices.length === 0
                ? "Este barbero no tiene servicios activos."
                : undefined
            }
          >
            <Select
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
              required
            >
              {availableServices.length === 0 ? (
                <option value="">Sin servicios disponibles</option>
              ) : null}
              {availableServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} — {formatPrice(service.price)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Fecha" htmlFor="date" required>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              disabled={isSaving}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setSelectedTime("");
                setFormError("");
              }}
              required
            />
          </Field>

          {/* Horarios como grid de pills clickeables */}
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
                Horario <span className="text-[color:var(--brand-gold)]">*</span>
              </p>
              {isLoadingTimes ? (
                <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-subtle)]">
                  Actualizando…
                </span>
              ) : null}
            </div>

            {!selectedService ? (
              <p className="mt-4 text-xs text-[color:var(--text-muted)]">
                Elegí un servicio para ver los horarios disponibles.
              </p>
            ) : availabilitySlots.length === 0 && !isLoadingTimes ? (
              <p className="mt-4 text-xs text-[color:var(--text-muted)]">
                No hay horarios disponibles para esta fecha.
              </p>
            ) : (
              <div
                role="radiogroup"
                aria-label="Horarios disponibles"
                className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5"
              >
                {availabilitySlots.map((slot) => {
                  const isSelected = slot.time === selectedTime;
                  const title = SLOT_REASON_TITLE[slot.reason] || undefined;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={!slot.isAvailable || isSaving}
                      onClick={() => handleSlotSelect(slot)}
                      title={title}
                      className={cn(
                        "min-h-11 rounded-[var(--radius-sm)] border font-mono text-xs font-bold tabular-nums transition-colors duration-[var(--duration-fast)]",
                        isSelected
                          ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)] text-black"
                          : slot.isAvailable
                            ? "border-[color:var(--border-default)] text-white hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
                            : "cursor-not-allowed border-[color:var(--border-subtle)] text-[color:var(--text-subtle)] line-through",
                      )}
                    >
                      {slot.time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="clientName" required>
              <Input
                id="clientName"
                type="text"
                value={clientName}
                disabled={isSaving}
                onChange={(event) => {
                  setClientName(event.target.value);
                  setFormError("");
                }}
                placeholder="Tu nombre"
                autoComplete="name"
                required
              />
            </Field>

            <Field label="Teléfono" htmlFor="clientPhone" required>
              <Input
                id="clientPhone"
                type="tel"
                value={clientPhone}
                disabled={isSaving}
                onChange={(event) => {
                  setClientPhone(event.target.value);
                  setFormError("");
                }}
                placeholder="11 5555-5555"
                autoComplete="tel"
                inputMode="tel"
                required
              />
            </Field>
          </div>

          <Field label="Comentario" htmlFor="comment" optional>
            <Textarea
              id="comment"
              value={comment}
              onChange={(event) => {
                setComment(event.target.value);
                setFormError("");
              }}
              disabled={isSaving}
              placeholder="Preferencia o detalle"
              rows={2}
            />
          </Field>
        </div>
      </section>

      {/* Resumen — columna lateral minimalista */}
      <aside className="lg:sticky lg:top-12">
        <div
          className="animate-fade-up border-t border-[color:var(--border-subtle)] pt-8 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0 lg:pl-10"
          style={{ animationDelay: "120ms" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
            Resumen
          </p>

          {selectedService ? (
            <div className="mt-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
                Total
              </p>
              <p className="mt-2 font-mono text-4xl font-black tabular-nums leading-none text-[color:var(--brand-gold)] sm:text-5xl lg:text-6xl">
                {formatPrice(selectedService.price)}
              </p>
            </div>
          ) : null}

          <dl className="mt-8 grid gap-4 sm:mt-10 sm:gap-5">
            {summaryRows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[auto_1fr] items-baseline gap-4"
              >
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] sm:tracking-[0.2em]">
                  {row.label}
                </dt>
                <dd className="min-w-0 break-words text-right text-sm font-semibold text-white">
                  {row.value}
                </dd>
              </div>
            ))}
            {comment ? (
              <div className="grid gap-2">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] sm:tracking-[0.2em]">
                  Comentario
                </dt>
                <dd className="break-words text-sm text-[color:var(--text-secondary)]">
                  {comment}
                </dd>
              </div>
            ) : null}
          </dl>

          {formError ? (
            <div
              role="alert"
              className="mt-8 border-l-2 border-[color:var(--danger)] pl-4 text-sm font-semibold text-[color:var(--danger)]"
            >
              {formError}
            </div>
          ) : null}

          <p className="mt-8 text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-subtle)]">
            Al reservar, guardamos el turno y abrimos WhatsApp.
          </p>

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={isSaving}
            disabled={isSubmitDisabled}
            className="mt-8 hidden lg:inline-flex"
          >
            {isSaving ? "Guardando…" : "Reservar turno"}
          </Button>
        </div>
      </aside>

      {/* Sticky bottom CTA (mobile) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border-default)] bg-black/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-subtle)]">
              Tu turno
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-white">
              {compactSummary || "Completá los datos"}
            </p>
          </div>
          <Button
            type="submit"
            size="md"
            loading={isSaving}
            disabled={isSubmitDisabled}
          >
            {isSaving ? "…" : "Reservar"}
          </Button>
        </div>
      </div>
    </form>
  );
}
