/**
 * Aviso por WhatsApp al barbero cuando el CLIENTE cancela o cambia su turno
 * desde el link del turno (`/r/[token]`).
 *
 * ── De dónde sale ───────────────────────────────────────────────────────────
 * Un barbero lo pidió el 12/11/2026: "muchos me lo reagendan y no me llegan
 * notificaciones ni de que me lo cancelaron ni de que me lo reagendaron". Al
 * reservar, el cliente le manda un WhatsApp con los datos; al cancelar o
 * cambiar el horario no le llegaba nada (el aviso al celular solo existía al
 * cancelar, y solo si el barbero tenía las notificaciones activadas).
 *
 * Mismo mecanismo que la reserva: el WhatsApp lo manda el cliente desde su
 * celular, con el mensaje ya escrito, al número del barbero del turno si tiene
 * uno propio y si no al de la barbería.
 */
import { formatDateWithWeekday, normalizeTimeValue } from "@/lib/format";

type BarberoConTelefono = {
  name: string;
  displayName?: string;
  whatsapp?: string;
};

/**
 * A qué número avisar: el del barbero del turno si lo tiene cargado, si no el
 * de la barbería. `null` si ninguno sirve (no se muestra el botón).
 */
export function telefonoParaAvisos(
  barberos: BarberoConTelefono[],
  nombreDelBarbero: string,
  whatsappDeLaBarberia: string | null | undefined,
): string | null {
  const nombre = nombreDelBarbero.trim().toLowerCase();
  const barbero = barberos.find(
    (b) =>
      b.name.trim().toLowerCase() === nombre ||
      (b.displayName ?? "").trim().toLowerCase() === nombre,
  );
  const digitos = (valor: string | null | undefined) => (valor ?? "").replace(/\D/g, "");
  const propio = digitos(barbero?.whatsapp);
  if (propio.length >= 8) return propio;
  const general = digitos(whatsappDeLaBarberia);
  return general.length >= 8 ? general : null;
}

export type CambioDelCliente =
  | { tipo: "cancelo"; fecha: string; hora: string }
  | { tipo: "reagendo"; fecha: string; hora: string; fechaNueva: string; horaNueva: string };

/** "jueves 05/11 a las 16:20" */
const cuando = (fecha: string, hora: string) =>
  `${formatDateWithWeekday(fecha)} a las ${normalizeTimeValue(hora)}`;

export function mensajeDeCambio(params: {
  cliente: string;
  barbero: string;
  servicio: string;
  cambio: CambioDelCliente;
}): string {
  const { cliente, barbero, servicio, cambio } = params;
  const lineas =
    cambio.tipo === "cancelo"
      ? [
          `Hola, soy ${cliente}. Cancelé mi turno.`,
          "",
          `Era el ${cuando(cambio.fecha, cambio.hora)}`,
        ]
      : [
          `Hola, soy ${cliente}. Cambié el horario de mi turno.`,
          "",
          `Antes: ${cuando(cambio.fecha, cambio.hora)}`,
          `Ahora: ${cuando(cambio.fechaNueva, cambio.horaNueva)}`,
        ];
  lineas.push(`Servicio: ${servicio}`);
  if (barbero.trim()) lineas.push(`Barbero: ${barbero}`);
  return lineas.join("\n");
}

/**
 * Link directo a `api.whatsapp.com/send` (no `wa.me`, que solo redirige ahí y
 * suma un salto de red con la pestaña en blanco). Igual que la reserva.
 */
export function linkDeAvisoDeCambio(telefono: string, mensaje: string): string {
  return `https://api.whatsapp.com/send/?phone=${telefono}&text=${encodeURIComponent(mensaje)}&type=phone_number&app_absent=0`;
}
