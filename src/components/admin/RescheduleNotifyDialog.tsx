"use client";

import { useEffect, useState } from "react";
import { Check, Mail, MessageCircle, X } from "lucide-react";
import { useToast } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { createWhatsAppRescheduleLink } from "@/lib/whatsapp";

export type RescheduleNotifyContext = {
  appointmentId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  serviceName: string;
  oldDate: string; // YYYY-MM-DD
  oldTime: string; // HH:MM
  newDate: string;
  newTime: string;
  newBarberName: string;
};

type Props = {
  context: RescheduleNotifyContext | null;
  barbershopSlug: string;
  barbershopName: string;
  onClose: () => void;
};

/**
 * Wrapper que renderiza el inner solo cuando context !== null.
 * El inner se monta fresh por cada appointment movido, así su useEffect
 * de fetch del email se dispara una sola vez en mount (no en cada
 * cambio de prop).
 */
export function RescheduleNotifyDialog(props: Props) {
  if (!props.context) return null;
  return <RescheduleNotifyDialogInner {...props} context={props.context} />;
}

type InnerProps = Omit<Props, "context"> & { context: RescheduleNotifyContext };

/**
 * Modal que aparece DESPUÉS de un drag&drop exitoso en el calendar grid.
 * Ofrece avisar al cliente del nuevo horario:
 *  - Email automático (si tiene email registrado) — se envía solo al
 *    abrir el modal sin acción del admin (UX "set and forget")
 *  - WhatsApp manual — botón gold que abre wa.me con mensaje pre-armado
 *
 * Filosofía: el admin se entera del éxito del envío automático sin tener
 * que hacer click. El botón WhatsApp es la doble confirmación (los
 * argentinos leen WhatsApp más que email).
 */
function RescheduleNotifyDialogInner({
  context,
  barbershopSlug,
  barbershopName,
  onClose,
}: InnerProps) {
  const toast = useToast();
  // Estado inicial computado: lazy init evita setState en effect.
  const [emailStatus, setEmailStatus] = useState<
    "sending" | "sent" | "skipped" | "error"
  >(() => (context.customerEmail ? "sending" : "skipped"));
  const [emailDetail, setEmailDetail] = useState<string | null>(() =>
    context.customerEmail ? null : "Sin email registrado",
  );

  // Disparar el envío automático del email apenas se monta el wrapper.
  // Como este componente se monta UNA vez por modal abierto, este useEffect
  // corre exactamente una vez. No "set state in effect" porque solo
  // actualizamos como resultado de la operación async.
  useEffect(() => {
    if (!context.customerEmail) return; // ya quedó como "skipped" en initial
    let cancelled = false;

    (async () => {
      try {
        const { data: sessionData } = await getCurrentSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          if (cancelled) return;
          setEmailStatus("error");
          setEmailDetail("Sesión expirada");
          return;
        }

        const res = await fetch("/api/admin/appointments/notify-rescheduled", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            appointmentId: context.appointmentId,
            barbershopSlug,
            oldDate: context.oldDate,
            oldTime: context.oldTime,
          }),
        });

        if (cancelled) return;
        if (!res.ok) {
          setEmailStatus("error");
          setEmailDetail(`HTTP ${res.status}`);
          return;
        }
        const data = (await res.json()) as {
          sent: boolean;
          skipped?: string;
        };
        if (data.sent) {
          setEmailStatus("sent");
        } else {
          setEmailStatus("skipped");
          setEmailDetail(data.skipped ?? "No se pudo enviar");
        }
      } catch (err) {
        if (cancelled) return;
        setEmailStatus("error");
        setEmailDetail(err instanceof Error ? err.message : "Error");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, []);

  function handleSendWhatsApp() {
    const url = createWhatsAppRescheduleLink({
      barbershopName,
      clientName: context.customerName,
      clientPhone: context.customerPhone,
      serviceName: context.serviceName,
      oldDate: context.oldDate,
      oldTime: context.oldTime,
      newDate: context.newDate,
      newTime: context.newTime,
      newBarberName: context.newBarberName,
    });
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("WhatsApp abierto", {
      description: `Mensaje listo para ${context.customerName.split(" ")[0]}`,
    });
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Avisar al cliente del cambio de horario"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="w-full max-w-md rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-5 shadow-[0_24px_64px_-32px_rgba(0,0,0,0.9)] sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
              Turno movido
            </p>
            <h2 className="mt-1 text-lg font-bold leading-tight text-white sm:text-xl">
              ¿Avisamos a {context.customerName.split(" ")[0]}?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="size-8 shrink-0 rounded-full text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-white"
          >
            <X aria-hidden="true" className="mx-auto size-4" />
          </button>
        </header>

        {/* Resumen del cambio */}
        <div className="mt-4 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] p-3 text-xs">
          <p className="text-[color:var(--text-muted)]">
            <span className="font-mono line-through opacity-70">
              {context.oldTime}
            </span>
            <span className="mx-2">→</span>
            <span className="font-mono font-bold text-[color:var(--brand-gold)]">
              {context.newTime}
            </span>
            {context.newBarberName ? (
              <span className="ml-1.5 text-[color:var(--text-secondary)]">
                · con {context.newBarberName}
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-[color:var(--text-secondary)]">
            {context.serviceName}
          </p>
        </div>

        {/* Email status */}
        <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] p-3">
          <Mail
            aria-hidden="true"
            className={cn(
              "mt-0.5 size-4 shrink-0",
              emailStatus === "sent" && "text-[color:var(--success)]",
              emailStatus === "sending" &&
                "animate-pulse text-[color:var(--brand-gold)]",
              (emailStatus === "skipped" || emailStatus === "error") &&
                "text-[color:var(--text-muted)]",
            )}
          />
          <div className="flex-1">
            <p className="text-xs font-semibold text-white">
              Email automático
            </p>
            <p className="mt-0.5 text-[11px] leading-5 text-[color:var(--text-secondary)]">
              {emailStatus === "sending" && "Enviando email al cliente…"}
              {emailStatus === "sent" && (
                <>
                  <Check
                    aria-hidden="true"
                    className="inline size-3 align-text-bottom text-[color:var(--success)]"
                  />{" "}
                  Email enviado a {context.customerEmail}
                </>
              )}
              {emailStatus === "skipped" &&
                (context.customerEmail
                  ? `No se envió (${emailDetail})`
                  : "El cliente no tiene email registrado")}
              {emailStatus === "error" && (
                <>Error enviando email{emailDetail ? ` (${emailDetail})` : ""}</>
              )}
            </p>
          </div>
        </div>

        {/* WhatsApp action */}
        <div className="mt-4 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            Avisar también por WhatsApp
          </p>
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-gold-grad px-4 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:brightness-110"
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            Abrir WhatsApp
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 w-full items-center justify-center text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--text-muted)] transition-colors hover:text-white"
          >
            Cerrar sin enviar
          </button>
        </div>
      </div>
    </div>
  );
}
