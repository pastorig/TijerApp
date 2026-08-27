"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { Button, Field, Input, Select } from "@/components/ui";

/**
 * El barbero tapa un rango suyo: franco, se va antes, el médico.
 *
 * ── Los motivos son presets, no texto libre ─────────────────────────────────
 * Igual que en la cancelación. Un campo vacío se llena con "x" o con nada, y
 * después el dueño ve una franja tapada sin saber por qué. Con cuatro opciones
 * se completa de un toque y el dato sirve.
 *
 * ── Lo que el barbero necesita saber al confirmar ───────────────────────────
 * Si tenía turnos adentro del rango, el servidor los cuenta y se le dice.
 * Bloquear no los cancela — cancelarle a un cliente es una decisión — así que
 * el aviso es la única forma de que no se entere el día del turno.
 */

const MOTIVOS = [
  "Me voy antes",
  "Franco",
  "Turno médico",
  "Almuerzo",
  "Otro",
] as const;

export function StaffBlockTimeModal({
  abierto,
  barbershopSlug,
  fecha,
  onCerrar,
  onCreado,
}: {
  abierto: boolean;
  barbershopSlug: string;
  /** El día que está mirando: es el que va a querer bloquear casi siempre. */
  fecha: string;
  onCerrar: () => void;
  /** Recibe cuántos turnos quedaron adentro del bloqueo, para avisarle. */
  onCreado: (turnosEnElRango: number) => void;
}) {
  const [dia, setDia] = useState(fecha);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [motivo, setMotivo] = useState<string>(MOTIVOS[0]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

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
    if (!desde || !hasta) {
      setError("Poné desde y hasta qué hora no vas a estar.");
      return;
    }
    if (hasta <= desde) {
      setError("El horario de fin tiene que ser posterior al de inicio.");
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
      const res = await fetch("/api/staff/time-block", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          barbershopSlug,
          date: dia,
          desde,
          hasta,
          motivo,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        turnosEnElRango?: number;
      };
      if (!res.ok) {
        setError(payload.error ?? "No pudimos bloquear ese horario.");
        return;
      }
      onCreado(payload.turnosEnElRango ?? 0);
      onCerrar();
    } catch {
      setError("No pudimos bloquear ese horario.");
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <form
        onSubmit={guardar}
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto rounded-t-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] sm:rounded-[var(--radius-md)]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[color:var(--border-subtle)] px-5 py-4">
          <div>
            <h2 className="text-lg font-black tracking-tight text-white">
              Bloquear horario
            </h2>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              Nadie va a poder reservar con vos en ese rango.
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
          <Field label="Día" htmlFor="staff-bloqueo-dia">
            <Input
              id="staff-bloqueo-dia"
              type="date"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde" htmlFor="staff-bloqueo-desde">
              <Input
                id="staff-bloqueo-desde"
                type="time"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </Field>
            <Field label="Hasta" htmlFor="staff-bloqueo-hasta">
              <Input
                id="staff-bloqueo-hasta"
                type="time"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Motivo" htmlFor="staff-bloqueo-motivo">
            <Select
              id="staff-bloqueo-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            >
              {MOTIVOS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>

          <p className="text-[11px] leading-4 text-[color:var(--text-subtle)]">
            Los turnos que ya tengas en ese rango <strong>no se cancelan</strong>.
            Si hay alguno, te lo avisamos.
          </p>

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
          <Button type="submit" size="sm" loading={guardando}>
            Bloquear
          </Button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
