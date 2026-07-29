# Research — 013 Onboarding "Primeros pasos"

**Fecha**: 2026-07-29
**Objetivo**: resolver las incógnitas técnicas del spec antes de diseñar la implementación.

---

## R1 — ¿De dónde salen los datos de cada paso sin sumar consultas al panel?

**Decisión: de lo que el Dashboard ya tiene en la mano. Cero consultas nuevas.**

`AdminDashboard` es un client component que ya recibe la barbería entera por prop
(`barbershop: DemoBarbershop`) y ya trae los turnos por su cuenta en un efecto. Entre las
dos cosas está **todo** lo que la guía necesita:

| Paso | Dato | De dónde sale |
|---|---|---|
| Servicios revisados | nombre, precio, duración | `barbershop.barbers[].services[]` |
| Horarios revisados | inicio, fin, intervalo | `barbershop.workingHours` |
| Datos de contacto | `address`, `instagram`, `whatsapp` | `barbershop` |
| Logo cargado | `logoUrl` | `barbershop` |
| Ya recibió turnos | cantidad de turnos | los que el Dashboard ya fetchea |
| Link público | `slug` | `barbershop` |

**Rationale:** el Dashboard es la primera pantalla que ve el barbero; sumarle consultas ahí
se paga en la percepción de velocidad del producto entero. Como el avance se puede derivar
de datos que ya viajaron, la guía es **gratis** en términos de red.

**Alternativa considerada:** un endpoint `/api/admin/onboarding-status` que devuelva el
avance calculado en el server. Descartado: agrega un round-trip y una superficie de API
nueva para calcular algo que ya se puede saber en el cliente. Se puede sumar después si el
cálculo creciera.

---

## R2 — ¿Cómo se detecta "sigue en el valor por defecto" sin duplicar constantes?

**Decisión: extraer los valores por defecto del registro a un módulo compartido y que la guía los importe de ahí.**

Hoy `DEFAULT_SERVICES` y `DEFAULT_WORKING_HOURS` viven **dentro** de
`src/app/api/registro/route.ts`. Un route handler no se puede importar desde un componente,
así que si la guía copiara esos valores tendríamos dos fuentes de verdad: el día que se
cambie el servicio inicial del registro, la guía empezaría a mentir en silencio.

Se mueven a un módulo propio (`src/lib/onboarding-defaults.ts`), que el route handler y la
guía importan. Ese módulo es **server-safe y sin `"use client"`**: es un módulo de datos
puro, importable desde ambos lados.

> **Gotcha del proyecto:** no exportar valores desde módulos marcados `"use client"` — en
> App Router eso rompe el import desde el lado servidor. Por eso el módulo de defaults es
> un archivo plano, sin directiva.

**Criterio de "revisado" por paso:**

- **Servicios**: hay más de un servicio, **o** el único que hay dejó de coincidir con el
  del registro (cambió nombre, precio o duración). Alcanza con que el barbero le ponga su
  precio real.
- **Horarios**: el inicio, el fin o el intervalo dejaron de ser los del registro. (Nota:
  el registro deja los siete días abiertos; cerrar el domingo se refleja en el horario
  semanal por barbero, que es la pantalla a la que apunta el paso.)
- **Contacto**: dirección **e** Instagram con contenido. El WhatsApp ya viene del registro,
  así que no se pide de nuevo.

**Alternativa considerada:** marcar en la barbería una bandera "onboarding completado" al
provisionar y ir tachando pasos con columnas nuevas. Descartada: exige migración y, peor,
permite que lo que muestra la guía se desincronice de la configuración real (el barbero
borra sus servicios y la guía sigue diciendo que están listos).

---

## R3 — ¿Dónde se guarda que el barbero ocultó la guía?

**Decisión: `localStorage`, con el mismo patrón que ya usa `OnboardingTip`.**

El repo ya resuelve esto: `OnboardingTip` guarda los tips descartados en
`localStorage` bajo `tijerapp:dismissed-tips`, con lectura *lazy* en el primer render para
que no haya parpadeo. La guía usa una clave propia y hermana
(`tijerapp:onboarding-hidden:<slug>`), por barbería.

**Rationale:** ocultar una guía es una preferencia de visualización, no información del
negocio. Meterla en la base costaría una migración (que además no puedo aplicar yo) para
guardar algo que no le importa a nadie más que a ese navegador.

**Consecuencia aceptada:** si el barbero cambia de dispositivo, la guía vuelve a aparecer.
Es aceptable — y como el avance se calcula del estado real, la va a ver ya completa, no
llena de pasos pendientes.

**Clave por barbería a propósito:** un admin de dos barberías no debería ocultar la guía de
una y perderla en la otra.

---

## R4 — ¿Cómo se evita que las barberías que ya existen vean una guía llena de pendientes?

**Decisión: sale gratis del criterio de R2, más un corte explícito.**

Una barbería vieja y bien configurada ya tiene sus servicios con precios propios, su
horario y sus datos: **todos los pasos dan por cumplidos solos**, sin ningún backfill. Y
como FR-008 pide que la guía deje de ocupar el lugar principal cuando está completa, esas
barberías no ven una guía de pasos: ven el bloque compacto con su link.

**Rationale:** es la ventaja concreta de derivar el avance del estado real en vez de
persistirlo. Con una bandera en la base habría que decidir qué valor le ponemos a las
barberías existentes, y cualquier elección sería incorrecta para algunas.

---

## R5 — ¿Cómo se comporta con el plan vencido (modo lectura)?

**Decisión: reusar `useIsReadOnly()` y degradar la guía a informativa.**

El modo lectura de la feature 009 ya está expuesto al panel: `PlanContext` publica
`isReadOnly` y hay un hook `useIsReadOnly()`. Con el plan vencido, la guía no ofrece los
accesos directos de configuración (no se puede escribir nada) y deja visible solo lo que sí
sirve: el link público. El aviso de plan vencido ya lo da el banner que existe, así que la
guía no lo repite.

**Rationale:** un botón que lleva a una pantalla donde todo va a fallar es peor que no
tener botón.

---

## R6 — ¿Dónde vive la guía y cómo se comporta en celular?

**Decisión: arriba de todo en el Dashboard, como tarjeta; en celular, una columna.**

El Dashboard es donde cae el barbero al terminar el registro y en cada login, así que es el
único lugar donde la guía se ve sin buscarla (FR-001). Va **arriba de las métricas**: en el
primer día no hay métricas que mirar (cero turnos), así que ocupar ese espacio con la guía
no tapa nada útil.

En celular los pasos van en una sola columna, con área de toque cómoda por paso (regla de
diseño del proyecto: botones grandes, admin compacto). Una vez completa, la guía colapsa a
un bloque bajo con el link y el botón de compartir, y las métricas vuelven a ser lo primero.

**Alternativa considerada:** un asistente a pantalla completa que bloquee el panel hasta
terminar. Descartado en el spec (Won't Have): el barbero se configura la barbería entre
cliente y cliente, y necesita poder salir a mirar la agenda en cualquier momento.

---

## R7 — ¿Qué se reusa del sistema de diseño?

**Decisión: `card-premium` + los primitives del panel; nada nuevo.**

Los estados de paso (pendiente / cumplido) se resuelven con los tokens que ya existen
(dorado para lo pendiente destacado, `--success` para lo cumplido) y con íconos de
`lucide-react`, que ya es dependencia. Para compartir el link se reusa el helper de
WhatsApp del proyecto en vez de armar el `wa.me` a mano.

**Sin dependencias nuevas y sin tokens nuevos** (constitución §5 y §3).

---

## Resumen de decisiones

| # | Tema | Decisión |
|---|---|---|
| R1 | Datos | Todo del prop `barbershop` + turnos que el Dashboard ya trae. Cero consultas nuevas |
| R2 | "Sin revisar" | Defaults extraídos a `src/lib/onboarding-defaults.ts`, única fuente de verdad |
| R3 | Ocultar guía | `localStorage` por barbería, patrón de `OnboardingTip` |
| R4 | Barberías viejas | Sale del criterio de R2: dan completas solas, sin backfill |
| R5 | Plan vencido | `useIsReadOnly()` → guía informativa, sin accesos que van a fallar |
| R6 | Ubicación | Arriba del Dashboard; una columna en celular; colapsa al completarse |
| R7 | Diseño | `card-premium` + lucide + helper de WhatsApp. Nada nuevo |

**Ninguna incógnita queda abierta. Sin migración.** Listo para el plan.
