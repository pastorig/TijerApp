# Tasks: Onboarding optimizado — "Primeros pasos"

**Branch**: `013-onboarding-primeros-pasos`
**Spec**: [spec.md](./spec.md) · **Research**: [research.md](./research.md) · **Plan**: [plan.md](./plan.md)
**Created**: 2026-07-29

## Overview

Guía de primeros pasos en el Dashboard del admin. **Sin migración, sin endpoints, sin
dependencias nuevas**: el avance se deriva de datos que el Dashboard ya tiene en memoria.

**Tests**: sí, y son el centro de esta feature. La lógica de "¿esto ya está configurado?"
es una función pura y ahí vive todo el riesgo (sobre todo el caso trampa de FR-006: un
servicio que sigue siendo el del registro **no** cuenta como revisado). Se cubre con el
harness liviano del repo (`npm run test:unit`, sin vitest), siguiendo el estilo de
`scripts/test-visits.ts`.

**Historias de usuario** (derivadas de los Acceptance Scenarios del spec):

| Historia | Prioridad | Escenarios | Alcance |
|---|---|---|---|
| US1 — Sé qué me falta y lo resuelvo | P1 (MVP) | 1, 2, 3, 4 | Pasos derivados del estado real + accesos directos |
| US2 — Tengo mi link para compartir | P2 | 5 | Guía terminada → colapsa y entrega el link |
| US3 — La guía no me molesta | P3 | 6, 7 | Ocultar/reabrir, barberías viejas, plan vencido |

---

## Phase 1: Setup

- [x] T001 Confirmar rama `013-onboarding-primeros-pasos` y árbol limpio (`git status`) en `C:/Users/Pastori/OneDrive/Desktop/Proyect/TijerApp`
- [x] T002 Tomar la línea base: `npx tsc --noEmit`, `npm run lint`, `npm run test:unit` y `npm run build` en verde antes de tocar nada (dejar anotado el total de casos que reporta `test:unit`)

---

## Phase 2: Foundational (bloquea todas las historias)

**Propósito**: la única fuente de verdad de los valores por defecto y la función pura que
calcula el avance. Sin esto no hay nada que renderizar.

- [x] T003 Crear `src/lib/onboarding-defaults.ts` con los valores con los que el registro provisiona una barbería (servicio inicial `Corte` $10.000 / 30 min, horario `09:00`–`20:00` con intervalo 30) y los predicados `isDefaultService(service)` / `isDefaultWorkingHours(hours)`. Módulo plano y server-safe: **sin `"use client"`** (un módulo client no se puede importar desde el servidor)
- [x] T004 Modificar `src/app/api/registro/route.ts` para que importe `DEFAULT_SERVICES` y `DEFAULT_WORKING_HOURS` de `src/lib/onboarding-defaults.ts` en vez de definirlos localmente. **Mudanza sin cambio de valores**: el registro tiene que seguir provisionando exactamente lo mismo
- [x] T005 Crear `src/lib/onboarding-steps.ts` con `getOnboardingSteps(barbershop, appointmentCount)`: función pura que devuelve los pasos con `id`, `title`, `hint`, `href`, `done` y `optional`, más el resumen de avance (obligatorios cumplidos / total y si la guía está terminada). Los 6 pasos y su criterio de cumplimiento salen de la tabla de `plan.md` → "Pasos de la guía". Sin React y sin I/O
- [x] T006 Crear `scripts/test-onboarding.ts` con los 9 casos del plan (Testing Strategy), en el estilo de `scripts/test-visits.ts`: barbería recién provisionada → 3 obligatorios pendientes; precio cambiado → paso 1 cumplido; servicio extra con el genérico intacto → paso 1 cumplido; **servicio idéntico al del registro → paso 1 pendiente** (el caso trampa de FR-006); horario cambiado en inicio / fin / intervalo → paso 2 cumplido; dirección sí pero Instagram vacío → paso 3 pendiente; barbería vieja bien configurada → todo cumplido y guía terminada; `appointmentCount > 0` → paso 5 cumplido; solo opcionales pendientes → guía terminada
- [x] T007 Sumar `scripts/test-onboarding.ts` al script `test:unit` de `package.json` (mismo patrón que los otros: `node --experimental-strip-types --import ./scripts/register-alias.mjs`)
- [x] T008 Correr `npm run test:unit` y dejar los 9 casos nuevos en verde antes de escribir una línea de UI

**Checkpoint**: la lógica está probada y el registro sigue funcionando igual. Nada visible todavía.

---

## Phase 3: User Story 1 — Sé qué me falta y lo resuelvo (P1, MVP)

**Objetivo**: el barbero entra al panel y ve, sin buscar, qué le falta para que su barbería
esté presentable, con un acceso directo a cada cosa.

**Test independiente**: entrar al panel de una barbería recién registrada. La guía es lo
primero de la pantalla, marca 0 de 3 obligatorios y los tres pasos figuran pendientes. Tocar
un paso lleva a la pantalla que lo resuelve. Al cambiar el precio del servicio y volver, ese
paso figura cumplido sin haberlo marcado.

- [x] T009 [US1] Crear `src/components/admin/OnboardingChecklist.tsx` (`"use client"`) con la tarjeta base: consume `getOnboardingSteps`, muestra el avance (obligatorios cumplidos / total) y la lista de pasos con título, ayuda y estado pendiente/cumplido claramente distinguibles. `card-premium` + tokens existentes (`--brand-gold` para pendiente, `--success` para cumplido) e íconos de `lucide-react`. **Sin colores ni tokens nuevos** (FR-001, FR-005)
- [x] T010 [US1] En `src/components/admin/OnboardingChecklist.tsx`, hacer que cada paso pendiente sea un `Link` a su pantalla (`/[slug]/admin/barbers`, `/[slug]/admin/settings`, la landing pública) con área de toque cómoda en celular (FR-004, FR-012)
- [x] T011 [US1] Montar `OnboardingChecklist` en `src/components/admin/AdminDashboard.tsx` arriba de las métricas, pasándole `barbershop` y la cantidad de turnos que el componente ya tiene en estado. Es el único cambio en el Dashboard (FR-001, FR-002)
- [x] T012 [US1] Verificar contra datos reales que el cálculo es correcto: correr un script con `node --env-file=.env.local --import ./scripts/register-alias.mjs` que importe `getOnboardingSteps` y lo evalúe contra las barberías vivas (`sv-barber` configurada, y una de las demo) — confirmar que la configurada da todo cumplido
- [ ] T013 [US1] Smoke test de US1 en dev: panel de una barbería recién creada (0 de 3), tocar cada paso y confirmar que llega a la pantalla correcta, y que al configurar algo el paso se tacha solo al volver

**Checkpoint**: US1 completa y entregable sola — ya resuelve el problema principal.

---

## Phase 4: User Story 2 — Tengo mi link para compartir (P2)

**Objetivo**: cuando la barbería ya está presentable, el momento de valor: su link público a
mano, listo para mandar.

**Test independiente**: con los tres pasos obligatorios cumplidos, la guía deja de ocupar el
lugar principal y en su lugar queda el link público con la opción de copiarlo y de
compartirlo por WhatsApp. Las métricas vuelven a ser lo primero.

- [x] T014 [US2] En `src/components/admin/OnboardingChecklist.tsx`, agregar el paso "Compartí tu link" con el link público completo de la barbería, botón de copiar y botón de compartir por WhatsApp reusando el helper de `src/lib/whatsapp.ts` (`whatsAppLinkWithMessage`) — sin rearmar el `wa.me` a mano (FR-007, research R7)
- [x] T015 [US2] En `src/components/admin/OnboardingChecklist.tsx`, implementar el estado "terminada": cuando los obligatorios están cumplidos, la tarjeta colapsa a un bloque bajo con el link y compartir, sin reclamar atención (FR-008)
- [x] T016 [US2] En `src/components/admin/AdminDashboard.tsx`, confirmar que con la guía terminada las métricas quedan como primer bloque visible de la pantalla (FR-008)
- [ ] T017 [US2] Smoke test de US2: completar los tres pasos obligatorios en una barbería de prueba y confirmar el colapso, que el link es el correcto y que copiar y compartir funcionan

---

## Phase 5: User Story 3 — La guía no me molesta (P3)

**Objetivo**: que el barbero veterano y la barbería que ya existía no sufran la guía.

**Test independiente**: `sv-barber` (ya configurada) no ve pasos pendientes. Ocultar la guía
la saca del Dashboard y sigue oculta al recargar, con una forma previsible de volver a
abrirla. Una barbería con el plan vencido no ve accesos de configuración.

- [x] T018 [US3] En `src/components/admin/OnboardingChecklist.tsx`, agregar ocultar/reabrir con `localStorage` bajo la clave `tijerapp:onboarding-hidden:<slug>` (por barbería, no global), con lectura *lazy* en el primer render para que no haya parpadeo — mismo patrón que `src/components/admin/OnboardingTip.tsx` (FR-009, research R3)
- [x] T019 [US3] En `src/components/admin/OnboardingChecklist.tsx`, degradar la guía con el plan vencido usando `useIsReadOnly()` de `src/components/admin/PlanContext.tsx`: sin accesos directos de configuración, dejando visible solo el link público. No repetir el aviso de plan vencido (ya lo da el banner que existe) (FR-011, research R5)
- [x] T020 [US3] Verificar que una barbería ya configurada no ve pasos pendientes — cubierto por el caso 7 de los tests, más comprobación en dev con `sv-barber` (FR-010)
- [ ] T021 [US3] Smoke test de US3: ocultar la guía, recargar y confirmar que sigue oculta; volver a abrirla; entrar con una barbería vencida y confirmar que no hay accesos de configuración

---

## Phase 6: Polish & Cross-Cutting

- [x] T022 Revisar el copy de los seis pasos en español rioplatense ("poné", "revisá", "completá", "compartí"), corto y sin texto innecesario (constitución §4 y regla de diseño "no usar textos innecesarios")
- [ ] T023 Verificar el recorrido completo en pantalla de celular: una columna, áreas de toque cómodas, sin desbordes (FR-012, SC-005)
- [x] T024 Verificar que el registro self-serve sigue provisionando exactamente igual tras la mudanza de constantes de T004: registrar una barbería de prueba y confirmar servicio, horario y barbero inicial
- [x] T025 Correr `npx tsc --noEmit`, `npm run lint`, `npm run test:unit` y `npm run build` — los cuatro en verde, sin warnings nuevos (SC-006, constitución §6)
- [x] T026 Marcar los ítems cubiertos en `specs/013-onboarding-primeros-pasos/checklists/requirements.md` y anotar desvíos
- [x] T027 Commit de la implementación en `013-onboarding-primeros-pasos` con mensaje `feat(013): onboarding primeros pasos`

---

## Dependencies

```
Phase 1 (Setup: T001–T002)
        ↓
Phase 2 (Foundational: T003–T008)   ← BLOQUEA todo lo demás
        ↓
Phase 3 (US1: T009–T013)            ← MVP
        ↓
   ┌────┴──────────────┐
   ↓                   ↓
Phase 4 (US2)     Phase 5 (US3)
T014–T017         T018–T021
   └────┬──────────────┘
        ↓
Phase 6 (Polish: T022–T027)
```

**Dependencias internas**:

- T003 bloquea T004 y T005 (ambos importan los defaults).
- T005 bloquea T006 (no se puede testear lo que no existe) y T009.
- T006 + T007 bloquean T008.
- T009 bloquea T010, T011, T014, T015, T018, T019 (todos tocan el mismo archivo).
- T011 bloquea T016.

**Nota sobre el paralelismo real de esta feature**: casi toda la UI vive en un solo archivo
(`OnboardingChecklist.tsx`), así que **US2 y US3 no se pueden hacer en paralelo de verdad**
aunque sean historias independientes — se hacen en serie sobre el mismo componente. Lo
único genuinamente paralelizable es la Phase 2 (lógica) contra nada, y por eso no hay
tareas `[P]` en las fases de historia. Se deja dicho para no fingir concurrencia que no
existe.

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + Phase 3 (US1)**. Con eso el barbero ya sabe qué le falta y llega
a cada pantalla: es el 80% del valor. US2 (el link) es el remate y US3 es higiene.

Orden sugerido:

1. **T001–T008** — defaults compartidos + función pura + tests en verde. Nada visible.
2. **T009–T013 (US1)** — la guía funcionando. Checkpoint entregable.
3. **T014–T017 (US2)** — el link y el colapso al terminar.
4. **T018–T021 (US3)** — ocultar, plan vencido, barberías viejas.
5. **T022–T027** — copy, celular, no romper el registro, verde y commit.

**Conteo**: 27 tareas — 2 setup, 6 foundational (incluye los tests), 5 en US1, 4 en US2, 4 en
US3, 6 de polish.

## Estado de verificación (2026-07-29)

**Verificado (verde):**

- `npx tsc --noEmit`, `npm run lint`, `npm run build` sin errores ni warnings nuevos.
- `npm run test:unit`: **104 casos** en 6 suites, incluidos los **29 nuevos** de
  `scripts/test-onboarding.ts` (la línea base eran 5 suites). Cubren el caso trampa de
  FR-006 y sus variantes (renombrado → cumplido; misma cosa con otra capitalización →
  pendiente).
- **Contra datos reales** (service_role, vía `resolveManagedBarbershopBySlug`, que es el
  mismo camino que usa el panel):

  | Barbería | Avance | Falta |
  |---|---|---|
  | `sv-barber` (real, configurada) | **3/3 LISTA** | — |
  | `popesbarber` | **3/3 LISTA** | — |
  | `kekasbarber` | 2/3 | horarios (sigue en 09:00–20:00/30) |
  | `leocuts` | 2/3 | contacto (sin dirección) |
  | `primebarber` | 1/3 | horarios, contacto |

  Confirma FR-010: las barberías ya configuradas **no** ven pasos pendientes, sin backfill.

  > Ojo para quien retome: `listKnownBarbershops()` **no trae los servicios** de cada
  > barbería (daba `servicios:0` en todas). Para evaluar el onboarding hay que usar
  > `resolveManagedBarbershopBySlug`, que es el que carga barberos con servicios.

- **El registro sigue provisionando igual** tras la mudanza de constantes: verificado que
  `DEFAULT_SERVICES`, `DEFAULT_WORKING_HOURS` y `TRIAL_DAYS` son idénticos a los literales
  que estaban en el route handler.
- La ruta `/[slug]/admin` responde 200 y sin errores de servidor con la guía montada.
- `ToastProvider` está en el layout raíz, así que `useToast` dentro de la guía tiene provider.

**NO verificable en este entorno** (T013, T017, T021, T023):

La guía vive **detrás del login del admin**, y el navegador headless de la sesión no puede
iniciar sesión (limitación ya conocida del proyecto). Así que el aspecto y las
interacciones (tachado, colapso, copiar, compartir, ocultar/reabrir, celular) no se pudieron
mirar. La lógica que decide qué se muestra sí está cubierta por los 29 tests y por el
chequeo contra datos reales.

**Queda para verificación manual de Bautista** (logueado en el panel):

1. Barbería nueva: la guía arriba, 0 de 3, y cada paso lleva a su pantalla.
2. Configurar algo y volver: el paso se tacha solo.
3. Con los 3 obligatorios listos: la guía colapsa al bloque del link; copiar y compartir
   por WhatsApp funcionan y el link es el correcto.
4. Ocultar la guía, recargar (sigue oculta), volver a abrirla.
5. Una barbería vencida: sin accesos de configuración, solo el link.
6. Todo el recorrido desde el celular.
7. **Registrar una barbería de prueba de verdad** y confirmar que se provisiona igual. No lo
   hice yo a propósito: la base de Supabase es compartida con producción y no quise dejar
   una barbería basura ahí.

## Next Steps

- Verificación manual de los 7 puntos de arriba antes de mergear a `main`.
