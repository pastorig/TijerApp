/**
 * Datos del founder de TijerApp (contacto + cobro). Centralizados acá para no
 * repetir el número/alias en varios componentes. Si cambian, se actualiza acá.
 */
export const FOUNDER = {
  /**
   * Titular REAL de la cuenta para transferencias.
   *
   * Es la ÚNICA parte del producto donde va el nombre propio: en el resto
   * (landing, planes, soporte) la marca habla como "el fundador de TijerApp".
   * Acá tiene que ser el nombre real porque el barbero necesita saber a nombre
   * de quién está transfiriendo — si no, no sabe si la cuenta es la correcta.
   *
   * Se usa solo en TransferDetailsCard (paywall de plan vencido + modal Pagar).
   */
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
