"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
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

export function StaffNewAppointmentModal({
  abierto,
  barbershopSlug,
  fecha,
  onCerrar,
  onCreado,
}: {
  abierto: boolean;
  barbershopSlug: string;
  /** El día que el barbero está mirando: es el que va a querer casi siempre. */
  fecha: string;
  onCerrar: () => void;
  onCreado: () => void;
}) {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dia, setDia] = useState(fecha);
  const [hora, setHora] = useState("");
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Los servicios se piden una vez por apertura: cambian poco y el barbero
  // abre esto entre cliente y cliente, no cien veces por hora.
  useEffect(() => {
    if (!abierto) return;
    let vivo = true;
    void (async () => {
      try {
        const { data: sessionData } = await getCurrentSession();
        const token = sessionData.session?.access_token;
        if (!vivo || !token) return;
        const res = await fetch(
          `/api/staff/services?bs=${encodeURIComponent(barbershopSlug)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const payload = (await res.json().catch(() => ({}))) as {
          servicios?: Servicio[];
        };
        if (!vivo || !res.ok) return;
        setServicios(payload.servicios ?? []);
      } catch {
        if (vivo) setError("No pudimos traer tus servicios.");
      }
    })();
    return () => {
      vivo = false;
    };
  }, [abierto, barbershopSlug]);

  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !guardando) onCerrar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto, guardando, onCerrar]);

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!serviceId) {
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
        onSubmit={guardar}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] sm:rounded-[var(--radius-md)]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[color:var(--border-subtle)] px-5 py-4">
          <div>
            <h2 className="text-lg font-black tracking-tight text-white">
              Agregar turno
            </h2>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              Para el que entró sin reservar. Queda pendiente hasta que lo
              confirmes.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="shrink-0 rounded-[var(--radius-sm)] p-1.5 text-[color:var(--text-muted)] transition-colors hover:text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex flex-col gap-4 px-5 py-4">
          <Field label="Servicio" htmlFor="staff-turno-servicio">
            <Select
              id="staff-turno-servicio"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value="">Elegí un servicio</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.duration_minutes} min · {formatPrice(s.price)}
                </option>
              ))}
            </Select>
          </Field>

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
                onChange={(e) => setDia(e.target.value)}
              />
            </Field>
            <Field label="Horario" htmlFor="staff-turno-hora">
              <Input
                id="staff-turno-hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Nota" htmlFor="staff-turno-nota" optional>
            <Textarea
              id="staff-turno-nota"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Algo para acordarte"
            />
          </Field>

          {error ? (
            <p
              role="alert"
              className="rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-[color:var(--danger)]"
            >
              {error}
            </p>
          ) : null}
        </div>

        <footer className="flex justify-end gap-2 border-t border-[color:var(--border-subtle)] px-5 py-4">
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
            size="sm"
            loading={guardando}
            iconLeft={
              guardando ? <Loader2 className="size-3.5 animate-spin" /> : null
            }
          >
            Agregar turno
          </Button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
