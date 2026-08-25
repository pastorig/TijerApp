"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock, Loader2, X } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

/**
 * La agenda del empleado: SUS turnos del día.
 *
 * Los datos no se piden a Supabase desde acá — el empleado no puede leer
 * `appointments` por RLS, a propósito. Todo pasa por `/api/staff/*`, que
 * resuelve en el servidor de qué barbero es la agenda a partir del token. Acá
 * no se manda ningún `barberId`: si se mandara, sería un dato del cliente
 * decidiendo qué agenda se ve.
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

function hoyEnArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function sumarDias(ymd: string, dias: number): string {
  const [a, m, d] = ymd.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function etiquetaFecha(ymd: string): string {
  const hoy = hoyEnArgentina();
  if (ymd === hoy) return "Hoy";
  if (ymd === sumarDias(hoy, 1)) return "Mañana";
  if (ymd === sumarDias(hoy, -1)) return "Ayer";
  const [a, m, d] = ymd.split("-");
  return `${d}/${m}/${a}`;
}

export function StaffAgenda({ barbershopSlug }: { barbershopSlug: string }) {
  const [fecha, setFecha] = useState(hoyEnArgentina);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [tocando, setTocando] = useState<string | null>(null);
  // Sube de a uno para pedir una recarga después de confirmar o cancelar.
  const [recarga, setRecarga] = useState(0);

  // Mismo patrón que el resto del panel: la función vive DENTRO del efecto y
  // las recargas se piden subiendo un contador. Llamar desde el efecto a una
  // función de afuera que toca estado encadena renders.
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
        const payload = (await res.json().catch(() => ({}))) as {
          turnos?: Turno[];
          error?: string;
        };
        if (!vivo) return;
        if (!res.ok) {
          setError(payload.error ?? "No pudimos traer tus turnos.");
          return;
        }
        setTurnos(payload.turnos ?? []);
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

  const activos = useMemo(
    () => turnos.filter((t) => t.status !== "cancelled"),
    [turnos],
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--brand-gold)]">
            Mi agenda
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
            {etiquetaFecha(fecha)}
          </h1>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            {activos.length} turno{activos.length === 1 ? "" : "s"} en pie
          </p>
        </div>
        <CalendarDays className="size-5 text-[color:var(--text-muted)]" />
      </header>

      <div className="mb-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFecha((f) => sumarDias(f, -1))}
          className="min-h-10 flex-1 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] text-xs font-bold text-white"
        >
          ← Anterior
        </button>
        <button
          type="button"
          onClick={() => setFecha(hoyEnArgentina())}
          className="min-h-10 flex-1 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] text-xs font-bold text-white"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => setFecha((f) => sumarDias(f, 1))}
          className="min-h-10 flex-1 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] text-xs font-bold text-white"
        >
          Siguiente →
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-[color:var(--danger)]"
        >
          {error}
        </p>
      ) : null}

      {cargando ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-[color:var(--text-muted)]" />
        </div>
      ) : turnos.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] px-4 py-8 text-center text-sm text-[color:var(--text-muted)]">
          No tenés turnos este día.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {turnos.map((turno) => {
            const cancelado = turno.status === "cancelled";
            return (
              <li
                key={turno.id}
                className={cn(
                  "card-premium p-4",
                  cancelado && "opacity-50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-black text-white">
                      <Clock className="size-3.5 text-[color:var(--brand-gold)]" />
                      {turno.appointment_time.slice(0, 5)}
                      {turno.service_duration_minutes ? (
                        <span className="text-[11px] font-semibold text-[color:var(--text-muted)]">
                          · {turno.service_duration_minutes} min
                        </span>
                      ) : null}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-sm font-bold",
                        cancelado
                          ? "text-[color:var(--text-muted)] line-through"
                          : "text-white",
                      )}
                    >
                      {turno.customer_name}
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {turno.service_name}
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
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
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
                  <div className="mt-3 flex gap-2">
                    {turno.status !== "confirmed" ? (
                      <button
                        type="button"
                        disabled={tocando === turno.id}
                        onClick={() => void cambiarEstado(turno.id, "confirmed")}
                        className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[color:var(--success)] text-[11px] font-bold uppercase tracking-[0.12em] text-black disabled:opacity-50"
                      >
                        <Check className="size-3.5" />
                        Confirmar
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={tocando === turno.id}
                      onClick={() => void cambiarEstado(turno.id, "cancelled")}
                      className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--danger)] disabled:opacity-50"
                    >
                      <X className="size-3.5" />
                      Cancelar
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
