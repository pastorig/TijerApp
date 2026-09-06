# Quickstart — Excepción de horario por rango de días

## El caso que la originó

Un barbero de SV Barber quiere hacer horas extra **del 14 al 18 de septiembre**. Si toca su horario semanal, se lo cambia también todas las semanas siguientes.

## Por dónde se hace (cuando esté)

Panel → **Equipo → Barberos** → el barbero → **Horarios**, debajo de la regla semanal y los bloqueos.

## Orden de implementación

Este orden no es sugerencia: la pantalla multiplica el uso de las excepciones, así que soltarla antes del arreglo de la pausa convierte un bug raro en uno cotidiano.

1. **Migración** — las cuatro columnas y sus checks.
2. **`resolverJornadaDelDia()`** + su test. Sin tocar nada más todavía.
3. **Enchufarla en `buildAvailabilitySlots`** — extracción pura: mismas entradas, mismas salidas. Acá se arregla la pausa. **La suite entera tiene que quedar verde antes de seguir.**
4. **Pedir las columnas nuevas en los tres lugares que leen overrides.** Una columna que no se pide llega `undefined` y apaga la feature en silencio.
5. **`upsertDayOverridesEnLote()`** + la expansión del rango a fechas, con su test.
6. **La pantalla.**
7. **Marcar el día distinto en la agenda** (FR-101).

## Cómo probarlo sin romperle el día a nadie

Siempre contra la demo **`primebarber`**, nunca contra una barbería real.

```
1. Cargar 14–18 con horario extendido para un barbero de la demo.
2. Abrir la página pública de reserva y mirar la grilla de esos cinco días.
3. Mirar el lunes 21: tiene que estar exactamente como antes.
4. Repetir con un barbero QUE TENGA PAUSA y confirmar que la pausa sigue.
5. Borrar la excepción y confirmar que vuelve todo.
6. Acortar un día que ya tenga turnos: tiene que avisar cuáles quedan
   afuera, dejar guardar, y los turnos tienen que seguir ahí.
```

## Comandos

```bash
npm run test:unit
npm run lint
npm run build
```

## Trampas conocidas

- **La hora es la de la barbería, no la del server.** Para "no cargar en el pasado" usar `ahoraEnArgentina()`. `new Date().getHours()` en Vercel devuelve UTC, tres horas adelante — ya rompió la reserva el 04/09.
- **La columna que no se pide en el `select`** llega `undefined` y la feature se apaga sola, sin error y sin log.
- **La pausa por defecto se hereda.** Si un test empieza a fallar porque "aparece" una pausa donde antes no había, no es el test: es el bug arreglado.
- **El borrado es blando** y el unique es `(barber_id, override_date)` sin filtrar por `deleted_at`. Reactivar una fecha es el mismo upsert poniendo `deleted_at = null`, no un insert nuevo.
- **El último turno tiene que entrar entero** antes del cierre. El aviso de conflictos tiene que usar el mismo criterio que la grilla, o va a contar distinto.
