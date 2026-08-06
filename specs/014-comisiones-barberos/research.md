# Research — 014 Comisiones por barbero

**Fecha**: 2026-08-05
**Objetivo**: resolver las incógnitas técnicas antes de diseñar la implementación.

---

## R1 — ¿Dónde vive el cálculo?

**Decisión: una función pura en `src/lib/commissions.ts`, y todos consumen de ahí.**

La comisión se va a mostrar en al menos tres lugares: la tabla de Reportes, el PDF que ya
se exporta y el mensaje de WhatsApp al barbero. Si cada uno hace su propia cuenta, en algún
momento dan números distintos — y un número distinto en la liquidación de un empleado es
una discusión con plata de por medio.

La función recibe la producción por barbero (que Reportes **ya calcula**) más el porcentaje
de cada uno, y devuelve las filas listas: producido, porcentaje, comisión y resto para la
barbería. Sin React, sin I/O, cubierta por el harness de tests que ya existe.

**Alternativa considerada:** calcularlo en la base con una vista o RPC. Descartada: la
producción por período ya se arma en el cliente a partir de los turnos que el panel trae
igual, y meter una vista obliga a mantener la misma lógica de "qué cuenta como ingreso" en
dos lados.

---

## R2 — ¿Cómo se representa "sin configurar" sin confundirlo con 0%?

**Decisión: columna `commission_percent numeric(5,2) NULL`, donde `NULL` = sin configurar.**

Es la distinción que pide FR-002 y no es un tecnicismo: si un barbero sin configurar se
mostrara como 0%, el dueño ve "$0" y cree que no le debe nada, cuando en realidad nunca
cargó el dato. `NULL` obliga a que la UI diga "sin configurar" y a que el barbero quede
fuera del total hasta que se decida.

`numeric(5,2)` permite medios puntos (ej. 47,5%), que aparecen en arreglos reales, con un
`check` de 0 a 100.

**Alternativa considerada:** un entero con `-1` como centinela. Descartada: obliga a
recordar el significado del centinela en cada lectura y `NULL` ya expresa exactamente eso.

---

## R3 — El redondeo: que las cuentas cierren

**Decisión: se calcula la comisión y lo de la barbería sale por RESTA. Nunca los dos por separado.**

Con producción de $10.000 y 33%: la comisión es $3.300 y el resto $6.700. Si además se
calculara el resto como `total × 67%`, daría $6.700 y coincide — pero con $10.001 y tres
barberos, calcular ambas puntas por separado deja diferencias de pesos que el dueño ve y no
entiende, y le hacen desconfiar del sistema entero.

Regla: `comision = round(producido × pct / 100)` y `barberia = producido − comision`. Así
la identidad de FR-004 se cumple **por construcción**, no por suerte.

Los totales de la tabla se suman de las filas ya redondeadas, no se recalculan sobre el
total — si no, vuelve a aparecer el descalce.

---

## R4 — ¿Qué cuenta como producción?

**Decisión: reusar exactamente el criterio que ya usan los Reportes.**

Hoy `AdminReportes` suma `service_price` de los turnos `confirmed` y `pending`, excluyendo
cancelados y eliminados. Se reusa tal cual (FR-005): si la comisión contara distinto de lo
que el dueño ve como ingreso en la misma pantalla, tendría dos números que no cierran uno
al lado del otro.

Que cuente `pending` es deliberado y ya es la convención del panel: son turnos tomados que
todavía no se confirmaron, y el barbero igual los va a atender.

---

## R5 — ¿Dónde se carga el porcentaje?

**Decisión: en la ficha del barbero, en `/admin/barbers`, junto al resto de sus datos.**

Es donde el dueño ya edita nombre, WhatsApp y rol; el porcentaje es un dato del barbero,
no de los reportes. `AdminBarbersManager` ya tiene el formulario y persiste con
`updateBarber` / `createBarber`, así que es sumar un campo, no armar una pantalla.

**Ojo con el guardado:** `src/lib/barbers.ts` escribe con `getSupabaseClient()` (la sesión
del navegador), apoyado en las policies RLS de `barbers`. La columna nueva tiene que quedar
escribible por ese camino, o el campo no guarda. Se verifica al implementar.

---

## R6 — ¿Porcentaje vigente o histórico por turno?

**Decisión: el vigente, y avisarlo en pantalla.**

Guardar con qué comisión se hizo cada turno significa una columna en `appointments` y
escribirla en cada reserva — mucho más caro, y resuelve un problema que una barbería chica
no tiene (los porcentajes casi no cambian). Si cambia a mitad de período, se recalcula todo
con el nuevo.

Lo que **no** se puede hacer es dejarlo implícito: el dueño tiene que enterarse por la
interfaz (FR-103), no descubriéndolo cuando le cierra distinto. Queda como deuda conocida
en el spec (Won't Have).

---

## R7 — ¿Detrás de qué plan?

**Decisión: `reportes_por_barbero`, que ya existe y es Esencial+.**

No hace falta una feature flag nueva: las comisiones son una columna más de la producción
por barbero, que ya está gateada así. Una barbería del plan Solo tiene un barbero y no
necesita liquidar comisiones.

---

## Resumen de decisiones

| # | Tema | Decisión |
|---|---|---|
| R1 | Dónde calcula | Función pura `commissions.ts`, única para tabla, PDF y WhatsApp |
| R2 | Sin configurar | `commission_percent numeric(5,2) NULL`; NULL ≠ 0 |
| R3 | Redondeo | Comisión redondeada; la barbería sale por resta |
| R4 | Producción | Mismo criterio que Reportes (confirmed + pending) |
| R5 | Dónde se carga | Ficha del barbero en `/admin/barbers` |
| R6 | Vigente vs histórico | Vigente, avisado en pantalla |
| R7 | Plan | `reportes_por_barbero` (Esencial+), sin flag nueva |

**Ninguna incógnita queda abierta.** Lleva migración (una columna). Listo para el plan.
