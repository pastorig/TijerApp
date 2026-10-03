# Tasks: 032 calendario del empleado

- [x] T1 Grid compartido: `createOptions`, `allowDrag`, `readOnly`, tipos mínimos
- [x] T2 `opcionesDeHueco` en staff-permissions + tests
- [x] T3 `staff-sobreturno.ts` (validación pura) + tests
- [x] T4 `GET /api/staff/agenda`: duración real, sobreturno, horario, soloLectura
- [x] T5 `POST /api/staff/appointment`: sobreturno
- [x] T6 Modales: hora inicial, modo sobreturno, aviso de encimado
- [x] T7 `StaffAgenda`: selector, calendario, hoja de detalle
- [x] T8 tsc + lint + test:unit + build
- [x] T9 Verificación visual con datos fijos (390 / 1440)
- [ ] T10 QA logueada de Bautista (Esteban en primebarber): toggle, hoja de detalle, sobreturno real

## Verificación hecha (03/10)

Página local temporal con datos fijos, 375 px y escritorio:

| Caso | Hueco | Menú | Arrastre |
|---|---|---|---|
| Todos los permisos | botón | Turno, Sobreturno, Bloquear | no |
| Solo bloquear | botón ("Bloquear este rato") | Bloquear | no |
| Sin cargar ni bloquear | texto, no botón | — | no |
| Plan vencido | no se muestra | — | no |
| Dueño (sin props nuevas) | botón | Turno, Sobreturno | sí (5 de 5) |

Modal de sobreturno: hora del hueco precargada, duraciones 10/15/20/30, servicio
opcional, aviso "Se va a encimar con el turno de las 10:20". Sin desborde horizontal.

No verificado por mí (necesita login): el selector Lista/Calendario dentro de
`StaffAgenda`, la hoja de detalle y un sobreturno guardado de verdad.
