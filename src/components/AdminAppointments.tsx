"use client";

import { useEffect, useState } from "react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { listAppointmentsByBarbershop } from "@/lib/appointments";
import { formatDateForDisplay, formatPrice } from "@/lib/format";
import type { AppointmentRow } from "@/lib/supabase";

type AdminAppointmentsProps = {
  barbershop: DemoBarbershop;
};

export function AdminAppointments({ barbershop }: AdminAppointmentsProps) {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

          {!isLoading && !errorMessage && appointments.length === 0 ? (
            <div className="border border-stone-800 bg-stone-900/70 p-6 text-stone-300">
              Todavia no hay reservas para esta barberia.
            </div>
          ) : null}

          {!isLoading && !errorMessage && appointments.length > 0 ? (
            <div className="overflow-hidden border border-stone-800 bg-stone-900/70">
              <div className="hidden grid-cols-[0.9fr_0.7fr_1.1fr_1fr_1fr_0.7fr_1.2fr_0.7fr] gap-4 border-b border-stone-800 px-5 py-4 text-xs font-bold uppercase text-stone-400 lg:grid">
                <span>Fecha</span>
                <span>Horario</span>
                <span>Cliente</span>
                <span>Teléfono</span>
                <span>Servicio</span>
                <span>Precio</span>
                <span>Comentario</span>
                <span>Estado</span>
              </div>

              <div className="divide-y divide-stone-800">
                {appointments.map((appointment) => (
                  <article
                    key={
                      appointment.id ??
                      `${appointment.customer_phone}-${appointment.appointment_date}-${appointment.appointment_time}`
                    }
                    className="grid gap-4 px-5 py-5 text-sm text-stone-100 lg:grid-cols-[0.9fr_0.7fr_1.1fr_1fr_1fr_0.7fr_1.2fr_0.7fr] lg:items-center"
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
                      <span className="inline-flex rounded-md border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-xs font-bold uppercase text-amber-200">
                        {appointment.status}
                      </span>
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
