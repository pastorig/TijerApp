"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ArrowUpRight } from "lucide-react";
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
import { normalizePhone } from "@/lib/barbershop-clients";
import { cn } from "@/lib/cn";
import {
  formatDateForDisplay,
  formatDateWithWeekday,
  formatPrice,
  getLocalDateInputValue,
} from "@/lib/format";
import type { BarberRow, BarberServiceRow } from "@/lib/supabase";
import { createWhatsAppBookingLink } from "@/lib/whatsapp";
import { CouponInput } from "./booking/CouponInput";
import type { CouponValidation } from "@/lib/public-coupons";

type AppliedCoupon = Extract<CouponValidation, { valid: true }> & { code: string };
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  useToast,
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
  const [clientEmail, setClientEmail] = useState("");
  const [comment, setComment] = useState("");
  const [formError, setFormError] = useState("");
  const toast = useToast();
  const lastToastedErrorRef = useRef<string>("");

  // Toast como feedback visible sin importar scroll position. NO usamos
  // scrollIntoView porque el div de formError vive dentro del aside del
  // "Resumen" lateral (que en mobile queda al final del form): si
  // scrolleamos ahí, el usuario queda atrapado abajo sin saber cómo
  // volver al input que está mal. El toast aparece en el viewport
  // independientemente de dónde esté el scroll, sin moverlo.
  //
  // Usamos un ref para trackear el último error mostrado y evitar
  // disparar el toast múltiples veces por el mismo error cuando el
  // componente re-renderiza (cambio de horario seleccionado, recálculo
  // de slots disponibles, etc.). El effect SOLO dispara cuando el
  // valor de formError cambia respecto al último toasted, no en cada
  // render del componente.
  useEffect(() => {
    if (!formError) {
      lastToastedErrorRef.current = "";
      return;
    }
    if (formError === lastToastedErrorRef.current) return;
    lastToastedErrorRef.current = formError;
    toast.error("Revisá los datos", { description: formError });
  }, [formError, toast]);
  const [isSaving, setIsSaving] = useState(false);
  // Cupón aplicado al booking (FASE C parte 2). Si null, no se aplicó ninguno.
  // El precio final = service.price - appliedCoupon.discountAmount (si existe).
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>(
    [],
  );
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);
  const [waitlistError, setWaitlistError] = useState("");

  // Resultado del booking exitoso: si está set, mostramos pantalla de éxito
  // (oculta el form) con detalle del turno + link de confirmación.
  type BookingResult = {
    confirmationToken: string;
    barberName: string;
    serviceName: string;
    servicePrice: number;
    serviceDurationMinutes: number;
    date: string;
    time: string;
    customerName: string;
    customerPhone: string;
    comment: string;
    whatsappLink: string;
    couponCode?: string | null;
    couponDiscountAmount?: number | null;
    finalPrice?: number | null;
  };
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(
    null,
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

  async function handleSubmitWaitlist() {
    if (!selectedBarberId || !selectedService) {
      setWaitlistError("Elegí barbero y servicio antes.");
      return;
    }
    if (!clientName.trim() || !clientPhone.trim()) {
      setWaitlistError("Necesitamos nombre y teléfono.");
      return;
    }
    setWaitlistError("");
    setIsSubmittingWaitlist(true);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barbershopSlug: barbershop.slug,
          barberId: selectedBarberId,
          serviceName: selectedService.name,
          serviceDurationMinutes: selectedService.durationMinutes,
          customerName: clientName.trim(),
          customerPhone: clientPhone.trim(),
          customerEmail: clientEmail.trim() || null,
          preferredDate: selectedDate,
          notes: comment.trim() || null,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setWaitlistError(payload.error ?? "No pudimos guardarte.");
        return;
      }
      setWaitlistSubmitted(true);
      setShowWaitlistForm(false);
    } catch {
      setWaitlistError("No pudimos guardarte.");
    } finally {
      setIsSubmittingWaitlist(false);
    }
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

    // Validamos que el teléfono tenga al menos 8 dígitos. Si no, el trigger
    // de DB ignora el cliente en silencio y queda un turno huérfano sin
    // poder verlo en el panel de Clientes.
    if (!normalizePhone(clientPhone)) {
      setFormError(
        "El teléfono tiene que tener al menos 8 dígitos (sin contar letras ni símbolos).",
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
      customer_email: clientEmail.trim() || null,
      service_name: selectedService.name,
      service_price: selectedService.price,
      service_duration_minutes: selectedService.durationMinutes,
      appointment_date: selectedDate,
      appointment_time: selectedTime,
      comment: comment.trim(),
      // Cupón aplicado: si hay, guardamos el coupon_id + discount_amount.
      // El trigger appointment_increment_coupon_usage_trg en la DB se
      // encarga de incrementar usage_count del cupón automáticamente.
      coupon_id: appliedCoupon?.couponId ?? null,
      discount_amount: appliedCoupon?.discountAmount ?? null,
    };

    let confirmationToken: string | undefined;

    try {
      const { data, error } = await createPendingAppointment(appointment, {
        autoConfirm: barbershop.autoConfirmAppointments ?? false,
      });

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

      confirmationToken = data?.confirmation_token;
    } catch {
      setFormError(
        "No pudimos guardar la reserva. Revisá los datos e intentá nuevamente.",
      );
      return;
    } finally {
      setIsSaving(false);
    }

    // Nota: NO incluimos el confirmationToken en este WA inicial. El cliente
    // está PIDIENDO el turno al admin, no comunicándole un link de gestión.
    // El link va solo en el WA del admin → cliente (cuando el admin manda
    // el mensaje desde su panel), que tiene sentido conceptual.
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

    // Cambiamos la UI a "pantalla de éxito" con el link de confirmación
    // visible para el cliente.
    if (confirmationToken) {
      setBookingResult({
        confirmationToken,
        barberName: selectedBarberName,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        serviceDurationMinutes: selectedService.durationMinutes,
        date: selectedDate,
        time: selectedTime,
        customerName: appointment.customer_name,
        customerPhone: appointment.customer_phone,
        comment,
        whatsappLink,
        // Si había cupón aplicado, lo pasamos al success screen
        couponCode: appliedCoupon?.code ?? null,
        couponDiscountAmount: appliedCoupon?.discountAmount ?? null,
        finalPrice: appliedCoupon?.finalPrice ?? null,
      });
    }

    // Abrimos WhatsApp automático como hasta ahora — el cliente puede
    // mandar el mensaje y después volver al browser para usar el link
    // de confirmación.
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
      value: selectedDate ? formatDateWithWeekday(selectedDate) : "—",
    },
    { label: "Horario", value: selectedTime || "—" },
    { label: "Cliente", value: clientName || "—" },
    { label: "Teléfono", value: clientPhone || "—" },
  ];

  // Si el booking fue exitoso, mostramos la pantalla de éxito en lugar
  // del form. El cliente puede confirmar al toque desde acá, sin esperar
  // que el admin le mande otro WA.
  if (bookingResult) {
    return (
      <BookingSuccess
        result={bookingResult}
        barbershop={barbershop}
      />
    );
  }

  if (waitlistSubmitted) {
    return (
      <article className="animate-fade-up text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] text-[color:var(--success)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-7"
            aria-hidden="true"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
          Lista de espera
        </p>
        <h1 className="mt-3 text-3xl font-black uppercase leading-[0.95] tracking-tight text-balance text-white sm:text-4xl">
          Te anotamos en la lista
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[color:var(--text-secondary)] sm:text-base">
          Si se libera un horario para el{" "}
          <span className="font-bold text-white">
            {formatDateWithWeekday(selectedDate)}
          </span>{" "}
          con{" "}
          <span className="font-bold text-white">{selectedBarberName}</span>,{" "}
          {barbershop.name} te va a escribir por WhatsApp al{" "}
          <span className="font-mono text-[color:var(--brand-gold)]">
            {clientPhone.trim()}
          </span>{" "}
          con un link para confirmar el turno con un click.
        </p>

        <dl className="mx-auto mt-8 grid max-w-sm gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-4 text-left text-xs text-[color:var(--text-secondary)]">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              Servicio
            </dt>
            <dd className="font-semibold text-white">
              {selectedService?.name ?? "—"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              Barbero
            </dt>
            <dd className="font-semibold text-white">{selectedBarberName}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
              Fecha
            </dt>
            <dd className="font-semibold text-white">
              {formatDateWithWeekday(selectedDate)}
            </dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => {
              setWaitlistSubmitted(false);
              setSelectedDate(getTodayInputValue());
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-6 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)]"
          >
            Probar otra fecha
          </button>
          <Link
            href={`/${barbershop.slug}`}
            className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
          >
            Volver al inicio
          </Link>
        </div>
      </article>
    );
  }

  return (
    <>
      {showWaitlistForm ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowWaitlistForm(false)}
        >
          <div
            className="w-full max-w-md rounded-[var(--radius-md)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--surface-1)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
              Lista de espera
            </p>
            <h3 className="mt-3 text-2xl font-black uppercase text-white">
              Anotarte
            </h3>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              Si se libera un slot el {selectedDate} con tu barbero, te
              avisamos por WhatsApp para que confirmes.
            </p>
            <div className="mt-4 grid gap-2 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black p-3 text-xs text-[color:var(--text-secondary)]">
              <p>
                <span className="text-[color:var(--text-muted)]">
                  Servicio:
                </span>{" "}
                {selectedService?.name ?? "—"}
              </p>
              <p>
                <span className="text-[color:var(--text-muted)]">
                  Barbero:
                </span>{" "}
                {selectedBarberName}
              </p>
              <p>
                <span className="text-[color:var(--text-muted)]">Fecha:</span>{" "}
                {selectedDate}
              </p>
              <p>
                <span className="text-[color:var(--text-muted)]">Nombre:</span>{" "}
                {clientName.trim() || "—"}
              </p>
              <p>
                <span className="text-[color:var(--text-muted)]">
                  Teléfono:
                </span>{" "}
                {clientPhone.trim() || "—"}
              </p>
            </div>
            {waitlistError ? (
              <p className="mt-3 border-l-2 border-[color:var(--danger)] pl-3 text-xs font-semibold text-[color:var(--danger)]">
                {waitlistError}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowWaitlistForm(false)}
                disabled={isSubmittingWaitlist}
                className="inline-flex min-h-10 items-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitWaitlist}
                disabled={isSubmittingWaitlist}
                className="inline-flex min-h-10 items-center rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)] disabled:opacity-50"
              >
                {isSubmittingWaitlist ? "Guardando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
              // No permitimos fechas pasadas. El input nativo respeta `min`
              // en browsers modernos. Igual validamos en el submit por si
              // alguien manipula el DOM.
              min={getTodayInputValue()}
              disabled={isSaving}
              onChange={(event) => {
                const next = event.target.value;
                // Doble guard: si el user mete una fecha pasada manualmente,
                // forzamos hoy.
                if (next && next < getTodayInputValue()) {
                  setSelectedDate(getTodayInputValue());
                } else {
                  setSelectedDate(next);
                }
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
              <div className="mt-4 grid gap-3">
                <p className="text-xs text-[color:var(--text-muted)]">
                  No hay horarios disponibles para esta fecha.
                </p>
                <button
                  type="button"
                  onClick={() => setShowWaitlistForm(true)}
                  className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-soft)]/80"
                >
                  Anotarme en lista de espera
                </button>
              </div>
            ) : (
              <>
                {/* Slots divididos en MAÑANA (< 12:00) y TARDE (>= 12:00).
                    Solo mostramos la sección que tenga al menos 1 slot. */}
                {(() => {
                  const morningSlots = availabilitySlots.filter(
                    (s) => parseInt(s.time.slice(0, 2), 10) < 12,
                  );
                  const afternoonSlots = availabilitySlots.filter(
                    (s) => parseInt(s.time.slice(0, 2), 10) >= 12,
                  );

                  function renderSlot(slot: typeof availabilitySlots[number]) {
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
                  }

                  return (
                    <div className="mt-4 space-y-5">
                      {morningSlots.length > 0 ? (
                        <div>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-gold)]">
                            Mañana
                          </p>
                          <div
                            role="radiogroup"
                            aria-label="Horarios mañana"
                            className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5"
                          >
                            {morningSlots.map(renderSlot)}
                          </div>
                        </div>
                      ) : null}
                      {afternoonSlots.length > 0 ? (
                        <div>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-gold)]">
                            Tarde
                          </p>
                          <div
                            role="radiogroup"
                            aria-label="Horarios tarde"
                            className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5"
                          >
                            {afternoonSlots.map(renderSlot)}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
                {availabilitySlots.some((slot) => !slot.isAvailable) ? (
                  <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
                    Los horarios tachados ya pasaron
                  </p>
                ) : null}
              </>
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

          <Field
            label="Email"
            htmlFor="clientEmail"
            optional
            hint="Solo para que te contactemos si hay que cambiar el turno."
          >
            <Input
              id="clientEmail"
              type="email"
              value={clientEmail}
              disabled={isSaving}
              onChange={(event) => {
                setClientEmail(event.target.value);
                setFormError("");
              }}
              placeholder="tu@email.com"
              autoComplete="email"
              inputMode="email"
            />
          </Field>

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
              {appliedCoupon ? (
                <>
                  <p className="mt-1 font-mono text-base font-semibold tabular-nums leading-none text-[color:var(--text-muted)] line-through">
                    {formatPrice(selectedService.price)}
                  </p>
                  <p className="mt-1 font-mono text-4xl font-black tabular-nums leading-none text-[color:var(--brand-gold)] sm:text-5xl lg:text-6xl">
                    {formatPrice(appliedCoupon.finalPrice)}
                  </p>
                </>
              ) : (
                <p className="mt-2 font-mono text-4xl font-black tabular-nums leading-none text-[color:var(--brand-gold)] sm:text-5xl lg:text-6xl">
                  {formatPrice(selectedService.price)}
                </p>
              )}

              {/* Input de cupón — solo visible si hay servicio elegido */}
              <div className="mt-5">
                <CouponInput
                  barbershopSlug={barbershop.slug}
                  servicePrice={selectedService.price}
                  applied={appliedCoupon}
                  onApply={setAppliedCoupon}
                  onRemove={() => setAppliedCoupon(null)}
                />
              </div>
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
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* BookingSuccess: pantalla post-reserva con detalle + link de confirmar  */
/* ────────────────────────────────────────────────────────────────────── */

type BookingSuccessResult = {
  confirmationToken: string;
  barberName: string;
  serviceName: string;
  servicePrice: number;
  serviceDurationMinutes: number;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  comment: string;
  whatsappLink: string;
  // Si hay cupón aplicado, lo mostramos en el detalle. couponCode + finalPrice
  // se usan para mostrar el precio tachado y el final.
  couponCode?: string | null;
  couponDiscountAmount?: number | null;
  finalPrice?: number | null;
};

function BookingSuccess({
  result,
  barbershop,
}: {
  result: BookingSuccessResult;
  barbershop: DemoBarbershop;
}) {
  const confirmHref = `/r/${result.confirmationToken}`;
  const isAutoConfirmed = barbershop.autoConfirmAppointments ?? false;

  return (
    <section className="grid gap-12 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-20 lg:pb-0">
      <div className="animate-fade-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
          Turno reservado
        </p>
        <h1 className="mt-6 text-4xl font-black uppercase leading-[0.95] tracking-tight text-balance sm:text-5xl lg:text-6xl">
          ¡Listo, {firstNameOf(result.customerName)}!
        </h1>
        <p className="mt-6 max-w-xl text-sm leading-7 text-[color:var(--text-secondary)] sm:text-base">
          Tu turno en{" "}
          <span className="text-white font-semibold">{barbershop.name}</span>{" "}
          {isAutoConfirmed ? (
            <>
              quedó{" "}
              <span className="text-[color:var(--success)] font-semibold">
                confirmado
              </span>
              . Guardá el link de abajo: podés ver el detalle o cancelar cuando
              quieras.
            </>
          ) : (
            <>
              quedó{" "}
              <span className="text-[color:var(--brand-gold)] font-semibold">
                pendiente de confirmación
              </span>
              . Guardá el link de abajo: podés ver el detalle o cancelar cuando
              quieras.
            </>
          )}
        </p>

        <div className="mt-10 grid gap-3">
          <Button
            as="link"
            href={confirmHref}
            size="lg"
            fullWidth
            iconRight={<ArrowUpRight className="size-4" />}
            className="sm:w-auto"
          >
            Ver mi turno
          </Button>
          <a
            href={result.whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] sm:w-auto"
          >
            Reabrir WhatsApp con la reserva
          </a>
        </div>

        <p className="mt-8 text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-subtle)]">
          Guardá este link · podés volver acá cuando quieras
        </p>
      </div>

      {/* Aside: resumen del turno */}
      <aside className="lg:sticky lg:top-12">
        <div
          className="animate-fade-up border-t border-[color:var(--border-subtle)] pt-8 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 lg:pl-10"
          style={{ animationDelay: "120ms" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
            Detalle del turno
          </p>
          {result.couponCode && typeof result.finalPrice === "number" ? (
            <>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums leading-none text-[color:var(--text-muted)] line-through">
                {formatPrice(result.servicePrice)}
              </p>
              <p className="mt-1 font-mono text-4xl font-black tabular-nums leading-none text-[color:var(--brand-gold)] sm:text-5xl">
                {formatPrice(result.finalPrice)}
              </p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
                Cupón {result.couponCode} aplicado · Ahorrás{" "}
                {formatPrice(result.couponDiscountAmount ?? 0)}
              </p>
            </>
          ) : (
            <p className="mt-2 font-mono text-4xl font-black tabular-nums leading-none text-[color:var(--brand-gold)] sm:text-5xl">
              {formatPrice(result.servicePrice)}
            </p>
          )}
          <dl className="mt-8 grid gap-4">
            {[
              { label: "Servicio", value: result.serviceName },
              {
                label: "Duración",
                value: `${result.serviceDurationMinutes} min`,
              },
              { label: "Fecha", value: formatDateWithWeekday(result.date) },
              { label: "Horario", value: result.time },
              { label: "Barbero", value: result.barberName },
              { label: "Tu nombre", value: result.customerName },
              { label: "Tel", value: result.customerPhone },
            ].map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[auto_1fr] items-baseline gap-4"
              >
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  {row.label}
                </dt>
                <dd className="text-right text-sm font-semibold text-white">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </section>
  );
}

function firstNameOf(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
