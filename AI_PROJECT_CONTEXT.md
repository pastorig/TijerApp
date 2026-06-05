# AI_PROJECT_CONTEXT.md

## 1. Que es este proyecto

Este proyecto es un SaaS para barberias llamado **TijerApp**.

Su objetivo es centralizar:

- reservas online
- agenda diaria
- gestion de barberos
- clientes
- recordatorios
- lista de espera
- reportes
- configuracion de cada barberia

El proyecto nacio en una etapa anterior como "BarberSync", por eso:

- la carpeta local del repo sigue siendo `BarberSync`
- el repositorio puede seguir teniendo rastros viejos del nombre
- **pero la marca actual y correcta del producto es TijerApp**

Si otra IA va a trabajar sobre branding, redes sociales, copys, anuncios o diseno visual, debe usar **TijerApp** como nombre principal.

---

## 2. Posicionamiento del producto

TijerApp no es una app para una sola barberia.

Es una **plataforma multi-barberia**:

- la home principal pertenece a TijerApp
- cada barberia cliente tiene su propia pagina publica
- cada barberia tiene su propio panel admin
- existe un panel owner para gestionar la plataforma completa

En otras palabras:

- **TijerApp = producto SaaS**
- **SV Barber, Gino Barber, AG Barber, etc. = clientes/demo dentro del SaaS**

---

## 3. A quien esta dirigido

### Cliente ideal principal

Duenos de barberias modernas que:

- toman turnos por WhatsApp y se desordenan
- quieren ordenar la agenda desde el celular
- trabajan con uno o varios barberos
- necesitan confirmar, cancelar y reprogramar sin perder tiempo
- quieren una solucion visual, simple y premium

### Usuario operativo diario

Barbero o encargado que necesita:

- ver el turnero del dia
- confirmar turnos rapido
- mandar WhatsApp con un toque
- detectar huecos libres
- controlar cierres, atrasos y aprovechamiento horario

---

## 4. Propuesta de valor

TijerApp busca comunicar esta idea:

> "Vos te ocupas de cortar. TijerApp se ocupa del resto."

Beneficios principales:

- menos desorden con los turnos
- menos reservas duplicadas
- mas claridad sobre la agenda real
- mejor uso del horario del barbero
- experiencia mas prolija para el cliente
- operacion mobile-first durante el trabajo real

---

## 5. Estado actual del producto

El proyecto ya no es solo un MVP visual. Ya tiene muchas partes funcionales.

### Ya implementado

- home comercial de TijerApp
- pagina `/producto`
- formulario de contacto comercial
- login global
- login owner
- panel owner
- alta privada de barberias
- baja logica y reactivacion de barberias
- reset de acceso admin desde owner
- paginas publicas por slug
- reserva publica real
- multi-barberia
- multi-barbero
- servicios reales por barbero
- Supabase conectado
- RLS en Supabase
- agenda admin por barberia
- dashboard admin
- turnero diario
- calendario/agenda visual
- confirmacion de turnos
- cancelacion de turnos
- eliminacion logica de turnos
- bloqueo de horarios ocupados
- horarios semanales por barbero
- bloqueos manuales por barbero
- overrides por dia para extender o ajustar cierre puntual
- duracion real ajustable por turno
- lista de espera
- clientes
- reportes
- cierre de caja
- reseñas
- galeria
- PWA / instalacion web app
- links publicos por token para que el cliente confirme/cancele/reprograme
- integracion actual con WhatsApp por links prearmados
- cron de recordatorios por email
- Resend para emails
- Sentry para monitoreo
- deploy en Vercel

### Muy importante

Hay una diferencia entre:

- **lo que ya funciona tecnicamente**
- **lo que conviene prometer comercialmente hoy**

Para redes sociales se puede comunicar fuerte:

- turnos online
- panel admin
- multi-barbero
- reportes
- recordatorios
- lista de espera
- confirmacion por link
- experiencia mobile-first
- PWA

Pero conviene no comunicar cosas ambiguas como si fueran 100% cerradas si todavia estan en evolucion operativa fina.

---

## 6. Lo que NO conviene prometer todavia

Estas cosas no deberian presentarse como feature cerrada/definitiva:

- app nativa iOS/Android
- pagos online integrados
- Google Calendar integrado
- WhatsApp API oficial completa
- automatizaciones avanzadas por IA
- panel de roles complejos por equipo
- onboarding publico automatico para cualquier barberia sin supervision

Algunas existen parcialmente o estan encaminadas, pero no deberian venderse como "ya resuelto al 100%" si la otra IA hace marketing.

---

## 7. Nombre, tono y lenguaje de marca

### Marca correcta

**TijerApp**

### Estilo de marca

Minimalista, premium, operativa, moderna.

No es una marca "divertida" o exageradamente juvenil.
No es una barberia individual.
No es una agencia.
No es un marketplace.

### Tono recomendado

- claro
- sobrio
- confiable
- directo
- moderno
- argentino, pero no excesivamente localista
- profesional sin sonar corporativo frio

### Frases eje del producto

- Turnos online para barberias modernas
- Organiza tu barberia desde el celular
- Tu agenda, tus barberos, tus clientes
- Menos mensajes desordenados, mas control
- Confirma, reprograma y ordena sin perder tiempo

---

## 8. Identidad visual actual

La marca tiene un sistema visual definido en `BRAND.md`.

### Sensacion general

- negro profundo
- dorado antiguo
- plateado
- minimalismo premium
- interfaz de alto contraste

### Paleta conceptual

- fondo negro
- acento dorado
- secundario plateado
- blancos y grises para lectura

### Personalidad visual

- elegante
- masculina / barberia moderna
- seria
- limpia
- no recargada

### Cosas que NO encajan

- colores pastel
- estilo infantil
- diseno demasiado startup "bubble"
- exceso de emojis
- gradientes chillones
- ilustraciones cartoon
- estetica generica de app financiera

---

## 9. Arquitectura de producto actual

### Sitio comercial

- `/`
- `/producto`
- contacto comercial

### Experiencia publica por barberia

- `/[barbershopSlug]`
- `/[barbershopSlug]/reservar`

### Panel admin por barberia

- `/[barbershopSlug]/admin`
- `/[barbershopSlug]/admin/turnero`
- `/[barbershopSlug]/admin/recordatorios`
- `/[barbershopSlug]/admin/lista-espera`
- `/[barbershopSlug]/admin/reportes`
- `/[barbershopSlug]/admin/cierre`
- `/[barbershopSlug]/admin/barbers`
- `/[barbershopSlug]/admin/clientes`
- `/[barbershopSlug]/admin/resenas`
- `/[barbershopSlug]/admin/galeria`
- `/[barbershopSlug]/admin/settings`

### Panel owner

- `/owner`
- `/owner/login`
- `/owner/create-barbershop`
- `/owner/mensajes`

### Rutas publicas especiales por token

- confirmacion/cancelacion/reprogramacion de turnos por token
- confirmacion de lista de espera por token
- reseñas por token

---

## 10. Barberias demo / conocidas

Actualmente hay demo data y casos de prueba como:

- `sv-barber`
- `gino-barber`
- `ag-barber`

**SV Barber** es el demo historico mas importante, pero no debe tratarse como la marca del producto.

---

## 11. Que resuelve para la barberia

### Problemas actuales del rubro que TijerApp ataca

- turnos tomados a mano por WhatsApp
- horarios pisados o duplicados
- falta de visibilidad del dia
- poco control sobre cancelaciones
- baja profesionalizacion en la experiencia del cliente
- mala lectura del rendimiento del negocio
- dependencia mental del barbero para recordar todo

### Solucion que propone

- link publico para reservar
- agenda visual clara
- confirmaciones rapidas
- links para cliente
- disponibilidad real por barbero
- gestion de huecos
- recordatorios
- lista de espera
- KPI y reportes

---

## 12. Diferenciales mas fuertes del producto hoy

Si otra IA tiene que crear contenido comercial, estos son buenos diferenciales:

1. **Multi-barbero real**
   - cada barbero tiene sus servicios, duraciones y horarios

2. **Agenda operativa de verdad**
   - no solo lista de turnos; hay turnero, vista por dia, huecos, cierres y ajustes

3. **Duracion real por turno**
   - el admin puede ajustar la duracion real de un corte puntual

4. **Aprovechamiento horario**
   - el sistema muestra si entra o no un ultimo corte segun la agenda real

5. **Reserva publica sin friccion**
   - el cliente reserva sin crear cuenta

6. **Control por token para el cliente**
   - confirmar, cancelar o reprogramar desde un link

7. **Lista de espera**
   - si se libera un hueco, hay base para reactivar clientes interesados

8. **Panel owner**
   - pensado como producto SaaS real y no como proyecto aislado

9. **PWA**
   - se puede instalar como app web

10. **Estetica premium**
   - fuerte identidad visual, no aspecto generico

---

## 13. Stack tecnico

- Next.js 16
- App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase
- Resend
- Sentry
- Vercel

### Variables de entorno importantes

El proyecto depende al menos de:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Tambien puede usar:

- `RESEND_API_KEY`
- `OWNER_NOTIFICATION_EMAIL`
- `OWNER_NOTIFICATION_FROM`
- variables de Sentry

---

## 14. Base de datos / modulos de datos actuales

El esquema ya tiene bastante profundidad. A alto nivel existen tablas o modulos para:

- `barbershops`
- `barbershop_admins`
- `platform_owners`
- `barbers`
- `barber_services`
- `appointments`
- `barber_weekly_schedules`
- `barber_time_blocks`
- `barber_day_overrides`
- `barbershop_clients`
- `reminder_log`
- `waitlist_entries`
- `appointment_reviews`
- `contact_requests`

### Ideas clave del modelo

- RLS por barberia
- owner con acceso global controlado
- disponibilidad por barbero
- servicios por barbero
- clientes sincronizados desde appointments
- links por token para acciones publicas

---

## 15. Funcionalidades actuales del admin

### Dashboard / operacion diaria

- resumen del dia
- proximos turnos
- quick actions
- filtro por fecha
- organizacion compacta mobile-first

### Turnero

- turnos por fecha y barbero
- confirmar
- cancelar
- WhatsApp
- ajustar duracion real
- leer atraso real
- ver si un turno queda fuera del cierre
- sugerencias de aprovechamiento horario

### Recordatorios

- panel de recordatorios
- links y acciones para seguimiento
- cron por email en evolucion

### Lista de espera

- clientes interesados cuando no hay lugar
- confirmacion por token
- salida rapida por WhatsApp

### Clientes

- base por barberia
- etiquetas
- notas
- reactivacion por WhatsApp

### Reportes

- KPIs
- produccion por barbero
- ingresos
- horarios pico
- top servicios
- clientes nuevos vs recurrentes

### Cierre de caja

- vista para ordenar ingresos/cierres del dia

### Reseñas

- recepcion de reseñas del cliente por link
- contexto de opinion post-turno

### Galeria

- gestion visual de fotos
- soporte de identidad publica

### Configuracion

- nombre
- descripcion
- WhatsApp
- Instagram
- direccion
- horarios generales
- auto confirmacion de turnos
- Google Reviews URL

---

## 16. Funcionalidades owner actuales

### Owner dashboard

- metricas globales
- listado de barberias
- accesos cruzados

### Alta privada de barberias

- crear barberia
- crear admin
- crear primer barbero
- crear servicios iniciales

### Gestion de barberias

- soft delete
- hard delete
- reactivacion
- reset de credenciales admin

### Mensajes comerciales

- panel `/owner/mensajes`
- lectura de contactos entrantes

---

## 17. Experiencia publica actual

La parte publica de cada barberia puede mostrar:

- hero principal
- CTA de reserva
- informacion de contacto
- equipo
- galeria
- reseñas
- footer de marca

La reserva publica hoy esta pensada para ser:

- mobile-first
- rapida
- clara
- sin login
- sin pasos innecesarios

---

## 18. Integraciones actuales

### Ya activas

- Supabase
- Vercel
- Resend
- Sentry
- WhatsApp via links

### En uso real dentro del producto

- `wa.me` para mensajes al cliente
- emails de contacto / recordatorios
- PWA service worker manual

---

## 19. Que puede decir otra IA sobre el producto

### Claims validos y alineados

- SaaS de turnos para barberias
- turnos online
- agenda mobile-first
- panel admin por barberia
- multi-barbero
- servicios por barbero
- disponibilidad real
- confirmaciones por link
- WhatsApp integrado
- lista de espera
- reportes
- PWA instalable

### Claims que conviene evitar o matizar

- "App nativa"
- "IA que gestiona todo sola"
- "Pagos ya integrados"
- "Google Calendar integrado"
- "WhatsApp API oficial completa"
- "Automatizacion completa sin intervencion"

---

## 20. Tono recomendado para redes sociales

La comunicacion de redes deberia sentirse:

- moderna
- premium
- simple
- clara
- orientada a dueños de barberias
- operativa, no teorica

### Mensajes que funcionan

- "Ordena tus turnos desde el celular"
- "Deja de perder tiempo acomodando WhatsApp a mano"
- "Cada barbero con su agenda real"
- "Mostrale a tus clientes una experiencia mas profesional"
- "Confirma, reprograma y organiza en segundos"

### Enfoques de contenido recomendados

1. problema -> solucion
2. antes/despues del uso de la agenda
3. vista del turnero en celular
4. multi-barbero
5. reportes y control del negocio
6. lista de espera y reactivacion
7. experiencia premium para el cliente

---

## 21. Perfil de marca para diseno de redes

### Visualmente

- negro dominante
- dorado antiguo como acento principal
- plateado como acento secundario
- tipografia fuerte
- pocas palabras
- mucho contraste
- composicion limpia

### Conceptualmente

No vender "tecnologia por tecnologia".
Vender:

- orden
- control
- profesionalismo
- agenda clara
- tiempo recuperado
- imagen premium para la barberia

---

## 22. Estado de madurez del producto

TijerApp ya esta en una etapa donde:

- hay producto funcional real
- hay backend real
- hay seguridad por barberia
- hay deploy real
- hay paneles diferenciados
- hay una experiencia bastante completa para demo y beta

No es una simple landing. Es un SaaS operativo en desarrollo avanzado.

---

## 23. Nota importante para otra IA

Si vas a usar este archivo para pedir:

- branding
- contenido para Instagram
- ideas de reels
- copies
- carruseles
- anuncios
- identidad de marca
- estrategia de redes

usa SIEMPRE estas premisas:

1. la marca es **TijerApp**
2. es un **SaaS para barberias**
3. SV Barber es solo un demo/cliente
4. el estilo debe ser **premium, minimalista y oscuro**
5. el tono debe ser **claro, moderno, confiable y operativo**
6. no prometas features que aun no estan cerradas
7. el producto esta pensado primero para **uso real desde el celular**

---

## 24. Resumen ejecutivo corto

**TijerApp** es una plataforma SaaS de turnos para barberias modernas.
Permite que cada barberia tenga su pagina publica, sus reservas online, su panel admin, sus barberos, sus reportes y su operacion diaria ordenada desde una experiencia mobile-first.

La marca debe sentirse premium, oscura, moderna y confiable.
El producto ya tiene bastante profundidad real: agenda visual, multi-barbero, WhatsApp, lista de espera, clientes, reportes, recordatorios, PWA y panel owner.

Si otra IA va a trabajar contenido o diseno para redes, debe pensar TijerApp como un producto serio, moderno y listo para mostrarse como software real para barberias.
