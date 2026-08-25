/**
 * A dónde va cada persona después de entrar.
 *
 * No hay un login aparte para empleados: usan el mismo formulario y acá se
 * decide el destino. Un login separado sería otra pantalla que mantener y otra
 * puerta que auditar, para el mismo resultado.
 *
 * Lógica pura para que se pueda testear sola: mandar a alguien a la pantalla
 * equivocada es, en el peor caso, mandar a un empleado al panel del dueño.
 */

export type PostLoginDestination =
  | { kind: "admin"; path: string }
  | { kind: "staff"; path: string }
  | { kind: "sin-acceso" };

export function resolvePostLoginDestination({
  barbershopSlug,
  isAdmin,
  isStaff,
}: {
  barbershopSlug: string;
  isAdmin: boolean;
  isStaff: boolean;
}): PostLoginDestination {
  // El dueño manda. Si alguien es las dos cosas —porque se dio acceso a sí
  // mismo para probar— va al panel completo: mandarlo a la agenda reducida
  // sería quitarle acceso a lo suyo.
  if (isAdmin) {
    return { kind: "admin", path: `/${barbershopSlug}/admin` };
  }
  if (isStaff) {
    return { kind: "staff", path: `/${barbershopSlug}/mi-agenda` };
  }
  return { kind: "sin-acceso" };
}

/**
 * ¿Esta ruta es del empleado?
 *
 * Se usa para que la PWA abra donde corresponde y para no mandar a un empleado
 * a una ruta del dueño que igual le va a rebotar.
 */
export function isStaffPath(path: string): boolean {
  return /^\/[^/]+\/mi-agenda(\/|$|\?)/.test(path);
}
