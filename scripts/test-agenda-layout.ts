/**
 * Tests del reparto de turnos en el calendario de la agenda (spec 031).
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-agenda-layout.ts
 */
import {
  ALTO_COMPACTO_PX,
  ANCHO_SOBRETURNO_PCT,
  PX_POR_MIN,
  franjasNoDisponibles,
  huecosLibres,
  layoutDia,
  pisaAOtro,
  rangoDelDia,
  type TurnoParaLayout,
} from "../src/lib/agenda-layout.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(got)}`}`);
  if (ok) passed++;
  else failed++;
}

const h = (hhmm: string) => {
  const [a, b] = hhmm.split(":").map(Number);
  return a * 60 + b;
};
const turno = (id: string, inicio: string, dur: number, esSobreturno = false): TurnoParaLayout => ({
  id,
  inicioMin: h(inicio),
  duracionMin: dur,
  esSobreturno,
});

/** ¿Dos bloques visibles se tapan (se cruzan en vertical Y en horizontal)? */
function hayTapados(bloques: ReturnType<typeof layoutDia>["bloques"]) {
  const vis = bloques.filter((b) => !b.oculto);
  for (let i = 0; i < vis.length; i++) {
    for (let j = i + 1; j < vis.length; j++) {
      const a = vis[i];
      const b = vis[j];
      const vertical = a.topPx < b.topPx + b.altoPx && b.topPx < a.topPx + a.altoPx;
      const horizontal =
        a.izquierdaPct < b.izquierdaPct + b.anchoPct - 0.001 &&
        b.izquierdaPct < a.izquierdaPct + a.anchoPct - 0.001;
      if (vertical && horizontal) return `${a.id} tapa a ${b.id}`;
    }
  }
  return null;
}

// 1) Un turno solo: ancho completo, en su lugar.
{
  const { bloques } = layoutDia([turno("a", "10:00", 30)], h("09:00"));
  check("turno solo → ancho 100%", bloques[0].anchoPct, 100);
  check("turno solo → top = 60 min × 2 px", bloques[0].topPx, 60 * PX_POR_MIN);
  check("turno solo → no encimado", bloques[0].encimado, false);
}

// 2) Doble encimado (el caso de SV Barber): 15:00-15:40 y 15:30-16:00.
{
  const { bloques, grupos } = layoutDia([turno("a", "15:00", 40), turno("b", "15:30", 30)], h("15:00"));
  check("doble → un solo grupo", grupos.length, 1);
  check("doble → mismo ancho 50%", bloques.map((b) => b.anchoPct), [50, 50]);
  check("doble → los dos encimados", bloques.map((b) => b.encimado), [true, true]);
  check("doble → nada tapado", hayTapados(bloques), null);
}

// 3) Cadena A-B-C-D: el bug viejo (B y D se tapaban porque D salía al 50%).
{
  const { bloques, grupos } = layoutDia(
    [turno("A", "10:00", 60), turno("B", "10:30", 60), turno("C", "10:45", 30), turno("D", "11:20", 40)],
    h("10:00"),
  );
  check("cadena → un solo grupo", grupos.length, 1);
  const visibles = bloques.filter((b) => !b.oculto);
  check(
    "cadena → todos los visibles con el mismo ancho",
    new Set(visibles.map((b) => b.anchoPct.toFixed(3))).size,
    1,
  );
  check("cadena → nada tapado", hayTapados(bloques), null);
}

// 4) Tres simultáneos → 2 visibles + 1 en el "+N".
{
  const { bloques, grupos } = layoutDia(
    [turno("a", "12:00", 30), turno("b", "12:00", 30), turno("c", "12:00", 30)],
    h("12:00"),
  );
  check("3 simultáneos → 1 oculto", grupos[0].ocultos.length, 1);
  check("3 simultáneos → 3 carriles en el grupo", grupos[0].carriles, 3);
  check("3 simultáneos → visibles al 50%", bloques.filter((b) => !b.oculto).map((b) => b.anchoPct), [50, 50]);
  check("3 simultáneos → nada tapado", hayTapados(bloques), null);
}

// 5) Ocho turnos de 15 min seguidos: ni encimados ni tapados, todos compactos y a ancho completo.
{
  const turnos = Array.from({ length: 8 }, (_, i) =>
    turno(`t${i}`, `${String(9 + Math.floor((i * 15) / 60)).padStart(2, "0")}:${String((i * 15) % 60).padStart(2, "0")}`, 15),
  );
  const { bloques } = layoutDia(turnos, h("09:00"));
  check("8 cortos → ninguno encimado", bloques.some((b) => b.encimado), false);
  check("8 cortos → todos a ancho completo", bloques.every((b) => b.anchoPct === 100), true);
  check("8 cortos → nada tapado", hayTapados(bloques), null);
  check("8 cortos → todos compactos", bloques.every((b) => b.compacto), true);
  check("8 cortos → 15 min = 30 px", bloques[0].altoPx, 30);
}

// 6) Un turno muy corto (5 min) igual mide lo mínimo y no se tapa con el siguiente.
{
  const { bloques } = layoutDia([turno("a", "10:00", 5), turno("b", "10:15", 30)], h("10:00"));
  check("5 min → alto mínimo 28 px", bloques[0].altoPx, 28);
  check("5 min → no tapa al siguiente", hayTapados(bloques), null);
}

// 7) Turno largo no compacto.
{
  const { bloques } = layoutDia([turno("a", "10:00", 45)], h("10:00"));
  check("45 min → 90 px, no compacto", [bloques[0].altoPx, bloques[0].compacto], [90, false]);
  check("umbral compacto = 56 px", ALTO_COMPACTO_PX, 56);
}

// 8) Duración real alargada que pisa al siguiente → encimado.
{
  const { bloques } = layoutDia([turno("a", "10:00", 40), turno("b", "10:30", 30)], h("10:00"));
  check("alargue 30→40 que pisa → encimados", bloques.map((b) => b.encimado), [true, true]);
}

// 9) Sobreturno en un hueco libre: ancho completo, sin "encimado".
{
  const { bloques } = layoutDia([turno("s", "14:00", 15, true)], h("14:00"));
  check("sobreturno solo → ancho completo", bloques[0].anchoPct, 100);
  check("sobreturno solo → no encimado", bloques[0].encimado, false);
  check("sobreturno solo → marcado", bloques[0].esSobreturno, true);
}

// 10) Sobreturno encima de un turno común: franja angosta a la derecha, nadie encimado.
{
  const { bloques } = layoutDia([turno("a", "15:00", 40), turno("s", "15:00", 15, true)], h("15:00"));
  const a = bloques.find((b) => b.id === "a")!;
  const s = bloques.find((b) => b.id === "s")!;
  check("sobre + común → común ocupa 72%", a.anchoPct, 100 - ANCHO_SOBRETURNO_PCT);
  check("sobre + común → sobreturno a la derecha", [s.izquierdaPct, s.anchoPct], [100 - ANCHO_SOBRETURNO_PCT, ANCHO_SOBRETURNO_PCT]);
  check("sobre + común → ninguno marcado encimado", [a.encimado, s.encimado], [false, false]);
  check("sobre + común → nada tapado", hayTapados(bloques), null);
}

// 11) Dos comunes encimados + un sobreturno: los comunes siguen encimados.
{
  const { bloques } = layoutDia(
    [turno("a", "15:00", 40), turno("b", "15:30", 30), turno("s", "15:10", 15, true)],
    h("15:00"),
  );
  check("2 comunes + sobre → comunes encimados", bloques.filter((b) => !b.esSobreturno).every((b) => b.encimado), true);
  check("2 comunes + sobre → nada tapado", hayTapados(bloques), null);
}

// 12) Rango del día: se estira por un turno fuera de jornada y redondea a la hora.
{
  const r = rangoDelDia(
    [{ inicioMin: h("09:00"), finMin: h("20:00") }],
    [{ inicioMin: h("20:30"), finMin: h("21:10") }],
    { inicioMin: h("09:00"), finMin: h("21:00") },
  );
  check("rango estirado → 09:00 a 22:00", [r.inicioMin, r.finMin], [h("09:00"), h("22:00")]);
  const r2 = rangoDelDia([{ inicioMin: h("09:30"), finMin: h("18:15") }], [], { inicioMin: 0, finMin: 60 });
  check("rango redondeado → 09:00 a 19:00", [r2.inicioMin, r2.finMin], [h("09:00"), h("19:00")]);
  const r3 = rangoDelDia([], [], { inicioMin: h("10:00"), finMin: h("20:00") });
  check("sin datos → respaldo", [r3.inicioMin, r3.finMin], [h("10:00"), h("20:00")]);
}

// 13) Franjas no disponibles: cerrado antes/después, pausa y bloqueo.
{
  const jornada = { trabaja: true, inicioMin: h("10:00"), finMin: h("19:00"), pausa: { inicioMin: h("13:00"), finMin: h("14:00") } };
  const f = franjasNoDisponibles(jornada, [{ inicioMin: h("16:00"), finMin: h("16:30"), etiqueta: "Médico" }], { inicioMin: h("09:00"), finMin: h("20:00") });
  check("franjas → tipos en orden", f.map((x) => x.tipo), ["fuera-de-horario", "pausa", "bloqueo", "fuera-de-horario"]);
  check("franjas → etiqueta del bloqueo", f[2].etiqueta, "Médico");
  const libre = franjasNoDisponibles(null, [], { inicioMin: h("09:00"), finMin: h("20:00") });
  check("no trabaja → toda la columna", libre.map((x) => [x.tipo, x.inicioMin, x.finMin]), [["fuera-de-horario", h("09:00"), h("20:00")]]);
}

// 14) Huecos libres descontando turnos, pausa y bloqueos.
{
  const jornada = { trabaja: true, inicioMin: h("10:00"), finMin: h("14:00"), pausa: { inicioMin: h("12:00"), finMin: h("12:30") } };
  const huecos = huecosLibres(jornada, [{ inicioMin: h("10:00"), duracionMin: 40 }], [{ inicioMin: h("13:00"), finMin: h("13:20") }]);
  check(
    "huecos → 10:40-12:00, 12:30-13:00, 13:20-14:00",
    huecos.map((x) => [x.inicioMin, x.finMin]),
    [[h("10:40"), h("12:00")], [h("12:30"), h("13:00")], [h("13:20"), h("14:00")]],
  );
  check("no trabaja → sin huecos", huecosLibres(null, [], []), []);
}

// 15) pisaAOtro.
{
  const turnos = [{ inicioMin: h("15:00"), duracionMin: 40 }];
  check("15:30 pisa al de 15:00 (40 min)", pisaAOtro({ inicioMin: h("15:30"), duracionMin: 15 }, turnos), true);
  check("15:40 no pisa", pisaAOtro({ inicioMin: h("15:40"), duracionMin: 15 }, turnos), false);
  check("14:45 de 15 min no pisa", pisaAOtro({ inicioMin: h("14:45"), duracionMin: 15 }, turnos), false);
}

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
