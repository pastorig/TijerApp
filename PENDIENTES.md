# PENDIENTES — TijerApp

Tareas manuales (dashboards) que quedan por hacer. El código ya está listo y en producción.

---

## 📌 Lo que queda al 08/10/2026

El detalle de cada punto está más abajo, en su sección.

### De Bautista

1. **Crons puntuales — ANDANDO desde el 08/10.** El `CRON_SECRET` se perdió y se generó
   uno nuevo; está cargado en Vercel y en Vault (`tijerapp_cron_secret`). Los cinco crons
   quedaron programados en la base y la llamada de prueba a `/api/cron/deposits` contestó
   200. **Falta confirmar** que el secreto nuevo también esté en GitHub (Settings →
   Secrets → Actions → `CRON_SECRET`): si quedó el viejo, los crons de respaldo dan 401.
   Se ve corriendo "Cierre del día Cron" a mano desde Actions.
2. **21/10 — cobrarle a Leo Cuts $27.000.** Sigue en Esencial; el panel y el aviso de
   vencimiento ya muestran ese monto.
3. **MercadoPago por el camino real.** Sigue siendo el riesgo más grande: falta la prueba
   con usuarios de prueba de MP (vendedor + comprador), ninguna barbería real tiene MP
   conectado, y la seña de `primebarber` quedó apagada. Confirmar también que
   `NEXT_PUBLIC_ALLOW_DEPOSIT_SIMULATION` no esté cargada en producción.
4. **Pruebas a mano que nadie hizo:**
   - Catálogo (035): cargar un producto con foto desde el celular y ver un turno con
     productos en la agenda de un empleado.
   - Calendario del empleado (032): los cinco puntos de "Para mirar logueado".
   - Escanear con el celular el QR de la pantalla Compartir.
   - Confirmar que llega el mail de recuperar contraseña (desde el 03/10 lo manda la app).
5. **Comercial:** Mateo Cuts lleva 0 turnos desde que se registró el 05/10; Barbería ID no
   cargó turnos nuevos en 7 días. Los referidos (20% por cada referido que pague, tope
   100%) ya se les ofrecieron a Leo Cuts y a SV Barber; se llevan a mano.

### De código

No queda nada abierto. Lo que había, cerrado el 08/10:

- Un horario recién ocupado ya contesta "acaba de ocuparse" (antes decía "no está en la
  agenda de ese barbero"). Si lo pisa un bloqueo, dice que está bloqueado.
- Reprogramar desde el link del cliente verifica y guarda en un solo paso, con el mismo
  candado que la reserva. Mover turnos desde el panel o la agenda del empleado no lleva
  candado a propósito: ahí encimar es decisión de quien atiende. Migración
  `20261010120000` corrida el 08/10; el servidor ya encuentra la función. Sin probar con
  una carrera real.
- Los modales de `/owner/planes` no se cierran mientras se está guardando.
- La búsqueda de cuentas por email recorre todas las páginas en los tres lugares (Equipo,
  accesos de empleado y registro): `src/lib/server/buscar-usuario-por-email.ts`.
- "Registrar pago" ya pedía confirmación si el monto no es un precio de lista. Ojo: los
  $27.000 de Leo Cuts no son de lista, así que va a pedir confirmar; es lo esperado.

### Fechas

- **08/11/2026** — ¿alguna barbería que paga usó el catálogo? Si no, no construir encima.
- **Noviembre 2026** — checkpoint de SEO (impresiones de `/guias` en Search Console).

---

## ✅ 035 — Catálogo de productos — EN PROD (2026-10-08)

Las barberías cargan lo que venden en el mostrador (ceras, pomadas, polvos) y el cliente lo
suma a su turno al reservar. Lo paga en el local. Planes Esencial y Pro.

- **Panel**: Mi barbería → Productos. Alta con foto, precio y categoría; disponible/agotado a
  mano; cualquier administrador.
- **Página de la barbería**: sección "Productos" (solo si hay alguno disponible).
- **Reserva**: paso opcional "¿Te llevás algo?". Cupón y seña se calculan solo sobre el servicio.
- **El turno** muestra los productos y el total a cobrar: turnero, agenda del empleado, link del
  cliente y WhatsApp.
- **Reportes**: "Productos vendidos" (turnos confirmados). No suma a ingresos ni a comisiones.

Las dos migraciones (`barbershop_products`, `appointment_products`) ya están corridas.

**Falta probar a mano (Bautista):**
- Cargar un producto CON FOTO desde el celular. La subida de la foto contra el storage real no
  se ejerció nunca: al 08/10 nadie cargó un producto.
- Ver un turno con productos en la agenda de un empleado.

**Qué mirar el 08/11/2026 (a los 30 días):** ¿alguna barbería que paga tiene productos cargados?
¿hay algún turno con producto? Si la respuesta es no, no construir nada encima (stock, cobro
online, reportes en PDF) y preguntarles a SV Barber y Leo Cuts por qué no lo usaron.

**Quedó afuera a propósito:** cobro online, stock por unidades, sumar productos a un turno desde
el panel, comisión al empleado, y los productos en el PDF de reportes.

Spec, plan y tasks en `specs/035-catalogo-productos/`.

---

## ✅ 036 — Corregir los datos del cliente en un turno — EN PROD (2026-10-08)

En los tres puntos de cada turno: "Corregir datos del cliente" (nombre, teléfono, mail y
comentario). Salió de un cliente que reservó con el número mal escrito. El servicio, el día y la
hora no se editan ahí: eso se hace arrastrando el turno en el calendario.

---

## ✅ Migración de la activación — CORRIDA

`supabase/migrations/20261004130000_barbershop_activation_log.sql` ya está
corrida. La serie funciona: Mateo Cuts (registrada el 05/10) recibió la
bienvenida, el mail del día 1 y el del día 3.

---

## ✅ 034 — Activación de barberías recién registradas — EN PROD (2026-10-04)

**El problema.** Grado, Barber Uri y Focus hicieron lo mismo: se registraron,
dejaron todo configurado, entraron UNA vez y no volvieron. Cero turnos. Y al
registrarse no les llegaba ni un mail.

**Lo que hay ahora.**
- **Bienvenida** al registrarse, con el link de turnos y el paso que falta.
- **Serie de mails mientras siga en cero turnos**: día 1 (texto para la bio de
  Instagram), día 3 (cartel con QR + mensaje para WhatsApp) y día 7 (cuántos
  días de prueba le quedan + WhatsApp directo). Entre las 10 y las 13. Se corta
  sola con el primer turno, con la prueba vencida o a los 14 días.
- **Aviso al fundador el día 3** si sigue en cero, con el WhatsApp del dueño,
  para escribirle a mano.
- **Pantalla "Compartir"** (Mi barbería → Compartir, y "Cartel con QR" en el
  bloque del link del Inicio): link, QR, texto para la bio, mensaje para
  clientes y un cartel de una hoja para imprimir.

**A quién NO le escribe:** a ninguna barbería que ya existía (la serie solo
corre para las que recibieron la bienvenida, que la manda el registro) ni a las
creadas a mano desde `/owner`.

**Para mirar sin mandar nada:** GitHub → Actions → "Activación Cron" → Run
workflow (por defecto en modo prueba).

**Qué mirar:** la próxima barbería que se registre tiene que recibir la
bienvenida al minuto. Y escanear el QR de "Compartir" con el celular una vez.

Spec, plan y tasks en `specs/034-activacion-registro/`.

---

## ✅ 033 — Cierre automático del día + pedido de reseña — EN PROD (2026-10-04)

**Cierre.** Cada hora, los turnos pendientes de días ya terminados pasan a
confirmado solos (quedan como "Confirmado por Cierre automático"). No le avisa
nada al cliente. No toca los turnos con seña impaga. La primera corrida, el
04/10, cerró **233 turnos viejos** (216 de SV Barber, que pasó de 78 a 195
confirmados en los últimos 30 días). Verificado contra la base: 0 pendientes con
fecha pasada.

**Si un cliente no vino**, se cancela el turno con el motivo "Cliente no vino",
igual que siempre, antes o después del cierre.

**Reseñas** (migración corrida el 04/10; el primer envío es el 05/10). Entre las 10 y las 13, a los clientes de AYER que dejaron mail: un
mail con un botón al formulario de reseña. Uno por turno. **Desde el 11/10:** al que
ya dejó una reseña en esa barbería no se le pide nunca más; al que no contestó,
un segundo intento a los 90 días y ahí se corta (dos pedidos como mucho en total).
No a barberías en modo lectura.

**Para probar o mirar sin tocar nada:** GitHub → Actions → "Cierre del día Cron"
→ Run workflow (por defecto corre en modo prueba y solo informa qué haría).

**Qué mirar la primera semana:**
- que SV Barber y Leo Cuts vean sus turnos de ayer como confirmados a la mañana;
- después de correr la migración, que empiecen a llegar reseñas (hoy hay cero);
- si algún barbero se queja de que le "confirmó" a uno que no vino: es lo
  esperado, se cancela con "Cliente no vino".

Spec, plan y tasks en `specs/033-cierre-del-dia/`.

---

## 🧪 Para mirar logueado (2026-10-03)

Lo que entró a prod el 03/10 y no pude ver con sesión:

1. **Remasterización de Codex: quedó SOLO en lo público.** A Bautista no le
   gustó cómo quedó el panel, así que el 03/10 se volvió atrás en el panel del
   dueño, el del empleado y el owner (47 archivos, idénticos a como estaban
   antes de Codex salvo el calendario 031/032 y los arreglos de seguridad). Las
   páginas públicas —home, precios, producto, guías, la página de la barbería,
   la reserva, login/registro y los links del cliente— siguen con el rediseño.
   El trabajo completo de Codex está guardado en la rama
   `codex/remaster-2026-10-02`, por si se quiere rescatar una pantalla.
2. **032 — Calendario en la agenda del empleado.** Entrar con Esteban
   (`chinitodou@gmail.com`) a `/primebarber/mi-agenda`:
   - el selector **Lista / Calendario** (arranca en Lista; al elegir Calendario
     y volver a entrar tiene que seguir en Calendario);
   - tocar un turno → se abre la hoja con la misma tarjeta de la Lista;
   - tocar un rato libre → Turno / Sobreturno / Bloquear;
   - cargar un **sobreturno** de verdad y ver que la reserva pública ya no
     ofrece ese horario;
   - sacarle a Esteban "cargar turnos" desde Equipo y ver que el hueco solo
     ofrece Bloquear.

> El checkout `ProyectG/TijerApp` ya está en `main` y limpio (la rama
> `design/admin-shell-remaster` se borró el 03/10).

---

## 🔍 Revisión a fondo del 03/10 — qué se arregló y qué queda

Partió de la revisión de Codex (`docs/remasterizacion-2026-10-01/QA-REVISION-2026-10-02.md`).
Los tres primeros eran bugs que YA estaban en prod, no de la remasterización.

### Arreglado y en prod

- **Invitar un admin le cambiaba la contraseña a cuentas ajenas.** El dueño de
  cualquier barbería Pro podía "invitar" el email de alguien con cuenta —el
  dueño de otra barbería, un empleado— y a esa persona se le reemplazaba la
  clave. No la veía el que invitaba (iba por mail al titular), así que no era
  robo de cuenta, pero sí dejar afuera a cualquiera. Ahora a una cuenta que ya
  existe se le suma el acceso y **no se le toca nada**. De paso: la clave
  temporal sale de `crypto`, y si el mail no sale el dueño se entera.
- **La disponibilidad se "abría" si fallaba una consulta.** Si la base fallaba
  al leer los turnos o los bloqueos, el servidor seguía con una lista vacía y
  el horario salía libre encima de un turno que sí existía. Ahora, ante un
  fallo, no se ofrece nada y se pide reintentar.
- **Se podía reservar con un servicio desactivado o un barbero pausado**
  armando el pedido a mano, y el nombre del barbero lo mandaba el navegador.
  Ahora el servidor exige servicio activo, barbero activo de esa barbería, y
  el nombre sale de la base.
- `AGENTS.md` describía el proyecto como en junio ("no implementar pagos ni
  panel owner"). Actualizado.

### Segunda pasada (03/10, noche) — arreglado y en prod

- **Cupones: editar y borrar no ataban el cupón a la barbería.** El admin de una
  barbería podía editar o borrar el cupón de otra si conocía su id. Ahora el
  filtro lleva el slug.
- **Galería y logo: el archivo a borrar lo decía el navegador.** Se podía borrar
  una foto o el logo de otra barbería mandando su ruta. Ahora sale de la base.
- **El owner de la plataforma ya puede operar el panel de cualquier barbería.**
  Las 15 rutas de `/api/admin` deciden el acceso con un solo helper
  (`src/lib/server/barbershop-admin-access.ts`). Si la base falla al verificar,
  se contesta 503 en vez de "no sos admin". El owner solo pasa si la barbería
  existe.
- **Respuestas sin mensajes internos de Postgres** (configuración e importar
  clientes los devolvían en un campo `debug`).
- **Foco y teclado** en los modales de `/owner/planes` y en el menú mobile de la
  home (`src/hooks/useDialogFocus.ts`, compartido con los modales del empleado).

### Queda (nada urgente, por orden)

1. ~~**Dos reservas al mismo tiempo que se pisan sin empezar a la misma hora.**~~
   **HECHO el 08/10 (037)**: la reserva pública verifica y guarda en un solo
   paso (`reservar_turno_atomico`), migración corrida y carrera verificada en
   prod. Reprogramar desde el link del cliente tiene su propia función
   (`reprogramar_turno_atomico`, migración `20261010120000`, corrida el 08/10).
2. ~~**¿Los accesos de empleados los da cualquier admin o solo el dueño?**~~
   **DECIDIDO el 05/10: solo el dueño** crea, cambia permisos y quita. Ver la
   lista, cualquier admin.
3. ~~**`barbers` POST acepta `is_owner: true` del pedido**~~ **HECHO**: solo lo
   respeta si quien lo pide es el dueño de la barbería
   (`src/app/api/admin/barbers/route.ts`).
4. ~~**En los modales de `/owner/planes`**, Cancelar, la X y el clic afuera
   cerraban mientras se estaba guardando.~~ **HECHO el 08/10.**
5. ~~**Búsqueda de cuentas por email limitada a la primera página**~~ **HECHO
   el 08/10**: registro, accesos de empleado y Equipo usan el mismo
   `buscarUsuarioPorEmail`, que recorre todas las páginas.
6. **Probar con plata real**: MercadoPago, crons y push no se pueden verificar
   sin aislar destinatarios. Sigue siendo el riesgo más grande.
7. ~~**Preview sin aprobar**: `preview/controles-resto`~~ **APROBADA y en prod
   el 08/10** (controles de 44 px en barberos, clientes, lista de espera,
   galería, cupones y turnero).

---

## ✅ Mails de Supabase Auth en castellano — HECHO (2026-10-02)

SMTP propio con Resend (`no-responder@tijerapp.com`, key `supabase-auth-tijerapp`)
y la plantilla "Reset Password" en castellano con la marca. Probado de punta a
punta por Bautista: llega, en castellano, y el link deja cambiar la contraseña.

Es la ÚNICA plantilla que importa: todas las cuentas se crean ya confirmadas y
la invitación de admins la manda la app. Antes de esto, con el SMTP de fábrica,
"olvidé mi contraseña" casi seguro no le llegaba a ningún barbero.

---

## ✅ Migración de `appointment_time` y CRM — HECHO (2026-10-02)

- Bautista corrió `20261003130000_appointment_time_canonico.sql`: los 946 turnos
  quedaron en "HH:MM:SS" (verificado). De acá en adelante lo mantiene la base
  (trigger + CHECK).
- `CRM_EXPORT_TOKEN` y `CRM_ACTIVATE_TOKEN` cargados en Vercel, y sus pares
  `CONNECTOR_TIJERAPP_TOKEN` / `CONNECTOR_TIJERAPP_ACTIVATE_TOKEN` en el CRM.
  Verificado en prod: export contesta 200 con el token y activate valida el
  pedido (422 con body vacío, sin activar nada).

---

## ✅ 016/017 — PROBADAS EN UN CELULAR Y FUNCIONANDO (2026-08-25)

Bautista confirmó que el aviso llega al empleado que corresponde. Con eso las
cuentas de empleados y el push por barbero quedan **cerradas de punta a punta**:
código, ruteo verificado contra la base y entrega verificada en un teléfono
real. No queda nada por probar de esas dos features.

Lo de abajo es el histórico de cómo se verificó.

<details>
<summary>Qué se había verificado antes, sin celular</summary>

**Verificado contra la base de producción el 25/08/2026:**

- `chinitodou@gmail.com` es empleado de `primebarber` y está atado a **Matias
  Rojas**, con el acceso vigente (`revoked_at` en null).
- **Los avisos ya están activados**: tiene una suscripción push viva para esa
  barbería. Ese paso del checklist ya está hecho.
- La función `enqueue_admin_push` que está corriendo en prod filtra por
  barbero. Simulando el reparto con las filas reales: un turno **con Matías**
  encola **1 aviso** (el de chinitodou); un turno **con Esteban** encola
  **ninguno**. Que es exactamente lo que pide la feature 017.

Lo que faltaba era la entrega (VAPID + service worker) en un teléfono real, que
es lo que Bautista confirmó.

</details>

### Dos cosas que aparecieron mirando la base y siguen abiertas

- **Matías no tiene comisión configurada** (`commission_percent` en null). La
  pantalla de Ganancias del empleado va a decir "tu comisión todavía no está
  configurada" en vez de un número — está bien que lo diga, pero si querés ver
  esa pantalla con plata, hay que cargarle el porcentaje desde Equipo.
- **Al dueño de `primebarber` no le llega ningún aviso**, porque no tiene
  notificaciones activadas en esa barbería. Para la demo da igual, pero en una
  barbería real es lo primero que hay que mirar si el dueño dice "no me llegan".

---

## ✅ Auditoría del módulo empleado — CERRADA (2026-08-26)

Los 5 hallazgos accionables se arreglaron en las features 020, 021 y 022, todas
en prod.

- ~~**06** (GET/PATCH/DELETE de staff-access sin chequeo de plan)~~ → **HECHO
  (02/10)**: GET mira el tier (en modo lectura se sigue viendo), PATCH pide el
  plan al día. DELETE queda sin chequeo a propósito: revocar un acceso nunca
  tiene que depender de estar al día.

Con la **023** y la **024** se cerró todo lo que quedaba de capacidades: el
empleado ya puede **bloquear un horario** y **mover un turno suyo**. De la
lista original no queda nada.

Son **siete permisos** por empleado, todos tildables en Equipo: ver lo que gana,
confirmar, cancelar, escribirle al cliente, cargar turnos, bloquear horarios y
mover turnos.
- ~~**07** (al cliente no se le avisa que le cancelaron)~~ → **HECHO en la 026**,
  para los dos caminos.

### Lo que encontró la implementación y la auditoría no vio

**`APPOINTMENT_SELECT` no traía `cancellation_reason`.** El bloque "Motivo" del
turnero no se dibujaba nunca y el segmento de clientes ghost daba siempre
falso. **Leo Cuts marcó 2 turnos como "Cliente no vino" y nunca los vio
marcados** — el único hallazgo de todo esto que ya estaba afectando a un
cliente que paga. Arreglado en la 021.

**El `<Button>` del sistema no fijaba `type`**, así que por defecto era submit:
cualquiera adentro de un form lo enviaba al tocarlo. Arreglado en la 022.

---

## ✅ El login de empleado de la demo pasó al barbero que NO es dueño (26/08)

En `primebarber`, **Matias Rojas** es `is_owner` y tenía login de empleado — el
único caso así en todo el sistema. Se revocó (no se borró: queda el historial)
y el acceso pasó a **Esteban Perez**, con la misma cuenta `chinitodou@gmail.com`
para no perder el login de prueba.

Verificado contra la base: el reparto de avisos **se dio vuelta solo**, sin
tocar nada más. Ahora un turno con Esteban le avisa a chinitodou y uno con
Matías no le avisa a nadie. La suscripción push va por cuenta, no por barbero,
así que no hubo que volver a activarla.

> **Si volvés a probar el push, ahora reservá con Esteban, no con Matías.**

✅ **Comisión cargada: Esteban al 50%.** Con la producción de este mes
($12.000, 1 turno), la pantalla de Ganancias tiene que mostrar **$6.000**. Si
muestra otra cosa, ahí hay algo para mirar. El porcentaje se cambia desde
Equipo cuando quieras.

---

## ✅ Mails al cliente: los DOS verificados de punta a punta (29/08)

Se probaron con envíos reales a `bau.pastori@gmail.com` y se leyeron los mails.

### Reprogramar (024)

Turno movido del 28/08 13:00 al 29/08 14:00 desde la agenda del empleado.
Llegó "Tu turno fue reagendado", con el horario viejo tachado y el nuevo abajo.

### Cancelar (026)

Cancelado el del 29/08 14:00. Llegó "Se canceló tu turno", con el horario
tachado y la invitación a sacar otro.

> **Ojo con cómo se prueba esto.** El primer intento no sirvió: se canceló un
> turno que ya había pasado, y la regla de la 026 calla el mail en ese caso —
> el sistema hizo lo correcto, pero la prueba no probó nada. **El turno tiene
> que ser futuro**, y el motivo no puede ser "Cliente avisó" ni "Cliente no
> vino".

### Lo que encontraron esas dos pruebas

1. El pie decía **"WhatsApp: 0000000000"** (el placeholder de la demo), y el de
   cancelación armaba un botón a `wa.me/0000000000`. Arreglado en la **027**:
   si el número no sirve, no se dibuja.
2. El **preheader** seguía diciendo "Escribinos y lo reprogramamos" aunque el
   cuerpo no ofreciera por dónde. Arreglado en la **028**.

Ninguna de las dos se veía sin mandar el mail de verdad y leerlo.

### ✅ Y el botón de WhatsApp también quedó verificado (29/08 00:30)

A `primebarber` se le cargó el número real (**+54 9 3571 62-4511**) y se canceló
el turno del 05/09. El mail llegó **2 segundos después** con todo:

- Botón **ESCRIBINOS POR WHATSAPP** → `https://wa.me/5493571624511`
- El cuerpo cambió a *"...o escribinos y lo vemos juntos"*
- El pie con el número: *"PRIME BARBER · WhatsApp: +54 9 3571 62-4511"*

O sea que las dos ramas del condicional están probadas con envíos reales: **sin**
número usable el mail sale sin botón, **con** número sale completo.

**No queda nada por probar de los mails al cliente.**

---

## ✅ El push del empleado quedó verificado (29/08 00:36)

Bautista lo activó con `chinitodou` en `/primebarber/mi-agenda/cuenta` desde la
PC y le llegó: *"Nueva reserva — Gino · mar 01/09 09:30 · **con Esteban** ·
Corte"*. Suscripción nueva VIVA en la base, con un envío OK.

Que el aviso diga "con Esteban" es el ruteo de la 017 funcionando: le llega al
que maneja esa agenda y no a los demás.

> **Ojo, las suscripciones se mueren solas.** La anterior duró dos días. No es
> un bug —las rota el navegador— pero si un barbero dice "no me llega nada", lo
> primero es que la vuelva a activar desde su pantalla de cuenta.

---

## ⏱️ Reservar → WhatsApp: se aceleró (029), falta que Bautista lo sienta

Bautista notó que tardaba en abrirse WhatsApp después de reservar. Se sacó un
viaje entero a la red que no aportaba nada (el navegador validaba el horario y
el servidor ya lo revalida) y se paralelizaron los dos rate limits.

**No pude medir la latencia real desde una red argentina** — lo que hice fue
contar y sacar viajes. Falta que Bautista reserve un turno de prueba y diga si
se nota.

De paso apareció un bug: el freno por teléfono usaba `/D/` en vez de `/D/`, así
que el mismo número escrito distinto caía en cubetas distintas y se esquivaba
cambiando el formato. Arreglado.

---

## ✂️ Volver a prender la seña en `primebarber`

Bautista la apagó para una prueba y quedó apagada. Se prende en
`/primebarber/admin/cobros`.

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

## 📅 21/10/2026 — a Leo Cuts se le termina el Fundador: cobrarle $27.000

**Resuelto el 08/10:** Leo aceptó seguir en **Esencial a $27.000** (lista
$33.000), congelado 6 meses, hasta el 21/04/2027. No baja a Solo: su tier sigue
`esencial` y el 21/10 no hay que tocarlo.

Lo único que queda es **cobrarle ese día**. El monto sale de `PRECIO_ACORDADO`
en `src/data/founders.ts`: el panel, el aviso de vencimiento y el monto
sugerido al registrar el pago ya dicen 27.000.

> Bajar Solo a $19.000: **descartado por ahora** (decisión del 02/10/2026).

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

### ✅ La firma del webhook SE VALIDA Y ESTÁ ACTIVA (2026-08-20) — CERRADO

**Los dos secretos ya están cargados en Vercel y verificados.** El simulador de
MercadoPago devolvió `200 - OK` tanto en Modo productivo como en Modo de
prueba, o sea que cada clave valida las notificaciones de su modo. Verificado
también desde afuera: una llamada sin firma al webhook responde `401`, y una
notificación que no es de pago sigue respondiendo `200 · ignored` (si diera
401, MP la reintentaría para siempre).

La respuesta del webhook incluye `modoFirma` (`produccion` | `prueba`): sirve
para la prueba con usuarios de prueba, donde una notificación real que validara
con el secreto de prueba sería señal de que algo quedó cruzado.

Lo de abajo es el histórico de cómo se activó.

<details>
<summary>Pasos que se siguieron</summary>

El código está en prod: `src/lib/mercadopago/webhook-signature.ts` valida el HMAC
de `x-signature` y el webhook rechaza con 401 lo que no cierre.

**Mientras no exista ninguno de los dos secretos, la validación no hace nada**
— a propósito: prenderla a medias cortaría el cobro de seña de cualquier
barbería que ya esté cobrando.

**Son DOS secretos, no uno.** MP firma cada notificación con el secreto del
modo que la generó: los pagos reales con el productivo, los de usuarios de
prueba con el de prueba. Con uno solo cargado, el otro modo se rechaza con
401 — y eso se ve idéntico a "el cliente pagó y el turno no se confirmó".

Para activarla (Bautista):

1. Panel de MP → *Tus integraciones* → la aplicación de TijerApp (la del
   `MP_CLIENT_ID`: comparar el Client ID, es el error más fácil de cometer)
   → **Webhooks**.
2. En la pestaña **Modo productivo**:
   - URL: `https://tijerapp.com/api/mp/webhook?bs=primebarber`
   - Evento: **solo "Pagos (legacy)"**. Es el único que el código entiende
     (`type: "payment"`); "Order (Mercado Pago)" es el formato nuevo y hoy se
     ignora.
   - Guardar y recién ahí se habilita generar la **clave secreta**.
3. Repetir en la pestaña **Modo de prueba** para el segundo secreto.
4. Cargar en Vercel (scope Production las dos):
   - `MP_WEBHOOK_SECRET` ← modo productivo
   - `MP_WEBHOOK_SECRET_TEST` ← modo de prueba
5. **Redeploy**, o la variable no se toma.
6. Probar con el simulador de MP apuntando a esa URL: **200** = el secreto es
   el correcto; **401 "Firma inválida"** = es de otra aplicación o del otro
   modo. Que la respuesta diga `payment fetch failed` está bien: el pago
   simulado no existe.

> Hacer la simulación DESPUÉS del redeploy. Antes da 200 igual, porque sin
> secretos la validación está inerte, y te hace creer que funciona.

Si en Sentry aparece "Webhook de MP con firma inválida" para TODAS las
notificaciones, el secreto no corresponde a esa aplicación.

</details>

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
