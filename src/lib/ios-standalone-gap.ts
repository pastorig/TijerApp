/**
 * Cuánto le falta a la app instalada en el iPhone/iPad para llegar al borde de
 * abajo de la pantalla. Portado de Dentidad, donde costó 6 PRs (nov 2026).
 *
 * Con la app instalada y la barra de estado transparente (`black-translucent`),
 * iOS dibuja la página desde arriba de todo (detrás de la hora) pero calcula el
 * alto de la ventana SIN esa franja. Lo que se mide con ese alto —`100dvh`,
 * `position: fixed; bottom: 0`— termina antes del borde y queda una banda
 * vacía abajo (~60 pt). `100vh` sí mide la pantalla entera.
 *
 * - `panelCorto`: el panel tiene que pasar a medir `100vh` (modo de la franja).
 *   En un iPhone instalado va SIEMPRE, sin esperar a medir: al abrir, iOS a
 *   veces todavía no achicó la ventana y cuando la achica no avisa.
 * - `bajarFijos`: la diferencia entre `100vh` e `innerHeight`.
 *
 * Fuera de ese caso (compu, Android, Safari en una pestaña) todo da 0.
 */

/** Más que esto no es la franja de la hora: es otra cosa y no se toca. */
const MAX_GAP = 80;

function diferencia(mayor: number, menor: number): number {
  const d = Math.round(mayor - menor);
  // Uno o dos píxeles son redondeo, no el problema.
  if (!Number.isFinite(d) || d <= 2 || d > MAX_GAP) return 0;
  return d;
}

export function computeIosStandaloneGap(input: {
  standalone: boolean;
  ios?: boolean;
  /** Alto de un elemento de `100vh`. */
  fullHeight: number;
  /** Alto de un elemento de `100dvh`. */
  dynamicHeight?: number;
  /** `window.innerHeight`. */
  innerHeight: number;
}): { panelCorto: boolean; bajarFijos: number } {
  if (!input.standalone) return { panelCorto: false, bajarFijos: 0 };
  const bajarFijos = diferencia(input.fullHeight, input.innerHeight);
  const panelCorto =
    input.ios === true ||
    bajarFijos > 0 ||
    (input.dynamicHeight !== undefined && diferencia(input.fullHeight, input.dynamicHeight) > 0);
  return { panelCorto, bajarFijos };
}

/**
 * El mismo criterio, como script para el <head>: prende el modo ANTES de
 * dibujar. Si se espera a React, a veces la franja quedaba (Dentidad, 23/11).
 */
export const IOS_GAP_TEMPRANO = `try{var n=navigator,i=/iPhone|iPad|iPod/.test(n.userAgent)||(n.platform==="MacIntel"&&n.maxTouchPoints>1),s=n.standalone===true||matchMedia("(display-mode: standalone)").matches;if(i&&s)document.documentElement.setAttribute("data-ios-gap","")}catch(e){}`;

/**
 * Nivel de desenfoque según el equipo: 0 normal, 1 flojo, 2 muy flojo.
 * Un equipo con poca memoria o pocos núcleos traba el scroll con el vidrio
 * (web de Solvian, nov 2026).
 */
export function nivelDeEquipo(input: { memoriaGb?: number; nucleos?: number }): 0 | 1 | 2 {
  const { memoriaGb, nucleos } = input;
  if ((memoriaGb !== undefined && memoriaGb <= 1) || (nucleos !== undefined && nucleos <= 2 && memoriaGb !== undefined && memoriaGb <= 2)) {
    return 2;
  }
  if ((memoriaGb !== undefined && memoriaGb <= 2) || (nucleos !== undefined && nucleos <= 2)) return 1;
  return 0;
}
