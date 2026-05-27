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

function normalizeWhatsAppPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

/**
 * Construye la URL pública del link de confirmación.
 * Usa NEXT_PUBLIC_SITE_URL (seteada en Vercel). En SSR/server fallback al
 * mismo default que metadataBase.
 */
function getConfirmationUrl(token: string) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  // Quitar trailing slash si existe.
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/r/${token}`;
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
      getConfirmationUrl(confirmationToken),
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
