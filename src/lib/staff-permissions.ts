/**
 * Qué puede ver y tocar un empleado (feature 019).
 *
 * ── Por qué esta lista vive en un solo archivo ──────────────────────────────
 * Los permisos se aplican en tres endpoints, se dibujan en dos pantallas y se
 * editan en una tercera. Si la lista estuviera escrita en cada lugar, agregar
 * un permiso sería acordarse de seis archivos, y el que se olvide queda
 * abierto sin que nada avise. Acá está una vez y el tipo obliga al resto.
 *
 * ── Por qué "ver lo que gana" es UN permiso y no tres ───────────────────────
 * La plata del empleado aparece en tres lugares: la pestaña Ganancias, el
 * "Te llevás" del resumen del día y el precio de cada servicio en su agenda.
 * Es el mismo dato entrando por tres puertas. Con tres tildes separados, el
 * dueño que apaga "Ganancias" creería que el barbero no ve la facturación
 * mientras la sigue sumando desde los precios de los turnos.
 *
 * ── El default es "sí" ──────────────────────────────────────────────────────
 * Es lo contrario de lo habitual en permisos, y es a propósito: los accesos
 * que ya existen fueron dados cuando el empleado veía todo. Si el default
 * fuera "no", el día del deploy todos los empleados de todas las barberías
 * perderían la mitad de la app sin que nadie lo haya pedido.
 */

export type StaffPermission =
  | "verGanancias"
  | "confirmar"
  | "cancelar"
  | "contactarCliente"
  | "cargarTurno"
  | "bloquearHorario";

export type StaffPermissions = Record<StaffPermission, boolean>;

/** La columna de la base que respalda cada permiso. */
export const COLUMNA_DE_PERMISO: Record<StaffPermission, string> = {
  verGanancias: "can_see_earnings",
  confirmar: "can_confirm",
  cancelar: "can_cancel",
  contactarCliente: "can_contact_client",
  cargarTurno: "can_create_appointment",
  bloquearHorario: "can_block_time",
};

/** Cómo se le explica cada permiso al dueño, en Equipo. */
export const PERMISOS_UI: Array<{
  key: StaffPermission;
  label: string;
  detalle: string;
}> = [
  {
    key: "verGanancias",
    label: "Ver lo que gana",
    detalle:
      "Su comisión del mes, cuánto se lleva en el día y el precio de cada servicio.",
  },
  {
    key: "confirmar",
    label: "Confirmar turnos",
    detalle: "Puede marcar un turno suyo como confirmado.",
  },
  {
    key: "cancelar",
    label: "Cancelar turnos",
    detalle: "Puede cancelar un turno suyo y liberar el horario.",
  },
  {
    key: "contactarCliente",
    label: "Escribirle al cliente",
    detalle: "Ve el teléfono del cliente y puede abrirle el WhatsApp.",
  },
  {
    key: "cargarTurno",
    label: "Cargar turnos",
    detalle:
      "Puede anotar en su agenda al cliente que entra sin haber reservado.",
  },
  {
    key: "bloquearHorario",
    label: "Bloquear horarios",
    detalle:
      "Puede tapar un rango suyo cuando no va a estar: franco, se va antes, el médico.",
  },
];

export const PERMISOS_POR_DEFECTO: StaffPermissions = {
  verGanancias: true,
  confirmar: true,
  cancelar: true,
  contactarCliente: true,
  cargarTurno: true,
  bloquearHorario: true,
};

/**
 * Los permisos de una fila de `barber_staff_access`.
 *
 * Todo lo que no sea un `false` explícito se lee como permitido: una fila
 * anterior a la migración, un `null`, o una columna que todavía no llegó.
 * Es la misma decisión que el default de la tabla, sostenida en el código.
 */
export function normalizarPermisos(
  fila: Record<string, unknown> | null | undefined,
): StaffPermissions {
  const resultado = { ...PERMISOS_POR_DEFECTO };
  if (!fila) return resultado;

  for (const key of Object.keys(COLUMNA_DE_PERMISO) as StaffPermission[]) {
    if (fila[COLUMNA_DE_PERMISO[key]] === false) resultado[key] = false;
  }
  return resultado;
}

/** Lo que llega del cuerpo de un request, quedándose solo con lo booleano. */
export function permisosDesdeBody(
  body: Record<string, unknown>,
): Partial<StaffPermissions> {
  const parcial: Partial<StaffPermissions> = {};
  for (const key of Object.keys(COLUMNA_DE_PERMISO) as StaffPermission[]) {
    if (typeof body[key] === "boolean") parcial[key] = body[key];
  }
  return parcial;
}

/**
 * Saca del turno lo que el empleado no tiene permitido ver.
 *
 * **Se borra del payload, no se oculta en la pantalla.** Si el precio y el
 * teléfono viajaran igual y solo dejáramos de dibujarlos, cualquiera que abra
 * las herramientas del navegador los ve — y el dueño estaría creyendo que
 * apagó algo que sigue estando.
 */
export function recortarTurno<
  T extends { service_price?: unknown; customer_phone?: unknown },
>(turno: T, permisos: StaffPermissions): T {
  const recortado = { ...turno };
  if (!permisos.verGanancias) recortado.service_price = null;
  if (!permisos.contactarCliente) recortado.customer_phone = null;
  return recortado;
}

/** Qué acción del turno habilita cada permiso. */
export function puedeCambiarEstado(
  status: "confirmed" | "cancelled",
  permisos: StaffPermissions,
): boolean {
  return status === "confirmed" ? permisos.confirmar : permisos.cancelar;
}

/** Traduce a las columnas de la base, para el update. */
export function aColumnas(
  parcial: Partial<StaffPermissions>,
): Record<string, boolean> {
  const columnas: Record<string, boolean> = {};
  for (const [key, valor] of Object.entries(parcial)) {
    if (typeof valor === "boolean") {
      columnas[COLUMNA_DE_PERMISO[key as StaffPermission]] = valor;
    }
  }
  return columnas;
}
