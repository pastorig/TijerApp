"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarX2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MessageCircle,
  X,
} from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { createWhatsAppClientContactLink } from "@/lib/whatsapp";

/**
 * La agenda del empleado: SUS turnos del día.
 *
 * Los datos no se piden a Supabase desde acá — el empleado no puede leer
 * `appointments` por RLS, a propósito. Todo pasa por `/api/staff/*`, que
 * resuelve en el servidor de qué barbero es la agenda a partir del token. Acá
 * no se manda ningún `barberId`: si se mandara, sería un dato del cliente
 * decidiendo qué agenda se ve.
 *
 * ── Qué mira un barbero mientras labura ─────────────────────────────────────
 * Primero: qué viene ahora. Después: cuántos le quedan y cuánto lleva ganado.
 * Por eso el próximo turno va destacado arriba de todo y el resumen del día
 * está a la vista, no escondido en otra pestaña.
 */

type Turno = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  service_name: string;
  service_price: number | null;
  service_duration_minutes: number | null;
  appointment_time: string;
  comment: string | null;
  status: "pending" | "confirmed" | "cancelled";
};

type Respuesta = {
  turnos?: Turno[];
  produccionDelDia?: number;
  comisionDelDia?: number | null;
  error?: string;
};

const TZ = "America/Argentina/Buenos_Aires";

function hoyEnArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Minutos transcurridos del día, en hora argentina. */
function minutosDeAhora(): number {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [h, m] = partes.split(":").map(Number);
  return h * 60 + m;
}

function sumarDias(ymd: string, dias: number): string {
  const [a, m, d] = ymd.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

/** "lun 25 ago" — corto, para el selector de días. */
function diaCorto(ymd: string): { dia: string; num: string; mes: string } {
  const [a, m, d] = ymd.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("es-AR", { ...opts, timeZone: "UTC" }).format(fecha);
  return {
    dia: fmt({ weekday: "short" }).replace(".", "").slice(0, 3),
    num: String(d),
    mes: fmt({ month: "short" }).replace(".", ""),
  };
}

/**
 * "Martes 25 de agosto" — el encabezado.
 *
 * La mayúscula se pone acá y NO con `capitalize` de CSS: esa clase la pone en
 * CADA palabra y deja "Martes, 25 De Agosto", que se lee como un cartel de
 * inmobiliaria. Es el mismo bug que ya había aparecido en Sacatucancha.
 */
function fechaLarga(ymd: string): string {
  const [a, m, d] = ymd.split("-").map(Number);
  const texto = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(a, m - 1, d)));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function StaffAgenda({
  barbershopSlug,
  barbershopName,
}: {
  barbershopSlug: string;
  barbershopName: string;
}) {
  const [fecha, setFecha] = useState(hoyEnArgentina);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [comision, setComision] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [tocando, setTocando] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      setCargando(true);
      setError("");
      try {
        const { data: sessionData } = await getCurrentSession();
        const token = sessionData.session?.access_token;
        if (!vivo) return;
        if (!token) {
          setError("Se cerró tu sesión. Volvé a entrar.");
          return;
        }
        const res = await fetch(
          `/api/staff/agenda?bs=${encodeURIComponent(barbershopSlug)}&date=${fecha}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const payload = (await res.json().catch(() => ({}))) as Respuesta;
        if (!vivo) return;
        if (!res.ok) {
          setError(payload.error ?? "No pudimos traer tus turnos.");
          return;
        }
        setTurnos(payload.turnos ?? []);
        setComision(payload.comisionDelDia ?? null);
      } catch {
        if (vivo) setError("No pudimos traer tus turnos.");
      } finally {
        if (vivo) setCargando(false);
      }
    }
    cargar();
    return () => {
      vivo = false;
    };
  }, [barbershopSlug, fecha, recarga]);

  async function cambiarEstado(id: string, status: "confirmed" | "cancelled") {
    setTocando(id);
    try {
      const { data: sessionData } = await getCurrentSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/staff/appointment-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ barbershopSlug, appointmentId: id, status }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "No pudimos actualizar el turno.");
        return;
      }
      // Se recarga en vez de tocar el estado a mano: así lo que se ve es lo que
      // quedó guardado, y no una versión optimista que puede diferir.
      setRecarga((v) => v + 1);
    } finally {
      setTocando(null);
    }
  }

  const hoy = hoyEnArgentina();
  const esHoy = fecha === hoy;

  const activos = useMemo(
    () => turnos.filter((t) => t.status !== "cancelled"),
    [turnos],
  );

  /** El que está pasando ahora, o el que sigue. Solo tiene sentido hoy. */
  const destacado = useMemo(() => {
    if (!esHoy) return null;
    const ahora = minutosDeAhora();
    const enCurso = activos.find((t) => {
      const inicio = aMinutos(t.appointment_time);
      return (
        ahora >= inicio && ahora < inicio + (t.service_duration_minutes ?? 30)
      );
    });
    if (enCurso) return { turno: enCurso, enCurso: true };
    const proximo = activos.find((t) => aMinutos(t.appointment_time) > ahora);
    return proximo ? { turno: proximo, enCurso: false } : null;
  }, [activos, esHoy]);

  /** Siete días arrancando ayer, para poder mirar atrás sin perder el hilo. */
  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i - 1)),
    [hoy],
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-4">
      {/* Selector de días: se ve de un vistazo dónde estás parado, en vez de
          tres botones iguales que no dicen qué día es cada uno. */}
      <div className="-mx-1 flex items-center gap-1 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFecha((f) => sumarDias(f, -1))}
          aria-label="Día anterior"
          className="shrink-0 rounded-full p-2 text-[color:var(--text-muted)] hover:text-white"
        >
          <ChevronLeft className="size-4" />
        </button>
        {dias.map((dia) => {
          const activo = dia === fecha;
          const info = diaCorto(dia);
          return (
            <button
              key={dia}
              type="button"
              onClick={() => setFecha(dia)}
              className={cn(
                "flex shrink-0 flex-col items-center rounded-[var(--radius-md)] px-3 py-2 transition-colors",
                activo
                  ? "bg-gold-grad text-black"
                  : "border border-[color:var(--border-subtle)] text-[color:var(--text-secondary)]",
              )}
            >
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] opacity-80">
                {dia === hoy ? "hoy" : info.dia}
              </span>
              <span className="text-base font-black leading-none">
                {info.num}
              </span>
              <span className="text-[9px] font-semibold uppercase opacity-70">
                {info.mes}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setFecha((f) => sumarDias(f, 1))}
          aria-label="Día siguiente"
          className="shrink-0 rounded-full p-2 text-[color:var(--text-muted)] hover:text-white"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <h1 className="mt-4 text-xl font-black tracking-tight text-white">
        {fechaLarga(fecha)}
      </h1>

      {/* El resumen del día, arriba: cuántos turnos y cuánto se lleva. Es lo
          que un barbero quiere saber sin entrar a otra pantalla. */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="card-premium px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            Turnos
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums leading-none text-white">
            {activos.length}
          </p>
        </div>
        <div className="card-premium px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            Te llevás
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-black tabular-nums leading-none",
              comision === null
                ? "text-[color:var(--text-subtle)]"
                : "bg-gradient-to-br from-[color:var(--brand-gold-hi)] via-[color:var(--brand-gold)] to-[color:var(--brand-gold-lo)] bg-clip-text text-transparent",
            )}
          >
            {comision === null ? "—" : formatPrice(comision)}
          </p>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-[color:var(--danger)]"
        >
          {error}
        </p>
      ) : null}

      {cargando ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-5 animate-spin text-[color:var(--text-muted)]" />
        </div>
      ) : turnos.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-subtle)] px-6 py-12 text-center">
          <CalendarX2 className="size-7 text-[color:var(--text-subtle)]" />
          <p className="mt-3 text-sm font-bold text-white">
            {esHoy ? "Hoy no tenés turnos" : "Sin turnos este día"}
          </p>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            Cuando alguien reserve con vos, te aparece acá.
          </p>
        </div>
      ) : (
        <>
          {destacado ? (
            <section
              className={cn(
                "card-premium card-premium-glow mt-5 p-4",
                destacado.enCurso && "border-[color:var(--brand-gold)]",
              )}
            >
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--brand-gold)]">
                <Clock className="size-3" />
                {destacado.enCurso ? "Atendiendo ahora" : "Tu próximo turno"}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-black tabular-nums leading-none text-white">
                  {destacado.turno.appointment_time.slice(0, 5)}
                </span>
                <span className="truncate text-base font-bold text-white">
                  {destacado.turno.customer_name}
                </span>
              </div>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                {destacado.turno.service_name}
                {destacado.turno.service_duration_minutes
                  ? ` · ${destacado.turno.service_duration_minutes} min`
                  : ""}
              </p>
            </section>
          ) : null}

          <ol className="mt-4 flex flex-col gap-2">
            {turnos.map((turno) => {
              const cancelado = turno.status === "cancelled";
              const esDestacado = destacado?.turno.id === turno.id;
              const waLink = turno.customer_phone
                ? createWhatsAppClientContactLink({
                    barbershopName,
                    clientName: turno.customer_name,
                    clientPhone: turno.customer_phone,
                    date: fecha,
                    time: turno.appointment_time.slice(0, 5),
                  })
                : null;

              return (
                <li
                  key={turno.id}
                  className={cn(
                    "rounded-[var(--radius-md)] border p-3 transition-colors",
                    cancelado
                      ? "border-[color:var(--border-subtle)] opacity-45"
                      : esDestacado
                        ? "border-[color:var(--brand-gold-ring)]"
                        : "border-[color:var(--border-subtle)]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* La hora manda: es por lo que un barbero recorre la
                        lista. Antes competía con el nombre del cliente. */}
                    <span
                      className={cn(
                        "shrink-0 text-lg font-black tabular-nums leading-tight",
                        cancelado
                          ? "text-[color:var(--text-subtle)] line-through"
                          : "text-[color:var(--brand-gold)]",
                      )}
                    >
                      {turno.appointment_time.slice(0, 5)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-bold",
                          cancelado
                            ? "text-[color:var(--text-muted)] line-through"
                            : "text-white",
                        )}
                      >
                        {turno.customer_name}
                      </p>
                      <p className="truncate text-xs text-[color:var(--text-muted)]">
                        {turno.service_name}
                        {turno.service_duration_minutes
                          ? ` · ${turno.service_duration_minutes} min`
                          : ""}
                        {turno.service_price
                          ? ` · ${formatPrice(turno.service_price)}`
                          : ""}
                      </p>
                      {turno.comment ? (
                        <p className="mt-1 text-xs italic text-[color:var(--text-subtle)]">
                          “{turno.comment}”
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                        turno.status === "confirmed" &&
                          "bg-[color:var(--success-soft)] text-[color:var(--success)]",
                        turno.status === "pending" &&
                          "bg-amber-400/10 text-amber-400",
                        cancelado &&
                          "bg-[color:var(--danger)]/10 text-[color:var(--danger)]",
                      )}
                    >
                      {turno.status === "confirmed"
                        ? "Confirmado"
                        : turno.status === "pending"
                          ? "Pendiente"
                          : "Cancelado"}
                    </span>
                  </div>

                  {!cancelado ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {turno.status !== "confirmed" ? (
                        <button
                          type="button"
                          disabled={tocando === turno.id}
                          onClick={() =>
                            void cambiarEstado(turno.id, "confirmed")
                          }
                          className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[color:var(--success)] text-[11px] font-bold uppercase tracking-[0.12em] text-black disabled:opacity-50"
                        >
                          <Check className="size-3.5" />
                          Confirmar
                        </button>
                      ) : null}
                      {waLink ? (
                        /* Escribirle al cliente es lo que más hace un barbero
                           con un turno, y era lo único que el panel del dueño
                           tenía y esta pantalla no. */
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] text-[11px] font-bold uppercase tracking-[0.12em] text-white"
                        >
                          <MessageCircle className="size-3.5" />
                          WhatsApp
                        </a>
                      ) : null}
                      <button
                        type="button"
                        disabled={tocando === turno.id}
                        onClick={() => void cambiarEstado(turno.id, "cancelled")}
                        aria-label="Cancelar turno"
                        className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 px-3 text-[color:var(--danger)] disabled:opacity-50"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
