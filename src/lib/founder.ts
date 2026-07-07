/**
 * Datos del founder de TijerApp (contacto + cobro). Centralizados acá para no
 * repetir el número/alias en varios componentes. Si cambian, se actualiza acá.
 */
export const FOUNDER = {
  name: "Gino",
  titular: "Gino Pastori",
  /** WhatsApp en formato internacional (54 9 3571 624511). */
  whatsapp: "5493571624511",
  /** Alias de la cuenta (Naranja X). */
  alias: "pastorinx",
  /** CBU/CVU para transferencias. */
  cbu: "4530000800016883827535",
} as const;

/** Link de WhatsApp al founder con un mensaje pre-cargado. */
export function founderWaLink(message: string): string {
  return `https://wa.me/${FOUNDER.whatsapp}?text=${encodeURIComponent(message)}`;
}
