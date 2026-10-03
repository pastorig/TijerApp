/**
 * Dónde va cada turno en el calendario de la agenda (spec 031).
 *
 * Lógica pura, sin React: la usa `AgendaCalendarGridView` y la cubren los tests
 * de `scripts/test-agenda-layout.ts`.
 *
 * Por qué existe: el calendario calculaba el ancho de cada bloque mirando solo
 * a sus vecinos directos. En una cadena (A pisa a B, B pisa a C, C pisa a D)
 * cada bloque salía de un ancho distinto y dos terminaban uno encima del otro.
 * Además la altura mínima se aplicaba después de repartir, así que un turno de
 * 15 minutos se dibujaba más alto que su lugar y tapaba al siguiente.
 *
 * Acá los turnos se juntan en GRUPOS (todo lo que se pisa entre sí, directa o
 * encadenadamente), cada grupo se reparte en carriles y todos sus bloques
 * comparten el mismo ancho. La altura mínima entra en el cálculo.
 */

/** Escala fija: 2 px por minuto (120 px por hora), sin importar el intervalo de la barbería. */
export const PX_POR_MIN = 2;
/** Lo mínimo que mide un turno en pantalla, en minutos (14 min = 28 px). */
export const MIN_VISUAL_MIN = 14;
/** Por debajo de esta altura el bloque se dibuja en una sola línea. */
export const ALTO_COMPACTO_PX = 56;
/** Carriles de turnos comunes que se dibujan; el resto va al "+N". */
export const MAX_CARRILES_VISIBLES = 2;
/** Parte del ancho que se reserva para los sobreturnos cuando conviven con otros turnos. */
export const ANCHO_SOBRETURNO_PCT = 28;

export type TurnoParaLayout = {
  id: string;
  /** Minutos desde las 00:00. */
  inicioMin: number;
  /** Lo que dura el turno según el barbero: duración real si la ajustó, si no la del servicio. */
  duracionMin: number;
  esSobreturno: boolean;
};

export type BloqueDibujado = {
  id: string;
  topPx: number;
  altoPx: number;
  izquierdaPct: number;
  anchoPct: number;
  carril: number;
  grupoId: number;
  compacto: boolean;
  /** Se pisa de verdad con otro turno común (no un sobreturno a propósito). */
  encimado: boolean;
  esSobreturno: boolean;
  /** Va dentro del "+N" en vez de dibujarse. */
  oculto: boolean;
};

export type GrupoDibujado = {
  id: number;
  inicioMin: number;
  finMin: number;
  topPx: number;
  altoPx: number;
  /** Carriles de turnos comunes (puede ser más que los visibles). */
  carriles: number;
  /** Ids de los turnos que no se dibujan y van en el "+N". */
  ocultos: string[];
  /** Todos los ids del grupo, en orden de inicio. */
  ids: string[];
};

export type ResultadoLayout = {
  bloques: BloqueDibujado[];
  grupos: GrupoDibujado[];
};

type Ubicado = TurnoParaLayout & {
  finReal: number;
  finVisual: number;
  carril: number;
};

function finVisualDe(t: TurnoParaLayout) {
  return t.inicioMin + Math.max(t.duracionMin, MIN_VISUAL_MIN);
}

function asignarCarriles<T extends TurnoParaLayout>(
  turnos: T[],
): Array<T & { carril: number; finVisual: number; finReal: number }> {
  const finesPorCarril: number[] = [];
  return turnos.map((t) => {
    const finVisual = finVisualDe(t);
    let carril = finesPorCarril.findIndex((fin) => fin <= t.inicioMin);
    if (carril === -1) {
      carril = finesPorCarril.length;
      finesPorCarril.push(finVisual);
    } else {
      finesPorCarril[carril] = finVisual;
    }
    return { ...t, carril, finVisual, finReal: t.inicioMin + t.duracionMin };
  });
}

function sePisan(a: { inicioMin: number; finReal: number }, b: { inicioMin: number; finReal: number }) {
  return a.inicioMin < b.finReal && b.inicioMin < a.finReal;
}

/**
 * Reparte los turnos de UN barbero en un día.
 *
 * @param inicioReglaMin minuto en el que arranca la regla de horas (el `top` 0).
 */
export function layoutDia(
  turnos: TurnoParaLayout[],
  inicioReglaMin: number,
): ResultadoLayout {
  const ordenados = [...turnos]
    .filter((t) => Number.isFinite(t.inicioMin))
    .map((t) => ({ ...t, duracionMin: t.duracionMin > 0 ? t.duracionMin : MIN_VISUAL_MIN }))
    .sort((a, b) => a.inicioMin - b.inicioMin || b.duracionMin - a.duracionMin);

  // 1) Grupos: se cortan cuando el próximo turno arranca después del fin
  //    (visual) más tardío de todo lo acumulado. Así una cadena entera queda
  //    en un solo grupo aunque el primero y el último no se toquen.
  const grupos: TurnoParaLayout[][] = [];
  let finGrupo = -Infinity;
  for (const t of ordenados) {
    if (grupos.length === 0 || t.inicioMin >= finGrupo) {
      grupos.push([t]);
      finGrupo = finVisualDe(t);
    } else {
      grupos[grupos.length - 1].push(t);
      finGrupo = Math.max(finGrupo, finVisualDe(t));
    }
  }

  const bloques: BloqueDibujado[] = [];
  const gruposDibujados: GrupoDibujado[] = [];

  grupos.forEach((grupo, grupoId) => {
    const comunes = grupo.filter((t) => !t.esSobreturno);
    const sobres = grupo.filter((t) => t.esSobreturno);

    // Un grupo hecho solo de sobreturnos se reparte como si fueran comunes.
    const principales = comunes.length > 0 ? comunes : sobres;
    const laterales = comunes.length > 0 ? sobres : [];

    const ubicPrincipales: Ubicado[] = asignarCarriles(principales);
    const ubicLaterales: Ubicado[] = asignarCarriles(laterales);

    const carriles = Math.max(1, ...ubicPrincipales.map((u) => u.carril + 1));
    const visibles = Math.min(carriles, MAX_CARRILES_VISIBLES);
    const carrilesLaterales = Math.max(0, ...ubicLaterales.map((u) => u.carril + 1));

    const anchoZonaPrincipal = laterales.length > 0 ? 100 - ANCHO_SOBRETURNO_PCT : 100;
    const anchoCarril = anchoZonaPrincipal / visibles;
    const anchoCarrilLateral =
      carrilesLaterales > 0 ? ANCHO_SOBRETURNO_PCT / carrilesLaterales : 0;

    // Encimado = se pisa de verdad (con la duración real, no la visual) con
    // otro turno común del grupo.
    const comunesUbicados = ubicPrincipales.filter((u) => !u.esSobreturno);
    const encimados = new Set<string>();
    for (let i = 0; i < comunesUbicados.length; i++) {
      for (let j = i + 1; j < comunesUbicados.length; j++) {
        if (sePisan(comunesUbicados[i], comunesUbicados[j])) {
          encimados.add(comunesUbicados[i].id);
          encimados.add(comunesUbicados[j].id);
        }
      }
    }

    const ocultos: string[] = [];
    const dibujar = (u: Ubicado, izquierdaPct: number, anchoPct: number, oculto: boolean) => {
      const altoPx = (u.finVisual - u.inicioMin) * PX_POR_MIN;
      bloques.push({
        id: u.id,
        topPx: (u.inicioMin - inicioReglaMin) * PX_POR_MIN,
        altoPx,
        izquierdaPct,
        anchoPct,
        carril: u.carril,
        grupoId,
        compacto: altoPx < ALTO_COMPACTO_PX,
        encimado: encimados.has(u.id),
        esSobreturno: u.esSobreturno,
        oculto,
      });
    };

    for (const u of ubicPrincipales) {
      const oculto = u.carril >= MAX_CARRILES_VISIBLES;
      if (oculto) ocultos.push(u.id);
      dibujar(u, oculto ? 0 : u.carril * anchoCarril, anchoCarril, oculto);
    }
    for (const u of ubicLaterales) {
      dibujar(u, anchoZonaPrincipal + u.carril * anchoCarrilLateral, anchoCarrilLateral, false);
    }

    const inicioMin = grupo[0].inicioMin;
    const finMin = Math.max(...grupo.map(finVisualDe));
    gruposDibujados.push({
      id: grupoId,
      inicioMin,
      finMin,
      topPx: (inicioMin - inicioReglaMin) * PX_POR_MIN,
      altoPx: (finMin - inicioMin) * PX_POR_MIN,
      carriles,
      ocultos,
      ids: grupo.map((t) => t.id),
    });
  });

  return { bloques, grupos: gruposDibujados };
}

export type Intervalo = { inicioMin: number; finMin: number };

/**
 * Rango de la regla de horas: desde lo primero hasta lo último entre las
 * jornadas de los barberos y los turnos del día, redondeado a horas enteras.
 * Un turno fuera de horario estira la regla en vez de quedar cortado.
 */
export function rangoDelDia(
  jornadas: Intervalo[],
  turnos: Intervalo[],
  respaldo: Intervalo,
): Intervalo {
  const todos = [...jornadas, ...turnos].filter(
    (i) => Number.isFinite(i.inicioMin) && Number.isFinite(i.finMin) && i.finMin > i.inicioMin,
  );
  const base = todos.length > 0 ? todos : [respaldo];
  const inicio = Math.min(...base.map((i) => i.inicioMin));
  const fin = Math.max(...base.map((i) => i.finMin));
  return {
    inicioMin: Math.max(0, Math.floor(inicio / 60) * 60),
    finMin: Math.min(24 * 60, Math.ceil(fin / 60) * 60),
  };
}

export type JornadaParaLayout = {
  trabaja: boolean;
  inicioMin: number;
  finMin: number;
  pausa: Intervalo | null;
};

export type FranjaNoDisponible = Intervalo & {
  tipo: "pausa" | "bloqueo" | "fuera-de-horario";
  etiqueta: string;
};

/**
 * Franjas de la columna de un barbero donde no se atiende: antes de abrir,
 * después de cerrar, la pausa y los bloqueos. Recortadas al rango de la regla.
 */
export function franjasNoDisponibles(
  jornada: JornadaParaLayout | null,
  bloqueos: Array<Intervalo & { etiqueta?: string | null }>,
  rango: Intervalo,
): FranjaNoDisponible[] {
  const franjas: FranjaNoDisponible[] = [];
  const recortar = (f: FranjaNoDisponible) => {
    const inicioMin = Math.max(f.inicioMin, rango.inicioMin);
    const finMin = Math.min(f.finMin, rango.finMin);
    if (finMin > inicioMin) franjas.push({ ...f, inicioMin, finMin });
  };

  if (!jornada || !jornada.trabaja) {
    recortar({ ...rango, tipo: "fuera-de-horario", etiqueta: "No trabaja" });
  } else {
    recortar({ inicioMin: rango.inicioMin, finMin: jornada.inicioMin, tipo: "fuera-de-horario", etiqueta: "Cerrado" });
    recortar({ inicioMin: jornada.finMin, finMin: rango.finMin, tipo: "fuera-de-horario", etiqueta: "Cerrado" });
    if (jornada.pausa) {
      recortar({ ...jornada.pausa, tipo: "pausa", etiqueta: "Pausa" });
    }
  }
  for (const b of bloqueos) {
    recortar({
      inicioMin: b.inicioMin,
      finMin: b.finMin,
      tipo: "bloqueo",
      etiqueta: b.etiqueta?.trim() || "Bloqueado",
    });
  }
  return franjas.sort((a, b) => a.inicioMin - b.inicioMin);
}

/**
 * Ratos libres dentro de la jornada: sin turnos, sin pausa y sin bloqueos.
 * Es el punto de partida para meter un sobreturno.
 */
export function huecosLibres(
  jornada: JornadaParaLayout | null,
  turnos: Array<{ inicioMin: number; duracionMin: number }>,
  bloqueos: Intervalo[],
): Intervalo[] {
  if (!jornada || !jornada.trabaja) return [];
  const ocupado: Intervalo[] = [
    ...turnos.map((t) => ({ inicioMin: t.inicioMin, finMin: t.inicioMin + t.duracionMin })),
    ...bloqueos,
    ...(jornada.pausa ? [jornada.pausa] : []),
  ].sort((a, b) => a.inicioMin - b.inicioMin);

  const huecos: Intervalo[] = [];
  let cursor = jornada.inicioMin;
  for (const o of ocupado) {
    if (o.inicioMin > cursor) {
      huecos.push({ inicioMin: cursor, finMin: Math.min(o.inicioMin, jornada.finMin) });
    }
    cursor = Math.max(cursor, o.finMin);
    if (cursor >= jornada.finMin) break;
  }
  if (cursor < jornada.finMin) huecos.push({ inicioMin: cursor, finMin: jornada.finMin });
  return huecos.filter((h) => h.finMin > h.inicioMin);
}

/**
 * Qué parte de la jornada tiene ocupada el barbero, de 0 a 100.
 *
 * Disponible = jornada menos la pausa y los bloqueos. Ocupado = lo disponible
 * que no quedó como hueco libre (dos turnos encimados no cuentan doble). Null
 * si ese día no trabaja.
 */
export function ocupacionDelDia(
  jornada: JornadaParaLayout | null,
  turnos: Array<{ inicioMin: number; duracionMin: number }>,
  bloqueos: Intervalo[],
): number | null {
  if (!jornada || !jornada.trabaja || jornada.finMin <= jornada.inicioMin) return null;
  const recortar = (i: Intervalo): Intervalo => ({
    inicioMin: Math.max(i.inicioMin, jornada.inicioMin),
    finMin: Math.min(i.finMin, jornada.finMin),
  });
  // Pausa y bloqueos juntos, sin contar dos veces lo que se superpone.
  const noDisponible = [...(jornada.pausa ? [jornada.pausa] : []), ...bloqueos]
    .map(recortar)
    .filter((i) => i.finMin > i.inicioMin)
    .sort((a, b) => a.inicioMin - b.inicioMin);
  let minutosNoDisponibles = 0;
  let cursor = -Infinity;
  for (const i of noDisponible) {
    const desde = Math.max(i.inicioMin, cursor);
    if (i.finMin > desde) minutosNoDisponibles += i.finMin - desde;
    cursor = Math.max(cursor, i.finMin);
  }
  const disponible = jornada.finMin - jornada.inicioMin - minutosNoDisponibles;
  if (disponible <= 0) return 100;
  const libre = huecosLibres(jornada, turnos, bloqueos).reduce(
    (total, h) => total + (h.finMin - h.inicioMin),
    0,
  );
  return Math.round(Math.min(100, Math.max(0, ((disponible - libre) / disponible) * 100)));
}

/** ¿Un turno nuevo se pisaría con alguno de los existentes? */
export function pisaAOtro(
  nuevo: { inicioMin: number; duracionMin: number },
  turnos: Array<{ inicioMin: number; duracionMin: number }>,
): boolean {
  const finNuevo = nuevo.inicioMin + nuevo.duracionMin;
  return turnos.some(
    (t) => nuevo.inicioMin < t.inicioMin + t.duracionMin && t.inicioMin < finNuevo,
  );
}
