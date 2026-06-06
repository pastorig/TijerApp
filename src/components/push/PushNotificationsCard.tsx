"use client";

import { useState } from "react";
import {
  BellOff,
  BellRing,
  Check,
  Send,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import { useToast } from "@/components/ui";
import { usePushSubscription } from "@/lib/pwa/usePushSubscription";

type PushNotificationsCardProps = {
  barbershopSlug: string;
};

/**
 * UI Card para activar/desactivar/probar push notifications desde Settings.
 *
 * 7 visual states (matchea con los del hook usePushSubscription):
 *   1. checking — loading skeleton mientras detecta estado
 *   2. unsupported — browser sin push API (Firefox iOS, etc.)
 *   3. ios-needs-install — iOS Safari sin PWA instalada
 *   4. default — primer uso, botón "Activar"
 *   5. denied — permiso bloqueado, instrucciones para habilitar
 *   6. granted-no-subscription — permiso OK pero no hay sub en este device
 *   7. subscribed-this-device — activa, botones "Probar" + "Desactivar"
 *
 * Visual coherente con la paleta navy/silver/gold y el resto del admin.
 */
export function PushNotificationsCard({
  barbershopSlug,
}: PushNotificationsCardProps) {
  const toast = useToast();
  const { state, subscribe, unsubscribe, sendTest } =
    usePushSubscription(barbershopSlug);
  const [isWorking, setIsWorking] = useState(false);

  async function handleSubscribe() {
    setIsWorking(true);
    try {
      await subscribe(barbershopSlug);
      toast.success("Notificaciones activadas", {
        description: "Vas a recibir un aviso por cada reserva nueva.",
      });
    } catch (error) {
      toast.error("No se pudo activar", {
        description:
          error instanceof Error
            ? error.message
            : "Error desconocido al activar notificaciones.",
      });
    } finally {
      setIsWorking(false);
    }
  }

  async function handleUnsubscribe() {
    setIsWorking(true);
    try {
      await unsubscribe();
      toast.info("Notificaciones desactivadas", {
        description: "Ya no vas a recibir avisos en este dispositivo.",
      });
    } catch (error) {
      toast.error("Error al desactivar", {
        description:
          error instanceof Error ? error.message : "Error desconocido.",
      });
    } finally {
      setIsWorking(false);
    }
  }

  async function handleSendTest() {
    setIsWorking(true);
    try {
      const result = await sendTest(barbershopSlug);
      toast.success("Notificación de prueba enviada", {
        description: `${result.enqueued} dispositivo${result.enqueued === 1 ? "" : "s"} encolado${result.enqueued === 1 ? "" : "s"}. Esperá unos segundos.`,
      });
    } catch (error) {
      toast.error("Error enviando prueba", {
        description:
          error instanceof Error ? error.message : "Error desconocido.",
      });
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-5 sm:p-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
          Notificaciones push
        </p>
        <h3 className="mt-1 text-lg font-bold text-white sm:text-xl">
          Recibí avisos en tiempo real
        </h3>
        <p className="mt-1 text-sm leading-6 text-[color:var(--text-secondary)]">
          Cuando entra una reserva nueva, te llega una notif al dispositivo
          donde tengas TijerApp instalado o abierto en el navegador.
        </p>
      </header>

      <div className="mt-5">
        {state === "checking" && (
          <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] p-4">
            <div className="size-2 animate-pulse rounded-full bg-[color:var(--text-muted)]" />
            <p className="text-sm text-[color:var(--text-muted)]">
              Detectando estado…
            </p>
          </div>
        )}

        {state === "unsupported" && (
          <div className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] p-4">
            <BellOff
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-[color:var(--text-muted)]"
            />
            <div>
              <p className="text-sm font-semibold text-white">
                Tu navegador no soporta notificaciones push
              </p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--text-secondary)]">
                Probá con Chrome, Edge o Brave en una versión reciente. En iOS,
                necesitás Safari 16.4+ con la PWA instalada.
              </p>
            </div>
          </div>
        )}

        {state === "ios-needs-install" && (
          <div className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] p-4">
            <Smartphone
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-[color:var(--brand-gold)]"
            />
            <div>
              <p className="text-sm font-semibold text-white">
                Instalá TijerApp primero
              </p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--text-secondary)]">
                En iOS, las notificaciones push solo funcionan cuando la PWA
                está instalada en la pantalla de inicio. Tocá el botón Compartir
                de Safari → &ldquo;Agregar a pantalla de inicio&rdquo;, después
                volvé acá desde la app instalada.
              </p>
            </div>
          </div>
        )}

        {state === "denied" && (
          <div className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[color:var(--danger)]/30 bg-[color:var(--danger-soft)] p-4">
            <ShieldAlert
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-[color:var(--danger)]"
            />
            <div>
              <p className="text-sm font-semibold text-white">
                Permiso bloqueado
              </p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--text-secondary)]">
                Bloqueaste las notificaciones para este sitio. Tenés que
                habilitarlas desde la configuración del navegador (ícono del
                candado al lado de la URL → Notificaciones → Permitir) y
                recargar la página.
              </p>
            </div>
          </div>
        )}

        {state === "default" && (
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={isWorking}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-6 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <BellRing aria-hidden="true" className="size-4" />
            {isWorking ? "Activando…" : "Activar notificaciones"}
          </button>
        )}

        {state === "granted-no-subscription" && (
          <div className="space-y-3">
            <p className="rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/20 bg-[color:var(--brand-gold-soft)] p-3 text-xs leading-5 text-[color:var(--text-secondary)]">
              Detectamos que ya habías activado las notificaciones, pero este
              dispositivo perdió la suscripción (suele pasar después de una
              actualización del navegador o de TijerApp). Tocá el botón para
              reactivarlas sin volver a pedir permiso.
            </p>
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={isWorking}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-6 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <BellRing aria-hidden="true" className="size-4" />
              {isWorking
                ? "Reactivando…"
                : "Reactivar en este dispositivo"}
            </button>
          </div>
        )}

        {state === "subscribed-this-device" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[color:var(--success)]/30 bg-[color:var(--success-soft)] p-4">
              <Check
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-[color:var(--success)]"
              />
              <div>
                <p className="text-sm font-semibold text-white">
                  Activas en este dispositivo
                </p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--text-secondary)]">
                  Vas a recibir un aviso cada vez que entre una reserva nueva
                  en esta barbería.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isWorking}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)] bg-transparent px-5 text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-soft)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send aria-hidden="true" className="size-4" />
                {isWorking ? "Enviando…" : "Mandar notif de prueba"}
              </button>
              <button
                type="button"
                onClick={handleUnsubscribe}
                disabled={isWorking}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-transparent px-5 text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--danger)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <BellOff aria-hidden="true" className="size-4" />
                Desactivar
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
