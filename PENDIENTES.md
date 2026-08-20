# PENDIENTES — TijerApp

Tareas manuales (dashboards) que quedan por hacer. El código ya está listo y en producción.

---

## 🔎 NOVIEMBRE 2026 — checkpoint de SEO (decidir si se sigue o se abandona)

**Contexto:** toda la fundación de SEO (sitemap, robots, JSON-LD, `llms.txt`, grafo
de entidades, crawlers de IA, las 4 guías) se subió entre el **11 y el 12 de agosto
de 2026**. En los 30 días previos hubo **cero tráfico de Google**, pero eso no dice
nada: durante 29 de esos 30 días el SEO no existía. **No hay nada que medir hasta
noviembre.**

### La regla de decisión, escrita de antemano para no discutirla por intuición

Mirar Search Console → Rendimiento, filtrando páginas que contengan `/guias`:

- **Impresiones creciendo** (aunque los clicks sean pocos) → está agarrando. Dejarlo
  correr y recién ahí evaluar escribir más guías.
- **Impresiones planas en cero** → confirmado que no arrancó. Dejar de pensar en
  Google, no escribir más contenido, y todo el esfuerzo a Instagram.

### Por qué NO se apaga mientras tanto

El trabajo técnico ya está hecho y es costo hundido: no se pudre, no pide
mantenimiento y trabaja de fondo con esfuerzo marginal cero. El eje que puede pagar
antes es el de **buscadores con IA**, no Google: no tienen la muralla de autoridad de
dominio, y el GEO ya trajo interesados reales en Dentidad.

### ✅ HECHO por Bautista (2026-08-14): sitemap enviado + indexación pedida

Sitemap mandado y las 4 guías con "Solicitar indexación". Con eso **no queda nada
más de SEO por hacer hasta el checkpoint de noviembre.**

> Recordá que esto acelera que Google las **descubra**, no que rankeen. Que
> aparezcan indexadas en unos días no significa que estén posicionando: eso se
> mide en noviembre con la regla de arriba.

⚠️ **Ojo con el sitemap que ve Google ahora:** el mismo 14/08 se sacaron del
índice `primebarber` (demo ficticia) y `popesbarber` (vencida, en modo lectura).
Si Search Console reporta esas dos URLs como "excluidas" o "descubiertas pero no
indexadas", **es intencional, no un error**.

---

## ✅ Aviso de vencimiento del plan — EN PROD (2026-08-19)

El barbero ya no se entera de que se le venció el plan cuando la barbería
quedó en modo lectura. En los últimos 3 días del período pago ve un cartel con
los días que le quedan y el botón Pagar (alias/CBU/titular), y le llegan dos
notificaciones al celular: una al entrar en la ventana y otra el día que vence.

- Se envían entre las 10 y las 13, una sola vez cada una por vencimiento.
- Solo a quienes administran la barbería, no a los barberos empleados.
- El monto que dice es **el que la barbería paga**, no el del tier asignado:
  un fundador tiene el tier de arriba de regalo y paga el de abajo.
- Migración `plan_notice_log` aplicada y verificada el 20/08.

Spec en `specs/015-aviso-vencimiento-plan/`.

---

## 📅 OCTUBRE 2026 — dos cosas con fecha, sin recordatorio automático

> Ojo al llegar esa fecha: el precio que ve el barbero sale de
> `billedMonthlyArs(tier, isFounder)`, que baja un escalón si la barbería es
> fundadora. Cuando a Leo se le termine el upgrade y vuelva a Solo, ya no hay
> escalón para abajo y pasa a ver el precio de Solo, que es lo correcto. Si
> además se baja Solo a $19.000, va a ver $19.000 — revisar que eso sea lo que
> se le quiere cobrar.

**21/10/2026 — se le termina el programa Fundador a Leo Cuts.** Ese día pasa de
Esencial (que tiene gratis desde el 21/07) a Solo, **pagando lo mismo: $22.000**.
Menos producto por igual precio es el momento típico en que un cliente se va, así
que no dejarlo caer solo: llegar con una oferta armada, tipo Esencial a precio de
Fundador (~$26–28k), antes de esa fecha y no después.

**Recién ahí decidir el precio de Solo.** Quedó sobre la mesa bajarlo de $22.000 a
$19.000 (relevamiento del 12/08/2026: la mediana del mercado argentino en el tramo
"1 barbero" es ~$14.500, o sea Solo está ~50% arriba). No se hizo ahora **a
propósito**: $22.000 es el precio congelado de Leo Cuts, y bajar el público por
debajo dejaría su "precio de Fundador" peor que el de cualquiera.

Con el -15% anual, $19.000 queda en $16.150/mes — prácticamente la mediana, lo que
convierte al plan anual en argumento de venta. Si se cambia, se toca **solo**
`src/lib/plans.ts`: desde el commit `6f2c445` toda la landing deriva de ahí.

---

## ✅ PWA: re-login al reabrir + arranque en tijerapp.com — ARREGLADO en prod (2026-07-29)

Lo reportó Santi (SV Barber): abriendo la app 10 veces al día, en 7 tenía que iniciar sesión
de nuevo. Eran dos causas:

1. Los guards del admin resolvían el usuario con `auth.getUser()`, que **le pega a la red**.
   Con red mala (justo lo que pasa al reabrir una app) devolvía error → se leía como "no
   logueado" → al login, con la sesión intacta. Ahora usan `getSession()` vía
   `getUserFromLocalSession()`. La seguridad no cambia: RLS + validación server-side siguen
   igual.
2. El `start_url` era `/?source=pwa` → cargaba toda la landing comercial y recién después
   redirigía. Ahora es `/abrir`, una pantalla mínima que manda derecho al panel.

**Para verificar (Bautista/Santi):** que al reabrir la app caiga directo en el panel y no
pida sesión. Las instalaciones viejas pueden tardar en tomar el `start_url` nuevo (el browser
actualiza el manifest cuando quiere); el `PWARedirector` de la home las cubre igual.

---

## ✅ Historial de cobros del owner — EN PROD (2026-07-29)

`/owner/planes` ahora muestra "Cobros registrados" con el total. La tabla
`barbershop_payments` se venía llenando desde la feature 007 y no había pantalla que la
leyera. Nuevo endpoint `GET /api/owner/payments` (owner-gated).

✅ **Cerrado el 2026-08-13:** la tabla de planes pasó a tarjetas, igual que el historial de
cobros. Era la única pantalla del owner que scrolleaba para el costado en el celular.

---

## 📊 Lighthouse — línea base de la home (2026-07-29)

Medido con Lighthouse 12, mobile, sobre el **build de producción** local:

| Categoría | Antes | Después de los arreglos |
|---|---|---|
| Performance | 94 | 93 (±1 es ruido entre corridas) |
| Accesibilidad | 86 | **100** |
| Best practices | 96 | 96 |
| SEO | 100 | 100 |

Métricas: FCP 1,2s · **LCP 3,0s** · TBT 20ms · **CLS 0** · Speed Index 1,2s.

Los 4 defectos de accesibilidad ya están arreglados y en prod (commit `c0f4e9f`).

### ✅ CERRADO — el LCP ya está arreglado y medido contra prod (2026-08-13)

Los números de arriba salieron de un `next start` **local**, sin CDN y en frío, así que
exageraban. Medido con Lighthouse 12 contra `https://tijerapp.com`:

| | Mobile | Desktop |
|---|---|---|
| Performance | **97** | **100** |
| LCP | **2,6 s** (score 88) | **0,6 s** |
| FCP | 1,3 s | 0,4 s |
| TBT | 40 ms | 0 ms |
| CLS | **0** | **0** |

La causa del LCP alto era el hero arrancando en `opacity: 0` por `animate-fade-up`: un
elemento invisible no cuenta como pintado, así que el bloque más grande de la pantalla no
podía registrar LCP hasta que la animación avanzaba. Arreglado en el commit `73b7a6d` con
la utilidad `animate-rise`, que hace el mismo movimiento animando solo el transform.

El elemento LCP es el `<h1>` del hero y el 75% restante es "render delay", que a esta
altura es el costo del CPU simulado de mobile, no un defecto del sitio. **2,6 s contra el
umbral de 2,5 s de Google no vale la pena perseguirlo** con dos clientes pagando: no hay
nada roto, hay un décimo de segundo de diferencia contra un umbral arbitrario.

Secundario y chico: 26 KB de JS sin usar y 13 KB de JS legacy en un chunk.

> Nota: los `errors-in-console` que reporta Lighthouse corriendo local (404 + MIME de
> `_vercel/insights` y `_vercel/speed-insights`) son artefacto de no estar en Vercel. En
> prod esos scripts existen. No es un bug.

---

## ✅ Landing con movimiento (012) — REVISADA por Bautista (2026-08-13)

Hero, Stats y "Cómo funciona" con movimiento atado al scroll. Sin dependencias nuevas
(hooks propios + CSS). tsc + lint + build verdes; SSR y fallback sin JS verificados.

**Se mergeó con la verificación visual pendiente** (decisión de Bautista, 2026-07-29). El
navegador headless de la sesión no compone frames — ahí ni el `IntersectionObserver` ni los
eventos de scroll funcionan (los `Reveal` que ya estaban en la home tampoco se activan), así
que el movimiento no se pudo juzgar. Checklist en
`specs/012-landing-motion/tasks.md` → "Estado de verificación". Resumen:

1. Hero: barras en cascada, contadores, notificación cada ~6 s, tilt con mouse, parallax.
2. "Cómo funciona": la línea se traza con el scroll y los pasos se encienden en orden.
3. Stats: entrada escalonada + pop del ícono.
4. Con "reducir movimiento" activado: todo quieto y en estado final.
5. **Celular real**: que el scroll de la home siga fluido.

Si algo no gusta, revertir es trivial: no hay migración y cada pieza (hero / línea / stats)
se puede revertir sola.

---

## ✅ Onboarding "Primeros pasos" (013) — REVISADA por Bautista (2026-08-13)

Guía de primeros pasos en el Dashboard del admin: le dice al barbero recién registrado qué
le falta (servicios con su precio, horarios, dirección + Instagram) y le da su link público
listo para compartir. **Sin migración**: el avance se deriva del estado real de la barbería.

Verde: tsc + lint + build + `test:unit` (104 casos, 29 nuevos). Verificado contra datos
reales: `sv-barber` y `popesbarber` dan 3/3 (las barberías ya configuradas no ven pasos
pendientes).

**FALTA (Bautista): mirarla logueado.** El navegador headless no puede entrar al admin, así
que el aspecto y las interacciones (tachado, colapso, copiar/compartir, ocultar, celular) no
se pudieron verificar. Los 7 puntos a mirar están en
`specs/013-onboarding-primeros-pasos/tasks.md` → "Estado de verificación". Incluye uno que
no hice a propósito: **registrar una barbería de prueba de verdad** (la base de Supabase es
compartida con producción y no quise dejar basura).

---

## ✅ Modo lectura al vencer el plan (009) — MERGEADO a `main` (2026-07-28)

Cuando a una barbería se le vence el plan, ahora queda **congelada, no borrada**: el
barbero ve todo (agenda, clientes, reportes, configuración) y no puede escribir nada,
y la reserva online pública se apaga con CTA al WhatsApp de la barbería. Spec en
`specs/009-modo-lectura/spec.md`. Sin migración y sin cron nuevo.

Verificado contra `popesbarber` (vencida de verdad) en dev: landing entera sin CTA de
reserva, `/reservar` con el aviso de WhatsApp, `POST /api/appointments/book` → 402.
Control con `primebarber` (activa): sin ninguna regresión. Merge a `main` verde:
tsc + lint + test:unit (19/19) + build. En producción vía Vercel.

**Nice-to-have (Bautista):** darle una mirada al admin real en dev local con una
barbería vencida (el admin no loguea headless), pero el candado ya está probado a
nivel server + unit.

---

## ✅ Cobro de barberos (Opción A) — IMPLEMENTADO en rama `007-cobro-barberos`

**Decidido + implementado (2026-07-07):** los barberos le pagan el plan a Gino por transferencia; el owner registra el cobro desde `/owner/planes` (botón **"Registrar pago"**) y la barbería se reactiva +1 mes. El barbero vencido ve monto + **Alias `pastorinx` / CBU / Gino Pastori** en el paywall. Spec/plan/tasks en `specs/007-cobro-barberos/`. Build + tsc + lint verdes.

### ✅ Migración aplicada y loop probado (verificado contra la base el 2026-08-13)

`20260707120000_barber_billing.sql` está corrida: la tabla `barbershop_payments`
y la RPC `register_barbershop_payment` existen y funcionan. Hay **$44.000
cobrados** en 2 pagos (`leocuts` 21/07 y `barber` 12/08).

⚠️ **Al cargar un pago, revisá el monto.** El 12/08 el de `barber` entró como
**$22** en vez de $22.000 (un cero de menos) y quedó así hasta que se corrigió a
mano. La RPC no valida el monto ni que el slug exista.

---

### (Fase futura, cuando escale) Opción C — MercadoPago Suscripciones (auto-recurrente)

Después de la Opción A, se puede sumar cobro automático con MP (preapproval + webhook), reusando el webhook/OAuth de las señas. OJO: para recibir la plata de los barberos va la MP de Gino/plataforma, distinta de la MP por-barbería de las señas.

**Ya existe:**
- Tabla `barbershop_subscriptions` (`plan_tier`, `status`, `trial_expires_at`, `grace_expires_at`).
- Panel `/owner/planes` (`OwnerPlansManager`) para setear tier/status a mano.
- Gating por plan + paywall (`RequirePlan`) + banner (`PlanStatusBanner`) + resolución de estado (`resolvePlanStatus`: trial/active/grace/expired/cancelled).
- Contacto de pago = WhatsApp del founder (3571 566221, `FOUNDER.whatsapp`), ya en el paywall/banner.

**Piezas que faltan (Opción A):**
1. **`pagado_hasta` (date) en `barbershop_subscriptions`** + que `resolvePlanStatus` derive "vencido" cuando esa fecha pasa (igual que ya hace con `trial_expires_at`). Migración aditiva.
2. **Panel Owner "Cobros"**: registrar un pago (monto, fecha, método) → extiende `pagado_hasta` (+1 mes) y pone `status=active`. Idealmente con tabla `barbershop_payments` (historial/auditoría).
3. **Alias/CBU + monto en el paywall** (`RequirePlan` ExpiredPaywall + `PlanStatusBanner`): mostrar alias/CBU de Gino + el precio del plan, al lado del botón de WhatsApp, para que el barbero sepa cuánto y a dónde transferir.
4. (Opcional, después) auto-expiry: computar el vencimiento desde `pagado_hasta` al leer (sin cron nuevo).

**A definir con Bautista antes del spec:** alias/CBU de Gino; si el precio se lee de `PLAN_META` (Solo/Esencial/Pro) o es fijo; si "registrar cobro" vive dentro de `/owner/planes` o en sección nueva.

**Cómo se arranca:** Spec Kit (specify → clarify → plan → tasks → implement).

---

## ✅ Hecho (2026-06-25)

- Dominio **tijerapp.com** comprado (DonWeb) + conectado a Vercel (DNS A `@` → 216.198.79.1, CNAME `www` → vercel-dns; `tijerapp.com` principal, `www` redirige). **Valid** ✅.
- Vercel env var **`NEXT_PUBLIC_SITE_URL` = `https://tijerapp.com`** + redeploy.
- Supabase Auth: **Site URL** = `https://tijerapp.com` + Redirect URL `https://tijerapp.com/**`.
- Las 3 features en producción (gateadas): cobro de seña, conectar MercadoPago (OAuth), mensaje de WhatsApp personalizable.

---

## ✅ TAREA 1 — Resend (emails reales a clientes) — HECHO (2026-07-20)

Emails reales a clientes **funcionando en producción**. Dominio `tijerapp.com` verificado en Resend, `OWNER_NOTIFICATION_FROM = TijerApp <hola@tijerapp.com>` cargado en Vercel + `RESEND_API_KEY` presente. Verificado end-to-end: reserva con email no-founder → llegó el recordatorio 24h desde `hola@tijerapp.com` con el logo de la barbería (white-label OK).

**Cómo se probó (para replicar):** sacar turno para MAÑANA con un email que no sea el del founder → GitHub → Actions → **Reminders Cron** → **Run workflow** con **force=true** (ignora la ventana horaria) → el JSON devuelve `decisions:[{kind:"reminder_24h",sent:true}]`. OJO: el recordatorio 24h solo aplica a turnos de mañana y con email cargado; si el turno es de otro día o sin email → `decisions:[]`.

> Ojo si algún día toca DNS: NO borrar los MX existentes de DonWeb si hay casilla de correo. Los de Resend son aditivos.

---

## ✅ TAREA 2 — Activar MercadoPago (botón "Conectar con MP") — HECHO (2026-07-21)

App de plataforma creada en MP (Checkout Pro), redirect URI
`https://tijerapp.com/api/mp/oauth/callback` registrado, `MP_CLIENT_ID` +
`MP_CLIENT_SECRET` cargados en Vercel (Production) y redeploy hecho.
**Verificado**: el OAuth completó en `/primebarber/admin/cobros` → MP devolvió
"Autorizaste la conexión" y la barbería figura conectada.

El webhook NO requiere configuración en el panel de MP: la app setea el
`notification_url` por preferencia, con el slug (`/api/mp/webhook?bs=<slug>`).

### ⚠️ FALTA para cerrar el cobro de seña

~~1. Correr la migración de `reminder_log`.~~ **YA ESTÁ** (verificado contra la
base el 2026-08-13: el CHECK de `kind` acepta `deposit_reminder`).

Queda, y las dos son de Bautista:

1. **Activar el toggle "Cobrar seña al reservar"** en `/<barberia>/admin/cobros`
   y configurar el porcentaje. Estado real al 12/08: la única con la seña
   prendida y MercadoPago conectado es `primebarber` (la demo), al 1%. Las
   reales — `barber`, `leocuts`, `kekasbarber`, `grado-barber`, `popesbarber` —
   están todas en `mp_enabled: false` y **sin cuenta de MP conectada**, así que
   primero hay que hacer el OAuth ("Conectar con MercadoPago") en cada una.
2. **Prueba end-to-end con tarjeta de prueba de MP**: reservar → pagar → el
   turno debe pasar solo a "seña pagada" y confirmarse (lo hace el webhook).
   Ojo con el gotcha de MP: con OAuth por comercio, las dos puntas tienen que
   ser cuentas de prueba.

### ✅ La firma del webhook YA SE VALIDA — falta cargar el secreto (2026-08-19)

El código está en prod: `src/lib/mercadopago/webhook-signature.ts` valida el HMAC
de `x-signature` y el webhook rechaza con 401 lo que no cierre.

**Mientras no exista la env var `MP_WEBHOOK_SECRET`, la validación no hace nada**
— a propósito: prenderla a medias cortaría el cobro de seña de cualquier
barbería que ya esté cobrando.

Para activarla (Bautista):

1. Panel de MP → la aplicación de TijerApp → Webhooks → generar la **clave
   secreta**.
2. Cargarla en Vercel (Production) como `MP_WEBHOOK_SECRET` + redeploy.
3. **Rehacer la prueba de punta a punta.** Un secreto equivocado rechaza
   notificaciones buenas, y eso se ve exactamente como el problema que se
   quiere evitar: el cliente paga y el turno no se confirma. Si en Sentry
   aparece "Webhook de MP con firma inválida" para TODAS las notificaciones,
   el secreto no es el que corresponde a la aplicación.

---

## ✅ TAREA 3 — Cron de auto-cancelación de señas (HECHO por Claude)

`/.github/workflows/deposits-cron.yml` creado: dispara `GET /api/cron/deposits` cada hora a los :10 (Bearer `CRON_SECRET`, usa los mismos secrets `CRON_SECRET` + `CRON_BASE_URL` que el cron de reminders). Las señas impagas vencidas se auto-cancelan solas y liberan el horario. **No requiere nada de Bautista** (los secrets ya existen en GitHub).

---

## ✅ TAREA 4 — Recordatorio de pago al cliente (US3, HECHO por Claude)

**Qué hace:** el cron `/api/cron/deposits` ahora, además de expirar, manda un recordatorio de pago (push + email) cuando la seña pasó la mitad de su plazo y sigue impaga. Una sola vez por turno (`reminder_log` kind `deposit_reminder`), con link para pagar. Reusa `sendClientPushForAppointment` + Resend.

**Migración de `reminder_log`: CORRIDA en Supabase (2026-07-21).** ✅

```sql
alter table public.reminder_log drop constraint if exists reminder_log_kind_check;
alter table public.reminder_log add constraint reminder_log_kind_check
  check (kind in ('reminder_24h', 'confirmation', 'deposit_reminder'));
```

**Flujo de seña verificado (2026-07-21)** en primebarber con el simulador
(`NEXT_PUBLIC_ALLOW_DEPOSIT_SIMULATION`): reservar → simular pago → el turno
queda con chip **"Seña pagada"** y confirmado. La lógica interna funciona.

> ⚠️ El simulador debe quedar APAGADO en producción (borrar la env var +
> redeploy). Con la var activa, cualquiera puede marcar su seña como pagada.

### Lo único que falta para dar el cobro de seña por 100% cerrado

Probar el **camino real de MercadoPago** con **usuarios de prueba de MP**
(vendedor + comprador), no con plata real. El simulador saltea MP por completo,
así que todavía NO está verificado que el webhook de MP llegue y se procese.
Hacerlo ANTES de prender la seña en un cliente que cobra de verdad: si el
webhook falla en prod, el cliente paga y el turno le queda sin confirmar.

---

## ✅ US4 — Badge de estado de seña en el turnero (HECHO por Claude)

Cada turno en el turnero muestra un chip "Seña pendiente / pagada / vencida / rechazada" según el estado. Solo aparece si la barbería cobra seña.

---

## Diferido (mejoras, no bloquean)

- US3 (recordatorio de pago — ver Tarea Pendiente 4).
- Verificación final del dominio: entrar a `https://tijerapp.com`, reservar un turno y confirmar que el link `/r/...` arranca con `tijerapp.com`; probar "olvidé mi contraseña".
