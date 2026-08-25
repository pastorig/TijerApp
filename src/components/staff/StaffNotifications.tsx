"use client";

import { PushNotificationsCard } from "@/components/push/PushNotificationsCard";

/**
 * Los avisos de turnos nuevos, en la pantalla del empleado.
 *
 * Reusa la tarjeta del panel del dueño: es el mismo permiso del navegador, el
 * mismo hook y los mismos siete estados (sin soporte, iPhone sin instalar,
 * bloqueado, activo…). Reescribirla habría sido mantener dos veces la misma
 * lista de casos borde.
 *
 * **Qué le llega y qué no lo decide el servidor**, no esta pantalla: al
 * empleado le llegan los turnos de SU barbero y ninguno de un compañero. Eso
 * vive en `enqueue_admin_push` (migración 20260825120000). Acá solo se prende
 * y se apaga.
 */
export function StaffNotifications({
  barbershopSlug,
}: {
  barbershopSlug: string;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6">
      <p className="mb-2 text-xs leading-5 text-[color:var(--text-muted)]">
        Activá los avisos y te llega una notificación cuando alguien reserva un
        turno <strong>con vos</strong>. Los turnos de los otros barberos no te
        llegan.
      </p>
      <PushNotificationsCard barbershopSlug={barbershopSlug} />
    </div>
  );
}
