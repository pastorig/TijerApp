type WhatsAppBookingLinkInput = {
  barbershopName: string;
  barbershopWhatsapp: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  barberName?: string;
  date: string;
  time: string;
  comment?: string;
  /**
   * Si se provee, agrega al mensaje el link público de detalle/confirmación
   * del turno. Esto permite al admin abrir el link desde el mismo WhatsApp
   * del cliente y confirmar sin entrar al panel.
   */
  confirmationToken?: string;
};

type WhatsAppConfirmationLinkInput = {
  barbershopName: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  date: string;
  time: string;
  /**
   * Token único del turno. Si se provee, el mensaje incluye un link
   * a `/r/[token]` para que el cliente confirme o cancele desde la web.
   */
  confirmationToken?: string;
};

type WhatsAppReminderInput = {
  barbershopName: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  barberName?: string;
  date: string;
  time: string;
  /**
   * Token único del turno para que el cliente pueda confirmar/cancelar
   * desde un link en el mensaje. Aplica solo al template de "confirmación
   * urgente" (2 horas antes).
   */
  confirmationToken?: string;
};

function normalizeWhatsAppPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

/**
 * Construye la URL pública para que el cliente RESPONDA (confirme o
 * cancele) su turno desde un click. Apunta a `/r/[token]/responder`.
 *
 * Para la vista pasiva (solo detalle, sin botones) usar directamente
 * `/r/[token]` desde la pantalla de éxito post-reserva.
 */
function getResponderUrl(token: string) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/r/${token}/responder`;
}

export function createWhatsAppBookingLink({
  barbershopName,
  barbershopWhatsapp,
  clientName,
  clientPhone,
  serviceName,
  barberName,
  date,
  time,
  comment,
  confirmationToken,
}: WhatsAppBookingLinkInput) {
  const normalizedPhone = normalizeWhatsAppPhone(barbershopWhatsapp);
  const messageLines = [
    `Hola, quiero reservar un turno en ${barbershopName}.`,
    "",
    `Nombre: ${clientName}`,
    `Telefono: ${clientPhone}`,
    `Servicio: ${serviceName}`,
  ];

  if (barberName) {
    messageLines.push(`Barbero: ${barberName}`);
  }

  messageLines.push(`Fecha: ${date}`, `Horario: ${time}`);

  if (comment?.trim()) {
    messageLines.push(`Comentario: ${comment.trim()}`);
  }

  if (confirmationToken) {
    messageLines.push(
      "",
      "Detalle y confirmar:",
      getResponderUrl(confirmationToken),
    );
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
    messageLines.join("\n"),
  )}`;
}

export function createWhatsAppConfirmationLink({
  barbershopName,
  clientName,
  clientPhone,
  serviceName,
  date,
  time,
  confirmationToken,
}: WhatsAppConfirmationLinkInput) {
  const normalizedPhone = normalizeWhatsAppPhone(clientPhone);
  const messageLines = [
    `Hola ${clientName}, te recordamos tu turno en ${barbershopName}.`,
    "",
    `Servicio: ${serviceName}`,
    `Fecha: ${date}`,
    `Horario: ${time}`,
  ];

  if (confirmationToken) {
    messageLines.push(
      "",
      "Confirmá o cancelá tu turno con un click:",
      getResponderUrl(confirmationToken),
    );
  } else {
    messageLines.push(
      "",
      "Por favor, avisa con al menos 1 hora de anticipacion si necesitas cancelar.",
    );
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
    messageLines.join("\n"),
  )}`;
}

/**
 * Link wa.me con un mensaje de RECORDATORIO de turno para mañana.
 * Tono casual, sin link de confirmación (es solo informativo).
 */
export function createWhatsAppDayBeforeReminderLink({
  barbershopName,
  clientName,
  clientPhone,
  serviceName,
  barberName,
  date,
  time,
}: WhatsAppReminderInput) {
  const normalizedPhone = normalizeWhatsAppPhone(clientPhone);
  const messageLines = [
    `Hola ${clientName}! Te recordamos tu turno de manana en ${barbershopName}.`,
    "",
    `Fecha: ${date}`,
    `Hora: ${time}`,
    `Servicio: ${serviceName}`,
  ];
  if (barberName) {
    messageLines.push(`Barbero: ${barberName}`);
  }
  messageLines.push(
    "",
    "Si no podes asistir, avisanos cuanto antes asi liberamos el horario.",
    "Te esperamos!",
  );
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
    messageLines.join("\n"),
  )}`;
}

type WhatsAppReviewRequestInput = {
  barbershopName: string;
  clientName: string;
  clientPhone: string;
  confirmationToken: string;
};

/**
 * Link wa.me para pedirle al cliente que deje una reseña post-corte.
 * Apunta a `/rev/[token]` que es el formulario público de reseña.
 */
export function createWhatsAppReviewRequestLink({
  barbershopName,
  clientName,
  clientPhone,
  confirmationToken,
}: WhatsAppReviewRequestInput) {
  const normalizedPhone = normalizeWhatsAppPhone(clientPhone);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const reviewUrl = `${siteUrl.replace(/\/$/, "")}/rev/${confirmationToken}`;
  const firstName = clientName.split(/\s+/)[0] ?? clientName;
  const messageLines = [
    `Hola ${firstName}! Gracias por venir a ${barbershopName}.`,
    "",
    "Si tenes 30 segundos, contanos como te fue dejando una resena rapida:",
    "",
    reviewUrl,
    "",
    "Tu opinion nos ayuda un monton.",
  ];
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
    messageLines.join("\n"),
  )}`;
}

type WhatsAppReactivationInput = {
  barbershopName: string;
  barbershopSlug: string;
  clientName: string;
  clientPhone: string;
  daysSinceLastVisit: number;
};

/**
 * Link wa.me con mensaje para REACTIVAR un cliente que hace tiempo no
 * viene. Tono casual, incluye link directo al formulario de reserva
 * público de la barbería.
 */
export function createWhatsAppReactivationLink({
  barbershopName,
  barbershopSlug,
  clientName,
  clientPhone,
  daysSinceLastVisit,
}: WhatsAppReactivationInput) {
  const normalizedPhone = normalizeWhatsAppPhone(clientPhone);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const bookingUrl = `${siteUrl.replace(/\/$/, "")}/${barbershopSlug}/reservar`;
  const firstName = clientName.split(/\s+/)[0] ?? clientName;
  const messageLines = [
    `Hola ${firstName}! Te extranamos en ${barbershopName}.`,
    "",
    `Hace ${daysSinceLastVisit} dias que no pasas por la barberia.`,
    "Te dejamos el link para reservar cuando quieras volver:",
    "",
    bookingUrl,
  ];
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
    messageLines.join("\n"),
  )}`;
}

/**
 * Link wa.me con mensaje de CONFIRMACION URGENTE (turno en las proximas
 * 2 horas). Incluye link de confirmacion si hay token.
 */
export function createWhatsAppFinalConfirmationLink({
  barbershopName,
  clientName,
  clientPhone,
  serviceName,
  barberName,
  time,
  confirmationToken,
}: WhatsAppReminderInput) {
  const normalizedPhone = normalizeWhatsAppPhone(clientPhone);
  const messageLines = [
    `Hola ${clientName}! Tu turno en ${barbershopName} es en las proximas horas.`,
    "",
    `Hora: ${time}`,
    `Servicio: ${serviceName}`,
  ];
  if (barberName) {
    messageLines.push(`Barbero: ${barberName}`);
  }
  if (confirmationToken) {
    messageLines.push(
      "",
      "Confirma tu asistencia con un click:",
      getResponderUrl(confirmationToken),
    );
  } else {
    messageLines.push(
      "",
      "Por favor, confirmanos que vas a venir.",
    );
  }
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
    messageLines.join("\n"),
  )}`;
}
