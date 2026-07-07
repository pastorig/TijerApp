# Specification: Cobro de barberos — suscripción de plan (Fase 1: transferencia + activación manual)

**Branch**: `007-cobro-barberos`
**Created**: 2026-07-07
**Status**: Draft
**Input**: Que los barberos paguen su plan mensual al founder (Gino). Hoy, cuando el plan vence, el barbero ve un paywall/banner que solo abre WhatsApp y el pago se arregla a mano sin registro. Se quiere formalizar el cobro por **transferencia bancaria + activación manual** desde el panel del founder, sin integraciones de pago (MercadoPago recurrente queda para una fase posterior).

## User Scenarios & Testing

### Primary User Story

Un barbero cuyo plan venció necesita reactivarlo pagando su cuota mensual. Como todavía no hay pago automático, transfiere el dinero a la cuenta del founder (Gino); el founder registra ese pago desde su panel, lo que reactiva el acceso del barbero por un mes más. El barbero ve con claridad **cuánto** y **a dónde** transferir.

### Acceptance Scenarios

1. **Given** un barbero con plan vencido, **When** entra a su panel admin, **Then** ve un aviso/paywall con el monto a pagar, los datos de transferencia (alias/CBU) del founder y el botón de WhatsApp ya existente.
2. **Given** el founder recibió una transferencia de una barbería, **When** registra el cobro (monto, fecha, método) en su panel, **Then** el plan de esa barbería queda activo y su vencimiento pasa a ser un mes más adelante.
3. **Given** una barbería activa "pagada hasta" el 20/08, **When** el founder registra otro pago el 05/08, **Then** el nuevo vencimiento es el 20/09 (se suma un mes al vencimiento vigente; no se pierde lo ya pagado).
4. **Given** una barbería cuya fecha de "pagado hasta" ya pasó y sin trial vigente, **When** un barbero entra, **Then** el acceso queda bloqueado (mismo comportamiento que hoy con el trial vencido) hasta que se registre un nuevo pago.
5. **Given** el founder abre el panel de cobros, **When** mira una barbería, **Then** ve hasta cuándo está paga y su historial de pagos.

### Edge Cases

- Barbería sin ningún pago pero con **trial vigente** → sigue funcionando por el trial; el pago recién importa cuando el trial vence.
- Registrar un pago con **fecha retroactiva** → la extensión se calcula desde `max(hoy, vencimiento vigente)`, para no regalar días perdidos.
- Barbería que **paga durante el trial** → queda activa por pago; al vencer el trial no se corta.
- **Doble registro** accidental del mismo pago → cada registro suma un mes; el founder puede detectarlo en el historial. (Anular/revertir queda fuera de alcance de esta fase.)
- **Cambio de tier** mientras está paga → el monto a mostrar/cobrar refleja el tier vigente.

## Functional Requirements

### Must Have (MVP)

- **FR-001**: El sistema debe guardar, por barbería, una fecha de **"pagado hasta"** que determina hasta cuándo el plan está activo por pago.
- **FR-002**: El acceso del barbero debe **bloquearse cuando "pagado hasta" ya pasó** (y no hay trial vigente), con el mismo paywall + período de gracia que hoy usa el trial vencido.
- **FR-003**: El founder debe poder **registrar un pago** de una barbería (monto, fecha de pago, método, nota opcional); al registrarlo, el plan queda **activo** y "pagado hasta" se **extiende un mes** desde `max(hoy, vencimiento vigente)`.
- **FR-004**: Cada pago registrado debe quedar en un **historial consultable** por barbería (monto, método, período cubierto, quién lo registró, cuándo).
- **FR-005**: El aviso/paywall que ve el barbero con plan vencido o por vencer debe mostrar el **monto a pagar** y los **datos de transferencia del founder**, además del contacto por WhatsApp ya existente. **Datos a mostrar:** Alias **`pastorinx`** (Naranja X) · Titular **Gino Pastori** · CBU **`4530000800016883827535`**.
- **FR-006**: El founder debe poder ver, por barbería, **hasta cuándo está paga** y su **historial de pagos**.

### Should Have

- **FR-101**: El aviso debe comunicar el estado/urgencia (por vencer, en gracia, vencido) y los días restantes cuando aplique.
- **FR-102**: El monto mostrado corresponde al **precio del tier vigente** de la barbería (Solo / Esencial / Pro, tomado de `PLAN_META`). Cada barbería ve el precio de su propio plan.

### Won't Have (out of scope)

- Cobro automático/recurrente por MercadoPago (Suscripciones/preapproval), Checkout Pro o webhooks de pago — **fase futura**.
- Cualquier cambio al flujo de **señas de clientes** (integración MP por-barbería, distinta de este cobro de plataforma).
- Tarjetas guardadas, débito automático, facturación/AFIP, prorrateo por cambio de tier a mitad de mes.
- Anulación/reverso de pagos ya registrados (se evalúa aparte).

## Key Entities

- **Suscripción de barbería** (existente): estado del plan de cada barbería; se le agrega la noción de **"pagado hasta"**.
- **Pago de barbería** (nuevo): un pago registrado manualmente por el founder — barbería, monto, método, período cubierto (desde/hasta), quién lo registró, fecha de registro.

## Success Criteria

- **SC-001**: El founder puede registrar un pago y reactivar una barbería vencida en **menos de 30 segundos**, sin tocar la base de datos a mano.
- **SC-002**: El **100%** de las barberías con "pagado hasta" en el futuro tienen acceso completo; el **100%** con la fecha pasada (y sin trial) quedan bloqueadas.
- **SC-003**: Un barbero con plan vencido puede saber **cuánto y a dónde** transferir sin tener que preguntar (monto + alias/CBU visibles en el aviso).
- **SC-004**: Cada reactivación queda **registrada y es auditable** (quién pagó, cuánto y hasta cuándo).

## Assumptions

- El período de cobro es **mensual** (1 mes por pago) — default razonable para una cuota SaaS.
- La extensión se calcula desde `max(hoy, vencimiento vigente)` para no regalar días.
- El **período de gracia** existente se mantiene igual: al pasar "pagado hasta" primero hay gracia y luego bloqueo, como con el trial.
- El registro de cobros lo hace **solo el founder** (owner), no los barberos.
- La ubicación exacta del registro de cobros (dentro de `/owner/planes` o en una página nueva `/owner/cobros`) se define en la etapa de **plan**; no cambia el alcance funcional.

## Dependencies

- Sistema de planes existente (suscripciones por barbería, resolución de estado, gating, paywall/banner).
- Precios por tier existentes (para mostrar el monto).
- Dato de negocio: **alias/CBU de Gino** (lo provee Bautista).

## Clarifications

### Session 2026-07-07

- **Monto en el paywall** → sale del **precio del tier vigente** de la barbería (`PLAN_META`), no un precio fijo. (Resuelve FR-102.)
- **Datos de transferencia de Gino** → Alias `pastorinx` (Naranja X) · Titular Gino Pastori · CBU `4530000800016883827535`. (Resuelve FR-005.)

## Next Steps

- ✅ Clarificaciones resueltas (no quedan `[NEEDS CLARIFICATION]`).
- Run **speckit-plan** para diseñar la implementación.
