"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { MotionConfig, motion } from "framer-motion";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import {
  type Barber,
  getActiveBarbers,
  getBarberDisplayName,
  type DemoBarbershop,
} from "@/data/demo-barbershops";
import {
} from "@/lib/appointments";
import { getBarberDayAvailability } from "@/lib/barber-availability";
import type { AvailabilitySlot } from "@/lib/availability";
import { listActiveServicesByBarber } from "@/lib/barber-services";
import { listActiveBarbersByBarbershop } from "@/lib/barbers";
import { openPendingTab } from "@/lib/pending-tab";
import { normalizePhone } from "@/lib/barbershop-clients";
import { cn } from "@/lib/cn";
import {
  formatDateForDisplay,
  formatDateWithWeekday,
  formatPrice,
  getWeekdayName,
} from "@/lib/format";
import { hoyEnArgentina } from "@/lib/hora-argentina";
import type { BarberRow, BarberServiceRow } from "@/lib/supabase";
import { createWhatsAppBookingLink } from "@/lib/whatsapp";
import { CouponInput } from "./booking/CouponInput";
import { BarberPicker } from "./booking/BarberPicker";
import { InitialsAvatar } from "./booking/InitialsAvatar";
import { ServicePicker } from "./booking/ServicePicker";
import { DateStrip } from "./booking/DateStrip";
import { StepHeader } from "./booking/StepHeader";
import { PasoPendiente } from "./booking/PasoPendiente";
import { ProductPicker, type ProductoParaElegir } from "./booking/ProductPicker";
import {
  renglonEnTexto,
  totalDeProductos,
  type ProductoDeTurno,
} from "@/lib/productos";
import {
  Aparecer,
  Destellos,
  EASE_SUAVE,
  LatidoUnaVez,
  PrecioAnimado,
  TildeDeExito,
  TituloPorPalabras,
  bajarHastaElPaso,
} from "./booking/BookingMotion";
import { DepositPaymentPanel } from "./DepositPaymentPanel";
import { SimulatePaymentButton } from "./SimulatePaymentButton";
import type { CouponValidation } from "@/lib/public-coupons";

type AppliedCoupon = Extract<CouponValidation, { valid: true }> & { code: string };
import {
  Button,
  Field,
  Input,
  Textarea,
  useToast,
} from "@/components/ui";

type BookingFormProps = {
  barbershop: DemoBarbershop;
};

type BookingBarber = Barber;
type BookingService = BookingBarber["services"][number];

// El "hoy" es el de la barbería, no el del proceso: este componente se
// renderiza también en el servidor (UTC) y ahí la fecha local ya es mañana
// desde las 21:00 de Argentina.
function getTodayInputValue() {
  return hoyEnArgentina();
}

/**
 * Qué servicio queda elegido cuando se (re)carga la lista de un barbero.
 *
 * Con uno solo no tiene sentido pedir un toque: se preselecciona, igual que
 * pasa con el barbero único. Con dos o más NO se preselecciona ninguno. Antes
 * quedaba marcado el primero y el precio del resumen lo acompañaba, así que
 * alguien podía terminar reservando "Corte" cuando quería "Corte + Barba"
 * simplemente porque ya venía tildado y nunca tocó nada.
 *
 * Si la elección que ya había sigue existiendo, se respeta: recargar la lista
 * no puede pisar lo que el cliente eligió.
 */
function elegirServicioInicial(
  servicios: readonly BookingService[],
  elegido?: string,
): string {
  const sigueValido = servicios.find((servicio) => servicio.id === elegido);
  if (sigueValido) return sigueValido.id;
  return servicios.length === 1 ? servicios[0].id : "";
}

const SLOT_REASON_TITLE: Record<AvailabilitySlot["reason"], string> = {
  available: "",
  occupied: "Ocupado",
  blocked: "Bloqueado",
  past: "Horario pasado",
  "outside-hours": "Fuera de horario",
  "too-soon": "Reservá con más anticipación",
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
  // Si hay más de un barbero, no preseleccionamos ninguno: el cliente debe
  // elegir explícitamente para evitar confusiones. Con uno solo, va directo.
  const initialBarber =
    demoActiveBarbers.length === 1 ? demoActiveBarbers[0] : undefined;
  const [activeBarbers, setActiveBarbers] =
    useState<BookingBarber[]>(demoActiveBarbers);
  const [isLoadingBarbers, setIsLoadingBarbers] = useState(true);
  const [selectedBarberId, setSelectedBarberId] = useState(
    initialBarber?.id ?? "",
  );
  const [selectedServiceId, setSelectedServiceId] = useState(
    elegirServicioInicial(initialBarber?.services ?? []),
  );
  const [selectedBarberServices, setSelectedBarberServices] = useState<
    BookingService[]
  >(initialBarber?.services ?? []);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue());
  const [selectedTime, setSelectedTime] = useState("");
  // De qué barbero/servicio/día son los horarios en pantalla. Cuando cambia,
  // la grilla entra en cascada; si solo se refresca la misma, no se mueve nada.
  const [tandaDeHorarios, setTandaDeHorarios] = useState("");
  // Catálogo de productos (035): lo que la barbería ofrece para sumar al
  // turno, y cuántas unidades de cada uno eligió el cliente. Si la barbería no
  // tiene productos (o su plan no los trae) la lista queda vacía y el paso no
  // existe: la reserva es exactamente la de siempre.
  const [productos, setProductos] = useState<ProductoParaElegir[]>([]);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
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
    // Seña MercadoPago: si están, el cierre muestra el panel de pago.
    depositAmount?: number | null;
    initPoint?: string | null;
    // Productos que quedaron anotados en el turno, y los que no se pudieron
    // sumar (se agotaron mientras reservaba). Los dos vienen del servidor.
    productos?: ProductoDeTurno[];
    productosNoSumados?: string[];
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
  // Sin `?? availableServices[0]`: ese fallback hacía que elegir el servicio
  // no fuera realmente un paso. Ahora, o lo eligió el cliente, o es el único
  // que hay (lo resuelve `elegirServicioInicial`).
  const selectedService = availableServices.find(
    (service) => service.id === selectedServiceId,
  );
  const faltaBarbero = !selectedBarber;
  const faltaServicio = !selectedService;
  const isSubmitDisabled =
    isSaving ||
    isLoadingBarbers ||
    isLoadingServices ||
    !selectedBarber ||
    !selectedService ||
    availableServices.length === 0;
  // Lo que el cliente sumó, con el precio que ve en pantalla. El servidor
  // vuelve a resolver precio y disponibilidad: esto es solo para mostrar.
  const productosElegidos: ProductoDeTurno[] = productos
    .filter((p) => (cantidades[p.id] ?? 0) > 0)
    .map((p) => ({
      product_name: p.name,
      unit_price: p.price,
      quantity: cantidades[p.id],
    }));
  const totalProductos = totalDeProductos(productosElegidos);
  const pedidoDeProductos = productos
    .filter((p) => (cantidades[p.id] ?? 0) > 0)
    .map((p) => ({ id: p.id, cantidad: cantidades[p.id] }));
  const hayCatalogo = productos.length > 0;

  // Ya no falta nada: es cuando el botón del celular late una vez.
  const listoParaReservar =
    !isSubmitDisabled &&
    Boolean(selectedTime && clientName.trim() && clientPhone.trim());
  const compactSummary = [
    selectedService?.name,
    selectedBarberName,
    selectedTime,
    clientName.trim(),
  ]
    .filter(Boolean)
    .join(" · ");

  useEffect(() => {
    let vivo = true;
    // Si falla, la reserva sigue igual sin el paso de productos: no se avisa
    // de un error en algo que el cliente ni sabía que existía.
    fetch(`/api/products?bs=${encodeURIComponent(barbershop.slug)}`)
      .then((res) => (res.ok ? res.json() : { productos: [] }))
      .then((payload: { productos?: ProductoParaElegir[] }) => {
        if (vivo && Array.isArray(payload.productos)) {
          setProductos(payload.productos);
        }
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [barbershop.slug]);

  function handleProductChange(productId: string, cantidad: number) {
    setCantidades((actual) => {
      const siguiente = { ...actual };
      if (cantidad <= 0) delete siguiente[productId];
      else siguiente[productId] = cantidad;
      return siguiente;
    });
  }

  function handleBarberChange(barberId: string) {
    const barber = activeBarbers.find(
      (currentBarber) => currentBarber.id === barberId,
    );

    setSelectedBarberId(barberId);
    setSelectedBarberServices(barber?.services ?? []);
    // Cambiar de barbero borra el servicio: son listas distintas. La misma
    // regla de siempre decide si queda uno puesto (sólo si tiene uno solo).
    const servicioPuesto = elegirServicioInicial(barber?.services ?? []);
    setSelectedServiceId(servicioPuesto);
    setSelectedTime("");
    setFormError("");
    // Si el barbero tiene un solo servicio ya quedó elegido: se sigue al día.
    bajarHastaElPaso(servicioPuesto ? "paso-dia" : "paso-servicio");
  }

  function handleServiceChange(serviceId: string) {
    setSelectedServiceId(serviceId);
    setSelectedTime("");
    setFormError("");
    bajarHastaElPaso("paso-dia");
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
    // Solo la primera vez: el que cambia de horario está comparando, y que la
    // página se le mueva en cada toque estorba.
    if (!selectedTime) {
      bajarHastaElPaso(hayCatalogo ? "paso-productos" : "paso-datos");
      // Despierta al servidor de reservas mientras el cliente escribe sus
      // datos. Si nadie reservó en un rato, el primer pedido tarda cerca de
      // 1,5 s más solo en arrancar, y ese tiempo caía justo sobre "Reservar".
      // El pedido no hace nada: la ruta solo acepta POST y contesta 405.
      void fetch("/api/appointments/book", { method: "HEAD" }).catch(() => {});
    }
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

        // Preservamos la selección si sigue siendo válida. Si no hay ninguna,
        // solo autoseleccionamos cuando existe un único barbero (con 2+ el
        // cliente debe elegir a mano).
        const nextSelectedBarber =
          nextBarbers.find((barber) => barber.id === selectedBarberId) ??
          (nextBarbers.length === 1 ? nextBarbers[0] : undefined);

        setActiveBarbers(nextBarbers);
        setSelectedBarberId(nextSelectedBarber?.id ?? "");
        setSelectedBarberServices(nextSelectedBarber?.services ?? []);
        setSelectedServiceId(elegirServicioInicial(nextSelectedBarber?.services ?? []));
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
          setSelectedServiceId(elegirServicioInicial(selectedBarber.services));
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
          elegirServicioInicial(nextServices, selectedServiceId),
        );
      } catch {
        if (isMounted) {
          setSelectedBarberServices(selectedBarber.services);
          setSelectedServiceId(elegirServicioInicial(selectedBarber.services));
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
          minBookingNoticeMinutes: barbershop.minBookingNoticeMinutes ?? 0,
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
        setTandaDeHorarios(
          `${selectedBarberId}|${selectedService.id}|${selectedDate}`,
        );

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
    barbershop.minBookingNoticeMinutes,
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

    // Email obligatorio si la barbería lo configuró.
    if (barbershop.requireClientEmail && !clientEmail.trim()) {
      setFormError("Esta barbería necesita tu email para reservar.");
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

    // La pestaña de WhatsApp se pide ACÁ, mientras el navegador todavía
    // reconoce el click. Más abajo hay dos idas y vueltas a la red (validar el
    // horario y crear la reserva) y para cuando terminan el permiso ya se
    // perdió: `window.open` queda bloqueado y el cliente se come la pantalla
    // de "listo" sin que se abra nada. Ver src/lib/pending-tab.ts.
    const whatsappTab = openPendingTab();

    // Toda salida por error cierra la pestaña que se abrió con el click. Sin
    // esto, un horario ya tomado o un fallo de red te dejan una pestaña
    // "Abriendo WhatsApp…" que no lleva a ningún lado.
    const failBooking = (mensaje: string) => {
      whatsappTab.cancel();
      setFormError(mensaje);
    };

    // ── Acá NO se valida la disponibilidad ────────────────────────────────
    // Antes había, justo en este punto, una consulta a Supabase desde el
    // navegador para chequear si el horario seguía libre. La sacamos: el
    // servidor hace exactamente el mismo chequeo (`assertSlotBookable`) antes
    // de insertar, y además cubre lo que el cliente no puede — la carrera
    // entre dos personas reservando el mismo minuto, que la frena el índice
    // único de la base.
    //
    // O sea que era un viaje entero a la red (cuatro consultas) que no
    // agregaba ninguna garantía y que el cliente esperaba MIRANDO UNA PESTAÑA
    // EN BLANCO, porque la de WhatsApp ya se abrió con el click.
    //
    // El caso "se ocupó recién" no se pierde: el 23505 del servidor se maneja
    // más abajo y hace lo mismo que hacía este bloque — marca el horario como
    // ocupado y limpia la selección.

    // ── Barbería con seña activa ──────────────────────────────────────────
    // La reserva la crea el server (necesita el access_token de MP, secreto).
    // El cierre del flujo pasa a ser el pago de la seña, no el WhatsApp.
    if (barbershop.mpEnabled) {
      setIsSaving(true);
      try {
        const res = await fetch("/api/appointments/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            barbershopSlug: barbershop.slug,
            barberId: selectedBarber.id,
            barberName: selectedBarberName,
            serviceId: selectedService.id,
            customerName: clientName.trim(),
            customerPhone: clientPhone.trim(),
            customerEmail: clientEmail.trim() || null,
            appointmentDate: selectedDate,
            appointmentTime: selectedTime,
            comment: comment.trim(),
            products: pedidoDeProductos,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          token?: string;
          initPoint?: string;
          depositAmount?: number;
          error?: string;
          productos?: ProductoDeTurno[];
          productosNoSumados?: string[];
        };

        if (!res.ok || !data.ok || !data.token) {
          if (res.status === 409) {
            setAvailabilitySlots((currentSlots) =>
              currentSlots.map((slot) =>
                slot.time === selectedTime
                  ? { ...slot, isAvailable: false, reason: "occupied" }
                  : slot,
              ),
            );
            setSelectedTime("");
          }
          failBooking(
            data.error || "No pudimos crear la reserva. Probá de nuevo.",
          );
          return;
        }

        setBookingResult({
          confirmationToken: data.token,
          barberName: selectedBarberName,
          serviceName: selectedService.name,
          servicePrice: selectedService.price,
          serviceDurationMinutes: selectedService.durationMinutes,
          date: selectedDate,
          time: selectedTime,
          customerName: clientName.trim(),
          customerPhone: clientPhone.trim(),
          comment,
          whatsappLink: "",
          depositAmount: data.depositAmount ?? null,
          initPoint: data.initPoint ?? null,
          productos: data.productos ?? [],
          productosNoSumados: data.productosNoSumados ?? [],
        });
      } catch {
        failBooking("No pudimos crear la reserva. Probá de nuevo.");
      } finally {
        setIsSaving(false);
      }
      return;
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
    // Lo que el SERVIDOR dijo que quedó anotado. El WhatsApp y la pantalla de
    // éxito usan esto, no lo que el cliente tenía tildado: si un producto se
    // agotó en el medio, no puede aparecer en el mensaje al barbero.
    let productosAnotados: ProductoDeTurno[] = [];
    let productosNoSumados: string[] = [];

    try {
      // La reserva la crea el SERVER, no el browser. Antes esto era un insert
      // directo con la anon key: el precio, el descuento y hasta el horario
      // llegaban del cliente sin que nadie los validara. Ahora el endpoint
      // resuelve todo contra la base (precio y duración del servicio, cupón,
      // disponibilidad real del barbero) y el status sale de la config de la
      // barbería, no de acá.
      const res = await fetch("/api/appointments/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barbershopSlug: barbershop.slug,
          barberId: selectedBarber.id,
          barberName: selectedBarberName,
          serviceId: selectedService.id,
          customerName: appointment.customer_name,
          customerPhone: appointment.customer_phone,
          customerEmail: appointment.customer_email,
          appointmentDate: selectedDate,
          appointmentTime: selectedTime,
          comment,
          couponCode: appliedCoupon?.code ?? null,
          products: pedidoDeProductos,
        }),
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        token?: string;
        error?: string;
        productos?: ProductoDeTurno[];
        productosNoSumados?: string[];
      };
      productosAnotados = payload.productos ?? [];
      productosNoSumados = payload.productosNoSumados ?? [];
      const data = payload.ok && payload.token
        ? { confirmation_token: payload.token }
        : null;
      if (!data) {
        // 409 = el horario no se puede reservar. El servidor manda el motivo
        // real (ocupado, bloqueado, fuera del horario de ESE barbero, muy
        // pronto) y acá se muestra tal cual.
        //
        // Antes cualquier 409 se traducía a "acaba de ocuparse". Una barbería
        // reportó que un barbero le bloqueaba la agenda a otro: el horario
        // estaba fuera del día de ese barbero, pero el cartel decía que alguien
        // se lo había ganado de mano, y salieron a buscar un choque que no
        // existía. El mensaje del servidor ya venía bien; lo tirábamos.
        if (res.status === 409) {
          setAvailabilitySlots((currentSlots) =>
            currentSlots.map((slot) =>
              slot.time === selectedTime
                ? { ...slot, isAvailable: false, reason: "occupied" }
                : slot,
            ),
          );
          setSelectedTime("");
          failBooking(payload.error || "Ese horario no está disponible. Elegí otro.");
          return;
        }

        failBooking(
          payload.error ||
            "No pudimos guardar la reserva. Revisá los datos e intentá nuevamente.",
        );
        return;
      }

      confirmationToken = data?.confirmation_token;
    } catch {
      failBooking(
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
      barberWhatsapp: selectedBarber?.whatsapp,
      clientName: appointment.customer_name,
      clientPhone: appointment.customer_phone,
      serviceName: selectedService.name,
      barberName: selectedBarberName,
      date: formatDateForDisplay(selectedDate),
      time: selectedTime,
      comment,
      products: productosAnotados.map(renglonEnTexto),
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
        productos: productosAnotados,
        productosNoSumados,
      });
    }

    // Abrimos WhatsApp automático como hasta ahora — el cliente puede
    // mandar el mensaje y después volver al browser para usar el link
    // de confirmación.
    whatsappTab.go(whatsappLink);
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
    ...productosElegidos.map((p) => ({
      label: "Llevás",
      value: `${renglonEnTexto(p)} · ${formatPrice(p.unit_price * p.quantity)}`,
    })),
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
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] bg-gold-grad px-6 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)]"
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
    // "user": con "reducir movimiento" en el sistema, Framer Motion deja de
    // mover y de animar el layout, y solo conserva los cambios de opacidad.
    <MotionConfig reducedMotion="user">
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
                className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitWaitlist}
                disabled={isSubmittingWaitlist}
                className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] bg-gold-grad px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)] disabled:opacity-50"
              >
                {isSubmittingWaitlist ? "Guardando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-8 pb-28 sm:gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-20 lg:pb-0"
    >
      <section className="min-w-0 space-y-6 sm:space-y-10">
        <div className="animate-fade-up">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
            Reserva online
          </p>
          <h1 className="mt-3 text-[1.75rem] font-black uppercase leading-[0.95] tracking-tight text-balance break-words sm:mt-6 sm:text-5xl lg:text-6xl">
            {barbershop.name}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--text-secondary)] sm:mt-6 sm:text-base sm:leading-7">
            Reservá tu turno en un minuto. Elegí barbero, servicio, día y hora —
            listo.
          </p>
          <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[color:var(--text-muted)]">
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-[color:var(--brand-gold)]" aria-hidden="true" />
              Sin cuenta, sin vueltas
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-[color:var(--brand-gold)]" aria-hidden="true" />
              Cancelás gratis hasta 1h antes
            </li>
          </ul>
        </div>

        <div className="space-y-6">
          {isLoadingBarbers ? (
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
              Cargando barberos…
            </p>
          ) : null}

          <div className="space-y-3" id="paso-barbero">
            <StepHeader
              number={1}
              title={activeBarbers.length > 1 ? "Elegí tu barbero" : "Tu barbero"}
              done={Boolean(selectedBarberId)}
            />
            {activeBarbers.length > 1 ? (
              <BarberPicker
                barbers={activeBarbers}
                selectedId={selectedBarberId}
                disabled={isSaving}
                onSelect={handleBarberChange}
              />
            ) : selectedBarber ? (
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-3 py-2.5">
                <InitialsAvatar name={selectedBarberName} active />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-white">
                    {selectedBarberName}
                  </span>
                  {selectedBarber.role ? (
                    <span className="block truncate text-[11px] text-[color:var(--text-muted)]">
                      {selectedBarber.role}
                    </span>
                  ) : null}
                </span>
              </div>
            ) : null}
          </div>

          <div className="space-y-3" id="paso-servicio">
            <StepHeader
              number={2}
              title="¿Qué te hacés?"
              subtitle={isLoadingServices ? "Actualizando…" : undefined}
              done={Boolean(selectedService)}
              locked={!selectedBarber}
            />
            {/* El aviso grande va UNA sola vez, en el paso de la fecha. Acá y
                en los horarios alcanza con el paso en gris: repetir el mismo
                cartel tres veces convierte la ayuda en ruido y deja de leerse. */}
            {!selectedBarber ? (
              <p className="text-xs text-[color:var(--text-muted)]">
                Se abre cuando elijas tu barbero.
              </p>
            ) : availableServices.length === 0 &&
              !isLoadingServices &&
              !isLoadingBarbers ? (
              <p className="text-xs font-semibold text-[color:var(--danger)]">
                Este barbero no tiene servicios activos.
              </p>
            ) : (
              <Aparecer key={selectedBarberId}>
                <ServicePicker
                  services={availableServices}
                  selectedId={selectedService?.id ?? ""}
                  disabled={isSaving || isLoadingServices}
                  onSelect={handleServiceChange}
                />
              </Aparecer>
            )}
          </div>

          <div className="space-y-3" id="paso-dia">
            <StepHeader
              number={3}
              title="¿Qué día?"
              subtitle={
                selectedDate ? getWeekdayName(selectedDate) : undefined
              }
              done={Boolean(selectedDate)}
              locked={faltaBarbero || faltaServicio}
            />
            {/* La tira de días no sirve hasta tener barbero Y servicio: el
                horario se calcula contra la agenda de UNO y depende de cuánto
                dura lo que se va a hacer. Antes quedaba clickeable igual, y ahí
                se perdía la gente — tocaba un día, no pasaba nada y se iba
                creyendo que la barbería no tenía turnos. */}
            {faltaBarbero ? (
              <PasoPendiente
                texto="Elegí primero tu barbero y ahí se abren los días con sus horarios."
                irA="paso-barbero"
                irLabel="Elegir barbero"
              />
            ) : faltaServicio ? (
              <PasoPendiente
                texto="Ahora elegí qué te vas a hacer: el horario depende de cuánto dura."
                irA="paso-servicio"
                irLabel="Elegir servicio"
              />
            ) : null}
            <div
              className={
                faltaBarbero || faltaServicio
                  ? "pointer-events-none select-none opacity-45"
                  : undefined
              }
            >
            <DateStrip
              value={selectedDate}
              today={getTodayInputValue()}
              disabled={isSaving || faltaBarbero || faltaServicio}
              onChange={(ymd) => {
                // Doble guard contra fechas pasadas (por el input "otra fecha").
                setSelectedDate(
                  ymd < getTodayInputValue() ? getTodayInputValue() : ymd,
                );
                setSelectedTime("");
                setFormError("");
              }}
            />
            </div>
          </div>

          {/* Horarios como grid de pills clickeables */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <StepHeader
                number={4}
                title="¿A qué hora?"
                done={Boolean(selectedTime)}
                locked={faltaServicio}
              />
              {isLoadingTimes ? (
                <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-subtle)]">
                  Actualizando…
                </span>
              ) : null}
            </div>

            {/* Decía siempre "elegí un servicio", incluso cuando lo que faltaba
                era el barbero: mandaba a un paso que todavía estaba cerrado. */}
            {faltaServicio ? (
              faltaBarbero ? (
                <p className="mt-4 text-xs text-[color:var(--text-muted)]">
                  Se abren cuando elijas tu barbero.
                </p>
              ) : isLoadingServices || isLoadingBarbers ? null : availableServices.length > 0 ? (
                <p className="mt-4 text-xs text-[color:var(--text-muted)]">
                  Se abren cuando elijas el servicio.
                </p>
              ) : (
                // Barbero elegido y ni un servicio en la lista: no es que falte
                // tocar algo, es que ese barbero no tiene ninguno activo. De eso
                // ya avisa el paso 2, así que acá no hay a dónde mandarlo.
                <p className="mt-4 text-xs font-semibold text-[color:var(--danger)]">
                  Este barbero todavía no tiene servicios para reservar.
                </p>
              )
            ) : availabilitySlots.length === 0 && !isLoadingTimes ? (
              <div className="mt-4 grid gap-3">
                {barbershop.waitlistEnabled ? (
                  <>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      No hay horarios disponibles para esta fecha.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowWaitlistForm(true)}
                      className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-soft)]/80"
                    >
                      Anotarme en lista de espera
                    </button>
                  </>
                ) : (
                  // Lista de espera desactivada por la barbería: solo aviso claro.
                  <div className="flex flex-col items-center gap-2.5 rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-5 py-7 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                        aria-hidden="true"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                    </span>
                    <p className="text-sm font-semibold text-white">
                      No hay turnos disponibles para esta fecha.
                    </p>
                    <p className="text-xs leading-5 text-[color:var(--text-muted)]">
                      Probá con otro día para ver más horarios.
                    </p>
                  </div>
                )}
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

                  function renderSlot(
                    slot: typeof availabilitySlots[number],
                    orden: number,
                  ) {
                    const isSelected = slot.time === selectedTime;
                    const title = SLOT_REASON_TITLE[slot.reason] || undefined;
                    const sePuedeTocar = slot.isAvailable && !isSaving;
                    // Con un horario ya elegido, los otros libres se apagan un
                    // poco para que el elegido sea lo que se ve. Vuelven al
                    // pasarles por encima: siguen siendo elegibles.
                    const apagado =
                      Boolean(selectedTime) && !isSelected && slot.isAvailable;
                    return (
                      // La entrada va en un envoltorio aparte: así la demora de
                      // la cascada no retrasa también el toque.
                      <motion.div
                        key={`${tandaDeHorarios}-${slot.time}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.22,
                          ease: EASE_SUAVE,
                          // Tope: una grilla larga no puede tardar un segundo.
                          delay: Math.min(orden, 20) * 0.025,
                        }}
                      >
                      <motion.button
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={!slot.isAvailable || isSaving}
                        onClick={() => handleSlotSelect(slot)}
                        title={title}
                        initial={false}
                        animate={{
                          scale: isSelected ? [1, 1.08, 1] : 1,
                          opacity: apagado ? 0.6 : 1,
                        }}
                        whileHover={sePuedeTocar ? { opacity: 1 } : undefined}
                        whileTap={sePuedeTocar ? { scale: 0.95 } : undefined}
                        transition={{ duration: 0.24, ease: EASE_SUAVE }}
                        className={cn(
                          "min-h-11 w-full rounded-[var(--radius-sm)] border font-mono text-xs font-bold tabular-nums transition-colors duration-[var(--duration-fast)]",
                          isSelected
                            ? "gloss-gold border-[color:var(--brand-gold)] bg-gold-grad text-black"
                            : slot.isAvailable
                              ? "key-dark border-[color:var(--border-default)] text-white hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
                              : "cursor-not-allowed border-[color:var(--border-subtle)] text-[color:var(--text-subtle)] line-through",
                        )}
                      >
                        {slot.time}
                      </motion.button>
                      </motion.div>
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
                            {afternoonSlots.map((slot, i) =>
                              renderSlot(slot, morningSlots.length + i),
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
                {availabilitySlots.some((slot) => !slot.isAvailable) ? (
                  <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
                    Horarios no disponibles
                  </p>
                ) : null}
              </>
            )}
          </div>

          {/* Paso opcional: sumar productos del catálogo al turno (035). Solo
              existe si la barbería tiene productos disponibles, y nunca
              bloquea: se puede seguir de largo sin tocar nada. */}
          {selectedTime && hayCatalogo ? (
            <div id="paso-productos">
              <Aparecer className="space-y-3">
                <StepHeader
                  number={5}
                  title="¿Te llevás algo?"
                  subtitle="Opcional · lo pagás en el local"
                  done={productosElegidos.length > 0}
                />
                <ProductPicker
                  productos={productos}
                  cantidades={cantidades}
                  disabled={isSaving}
                  onChange={handleProductChange}
                />
              </Aparecer>
            </div>
          ) : null}

          {selectedTime ? (
          <div id="paso-datos">
          <Aparecer className="space-y-5">
            <StepHeader
              number={hayCatalogo ? 6 : 5}
              title="Tus datos"
              subtitle="Último paso"
              done={Boolean(clientName.trim() && clientPhone.trim())}
            />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
            optional={!barbershop.requireClientEmail}
            hint={
              barbershop.requireClientEmail
                ? "Te enviamos la confirmación y el recordatorio del turno a este email."
                : "Solo para que te contactemos si hay que cambiar el turno."
            }
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
              required={barbershop.requireClientEmail}
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
          </Aparecer>
          </div>
          ) : (
            <p className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-default)] px-4 py-6 text-center text-xs text-[color:var(--text-muted)]">
              Elegí un horario y te pedimos tus datos.
            </p>
          )}
        </div>
      </section>

      {/* Resumen — columna lateral minimalista */}
      {/* Con productos el resumen crece. Si llegara a ser más alto que la
          pantalla, se desliza por dentro: el botón de reservar no puede quedar
          fuera de alcance. */}
      <aside className="min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto">
        <div
          className="card-premium animate-fade-up p-5 sm:p-6 lg:p-6"
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
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: EASE_SUAVE }}
                  className="mt-1 font-mono text-base font-semibold tabular-nums leading-none text-[color:var(--text-muted)] line-through"
                >
                  {formatPrice(selectedService.price)}
                </motion.p>
              ) : null}
              {/* Un solo número para el total: al aplicar un cupón cuenta
                  desde el precio de lista hasta el final, en vez de cambiar
                  de golpe. */}
              <p
                className={cn(
                  appliedCoupon ? "mt-1" : "mt-2",
                  "text-gold-gradient font-mono text-3xl font-black tabular-nums leading-none sm:text-5xl",
                )}
              >
                <PrecioAnimado
                  value={
                    (appliedCoupon
                      ? appliedCoupon.finalPrice
                      : selectedService.price) + totalProductos
                  }
                />
              </p>

              {productosElegidos.length > 0 ? (
                <p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">
                  {selectedService.name}{" "}
                  {formatPrice(
                    appliedCoupon ? appliedCoupon.finalPrice : selectedService.price,
                  )}{" "}
                  + productos {formatPrice(totalProductos)}. Los productos los
                  pagás en el local.
                </p>
              ) : null}

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

          <dl className="mt-6 grid grid-cols-1 gap-3 sm:mt-10 sm:gap-5 lg:mt-6 lg:gap-3">
            {summaryRows.map((row, i) => (
              <div
                key={`${row.label}-${i}`}
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

          <p className="mt-8 lg:mt-5 text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-subtle)]">
            Al reservar, guardamos el turno y abrimos WhatsApp.
          </p>

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={isSaving}
            disabled={isSubmitDisabled}
            className="gloss-gold mt-5 hidden lg:inline-flex"
          >
            {isSaving ? "Guardando…" : "Reservar turno"}
          </Button>
        </div>
      </aside>

      {/* Sticky bottom CTA (mobile) — barra prominente: precio + RESERVAR grande */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border-strong)] bg-black/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            {selectedService ? (
              <p className="font-mono text-xl font-black tabular-nums leading-none text-[color:var(--brand-gold)]">
                <PrecioAnimado
                  value={
                    (appliedCoupon
                      ? appliedCoupon.finalPrice
                      : selectedService.price) + totalProductos
                  }
                />
              </p>
            ) : (
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-subtle)]">
                Tu turno
              </p>
            )}
            <p className="mt-0.5 truncate text-[11px] text-[color:var(--text-muted)]">
              {compactSummary || "Completá los datos"}
            </p>
          </div>
          <LatidoUnaVez activo={listoParaReservar} className="shrink-0">
          <Button
            type="submit"
            size="lg"
            loading={isSaving}
            disabled={isSubmitDisabled}
            iconRight={
              isSaving ? undefined : <ArrowUpRight className="size-4" />
            }
            className="gloss-gold px-7 text-sm"
          >
            {isSaving ? "Guardando…" : "Reservar"}
          </Button>
          </LatidoUnaVez>
        </div>
      </div>
    </form>
    </MotionConfig>
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
  // Seña MercadoPago.
  depositAmount?: number | null;
  initPoint?: string | null;
  productos?: ProductoDeTurno[];
  productosNoSumados?: string[];
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
  // Si hay seña, el cierre es el pago (no el WhatsApp).
  const isDeposit = Boolean(result.initPoint) || typeof result.depositAmount === "number";
  const payHref =
    result.initPoint ?? `/api/mp/pay?token=${result.confirmationToken}`;
  const productosDelTurno = result.productos ?? [];
  const noSumados = result.productosNoSumados ?? [];
  const totalDeLosProductos = totalDeProductos(productosDelTurno);

  // Esta pantalla reemplaza al formulario sin cambiar de página, así que el
  // scroll quedaba donde estaba el botón "Reservar": el cliente caía en la
  // mitad del detalle y no veía la confirmación.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <section className="grid grid-cols-1 gap-12 pb-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-20 lg:pb-0">
      {/* El orden de entrada es el orden de lectura: tilde, título, qué pasó,
          qué hacer ahora y, al final, el detalle. */}
      <div>
        <div className="relative inline-flex">
          <Destellos />
          <TildeDeExito />
        </div>
        <Aparecer demora={0.2}>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Turno reservado
          </p>
        </Aparecer>
        <TituloPorPalabras
          texto={`¡Listo, ${firstNameOf(result.customerName)}!`}
          demora={0.3}
          className="mt-4 text-4xl font-black uppercase leading-[0.95] tracking-tight text-balance sm:text-5xl lg:text-6xl"
        />
        <Aparecer demora={0.5}>
        <p className="mt-6 max-w-xl text-sm leading-7 text-[color:var(--text-secondary)] sm:text-base">
          Tu turno en{" "}
          <span className="text-white font-semibold">{barbershop.name}</span>{" "}
          {isDeposit ? (
            <>
              queda{" "}
              <span className="text-[color:var(--brand-gold)] font-semibold">
                reservado
              </span>
              . Para confirmarlo, pagá la seña acá abajo. Si no la pagás a
              tiempo, el horario se libera.
            </>
          ) : isAutoConfirmed ? (
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
        </Aparecer>

        {noSumados.length > 0 ? (
          <Aparecer demora={0.55}>
            <p
              role="status"
              className="mt-6 rounded-[var(--radius-sm)] border border-amber-400/40 bg-amber-400/10 px-3 py-2.5 text-xs leading-5 text-amber-200"
            >
              Tu turno quedó reservado, pero no pudimos sumar{" "}
              <strong>{noSumados.join(", ")}</strong>: ya no está disponible.
              Consultale al barbero cuando vayas.
            </p>
          </Aparecer>
        ) : null}

        {isDeposit ? (
          <Aparecer demora={0.6} className="mt-8">
            <DepositPaymentPanel
              amount={result.depositAmount}
              status="pending"
              payHref={payHref}
              barbershopName={barbershop.name}
            />
            <SimulatePaymentButton token={result.confirmationToken} />
          </Aparecer>
        ) : null}

        <Aparecer demora={0.68} className="mt-8 grid gap-3">
          <Button
            as="link"
            href={confirmHref}
            size="lg"
            fullWidth
            iconRight={<ArrowUpRight className="size-4" />}
            className="gloss-gold sm:w-auto"
          >
            Ver mi turno
          </Button>
          {!isDeposit && result.whatsappLink ? (
            <a
              href={result.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] sm:w-auto"
            >
              Reabrir WhatsApp con la reserva
            </a>
          ) : null}
        </Aparecer>

        <Aparecer demora={0.76}>
          <p className="mt-8 text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-subtle)]">
            Guardá este link · podés volver acá cuando quieras
          </p>
        </Aparecer>
      </div>

      {/* Aside: resumen del turno */}
      <aside className="min-w-0 lg:sticky lg:top-12">
        <Aparecer
          demora={0.4}
          className="card-premium p-5 sm:p-6 lg:p-8"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
            Detalle del turno
          </p>
          {result.couponCode && typeof result.finalPrice === "number" ? (
            <>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums leading-none text-[color:var(--text-muted)] line-through">
                {formatPrice(result.servicePrice)}
              </p>
              <p className="text-gold-gradient mt-1 font-mono text-4xl font-black tabular-nums leading-none sm:text-5xl">
                {formatPrice(result.finalPrice)}
              </p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
                Cupón {result.couponCode} aplicado · Ahorrás{" "}
                {formatPrice(result.couponDiscountAmount ?? 0)}
              </p>
            </>
          ) : (
            <p className="text-gold-gradient mt-2 font-mono text-4xl font-black tabular-nums leading-none sm:text-5xl">
              {formatPrice(result.servicePrice)}
            </p>
          )}
          <dl className="mt-8 grid grid-cols-1 gap-4">
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
              ...productosDelTurno.map((p) => ({
                label: "Llevás",
                value: `${renglonEnTexto(p)} · ${formatPrice(p.unit_price * p.quantity)}`,
              })),
              ...(productosDelTurno.length > 0
                ? [
                    {
                      label: "Productos",
                      value: `${formatPrice(totalDeLosProductos)} · se pagan en el local`,
                    },
                  ]
                : []),
            ].map((row, i) => (
              <Aparecer
                key={`${row.label}-${i}`}
                demora={0.5 + i * 0.05}
                className="grid grid-cols-[auto_1fr] items-baseline gap-4"
              >
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  {row.label}
                </dt>
                <dd className="text-right text-sm font-semibold text-white">
                  {row.value}
                </dd>
              </Aparecer>
            ))}
          </dl>
        </Aparecer>
      </aside>
    </section>
    </MotionConfig>
  );
}

function firstNameOf(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}
