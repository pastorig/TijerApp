"use client";

import { type FormEvent, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, X } from "lucide-react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { normalizePhone } from "@/lib/barbershop-clients";

/**
 * Corregir los datos del cliente en un turno ya reservado.
 *
 * Por qué existe: un cliente reservó con un número mal escrito y la barbería
 * no tenía forma de arreglarlo. El turno quedaba con un teléfono al que no se
 * le podía escribir, y el botón de WhatsApp del turno abría un chat con un
 * desconocido. La única salida era cancelar y cargar el turno de nuevo.
 *
 * Solo se corrigen los datos de la PERSONA (nombre, teléfono, mail) y el
 * comentario. El servicio, el barbero, el día y la hora no se tocan acá:
 * cambiar esos mueve la agenda, y para eso está arrastrar el turno en el
 * calendario.
 */

export type EditableAppointment = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  comment?: string | null;
};

export type AppointmentEdits = {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  comment: string;
};

export function EditAppointmentDialog({
  appointment,
  onClose,
  onSave,
}: {
  /** null = cerrado. El padre lo monta con `key={appointment.id}`. */
  appointment: EditableAppointment | null;
  onClose: () => void;
  /** Guarda y resuelve; si falla, rechaza con el mensaje para mostrar. */
  onSave: (edits: AppointmentEdits) => Promise<void>;
}) {
  const [name, setName] = useState(appointment?.customer_name ?? "");
  const [phone, setPhone] = useState(appointment?.customer_phone ?? "");
  const [email, setEmail] = useState(appointment?.customer_email ?? "");
  const [comment, setComment] = useState(appointment?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const open = appointment !== null;
  const dialogRef = useDialogFocus<HTMLFormElement>(open, {
    onEscape: saving ? undefined : onClose,
  });

  if (!appointment || typeof document === "undefined") return null;

  const cleanEmail = email.trim();
  const sinCambios =
    name.trim() === appointment.customer_name.trim() &&
    phone.trim() === appointment.customer_phone.trim() &&
    cleanEmail === (appointment.customer_email ?? "").trim() &&
    comment.trim() === (appointment.comment ?? "").trim();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setError("El nombre no puede quedar vacío.");
      return;
    }
    if (!normalizePhone(phone)) {
      setError("El teléfono tiene que tener al menos 8 dígitos.");
      return;
    }
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Ese mail no parece válido.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSave({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: cleanEmail || null,
        comment: comment.trim(),
      });
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "No pudimos guardar los cambios. Probá de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-appointment-title"
        onSubmit={handleSubmit}
        // Sin la validación del navegador: los avisos son los de acá abajo, en
        // castellano y todos en el mismo lugar.
        noValidate
        className="relative w-full max-w-lg overflow-hidden rounded-t-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] shadow-2xl animate-sheet-up sm:rounded-[var(--radius-lg)]"
      >
        <div className="flex items-start gap-4 border-b border-[color:var(--border-subtle)] px-5 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]">
            <Pencil className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="edit-appointment-title"
              className="text-base font-bold text-white sm:text-lg"
            >
              Corregir datos del turno
            </h2>
            <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
              Para cuando el cliente escribió mal su nombre o su número. El día,
              la hora y el servicio no cambian.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-white disabled:opacity-40"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid max-h-[60dvh] gap-4 overflow-y-auto px-5 py-4">
          <Field label="Nombre" htmlFor="edit-appt-name" required>
            <Input
              id="edit-appt-name"
              type="text"
              value={name}
              disabled={saving}
              maxLength={80}
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field
            label="Teléfono"
            htmlFor="edit-appt-phone"
            required
            hint="Es el número al que se abre el WhatsApp de este turno."
          >
            <Input
              id="edit-appt-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              disabled={saving}
              maxLength={30}
              autoComplete="off"
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field
            label="Email"
            htmlFor="edit-appt-email"
            optional
            hint="Ahí le llegan el recordatorio y los avisos del turno."
          >
            <Input
              id="edit-appt-email"
              type="email"
              inputMode="email"
              value={email}
              disabled={saving}
              maxLength={120}
              autoComplete="off"
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Comentario del cliente" htmlFor="edit-appt-comment" optional>
            <Textarea
              id="edit-appt-comment"
              value={comment}
              disabled={saving}
              rows={2}
              maxLength={500}
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>

          {error ? (
            <p
              role="alert"
              className="border-l-2 border-[color:var(--danger)] pl-3 text-xs font-semibold text-[color:var(--danger)]"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-[color:var(--border-subtle)] px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Volver
          </Button>
          <Button type="submit" loading={saving} disabled={saving || sinCambios}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
