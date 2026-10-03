"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Loader2, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { pisaAOtro } from "@/lib/agenda-layout";
import {
  DURACIONES_SOBRETURNO,
  DURACION_SOBRETURNO_POR_DEFECTO,
} from "@/lib/staff-sobreturno";
import { useStaffDialogFocus } from "./useStaffDialogFocus";
import { getCurrentSession } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

/**
 * El turno del que entró sin reservar, cargado por el propio barbero.
 *
 * ── Por qué no es el modal del dueño ────────────────────────────────────────
 * El del dueño elige barbero, elige entre los servicios de todos y guarda
 * directo contra Supabase. Acá el barbero es siempre el mismo —lo resuelve el
 * servidor— y los servicios ya vienen filtrados, así que de aquel modal
 * quedarían dos inputs. Compartir eso habría sido más acoplamiento que
 * ahorro; lo que sí se comparte es lo que importa: los componentes del sistema
 * de diseño.
 *
 * Lo que se manda es lo mínimo: qué servicio, quién y cuándo. El precio y la
 * duración los pone el servidor a partir del servicio — si viajaran desde acá,
 * el empleado podría inflar el precio de un corte y con eso su comisión.
 */

type Servicio = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
};

/** Lo que hace falta de los turnos del día para avisar que se va a encimar. */
export type TurnoDelDia = {
  appointment_time: string;
  duracionMin: number;
  customer_name: string;
};

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export function StaffNewAppointmentModal({
  abierto,
  barbershopSlug,
  fecha,
  horaInicial = "",
  modo = "turno",
  turnosDelDia = [],
  onCerrar,
  onCreado,
}: {
  abierto: boolean;
  barbershopSlug: string;
  /** El día que el barbero está mirando: es el que va a querer casi siempre. */
  fecha: string;
  /** "HH:MM" ya puesto: cuando se abre tocando un hueco del calendario. */
  horaInicial?: string;
  /**
   * "sobreturno" (feature 032): turno corto metido a propósito en un rato
   * libre o encima de otro. El servicio pasa a ser opcional y se elige cuánto
   * dura.
   */
  modo?: "turno" | "sobreturno";
  /** Los turnos activos de `fecha`, para avisar si el sobreturno se encima. */
  turnosDelDia?: TurnoDelDia[];
  onCerrar: () => void;
  onCreado: () => void;
}) {
  const esSobreturno = modo === "sobreturno";
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState("");
  const [servicesReload, setServicesReload] = useState(0);
  const [serviceId, setServiceId] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const dialogRef = useStaffDialogFocus(abierto);
  const [dia, setDia] = useState(fecha);
  const [hora, setHora] = useState(horaInicial);
  const [duracion, setDuracion] = useState<number>(DURACION_SOBRETURNO_POR_DEFECTO);
  /** El barbero ya vio el aviso de que se encima y eligió cargarlo igual. */
  const [encimarConfirmado, setEncimarConfirmado] = useState(false);
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Los servicios se piden una vez por apertura: cambian poco y el barbero
  // abre esto entre cliente y cliente, no cien veces por hora.
  useEffect(() => {
    if (!abierto) return;
    let vivo = true;
    void (async () => {
      setServicesLoading(true);
      setServicesError("");
      try {
        const { data: sessionData } = await getCurrentSession();
        const token = sessionData.session?.access_token;
        if (!vivo) return;
        if (!token) {
          setServicesError("Se cerró tu sesión. Volvé a entrar.");
          return;
        }
        const res = await fetch(
          `/api/staff/services?bs=${encodeURIComponent(barbershopSlug)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const payload = (await res.json().catch(() => ({}))) as {
          servicios?: Servicio[];
        };
        if (!vivo) return;
        if (!res.ok) {
          setServicesError("No pudimos traer tus servicios.");
          return;
        }
        setServicios(payload.servicios ?? []);
      } catch {
        if (vivo) setServicesError("No pudimos traer tus servicios.");
      } finally {
        if (vivo) setServicesLoading(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [abierto, barbershopSlug, servicesReload]);

  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !guardando) onCerrar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto, guardando, onCerrar]);

  // Con qué turno se pisa el sobreturno, si se pisa. Solo se puede saber para
  // el día que está cargado en la agenda; en otro día manda el servidor.
  const pisado =
    esSobreturno && hora && dia === fecha
      ? (turnosDelDia.find((t) =>
          pisaAOtro(
            { inicioMin: aMinutos(hora), duracionMin: duracion },
            [{ inicioMin: aMinutos(t.appointment_time), duracionMin: t.duracionMin }],
          ),
        ) ?? null)
      : null;

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!serviceId && !esSobreturno) {
      setError("Elegí el servicio.");
      return;
    }
    if (!nombre.trim()) {
      setError("Poné el nombre del cliente.");
      return;
    }
    if (!hora) {
      setError("Poné el horario.");
      return;
    }
    // Encimar a propósito es válido, pero no por accidente: la primera vez se
    // muestra con quién se pisa y el botón pasa a decir "Cargar igual".
    if (pisado && !encimarConfirmado) {
      setEncimarConfirmado(true);
      return;
    }

    setError("");
    setGuardando(true);
    try {
      const { data: sessionData } = await getCurrentSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Se cerró tu sesión. Volvé a entrar.");
        return;
      }
      const res = await fetch("/api/staff/appointment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          barbershopSlug,
          serviceId,
          customerName: nombre,
          customerPhone: telefono,
          date: dia,
          time: hora,
          comment: comentario,
          ...(esSobreturno ? { sobreturno: true, duracion } : {}),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(payload.error ?? "No pudimos cargar el turno.");
        return;
      }
      onCreado();
      onCerrar();
    } catch {
      setError("No pudimos cargar el turno.");
    } finally {
      setGuardando(false);
    }
  }

  // `abierto` arranca en false y solo lo prende un clic, así que en el render
  // del servidor nunca se llega al portal. Mismo criterio que el diálogo de
  // cancelación, que también va por portal.
  if (!abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-new-title"
        tabIndex={-1}
        onSubmit={guardar}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-y-auto [&_label]:text-xs [&_label]:normal-case [&_label]:tracking-normal [&_input]:min-h-11 [&_input]:text-base [&_select]:min-h-11 [&_select]:text-base [&_textarea]:text-base [&_button]:min-h-11 [&_button]:text-xs [&_button]:normal-case [&_button]:tracking-normal sm:[&_input]:text-sm sm:[&_select]:text-sm sm:[&_textarea]:text-sm rounded-t-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] sm:rounded-[var(--radius-md)]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] px-4 py-3">
          <div>
            <h2 id="staff-new-title" className="text-lg font-semibold tracking-normal text-white">
              {esSobreturno ? "Agregar sobreturno" : "Agregar turno"}
            </h2>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              {esSobreturno
                ? "Un corte corto metido en un rato libre. Ocupa ese horario para las reservas online."
                : "Para el que entró sin reservar. Queda pendiente hasta que lo confirmes."}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar"
            title="Cerrar"
            className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] transition-colors hover:text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex flex-col gap-3 px-4 py-3">
          <Field
            label="Servicio"
            htmlFor="staff-turno-servicio"
            optional={esSobreturno}
          >
            <Select
              id="staff-turno-servicio"
              disabled={servicesLoading || Boolean(servicesError)}
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value="">
                {servicesLoading
                  ? "Cargando servicios…"
                  : esSobreturno
                    ? "Sin servicio (sobreturno)"
                    : "Elegí un servicio"}
              </option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.duration_minutes} min · {formatPrice(s.price)}
                </option>
              ))}
            </Select>
          </Field>

          {servicesError ? (
            <div role="alert" className="text-xs text-[color:var(--danger)]">
              <p>{servicesError}</p>
              <Button type="button" variant="secondary" size="sm" onClick={() => setServicesReload(value => value + 1)}>Reintentar servicios</Button>
            </div>
          ) : !servicesLoading && servicios.length === 0 && !esSobreturno ? (
            <p className="text-xs text-[color:var(--text-secondary)]">No tenés servicios activos para agregar un turno.</p>
          ) : null}

          {esSobreturno ? (
            <fieldset>
              <legend className="mb-1.5 text-xs text-[color:var(--text-secondary)]">
                Cuánto dura
              </legend>
              <div className="grid grid-cols-4 gap-2">
                {DURACIONES_SOBRETURNO.map((min) => (
                  <button
                    key={min}
                    type="button"
                    aria-pressed={duracion === min}
                    onClick={() => {
                      setDuracion(min);
                      setEncimarConfirmado(false);
                    }}
                    className={cn(
                      "rounded-[var(--radius-sm)] border text-sm font-semibold tabular-nums transition-colors",
                      duracion === min
                        ? "border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] text-white"
                        : "border-[color:var(--border-default)] text-[color:var(--text-secondary)] hover:text-white",
                    )}
                  >
                    {min} min
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <Field label="Cliente" htmlFor="staff-turno-nombre">
            <Input
              id="staff-turno-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y apellido"
              autoComplete="off"
            />
          </Field>

          <Field
            label="Teléfono"
            htmlFor="staff-turno-tel"
            optional
            hint="El que entra de la calle muchas veces no lo deja."
          >
            <Input
              id="staff-turno-tel"
              type="tel"
              inputMode="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="3571 400111"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Día" htmlFor="staff-turno-dia">
              <Input
                id="staff-turno-dia"
                type="date"
                value={dia}
                onChange={(e) => {
                  setDia(e.target.value);
                  setEncimarConfirmado(false);
                }}
              />
            </Field>
            <Field label="Horario" htmlFor="staff-turno-hora">
              <Input
                id="staff-turno-hora"
                type="time"
                value={hora}
                onChange={(e) => {
                  setHora(e.target.value);
                  setEncimarConfirmado(false);
                }}
              />
            </Field>
          </div>

          <Field label="Nota" htmlFor="staff-turno-nota" optional>
            <Textarea
              id="staff-turno-nota"
              rows={2}
              className="min-h-20"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Algo para acordarte"
            />
          </Field>

          {pisado ? (
            <p
              role={encimarConfirmado ? "alert" : undefined}
              className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] px-3 py-2 text-xs text-[color:var(--text-secondary)]"
            >
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-[color:var(--brand-gold)]" />
              <span>
                Se va a encimar con el turno de las{" "}
                <span className="font-semibold tabular-nums text-white">
                  {pisado.appointment_time.slice(0, 5)}
                </span>{" "}
                ({pisado.customer_name}).
                {encimarConfirmado ? " Tocá de nuevo para cargarlo igual." : ""}
              </span>
            </p>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-[color:var(--danger)]"
            >
              {error}
            </p>
          ) : null}
        </div>

        <footer className="sticky bottom-0 z-10 flex justify-end gap-2 border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCerrar}
            disabled={guardando}
          >
            Volver
          </Button>
          <Button
            type="submit"
            style={{ backgroundImage: "none", backgroundColor: "var(--brand-gold)" }}
            disabled={
              !esSobreturno &&
              (servicesLoading || Boolean(servicesError) || servicios.length === 0)
            }
            size="sm"
            loading={guardando}
            iconLeft={
              guardando ? <Loader2 className="size-3.5 animate-spin" /> : null
            }
          >
            {pisado && encimarConfirmado
              ? "Cargar igual"
              : esSobreturno
                ? "Agregar sobreturno"
                : "Agregar turno"}
          </Button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
