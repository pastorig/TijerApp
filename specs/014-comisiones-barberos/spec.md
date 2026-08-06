# Specification: Comisiones por barbero

**Branch**: `014-comisiones-barberos`
**Created**: 2026-07-30
**Status**: Draft
**Input**: De la auditoría de competencia: es la funcionalidad de mayor valor que tienen
AgendaPro y los líderes y nosotros no. En la mayoría de las barberías el barbero cobra un
porcentaje de lo que produce, y hoy el dueño lo calcula a mano.

## Contexto

El panel ya sabe **cuánto produjo cada barbero**: los reportes suman `service_price` de sus
turnos y hay una sección "Producción por barbero". Lo que no sabe es **cuánto de eso le
toca al barbero**.

Hoy el dueño hace esa cuenta afuera: mira la producción, la multiplica por el porcentaje
que arregló con cada uno, y le pasa el número por WhatsApp. Es la tarea más repetitiva y
más propensa a error de la semana, y es justo donde una barbería con empleados siente que
el sistema "no llega". SV Barber acaba de sumar un empleado — el caso ya está vivo.

**Principio:** el sistema ya tiene los datos. Esto no es cargar información nueva, es
**terminar una cuenta que quedó a medias**.

## User Scenarios & Testing

### Primary User Story

El dueño de la barbería le asigna a cada barbero el porcentaje que cobra. Al final de la
semana entra a Reportes, elige el período, y ve exactamente cuánto le corresponde a cada
uno y cuánto le queda a la barbería — listo para pagar, sin sacar la calculadora.

### Acceptance Scenarios

1. **Given** un barbero sin comisión configurada, **When** el dueño abre su ficha, **Then**
   puede cargarle un porcentaje, y hasta que lo haga el barbero no aparece en el cálculo de
   comisiones.
2. **Given** barberos con comisión configurada, **When** el dueño mira los reportes de un
   período, **Then** ve por cada barbero lo que produjo, el porcentaje que cobra, cuánto le
   corresponde y cuánto queda para la barbería.
3. **Given** un período con turnos, **When** el dueño mira el total, **Then** la suma de lo
   que se lleva cada barbero más lo que queda para la barbería coincide con la producción
   total, sin diferencias de redondeo.
4. **Given** el dueño cambia el porcentaje de un barbero, **When** vuelve a los reportes,
   **Then** el cálculo se actualiza sin necesidad de recargar nada a mano.
5. **Given** turnos cancelados o eliminados, **When** se calculan las comisiones, **Then**
   no cuentan — se usa el mismo criterio de ingresos que ya usan los reportes.
6. **Given** el dueño quiere pagarle a un barbero, **When** mira su fila, **Then** puede
   mandarle el detalle por WhatsApp con un toque.

### Edge Cases

- **Barbero sin comisión cargada:** no se asume ningún valor por defecto. Se muestra como
  "sin configurar", no como 0% — son cosas distintas y confundirlas hace que el dueño pague
  de menos sin darse cuenta.
- **Barbero que se dio de baja a mitad del período:** sus turnos del período igual cuentan;
  el trabajo ya lo hizo.
- **Porcentaje al 100%:** válido (el barbero alquila el sillón y se lleva todo). El sistema
  no lo trata como error.
- **Turnos sin precio** (`service_price` nulo o 0): no rompen el cálculo; suman cero.
- **El dueño también atiende:** si el barbero "cabeza" tiene comisión cargada, se calcula
  igual que cualquier otro. Si no, queda fuera.
- **Cambio de porcentaje a mitad de período:** el cálculo usa el porcentaje **vigente**, no
  el histórico. Hay que decírselo al dueño para que no se confunda.

## Functional Requirements

### Must Have (MVP)

- **FR-001**: Cada barbero debe poder tener un porcentaje de comisión configurable por el
  dueño, entre 0 y 100.
- **FR-002**: El sistema debe distinguir "sin comisión configurada" de "comisión 0%".
- **FR-003**: En los reportes, por cada barbero con comisión configurada, debe mostrarse:
  lo producido en el período, el porcentaje, lo que le corresponde y lo que queda para la
  barbería.
- **FR-004**: El total de comisiones más lo que queda para la barbería debe coincidir
  exactamente con la producción total del período.
- **FR-005**: El cálculo debe usar el mismo criterio de ingresos que ya usan los reportes
  (no contar cancelados ni eliminados).
- **FR-006**: El cálculo debe respetar el período que el dueño ya elige en Reportes.
- **FR-007**: Los importes deben mostrarse en pesos con el mismo formato que el resto del
  panel.

### Should Have

- **FR-101**: Poder mandarle a un barbero el detalle de su liquidación por WhatsApp.
- **FR-102**: Incluir el detalle de comisiones en el reporte PDF que ya se exporta.
- **FR-103**: Avisar en pantalla que el porcentaje que se aplica es el vigente, no el que
  estaba cuando se hizo cada turno.

### Won't Have (out of scope)

- Historial de porcentajes (que cada turno recuerde con qué comisión se hizo).
- Registrar el pago de la comisión al barbero (esto calcula, no salda).
- Comisiones distintas por servicio o por rango de facturación.
- Comisiones sobre venta de productos (no existe venta de productos todavía).
- Descuentos, adelantos o retenciones sobre la comisión.
- Que el barbero vea su propia liquidación (no hay login por barbero).

## Success Criteria

- **SC-001**: El dueño obtiene cuánto le debe a cada barbero en un período sin usar
  calculadora ni planilla.
- **SC-002**: Las cuentas cierran: comisiones + barbería = producción total, sin diferencias
  por redondeo.
- **SC-003**: Configurar la comisión de un barbero lleva menos de 30 segundos.
- **SC-004**: Una barbería sin comisiones configuradas no ve ningún cambio respecto de hoy.
- **SC-005**: El proyecto compila y pasa sus verificaciones sin errores nuevos.

## Assumptions

- **El porcentaje se aplica sobre el precio del servicio**, que es lo que ya se usa como
  ingreso en los reportes.
- **Una comisión por barbero**, plana, sin variar por servicio. Es como trabaja la mayoría
  de las barberías chicas y es lo que permite entregar valor rápido.
- **El redondeo se resuelve a favor de que las cuentas cierren**: se calcula la comisión y
  lo de la barbería se obtiene por resta, nunca calculando ambos por separado.
- **Es una feature de plan pago**: encaja con `reportes_por_barbero`, que ya es Esencial+.
- **Requiere migración** (una columna nueva en `barbers`), a diferencia de las últimas
  features. Bautista la corre en el SQL Editor.

## Dependencies

- Reportes por barbero, que ya calculan la producción por período.
- Ficha del barbero en el panel (`/admin/barbers`), donde se carga el porcentaje.
- Gating por plan (`hasFeature`), para dejarla en Esencial+.
- Helper de WhatsApp, para el envío del detalle.

## Next Steps

- Run **speckit-plan** to design the implementation
