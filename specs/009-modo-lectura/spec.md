# 009 — Modo lectura al vencer el plan

**Estado:** aprobado (2026-07-23). Decidido con Bautista.

## Problema

Hoy, cuando a una barbería se le vence el plan, el paywall casi no duele: `RequirePlan`
solo envuelve 4 páginas (cobros, cupones, equipo, fidelización). El barbero vencido
conserva turnero, clientes, reportes, barberos, settings y galería, y la reserva
online pública sigue funcionando. Resultado: no hay ninguna urgencia comercial para
pagar, y el vencimiento pasa desapercibido.

## Principio

**Vencido = la barbería se congela, no se borra.** El barbero ve todo lo suyo
(agenda, clientes, reportes, configuración) y no puede escribir nada. Sus datos
quedan intactos y a la vista; lo que se apaga es que la app trabaje para él.

## Alcance

### 1. La regla, en un solo lugar

`ResolvedPlan` (en `src/lib/plans.ts`) suma `isReadOnly: boolean`, derivado de
`!canAccessFeatures` — o sea, `true` en `expired` y `cancelled`, `false` en
`active` y `grace`. Una sola fuente de verdad para server y cliente.

`SerializedPlan` (en `PlanContext.tsx`) también lo expone, para los componentes client.

### 2. El candado real es server-side

Nuevo `assertPlanActive(slug)` en `src/lib/api-plan-guard.ts`: devuelve **402** si el
plan está vencido. Se llama DESPUÉS de validar que el usuario es admin de la barbería,
igual que el `assertPlanFeature` que ya existe.

Se aplica **solo a los métodos de escritura** (POST / PATCH / PUT / DELETE) de los
endpoints `/api/admin/*`. Los GET siguen funcionando: el barbero tiene que poder leer.

Endpoints alcanzados: `appointments`, `appointments/move`, `appointments/notify-rescheduled`,
`barbershop-settings`, `clients`, `clients/import`, `coupons`, `gallery-photos`, `logo`,
`loyalty`, `mp`, `team`, `waitlist`.

> Los endpoints que ya usan `assertPlanFeature` quedan cubiertos (ese guard ya
> devuelve 402 cuando el plan está vencido). `assertPlanActive` generaliza eso a
> los endpoints base, que hoy no tienen ningún guard de plan.

### 3. El admin se apaga visualmente

- `PlanStatusBanner`, en estado vencido, pasa a explicar el modo lectura:
  *"Modo lectura — podés ver todo, pero no cargar ni modificar turnos"*, junto a los
  datos de transferencia que ya muestra.
- Los puntos de entrada de escritura quedan deshabilitados con motivo visible:
  botón "Nuevo turno", afordancia "+ turno" del calendario, acciones de fila
  (confirmar / cancelar / editar), y los botones de guardar de settings, barberos
  y galería.
- **Drag & drop apagado**: cuando `isReadOnly`, no se montan los sensores de dnd-kit.
- Lo que se escape de la UI rebota contra el 402 del server con un mensaje honesto.

### 4. La reserva pública se apaga con dignidad

La landing pública de la barbería sigue entera (servicios, equipo, galería, Instagram,
horarios). Lo único que cambia es el CTA de reservar: pasa a decir que la reserva
online no está disponible por ahora y manda al WhatsApp del barbero.

`/[slug]/reservar` muestra el mismo mensaje si alguien entra por link directo.

Server-side: `POST /api/appointments/book`, `POST /api/appointments/reschedule` y los
endpoints de `waitlist` cortan con 402 si la barbería está vencida.

**Por qué:** el cliente final nunca ve algo roto ni se entera del problema comercial,
y el barbero pierde exactamente aquello por lo que paga — que la agenda se llene sola.

### Decisiones tomadas

- **Cero escritura** en modo lectura: el barbero tampoco puede confirmar ni cancelar
  turnos ya cargados. Más simple de blindar y el mensaje es inequívoco.
- **La reserva pública se corta**, pero la landing NO se apaga (apagarla entera
  arriesga daño reputacional: el cliente final vería una página caída).

## Fuera de alcance (a propósito)

- Ningún cron nuevo: el vencimiento ya se computa en cada lectura (`resolvePlanStatus`).
- Ninguna migración: `current_period_ends_at` ya existe y funciona.
- No se toca la lógica de trial ni de gracia. En `grace` el barbero opera normal.

## Verificación

- Tests unitarios en `scripts/test-plans.ts`: `isReadOnly` en los 5 estados
  (`active`, `trial` vigente, `grace`, `expired`, `cancelled`), más el caso de
  vencimiento por `paidUntil`.
- `npm run lint`, `tsc --noEmit`, `npm run build`, `npm run test:unit`.
- Caso de prueba real: `popesbarber` ya está `expired` en la base, sirve para
  verificar end-to-end sin tocar clientes reales.
