"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X } from "lucide-react";
import { useStaffDialogFocus } from "./useStaffDialogFocus";
import { getCurrentSession } from "@/lib/auth";
import { createWhatsAppRescheduleLink } from "@/lib/whatsapp";
import { Button, Field, Input } from "@/components/ui";

/**
 * Mover un turno de día o de hora.
 *
 * ── El paso que no se puede saltear ─────────────────────────────────────────
 * Después de mover, el modal NO se cierra solo: muestra qué pasó con el aviso
 * al cliente. Si el mail salió, lo dice y listo. Si el cliente no tiene mail,
 * lo dice fuerte y ofrece el WhatsApp — porque ahí el aviso queda en manos del
 * barbero, y cerrarle la ventana sería dejarlo creer que ya está resuelto.
 *
 * Un cliente que aparece a la hora vieja porque nadie le avisó es peor que un
 * turno sin mover.
 */

type Turno = {
  id: string;
  customer_name: string;
  service_name: string;
  appointment_time: string;
};

type Resultado = {
  aviso: { sent: boolean; skipped?: string };
  cliente: { nombre: string; telefono: string | null };
  anterior: { fecha: string; hora: string };
};

export function StaffRescheduleModal({
  turno,
  barbershopSlug,
  barbershopName,
  fecha,
  onCerrar,
  onMovido,
}: {
  /** El turno a mover. `null` = cerrado. */
  turno: Turno | null;
  barbershopSlug: string;
  barbershopName: string;
  /** El día en el que está hoy ese turno. */
  fecha: string;
  onCerrar: () => void;
  onMovido: () => void;
}) {
  const dialogRef = useStaffDialogFocus(turno !== null);
  const [dia, setDia] = useState(fecha);
  const [hora, setHora] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    if (!turno) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !guardando) cerrar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turno, guardando]);

  function cerrar() {
    // Si el turno se movió, al cerrar hay que refrescar la agenda: el turno ya
    // no está donde estaba.
    if (resultado) onMovido();
    setResultado(null);
    setError("");
    setHora("");
    onCerrar();
  }

  async function mover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!turno) return;
    if (!hora) {
      setError("Poné el horario nuevo.");
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
      const res = await fetch("/api/staff/appointment-reschedule", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          barbershopSlug,
          appointmentId: turno.id,
          newDate: dia,
          newTime: hora,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as Resultado & {
        error?: string;
      };
      if (!res.ok) {
        setError(payload.error ?? "No pudimos mover el turno.");
        return;
      }
      setResultado(payload);
    } catch {
      setError("No pudimos mover el turno.");
    } finally {
      setGuardando(false);
    }
  }

  if (!turno) return null;

  const waLink =
    resultado && resultado.cliente.telefono
      ? createWhatsAppRescheduleLink({
          barbershopName,
          clientName: resultado.cliente.nombre,
          clientPhone: resultado.cliente.telefono,
          serviceName: turno.service_name,
          oldDate: resultado.anterior.fecha,
          oldTime: resultado.anterior.hora,
          newDate: dia,
          newTime: hora,
          newBarberName: "",
        })
      : null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-move-title"
        tabIndex={-1}
        onSubmit={mover}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-y-auto [&_label]:text-xs [&_label]:normal-case [&_label]:tracking-normal [&_input]:min-h-11 [&_input]:text-base [&_select]:min-h-11 [&_select]:text-base [&_textarea]:text-base [&_button]:min-h-11 [&_button]:text-xs [&_button]:normal-case [&_button]:tracking-normal sm:[&_input]:text-sm sm:[&_select]:text-sm sm:[&_textarea]:text-sm rounded-t-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] sm:rounded-[var(--radius-md)]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] px-4 py-3">
          <div className="min-w-0">
            <h2 id="staff-move-title" className="text-lg font-semibold tracking-normal text-white">
              {resultado ? "Turno movido" : "Mover turno"}
            </h2>
            <p className="mt-1 break-words text-xs text-[color:var(--text-muted)]">
              {turno.customer_name} · {turno.appointment_time.slice(0, 5)} ·{" "}
              {turno.service_name}
            </p>
          </div>
          <button
            type="button"
            onClick={cerrar}
            disabled={guardando}
            aria-label="Cerrar"
            title="Cerrar"
            className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] transition-colors hover:text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        {resultado ? (
          <div className="flex flex-col gap-3 px-4 py-3">
            {resultado.aviso.sent ? (
              <p className="rounded-[var(--radius-sm)] border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-3 py-2.5 text-sm text-[color:var(--success)]">
                Le avisamos por mail al cliente del horario nuevo.
              </p>
            ) : (
              <div className="rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] px-3 py-2.5">
                <p className="text-sm font-bold text-[color:var(--brand-gold)]">
                  Al cliente no le llegó ningún aviso
                </p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--text-secondary)]">
                  {resultado.aviso.skipped === "no email"
                    ? "No dejó un mail cuando reservó. Avisale vos, o va a venir a la hora vieja."
                    : "No pudimos mandarle el mail. Avisale vos, o va a venir a la hora vieja."}
                </p>
              </div>
            )}

            {waLink ? (
              <Button
                as="link"
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                fullWidth
                iconLeft={<MessageCircle className="size-3.5" />}
              >
                Avisarle por WhatsApp
              </Button>
            ) : !resultado.aviso.sent ? (
              <p className="text-xs leading-5 text-[color:var(--text-secondary)]">
                Este cliente tampoco dejó teléfono, así que no hay forma de
                escribirle desde acá.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nuevo día" htmlFor="staff-mover-dia">
                <Input
                  id="staff-mover-dia"
                  type="date"
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                />
              </Field>
              <Field label="Nueva hora" htmlFor="staff-mover-hora">
                <Input
                  id="staff-mover-hora"
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                />
              </Field>
            </div>

            <p className="text-xs leading-4 text-[color:var(--text-secondary)]">
              Al cliente le llega un mail con el horario nuevo, si dejó uno
              cuando reservó. El turno queda con vos: no se le puede pasar a
              otro barbero.
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
        )}

        <footer className="sticky bottom-0 z-10 flex justify-end gap-2 border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {resultado ? (
            <Button type="button" size="sm" onClick={cerrar} style={{ backgroundImage: "none", backgroundColor: "var(--brand-gold)" }}>
              Listo
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={cerrar}
                disabled={guardando}
              >
                Volver
              </Button>
              <Button type="submit"
            style={{ backgroundImage: "none", backgroundColor: "var(--brand-gold)" }} size="sm" loading={guardando}>
                Mover turno
              </Button>
            </>
          )}
        </footer>
      </form>
    </div>,
    document.body,
  );
}
