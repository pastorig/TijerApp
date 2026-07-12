/**
 * Datos del founder de TijerApp (contacto + cobro). Centralizados acá para no
 * repetir el número/alias en varios componentes. Si cambian, se actualiza acá.
 */
export const FOUNDER = {
  /**
   * Cómo se muestra el titular de la cuenta en la UI pública/admin. Es texto
   * de marca, NO el nombre legal — el banco del que transfiere igual muestra
   * el titular real al pegar el alias/CBU.
   */
  titular: "El fundador de TijerApp",
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
