# Contrato — `resolverJornadaDelDia()`

No hay endpoints nuevos en esta feature. El contrato que importa es el de la función que decide cómo es el día de un barbero, porque la usan **el navegador y el servidor** y si discrepan, el cliente ve un horario libre que al reservar rebota.

## Firma

```ts
function resolverJornadaDelDia(entrada: {
  /** YYYY-MM-DD, en fecha de la barbería. */
  fecha: string;
  /** La fila de la regla semanal del día de la semana que corresponda, o null. */
  reglaSemanal: {
    startTime: string;
    endTime: string;
    isWorking: boolean;
    breakStart: string | null;
    breakEnd: string | null;
  } | null;
  /** La excepción de ESA fecha, si existe y no está borrada. */
  excepcion: {
    startTime: string;
    endTime: string;
    isWorking: boolean;
    heredaPausa: boolean;
    breakStart: string | null;
    breakEnd: string | null;
  } | null;
  /** El horario general de la barbería: el respaldo. */
  horarioBarberia: { start: string; end: string };
}): JornadaDelDia;

type JornadaDelDia = {
  trabaja: boolean;
  inicio: string;  // "HH:MM"
  fin: string;     // "HH:MM"
  pausa: { inicio: string; fin: string } | null;
  origen: "excepcion" | "regla-semanal" | "horario-barberia";
};
```

## Reglas

1. **Si hay excepción, manda la excepción.** Define `trabaja`, `inicio` y `fin`. `origen = "excepcion"`.
2. **La pausa de una excepción**:
   - `heredaPausa = true` → la pausa sale de `reglaSemanal` (null si esa regla no tiene). **Es el default.**
   - `heredaPausa = false` → sale de la excepción; con los dos campos en null, ese día **no hay pausa**.
3. **Sin excepción**, rige `reglaSemanal` completa, pausa incluida. `origen = "regla-semanal"`.
4. **Sin regla semanal**, rige `horarioBarberia`, sin pausa, trabajando. `origen = "horario-barberia"`.
5. **`trabaja = false`** deja `inicio`/`fin` sin sentido: quien consuma esto no debe generar ningún horario.

## Lo que esta función NO hace

Y es a propósito — es la separación que evita los bugs de horario:

- **No** mira turnos tomados ni bloqueos. Eso tapa ratos *adentro* de la jornada, después.
- **No** sabe qué hora es. "Ya pasó" y "falta muy poco" se aplican encima, con `ahoraEnArgentina()`.
- **No** arma la grilla de horarios ni sabe cuánto dura un servicio.
- **No** toca la base. Recibe filas ya leídas.

Si aparece una regla que no entra en los cinco puntos de arriba, es señal de que algo se está mezclando.

## Función acompañante

```ts
/** Los turnos que quedarían fuera de una jornada. Para el aviso al guardar. */
function turnosFueraDeJornada(
  turnos: Array<{ hora: string; duracionMinutos: number; cliente: string }>,
  jornada: JornadaDelDia,
): Array<{ hora: string; cliente: string; motivo: "antes" | "despues" | "en-pausa" | "dia-cerrado" }>;
```

Tiene que contar con el mismo criterio que el motor: un turno que **empieza** adentro pero **termina** afuera del cierre cuenta como afuera, igual que en la grilla.
