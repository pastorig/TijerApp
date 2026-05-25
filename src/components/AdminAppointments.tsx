"use client";

import { useEffect, useState } from "react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import {
  cancelAppointment,
  confirmAppointment,
  listAppointmentsByBarbershop,
} from "@/lib/appointments";
import { formatDateForDisplay, formatPrice } from "@/lib/format";
import type { AppointmentRow } from "@/lib/supabase";
import { createWhatsAppConfirmationLink } from "@/lib/whatsapp";

type AdminAppointmentsProps = {
  barbershop: DemoBarbershop;
};

type AppointmentFilter = "all" | "today" | "pending" | "confirmed" | "cancelled";

function getTodayInputValue() {
  return new Date().toISOString().split("T")[0];
}

export function AdminAppointments({ barbershop }: AdminAppointmentsProps) {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState<AppointmentFilter>("all");
  const [confirmingAppointmentId, setConfirmingAppointmentId] = useState<
    string | null
  >(null);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<
    string | null
  >(null);

  function getStatusClasses(status: string) {
    if (status === "confirmed") {
      return "border-emerald-300/30 bg-emerald-300/10 text-emerald-200";
    }

    if (status === "cancelled") {
      return "border-red-300/30 bg-red-400/10 text-red-200";
    }

    return "border-amber-300/30 bg-amber-300/10 text-amber-200";
  }

  const today = getTodayInputValue();
  const filterCounts: Record<AppointmentFilter, number> = {
    all: appointments.length,
    today: appointments.filter(
      (appointment) => appointment.appointment_date === today,
    ).length,
    pending: appointments.filter((appointment) => appointment.status === "pending")
      .length,
    confirmed: appointments.filter(
      (appointment) => appointment.status === "confirmed",
    ).length,
    cancelled: appointments.filter(
      (appointment) => appointment.status === "cancelled",
    ).length,
  };
  const filterOptions: Array<{ label: string; value: AppointmentFilter }> = [
    { label: "Todos", value: "all" },
    { label: "Hoy", value: "today" },
    { label: "Pendientes", value: "pending" },
    { label: "Confirmados", value: "confirmed" },
    { label: "Cancelados", value: "cancelled" },
  ];
  const filteredAppointments = appointments.filter((appointment) => {
    if (activeFilter === "all") {
      return true;
    }

    if (activeFilter === "today") {
      return appointment.appointment_date === today;
    }

    return appointment.status === activeFilter;
  });
  const activeFilterLabel =
    filterOptions.find((filter) => filter.value === activeFilter)?.label ??
    "este filtro";

  async function handleConfirmAppointment(appointment: AppointmentRow) {
    if (!appointment.id) {
      setErrorMessage("No pudimos identificar la reserva.");
      return;
    }

    setErrorMessage("");
    setConfirmingAppointmentId(appointment.id);

    try {
      const { error } = await confirmAppointment(appointment.id);

      if (error) {
        setErrorMessage("No pudimos confirmar la reserva.");
        return;
      }

      setAppointments((currentAppointments) =>
        currentAppointments.map((currentAppointment) =>
          currentAppointment.id === appointment.id
            ? { ...currentAppointment, status: "confirmed" }
            : currentAppointment,
        ),
      );

      const whatsappLink = createWhatsAppConfirmationLink({
        barbershopName: barbershop.name,
        clientName: appointment.customer_name,
        clientPhone: appointment.customer_phone,
        serviceName: appointment.service_name,
        date: formatDateForDisplay(appointment.appointment_date),
        time: appointment.appointment_time,
      });

      window.open(whatsappLink, "_blank", "noopener,noreferrer");
    } catch {
      setErrorMessage("No pudimos confirmar la reserva.");
    } finally {
      setConfirmingAppointmentId(null);
    }
  }

  async function handleCancelAppointment(appointment: AppointmentRow) {
    if (!appointment.id) {
      setErrorMessage("No pudimos identificar la reserva.");
      return;
    }

    const shouldCancel = window.confirm(
      `¿Cancelar el turno de ${appointment.customer_name} del ${formatDateForDisplay(
        appointment.appointment_date,
      )} a las ${appointment.appointment_time}?`,
    );

    if (!shouldCancel) {
      return;
    }

    setErrorMessage("");
    setCancellingAppointmentId(appointment.id);

    try {
      const { error } = await cancelAppointment(appointment.id);

      if (error) {
        setErrorMessage("No pudimos cancelar la reserva.");
        return;
      }

      setAppointments((currentAppointments) =>
        currentAppointments.map((currentAppointment) =>
          currentAppointment.id === appointment.id
            ? { ...currentAppointment, status: "cancelled" }
            : currentAppointment,
        ),
      );
    } catch {
      setErrorMessage("No pudimos cancelar la reserva.");
    } finally {
      setCancellingAppointmentId(null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadAppointments() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const { data, error } = await listAppointmentsByBarbershop(
          barbershop.slug,
        );

        if (!isMounted) {
          return;
        }

        if (error) {
          setErrorMessage("No pudimos cargar las reservas.");
          setAppointments([]);
          return;
        }

        setAppointments(data ?? []);
      } catch {
        if (isMounted) {
          setErrorMessage("No pudimos cargar las reservas.");
          setAppointments([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAppointments();

    return () => {
      isMounted = false;
    };
  }, [barbershop.slug]);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-50">
      <section className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10 sm:py-14 lg:px-12">
        <div className="flex flex-col gap-3 border-b border-stone-800 pb-8">
          <p className="text-sm font-semibold uppercase text-amber-300">
            Panel admin
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-black text-balance sm:text-5xl">
                Reservas de {barbershop.name}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-stone-300">
                Vista inicial de turnos cargados desde Supabase para esta
                barberia. Este panel es publico hasta implementar login.
              </p>
            </div>
            <div className="rounded-md border border-stone-800 bg-stone-900 px-4 py-3 text-sm text-stone-300">
              <span className="font-mono text-amber-300">
                {appointments.length}
              </span>{" "}
              reservas
            </div>
          </div>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <div className="border border-stone-800 bg-stone-900/70 p-6 text-stone-300">
              Cargando reservas...
            </div>
          ) : null}

          {!isLoading && errorMessage ? (
            <div className="border border-red-400/30 bg-red-500/10 p-6 text-sm font-semibold text-red-200">
              {errorMessage}
            </div>
          ) : null}

          {!isLoading && !errorMessage && appointments.length > 0 ? (
            <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
              {filterOptions.map((filter) => {
                const isActive = activeFilter === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    className={`min-h-11 shrink-0 rounded-md border px-4 py-2 text-sm font-bold transition ${
                      isActive
                        ? "border-amber-300 bg-amber-300 text-stone-950"
                        : "border-stone-800 bg-stone-900 text-stone-300 hover:border-stone-600"
                    }`}
                  >
                    {filter.label} ({filterCounts[filter.value]})
                  </button>
                );
              })}
            </div>
          ) : null}

          {!isLoading && !errorMessage && appointments.length === 0 ? (
            <div className="border border-stone-800 bg-stone-900/70 p-6 text-stone-300">
              Todavia no hay reservas para esta barberia.
            </div>
          ) : null}

          {!isLoading &&
          !errorMessage &&
          appointments.length > 0 &&
          filteredAppointments.length === 0 ? (
            <div className="border border-stone-800 bg-stone-900/70 p-6 text-stone-300">
              No hay reservas para el filtro {activeFilterLabel}.
            </div>
          ) : null}

          {!isLoading && !errorMessage && filteredAppointments.length > 0 ? (
            <div className="overflow-hidden border border-stone-800 bg-stone-900/70">
              <div className="hidden grid-cols-[0.8fr_0.65fr_1fr_0.95fr_0.95fr_0.65fr_1fr_0.75fr_1.35fr] gap-4 border-b border-stone-800 px-5 py-4 text-xs font-bold uppercase text-stone-400 lg:grid">
                <span>Fecha</span>
                <span>Horario</span>
                <span>Cliente</span>
                <span>Teléfono</span>
                <span>Servicio</span>
                <span>Precio</span>
                <span>Comentario</span>
                <span>Estado</span>
                <span>Acción</span>
              </div>

              <div className="divide-y divide-stone-800">
                {filteredAppointments.map((appointment) => (
                  <article
                    key={
                      appointment.id ??
                      `${appointment.customer_phone}-${appointment.appointment_date}-${appointment.appointment_time}`
                    }
                    className="grid gap-4 px-5 py-5 text-sm text-stone-100 lg:grid-cols-[0.8fr_0.65fr_1fr_0.95fr_0.95fr_0.65fr_1fr_0.75fr_1.35fr] lg:items-center"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">
                        Fecha
                      </p>
                      {formatDateForDisplay(appointment.appointment_date)}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">
                        Horario
                      </p>
                      <span className="font-mono text-amber-300">
                        {appointment.appointment_time}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">
                        Cliente
                      </p>
                      {appointment.customer_name}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">
                        Teléfono
                      </p>
                      {appointment.customer_phone}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">
                        Servicio
                      </p>
                      {appointment.service_name}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">
                        Precio
                      </p>
                      {formatPrice(appointment.service_price)}
                    </div>
                    <div className="text-stone-300">
                      <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">
                        Comentario
                      </p>
                      {appointment.comment || "Sin comentario"}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">
                        Estado
                      </p>
                      <span
                        className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold uppercase ${getStatusClasses(
                          appointment.status,
                        )}`}
                      >
                        {appointment.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">
                        Acción
                      </p>
                      <div className="mt-2 grid gap-2 lg:mt-0">
                        <button
                          type="button"
                          disabled={
                            appointment.status === "confirmed" ||
                            appointment.status === "cancelled" ||
                            confirmingAppointmentId === appointment.id ||
                            cancellingAppointmentId === appointment.id
                          }
                          onClick={() => handleConfirmAppointment(appointment)}
                          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-amber-300 px-4 py-2 text-xs font-bold uppercase text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-amber-300"
                        >
                          {confirmingAppointmentId === appointment.id
                            ? "Confirmando..."
                            : appointment.status === "confirmed"
                              ? "Confirmado"
                              : "Confirmar por WhatsApp"}
                        </button>
                        <button
                          type="button"
                          disabled={
                            appointment.status === "cancelled" ||
                            confirmingAppointmentId === appointment.id ||
                            cancellingAppointmentId === appointment.id
                          }
                          onClick={() => handleCancelAppointment(appointment)}
                          className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-red-300/40 px-4 py-2 text-xs font-bold uppercase text-red-100 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
                        >
                          {cancellingAppointmentId === appointment.id
                            ? "Cancelando..."
                            : appointment.status === "cancelled"
                              ? "Cancelado"
                              : "Cancelar turno"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
