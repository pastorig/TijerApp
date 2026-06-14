# AI_PROJECT_CONTEXT.md

> Documento de contexto para agentes IA que trabajan sobre **marketing, branding, contenido y comunicación** de TijerApp.
>
> Para tareas de **código** (Claude Code, Codex, Cursor), ver `AGENTS.md` y los specs en `specs/<NNN>-<feature>/`.
>
> **Última actualización**: 2026-06-05

---

## Índice

- [BLOQUE 1 — Producto](#bloque-1--producto)
- [BLOQUE 2 — Estado técnico actual](#bloque-2--estado-técnico-actual)
- [BLOQUE 3 — Comunicación y marca](#bloque-3--comunicación-y-marca)
- [BLOQUE 4 — Guía operativa para IA de marketing](#bloque-4--guía-operativa-para-ia-de-marketing)
- [BLOQUE 5 — Apéndices](#bloque-5--apéndices)

---

# BLOQUE 1 — Producto

## 1.1 Qué es TijerApp

**One-liner**: TijerApp es un SaaS de turnos online para barberías modernas, multi-tenant, mobile-first.

**Extendido**: TijerApp centraliza reservas, agenda, barberos, clientes, recordatorios, lista de espera y reportes en una sola plataforma. Cada barbería cliente tiene su propia URL pública (`tijerapp.com/su-barberia`), su panel admin y sus datos completamente aislados. El producto está pensado para que el barbero opere desde el celular mientras corta, no desde una computadora aparte.

## 1.2 Posicionamiento

TijerApp **no es una app para una sola barbería**.

| Es | No es |
|---|---|
| Plataforma SaaS multi-tenant | App custom para una barbería específica |
| Producto vendido a dueños de barberías | Marketplace de barberos para clientes |
| Operativo (gestión interna del negocio) | Red social o sistema de reviews |
| Pensado para mobile-first | Software de escritorio tradicional |

**Posicionamiento competitivo**:
- Más simple que Booksy / Fresha (que tienen funcionalidades de marketplace de barberos)
- Más visual y operativo que Calendly genérico
- Más profesional que tomar turnos por WhatsApp manualmente
- Más accesible que un sistema custom desarrollado por la barbería

## 1.3 Mercado target

### Foco inicial: Argentina

**Por qué AR primero**:
- Boom de barberías premium post-2020 en grandes ciudades (CABA, Córdoba, Rosario, Mendoza, La Plata)
- Cultura existente de "barbería con estilo" — clientela dispuesta a pagar premium por experiencia
- Booksy y Fresha tienen baja penetración real en AR (más fuertes en MX, CO, CL)
- Founder está en AR → primeros clientes vendrán por red de contactos cercanos
- Una zona horaria, una moneda, un idioma puro rioplatense

**LATAM-ready en arquitectura**:
- El producto técnicamente es multi-tenant: cualquier barbería de cualquier país puede operar sin cambios de código
- Soporta cualquier slug, cualquier zona horaria
- Si en AR pega fuerte, expansión a Uruguay, Chile, México es directa
- El doc de marketing prioriza AR pero NO bloquea LATAM

### Audiencia target en Argentina

| Grupo | Tamaño estimado AR | Características |
|---|---|---|
| Barberías premium (1-3 sillones) | ~3-5k locales | Clientela millennial/Gen Z, ticket $5k-15k AR por corte, ya cobran con QR/MP, instagrameables |
| Barberías clásicas modernizándose | ~5-8k locales | Dueños 35-50 años, quieren ordenarse, todavía toman turnos por WhatsApp |
| Barberos independientes (alquilan sillón) | ~10k+ | Cuenta propia, mobile-first, sin sistema actual |

## 1.4 Personas detalladas

### Persona 1 — Pedro, dueño de barbería premium

- **Edad**: 34 años
- **Ubicación**: Belgrano, CABA
- **Negocio**: "Pedro Barber Club", 2 sillones (él + 1 empleado), 1 socio
- **Día típico**: abre 11am, cierra 21pm de lunes a sábado, ~40-50 turnos por semana entre los dos sillones
- **Stack actual**: Instagram para promo, WhatsApp Business para turnos, Excel para "memoria" de pagos, MP para cobrar
- **Pain points**:
  - Pierde 1-2 turnos por semana porque alguien escribe por WhatsApp y nadie ve
  - Doble-booking ocasional cuando él y el empleado confirman a la vez
  - No tiene visibilidad de "cuánto facturó la semana"
  - Cuando se va de vacaciones, tiene que pasarle el WhatsApp al empleado y siempre hay quilombo
- **Qué necesita**: orden, visibilidad, profesionalismo frente a sus clientes
- **Qué objeta**: "¿me hace perder tiempo aprender un sistema nuevo?", "¿mis clientes lo van a usar?"
- **Qué lo convence**: ver el panel admin desde su mobile en 30 segundos, instalable como app, "el cliente no necesita registrarse para reservar"

### Persona 2 — Juan, barbero empleado

- **Edad**: 26 años
- **Trabaja en**: La barbería de Pedro
- **Tareas diarias**: cortar, atender al cliente, confirmar turnos por WhatsApp en pausas
- **Stack personal**: smartphone Android gama media, no usa laptop
- **Pain points**:
  - Tiene que abrir el WhatsApp del local para chequear cada turno
  - Si tiene 30 minutos libres, no sabe si alguien escribió pidiendo turno mientras cortaba
  - El dueño lo manda turnos por mensaje y a veces se pierden
- **Qué necesita**: notificaciones al instante, agenda visual rápida, todo desde el celular
- **Qué lo convence**: que vibre el celular cuando entra reserva nueva (push notifs)

### Persona 3 — Camila, cliente final del cliente

- **Edad**: 28 años
- **Vínculo**: Cliente fija de la barbería de Pedro, va cada 3 semanas
- **Stack**: iPhone, Instagram, no usa apps "raras"
- **Pain points como cliente**:
  - Tiene que escribir al WhatsApp del local y a veces responden tarde
  - No siempre se acuerda cuándo fue la última vez
  - Si necesita cambiar el horario, mucho ida-y-vuelta
- **Qué necesita**: reservar en 3 taps sin pensar
- **Qué la convence**: link directo desde la bio de Instagram, ver disponibilidad real, no crear cuenta

> **Nota importante**: Camila NO es target de marketing de TijerApp. TijerApp se vende a Pedro. Camila es target del marketing de la barbería de Pedro. Pero el copy de TijerApp tiene que mostrar a Pedro que **a Camila le va a gustar** la experiencia que su barbería le ofrece.

## 1.5 Competitive landscape

### Competidores directos en LATAM/AR

| Competidor | Fortaleza | Debilidad para nuestro target |
|---|---|---|
| **Booksy** | Marca conocida internacional, marketplace de barberos | Pesado, muchas features que el barbero AR no necesita, comisión por reserva, soporte limitado en AR |
| **Fresha** | Free tier generoso, look moderno | Setup complejo, pensado más para spa/peluquería que barbería, push de procesamiento de pagos propio |
| **Vagaro** | Robusto en US | Casi inexistente en AR, en inglés |
| **Squire** | Excelente UX para barbería | US-only, no LATAM |
| **Setmore** | Free, multi-uso | Genérico, no específico de barbería |

### Competidores indirectos (más comunes en AR)

| Competidor "informal" | Penetración AR | Por qué TijerApp es mejor |
|---|---|---|
| **WhatsApp Business** | ~80% de barberías AR | No tiene agenda visual, no muestra disponibilidad, no maneja recordatorios |
| **Excel + Google Calendar** | ~30% | No multi-barbero, no público, no reservas online |
| **Agenda de papel** | ~15% (más en pueblos) | Obvio |
| **Calendly genérico** | <5% | No es barbería-aware, no tiene contexto multi-barbero ni servicios |

### Cómo posicionar TijerApp frente a competencia

- **Vs WhatsApp**: "El WhatsApp queda para charlar con el cliente. Las reservas se manejan solas."
- **Vs Booksy/Fresha**: "Hecho para barberías argentinas. Sin comisión por reserva. Setup en 5 minutos."
- **Vs Excel**: "Tu agenda visible para vos y para tu cliente. Sin pasar planillas a mano."
- **Vs Calendly**: "Tu barbería con tu estilo. No un link genérico que confunde."

## 1.6 Propuesta de valor

### Mensaje principal

> **"Vos te ocupás de cortar. TijerApp se ocupa del resto."**

### Beneficios concretos para el dueño

1. **Menos desorden** — agenda visual real, no hilos de WhatsApp
2. **Cero doble-booking** — el sistema bloquea horarios ocupados automáticamente
3. **Recordatorios automáticos** — el cliente no se olvida, vos no perseguís
4. **Visibilidad del negocio** — reportes de cuánto facturás, qué barbero rinde más, horarios pico
5. **Multi-barbero real** — cada barbero con sus servicios, horarios y agenda separada
6. **Profesionalismo frente al cliente** — link con tu marca, no genérico

### Beneficios para el barbero empleado

1. **Notificaciones en tiempo real** (próximamente push notifs)
2. **Agenda lista cuando llegás** — sabés exactamente cuántos turnos tenés
3. **Sin tener que mirar el WhatsApp constantemente**
4. **Tu propia disponibilidad** — vos definís cuándo trabajás

### Beneficios para el cliente final

1. **Reserva en 3 taps sin crear cuenta**
2. **Ve disponibilidad real, no horarios fake**
3. **Confirmación por link, sin idas y vueltas**
4. **Recordatorios automáticos para no olvidarse**

## 1.7 Pricing

> ✅ **Definido (2026-06-13)**. Pricing fijo en ARS, redondeado a números limpios según el valor de referencia MEP del momento de definición. 3 tiers + trial 7 días + programa fundadores.

### Estrategia general

- **Modelo**: SaaS por suscripción mensual, flat per-barbería (no por barbero, no por reserva)
- **Moneda**: Precio fijo en ARS
- **Trial**: 7 días gratis, sin tarjeta requerida, tier Pro activado
- **Anual**: 15% off pagando 12 meses upfront
- **Cancelación**: libre en cualquier momento, sin reembolso, acceso continúa hasta fin del mes pagado
- **Cobro**: MercadoPago suscripciones

### Tiers

#### 🟢 Solo — $22.000/mes
Barbero independiente, sin barbería física, alquila sillón o trabaja a domicilio.

- 1 barbero (solo el dueño)
- Reservas online ilimitadas
- URL pública con tu marca
- Recordatorios automáticos por email
- Confirmaciones por link
- Clientes + segmentación básica
- Reportes operativos básicos
- WhatsApp links
- PWA instalable
- 1 user admin
- Soporte por email (48-72h)

#### 🔵 Esencial — $41.000/mes
Barbería establecida con 2+ sillones. El **plan default**.

- Todo lo de Solo +
- Multi-barbero ilimitado
- Lista de espera con tokens
- Galería pública multi-foto con reorder
- Cierre de caja diario
- Cancelación con motivo + analytics no-show
- Reportes operativos completos (ingresos, top servicios, horarios pico)
- Soporte por email (24-48h)

#### 🟡 Pro — $61.000/mes
Barberías que quieren crecer en serio o tienen socios/managers.

- Todo lo de Esencial +
- 🔔 Push notifications en tiempo real (en cuanto se implemente)
- 📊 Reportes avanzados + comparativas multi-barbero + export PDF
- 👥 Hasta 5 users admin (socios/managers)
- 🏷️ Cupones de descuento (cuando esté implementado)
- 🎁 Sistema de fidelización (cuando esté implementado)
- 📧 Reportes mensuales por email automáticos
- 🎨 Logo en emails transaccionales (white-label parcial)
- ⚡ Soporte prioritario por WhatsApp (<24h)
- 🚀 Acceso anticipado a features nuevas (beta)

### Programa Fundadores (primeros 10 clientes)

Beneficios exclusivos para los primeros 10 que paguen el primer mes:

- 💰 **Precio congelado por 12 meses** — no se ajusta con inflación ni cambios globales
- ⬆️ **Upgrade gratis al tier siguiente por 6 meses** (Solo→Esencial o Esencial→Pro)
- 📞 **WhatsApp directo con el founder** para feedback y soporte
- 🏅 Badge "Fundador" en el panel admin
- 🎤 Mención opcional en website (sección "Fundadores TijerApp")
- 🚀 Beta tester de features nuevas (2 semanas antes que el público)

### Trial mechanics

- 7 días gratis desde primer login
- Tier Pro activo (probás lo mejor desde el día 1)
- **Sin tarjeta requerida** (lowers friction)
- Día 7: pedimos cargar tarjeta MP. Si no carga → trial expirado, modo read-only por 30 días, después soft-delete

### Cómo comunicar pricing en copies

✅ **Se puede decir**:
- "Desde $22.000/mes" (entry point Solo)
- "$41.000/mes para barberías con 2+ barberos" (Esencial)
- "7 días gratis, sin tarjeta"
- "Cancelás cuando quieras"
- "Programa Fundadores: precio congelado 12 meses para los primeros 10"

❌ **NO decir**:
- Precios distintos a los definidos oficialmente en ARS
- "Gratis para siempre" (no es freemium)
- "Sin compromiso anual" en absoluto — sí podemos decir "cancelás cuando quieras"
- Promesas de features Pro como si fueran Esencial

---

# BLOQUE 2 — Estado técnico actual

## 2.1 Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router + Turbopack) | 16.2.6 |
| UI | React | 19.2.4 |
| Estilos | Tailwind CSS | v4 |
| Auth + DB | Supabase | latest |
| Email transaccional | Resend | latest |
| Monitoring | Sentry | latest |
| Deploy | Vercel | Hobby plan |
| Idioma UI | Español rioplatense | — |
| Iconografía | lucide-react | latest |
| Animaciones | framer-motion | latest |

## 2.2 Arquitectura de rutas

### Sitio comercial TijerApp (público)

- `/` — Landing comercial
- `/producto` — Detalle de features
- `/login` — Login admin global
- `/owner/login` — Login para el platform owner

### Páginas públicas por barbería

- `/[slug]` — Landing de la barbería (hero, equipo, servicios, galería, reseñas)
- `/[slug]/reservar` — Form de reserva pública

### Panel admin por barbería

- `/[slug]/admin` — Dashboard
- `/[slug]/admin/turnero` — Agenda del día
- `/[slug]/admin/recordatorios` — Panel de recordatorios
- `/[slug]/admin/lista-espera` — Waitlist
- `/[slug]/admin/reportes` — KPIs y reportes
- `/[slug]/admin/cierre` — Cierre de caja
- `/[slug]/admin/barbers` — Gestión de barberos + servicios + horarios
- `/[slug]/admin/clientes` — Base de clientes
- `/[slug]/admin/resenas` — Reseñas recibidas
- `/[slug]/admin/galeria` — Gestión de fotos
- `/[slug]/admin/settings` — Configuración

### Panel owner (super admin de TijerApp)

- `/owner` — Dashboard global
- `/owner/create-barbershop` — Alta de barbería nueva
- `/owner/mensajes` — Inbox de contactos comerciales

### Rutas especiales por token

- `/r/[token]` — Vista del turno reservado (cliente)
- `/r/[token]/responder` — Confirmar/cancelar/reprogramar
- `/rev/[token]` — Reseña post-turno
- `/w/[token]` — Confirmar lista de espera

### Rutas técnicas

- `/offline` — Página PWA fallback
- `/manifest.webmanifest` — PWA manifest
- `/sw.js` — Service worker
- `/opengraph-image` — OG image dinámica
- `/api/*` — endpoints internos

## 2.3 Base de datos — módulos principales

| Tabla / módulo | Para qué |
|---|---|
| `barbershops` | Datos de cada barbería (slug, nombre, descripción, WhatsApp, IG, dirección, logo, horarios, auto-confirm) |
| `barbershop_admins` | Vinculación user ↔ barbería |
| `platform_owners` | Lista de owners globales de TijerApp |
| `barbers` | Barberos por barbería (con flag `is_owner` para "el cabeza") |
| `barber_services` | Servicios por barbero (nombre, precio, duración) |
| `barber_weekly_schedules` | Horario semanal por barbero |
| `barber_time_blocks` | Bloqueos puntuales (vacaciones, eventos) |
| `barber_day_overrides` | Overrides de horario por día específico |
| `appointments` | Reservas (con `confirmation_token`, `cancellation_reason`, `internal_notes`) |
| `barbershop_clients` | Clientes únicos por barbería (auto-poblado al crear appointment) |
| `barbershop_gallery_photos` | Fotos de galería pública |
| `appointment_reviews` | Reseñas post-turno (por token) |
| `waitlist_entries` | Lista de espera |
| `reminder_log` | Tracking de recordatorios enviados |
| `contact_requests` | Contactos comerciales entrantes |

### Características clave del modelo

- **RLS estricta** (Row Level Security) — un admin solo ve datos de SU barbería
- **Identidad de cliente por teléfono normalizado** — un cliente con el mismo número en 2 barberías es 2 rows separados
- **Tokens públicos** para acciones del cliente final sin login
- **Soft delete** en barberías (reactivable) + hard delete con cascade manual

## 2.4 Integraciones activas

| Integración | Estado | Uso |
|---|---|---|
| **Supabase** | ✅ Producción | Auth, DB, Storage (logos + galería), RLS |
| **Vercel** | ✅ Producción | Hosting, deploys automáticos, env vars |
| **Resend** | ✅ Producción | Emails transaccionales (recordatorios, notificaciones al owner) |
| **Sentry** | ✅ Producción | Error tracking en client + server + edge |
| **WhatsApp via `wa.me`** | ✅ Producción | Links prearmados para que el admin contacte al cliente |
| **GitHub Actions** | ✅ Producción | Cron horario que ejecuta `/api/cron/reminders` |

### Integraciones planeadas (en spec o roadmap)

| Integración | Estado | Cuándo |
|---|---|---|
| **Web Push Notifications** | Spec + Plan + Tasks listos en `specs/002-push-notifications/` | Próxima sesión grande de implement |
| **Supabase Database Webhooks** | Configuración manual al implementar push | Con push notifs |
| **Dominio propio tijerapp.com** | Sin comprar aún | A definir por el founder |

## 2.5 Features implementadas (en producción)

### Para el cliente final (público)

- Landing pública por barbería con hero, equipo, servicios, galería, reseñas
- Reserva online sin necesidad de crear cuenta
- Selección de barbero + servicio + fecha + horario disponible real
- Confirmación de reserva con link único (`/r/[token]`)
- Link permite confirmar / cancelar / reprogramar sin login
- Reseñas post-turno por link único
- Recordatorios automáticos por email
- PWA instalable en home screen

### Para el admin (barbero / dueño)

- Login con Supabase Auth
- Dashboard con resumen del día y quick actions
- Turnero diario con confirmar / cancelar / WhatsApp
- Cancelar con motivo (6 presets: no-show, cliente avisó, reprogramado, etc.)
- Detección automática de ghost clients (clientes con patrón de no-shows)
- Auto-confirmar reservas (toggle por barbería)
- Ajuste de duración real por turno
- Lectura de atraso real (cuánto te atrasaste)
- Aviso de "este turno queda fuera del cierre"
- Aprovechamiento horario (cuántos cortes entran según agenda real)
- Gestión completa de barberos (CRUD + servicios + horarios semanales + overrides)
- Bloqueos manuales puntuales (vacaciones, eventos)
- Lista de espera con confirmación por token
- Base de clientes con tags, notas y segmentación automática (VIP / recurrente / nuevo / por reactivar / inactivo / ghost / sin visitas)
- Cierre de caja diario
- Reportes: KPIs operativos, ingresos, producción por barbero, top servicios, horarios pico, clientes nuevos vs recurrentes
- Galería pública con upload múltiple + reorder + captions
- Configuración completa: nombre, descripción, WhatsApp, IG, dirección, horarios, auto-confirm, Google Reviews URL, logo
- PWA instalable con icon en home screen
- Last-context routing (al abrir la PWA, te lleva a la última barbería que estabas administrando)

### Para el owner (super admin de TijerApp)

- Dashboard con métricas globales: barberías activas, salud por barbería, ranking semanal, totales de plataforma
- Búsqueda + ordenamiento + filtros del listado de barberías
- Alta privada de barberías nuevas (con admin + barbero + servicios iniciales)
- Soft delete + reactivación + hard delete (con cleanup de DB y Storage)
- Reset de credenciales admin
- Inbox de mensajes comerciales con estados (pendiente/atendido)

## 2.6 Features en spec / planning (no en producción aún)

| Feature | Estado | Doc |
|---|---|---|
| **Push notifications** | Spec + Plan + Tasks listos, implementación pendiente | `specs/002-push-notifications/` |
| **Sistema de fidelización** (X visitas = corte gratis) | Idea conceptual | — |
| **Alertas VIP** (notif al admin cuando cliente top reserva) | Idea conceptual | — |
| **Reportes mensuales por email** | Idea conceptual, depende de dominio propio | — |
| **Cupones de descuento** | Idea conceptual | — |
| **Drag & drop en agenda** | Idea conceptual | — |
| **Tooltips contextuales en admin** | Idea conceptual | — |
| **Performance optimization** (Lighthouse 79 → 90+) | Idea conceptual | — |

## 2.7 Roadmap público

**Próximas 4 semanas (estimado)**:
1. Implementar push notifications (feature spec'd)
2. Comprar y configurar dominio tijerapp.com
3. Lighthouse optimization
4. Primer cliente real en producción

**Próximos 3 meses (estimado)**:
- Sistema de fidelización
- Cupones
- Reportes mensuales por email
- Onboarding optimizado

**No están en roadmap inmediato**:
- App nativa iOS/Android (la PWA cubre el caso)
- Pagos online integrados
- Google Calendar sync
- WhatsApp API oficial (la integración por `wa.me` es suficiente para MVP)
- Roles avanzados por equipo
- Marketplace público de barberos

## 2.8 Workflow de desarrollo

El proyecto sigue un workflow **spec-driven** usando **GitHub Spec Kit**:

```
/speckit-specify  →  spec.md (QUÉ y POR QUÉ)
/speckit-clarify  →  refina ambigüedades
/speckit-plan     →  plan.md + research.md + data-model.md + quickstart.md (CÓMO)
/speckit-tasks    →  tasks.md (PASO A PASO)
/speckit-implement →  ejecuta y commitea
```

Cada feature tiene su carpeta `specs/<NNN>-<short-name>/` con todos los docs. Esto significa:

- Para **agentes IA que hacen contenido**: pueden leer los specs para entender el detalle de cada feature implementada o planeada
- Para **comunicación**: si una feature está en `specs/<NNN>/` con plan, está casi cerrada. Si solo tiene spec.md, está en idea
- Para **transparencia**: el roadmap real vive en el repo, no en una herramienta externa

### Specs actuales en el repo

- `specs/001-pwa-installable/` — PWA instalable (✅ implementada, en producción)
- `specs/002-push-notifications/` — Push notifications (📅 spec+plan+tasks, implement pendiente)

---

# BLOQUE 3 — Comunicación y marca

## 3.1 Nombre y marca

### Marca correcta

**TijerApp**

### Cómo escribir

- ✅ TijerApp (cap-T inicial, App pegado, sin espacios)
- ✅ TIJERAPP (solo en logos/wordmarks all-caps)
- ❌ Tijer App (separado)
- ❌ TIJER APP
- ❌ tijerapp.com (en plano, no como dominio formal — el dominio aún no se compra)
- ❌ Tijer-App
- ❌ Tijera App
- ❌ BarberSync (nombre anterior, NUNCA usar)

### Cómo NO se debe llamar

El proyecto se llamaba antes "BarberSync". El rebrand está cerrado. Cualquier referencia a "BarberSync" en cualquier copy externo es un error. La carpeta local del repo puede llamarse `TijerApp` o `BarberSync` indistintamente (eso es interno y no impacta).

### Pronunciación

- "Ti-jer-app" (3 sílabas)
- La "j" se pronuncia como "j" española (no como "y" portuguesa ni como "h" inglesa)
- "Tijera" + "App" — el juego de palabras se ve y se escucha

## 3.2 Tono y voz

### Cómo suena TijerApp

- **Claro** — frases cortas, sin jerga técnica innecesaria
- **Sobrio** — no exagerado ni hypeado
- **Confiable** — habla de cosas concretas, no de "revolucionar"
- **Directo** — va al grano sin dar vueltas
- **Moderno** — no anticuado ni grandilocuente
- **Argentino sin folklorismo** — usa "vos", "podés", "elegí" pero evita "boludo", "che" innecesario, modismos muy locales
- **Profesional sin ser corporativo frío** — no suena como banco ni como prepaga
- **Operativo** — habla de uso real, no de teoría

### Cómo NO suena

- ❌ "Revolucionamos la industria"
- ❌ "La app que estabas esperando"
- ❌ "Únete a la familia TijerApp"
- ❌ "Empoderamos a tu barbería"
- ❌ "Tu solución integral 360"
- ❌ "Disrupting the barbershop industry"
- ❌ Cualquier cosa con emojis excesivos: "✨🔥💯🚀"
- ❌ "Súper fácil!!"
- ❌ Anglicismos innecesarios cuando hay palabra en español

## 3.3 Identidad visual

### Paleta exacta

| Color | Hex | Uso |
|---|---|---|
| Negro background | `#0a0a0a` (aprox) | Fondo principal, dark mode default |
| **Gold primario** | `#c9a23e` | Acento, CTAs, brand main, "Tijer" del wordmark |
| Gold high | `#e2c266` | Hover states |
| Gold low | `#8a6e25` | Pressed states |
| Gold soft | `rgba(201, 162, 62, 0.08)` | Backgrounds suaves |
| **Silver primario** | `#d8d8d8` | Acento secundario, "App" del wordmark |
| Silver mid | `#9c9c9c` | Texto muted, líneas |

### Tipografía

- **Geist Sans Black** — wordmark + headings principales
- **Geist Sans Regular/Bold** — body
- **Geist Mono** — números, datos, IDs, tabular nums
- Tracking generoso (`0.08em` en headings)
- Mayúsculas para títulos
- Spacing amplio entre líneas

### Wordmark "TIJERAPP"

```
TIJER  →  Gold #c9a23e
APP    →  Silver #d8d8d8
```

Black weight, all caps, tracking 0.08em, sin espacio entre las dos partes.

### Isotipo

T estilizada con dos "alas" arriba (pequeñas formas en gold sobre fondo negro). Versión actual diseñada con ChatGPT, refinada con esquinas redondeadas en `Logo.tsx`. El isotipo SOLO se muestra en gold sobre negro. Versiones blanco/otros colores NO existen.

### Reglas de uso visual

**Sí**:
- Negro dominante en fondos
- Gold para acentos (no usar en fondos grandes)
- Silver para secundarios
- Alto contraste
- Composición limpia
- Pocas palabras grandes

**No**:
- Colores pastel
- Estilo infantil
- Gradientes coloridos (gold-rosa, etc.)
- Glows excesivos
- Emojis decorativos dentro del wordmark
- Ilustraciones cartoon
- Texturas barber-stripes (rojo-azul-blanco)
- Estética genérica de fintech / app de delivery

## 3.4 Posicionamiento brand vs competencia

| Competidor | Su estética | TijerApp se diferencia por |
|---|---|---|
| Booksy | Verde + blanco, friendly, app store style | Más premium, oscuro, no "amigable plano" |
| Fresha | Magenta + blanco, beauty-spa | TijerApp es barbería-first, no spa |
| Calendly | Azul corporativo | Nosotros somos vertical-específico, no genéricos |
| Vagaro | Multi-color, US business style | Estética latina premium, no business gringo |
| WhatsApp | Verde institucional | Premium, oscuro, profesional |

**El visual de TijerApp grita**: "barbería moderna premium argentina". Si lo vieran sin texto, debería sentirse como la cuenta de Instagram de una barbería de calle de Palermo.

## 3.5 Frases eje — los copies que sí funcionan

### Headlines principales

- **"Vos te ocupás de cortar. TijerApp se ocupa del resto."**
- **"Tu barbería ordenada desde el celular."**
- **"Turnos online para barberías modernas."**
- **"Menos WhatsApp desordenado. Más control real."**
- **"Cada barbero, su agenda. Cada cliente, un tap."**

### Beneficios concretos

- "Tu cliente reserva sin crear cuenta."
- "Vos ves la agenda real desde el celular."
- "Cero doble-booking. El sistema bloquea por vos."
- "Recordatorios automáticos para que no falten."
- "Aprovechá cada hueco de la jornada."
- "Tu barbería con tu marca, no un link genérico."
- "Multi-barbero real, no un solo Calendly compartido."

### Calls to Action

- "Conocé TijerApp"
- "Hablá con nosotros"
- "Pedí acceso"
- "Sumá tu barbería"
- "Probá la demo en vivo"

### Anti-ejemplos — copies que NO usar

| ❌ NO | ✅ SÍ |
|---|---|
| "La app definitiva para tu barbería" | "Turnos online para barberías modernas" |
| "Revoluciona tu negocio 🚀" | "Tu barbería ordenada desde el celular" |
| "Súper fácil de usar!!" | "Setup en 5 minutos" |
| "El futuro del barberismo" | "Cómo trabajan las barberías que vienen creciendo" |
| "Únete a la familia" | "Sumá tu barbería" |
| "Empoderá a tu equipo" | "Cada barbero, su agenda" |
| "Tu solución integral 360" | "Lo que necesitás para operar" |
| "La nueva era de las reservas" | "Reservas online sin vueltas" |

## 3.6 Elevator pitches multi-formato

### Versión 10 segundos (tweet)

> TijerApp es el SaaS de turnos para barberías argentinas modernas. Cada barbería tiene su URL pública, su panel admin mobile-first, y su agenda real. Sin WhatsApp desordenado.

### Versión 30 segundos (Instagram caption)

> Si tenés una barbería y todavía manejás los turnos por WhatsApp, ya sabés el quilombo: clientes que se pisan, turnos que se olvidan, doble-booking, ningún control real de cuánto facturás.
>
> TijerApp es el SaaS pensado para que tu barbería esté ordenada de verdad. URL pública con tu marca, agenda mobile-first, multi-barbero, recordatorios automáticos, reportes reales.
>
> Setup en 5 minutos. Sin comisión por reserva. Hecho para barberías que arrancaron a tomarse en serio.

### Versión 60 segundos (presentación / venta)

> Soy de TijerApp, un SaaS de gestión para barberías argentinas modernas.
>
> El problema que vemos: las barberías que están creciendo siguen manejando turnos por WhatsApp. Pierden tiempo, pierden turnos, tienen doble-bookings, y no tienen visibilidad real de cómo va el negocio.
>
> Nuestra solución: cada barbería tiene su propia URL pública donde los clientes reservan en 3 taps sin crear cuenta. Atrás, hay un panel admin mobile-first que el dueño y los barberos usan mientras trabajan. Multi-barbero real, agenda visual, recordatorios automáticos, reportes operativos.
>
> Lo distinto: no es Booksy ni Fresha. Es vertical-específico para barbería, hecho en Argentina, pensado para usar mientras cortás. No tiene comisión por reserva, no presiona pagos a través de la plataforma, no impone un marketplace.
>
> Estamos arrancando con los primeros clientes ahora. ¿Querés conocerlo?

### Versión párrafo (about / bio)

> TijerApp es una plataforma SaaS para barberías argentinas modernas. Centraliza reservas online, agenda multi-barbero, gestión de clientes, recordatorios automáticos y reportes operativos en una sola experiencia mobile-first. Cada barbería tiene su URL pública con su marca y su panel admin propio. Pensado para usar mientras cortás, no desde una computadora.

### Versión bio Instagram (150 chars)

> Turnos online para barberías modernas. Cada barbería con su URL pública, su agenda mobile-first y multi-barbero. Setup en 5 min.

## 3.7 Claims válidos vs evitar

### Claims VÁLIDOS y alineados (todo verificable en el producto actual)

- SaaS de turnos para barberías
- Turnos online
- Cada barbería con su URL pública
- Agenda mobile-first
- Multi-barbero real con servicios y horarios propios
- Disponibilidad real bloqueada por sistema
- Confirmaciones por link sin login
- WhatsApp integrado (via wa.me)
- Lista de espera
- Reportes operativos
- PWA instalable
- Soporte para múltiples barbershops desde un solo panel owner
- Detección automática de no-shows (ghost segment)
- Cancelaciones con motivo y analytics
- Auto-confirmar reservas (opt-in por barbería)

### Claims a EVITAR o matizar

- ❌ "App nativa para iOS y Android" → SÍ podemos decir: "PWA instalable que funciona como app"
- ❌ "Pagos online integrados" → no implementado
- ❌ "Google Calendar sync" → no implementado
- ❌ "WhatsApp API oficial" → usamos links, no API oficial
- ❌ "IA que gestiona todo sola" → no hay IA en el producto
- ❌ "Automatización completa" → hay automatizaciones puntuales (recordatorios, ghost detection), no "todo automático"
- ❌ "Sin código" / "no-code" → no aplica
- ❌ "Cientos de barberías ya lo usan" → estamos pre-launch
- ❌ Testimoniales reales con nombres → no tenemos clientes reales aún
- ❌ "Reportes con IA" → los reportes son SQL/datos reales, no LLM
- ❌ Promesas de pricing distintas a las definidas en sección 1.7 (Solo $22.000, Esencial $41.000, Pro $61.000)

---

# BLOQUE 4 — Guía operativa para IA de marketing

## 4.1 Canal principal: Instagram

Foco de marketing en Instagram. La justificación:

- Los dueños de barbería ya pasan tiempo en IG (es su canal de promo orgánico)
- El producto es muy visual (panel admin, agenda, barberías reales)
- Reels permiten mostrar la velocidad del flujo "reservar → confirmar → cortar"
- Carruseles permiten explicar features sin saturar de texto
- Stories permiten testing rápido de mensajes

Canales secundarios futuros (en orden de prioridad): WhatsApp Business outbound, TikTok, LinkedIn.

## 4.2 Templates de reels (Instagram + Reels)

### Template 1 — "El problema que conocemos"

**Duración**: 7-15 seg
**Hook (0-2s)**: Mensaje de WhatsApp confuso ("¿Lo confirmás?", "¿14 o 15?", "¿Mañana?")
**Desarrollo (3-10s)**: Caos visible: barbero cortando + celular vibrando + 3 chats abiertos
**Resolución (10-15s)**: Pantalla limpia con panel TijerApp ordenado
**CTA visual**: "TijerApp.com" (o "Link en bio" hasta tener dominio)

### Template 2 — "Mirá en 7 segundos"

**Duración**: 7 seg estricto
**Estructura**: 7 screens × 1 seg cada uno, cortes rápidos
1. URL `tijerapp.com/tu-barberia`
2. Form de reserva limpia
3. Selección de barbero
4. Confirmación
5. Panel admin con el turno aparecido
6. Confirmación al cliente
7. Logo + CTA

**Música**: track techno-suave o lo-fi, sin letra

### Template 3 — "Antes y después"

**Duración**: 15 seg
**Antes (0-6s)**:
- Capturas de WhatsApp desordenado
- Excel pegado en la pared
- Voz: "Así trabajamos hace 5 años"

**Después (6-15s)**:
- Panel TijerApp limpio
- Reserva entrante con notif (cuando tengamos push)
- Reporte de la semana
- Voz: "Así trabajan las barberías que vienen creciendo"

### Template 4 — "Funcionalidad específica"

**Duración**: 10-12 seg
**Hook**: "¿Sabés cuántos turnos te quedan libres entre las 17 y las 19?"
**Demo**: zoom al feature de aprovechamiento horario en /admin/barbers
**Voz**: "TijerApp te lo dice. Para no perder esa hora."

### Template 5 — "Multi-barbero"

**Duración**: 12-15 seg
**Hook**: split-screen con 2 barberos cortando
**Visual**: cada uno con su agenda propia en mobile
**Voz**: "Pedro corta a las 14. Juan corta a las 14:15. Sin pisarse. Sin doble-booking."

## 4.3 Templates de carruseles (Instagram)

### Carrusel 5-slide — "Lo que TijerApp resuelve"

**Slide 1 (cover)**: "5 problemas que TijerApp resuelve en tu barbería"
**Slide 2**: Doble-booking → "Bloqueo automático de horarios ocupados"
**Slide 3**: Turnos olvidados → "Recordatorios automáticos al cliente"
**Slide 4**: WhatsApp desordenado → "Reservas centralizadas en tu URL propia"
**Slide 5**: Cero visibilidad → "Reportes operativos en tiempo real"
**Slide 6 (CTA)**: "Conocé TijerApp · [link en bio]"

### Carrusel 7-slide — "Tour del panel admin"

Una slide por sección del admin (dashboard, turnero, clientes, reportes, etc.), con screenshot real + descripción de 1 frase.

### Carrusel 4-slide — "¿Sos dueño de barbería?"

**Slide 1**: "¿Sos dueño de barbería y..." (lista de pains)
**Slide 2**: "TijerApp te da:" (lista de gains)
**Slide 3**: Captura del producto en mobile
**Slide 4**: CTA + "Acceso temprano disponible"

## 4.4 Templates de ads (Meta — Facebook + Instagram)

### Ad format 1 — Single image

**Headline (40 chars max)**: "Turnos online para tu barbería"
**Primary text (125 chars)**: "Cero doble-booking, agenda mobile, multi-barbero. Setup en 5 min. Pensado para barberías argentinas."
**CTA button**: "Más información"
**Visual**: Mockup del panel admin en mobile sobre fondo negro/gold

### Ad format 2 — Video corto

**Hook (0-3s)**: Logo + tagline "Vos cortás, TijerApp ordena"
**Body (3-12s)**: Mostrar features rápidas
**CTA (12-15s)**: Card final con URL

### Ad format 3 — Carousel ad

5 cards × 1 problema + solución cada una. Cada card linkea a `/producto`.

## 4.5 Hashtags base (Argentina + barbería)

### Hashtags principales (siempre incluir 5-8)

- #BarberíaArgentina
- #BarberShop
- #BarberLife
- #BarberíaModerna
- #TurnosOnline
- #GestiónBarbería
- #BarberíaPremium
- #BarberArgentino

### Hashtags secundarios (rotar 5-10)

- #BarberíaPorteña
- #BarberíaCABA
- #BarberíaCórdoba
- #BarberíaRosario
- #BarberShopArgentina
- #BarberíasUnidas
- #BarberArgentina
- #BarberTools
- #BarberíasDeArgentina
- #PymeArgentina
- #SaaS
- #SaaSLatam
- #EmprenderEnArgentina
- #SoftwareParaPymes
- #DigitalizaTuNegocio

### Hashtags branded (cuando tengamos tracción)

- #TijerApp
- #BarberíasConTijerApp
- #ConTijerApp

### Hashtags a EVITAR

- ❌ Hashtags genéricos sobreusados (#instagood, #amazing, #love) — bajan calidad del feed
- ❌ Hashtags spam (#followforfollow) — penalizan el alcance
- ❌ Hashtags en inglés cuando hay equivalente en español
- ❌ Más de 30 hashtags (IG penaliza spam)
- ❌ Hashtags de otros productos competidores (#Booksy, #Fresha) — no quiero asociar

## 4.6 SEO — palabras clave Argentina

### Palabras clave primarias

- "sistema turnos barbería"
- "app turnos barbería"
- "agenda online barbería"
- "software barbería Argentina"
- "turnos online barbería"
- "gestionar barbería celular"
- "panel admin barbería"

### Long-tail keywords

- "cómo ordenar los turnos de mi barbería"
- "alternativa a WhatsApp para turnos barbería"
- "app reservas online barberos"
- "agenda compartida barberos"
- "evitar doble booking barbería"
- "sistema reservas multi-barbero"

### Content topics para SEO

- "Cómo dejar de tomar turnos por WhatsApp (sin perder clientes)"
- "Excel vs sistema dedicado para tu barbería"
- "Cuánto tiempo perdés tomando turnos a mano"
- "Booksy vs alternativas argentinas"
- "Qué reportes tiene que tener una barbería para crecer"

## 4.7 Audience targeting (Meta Ads + TikTok Ads)

### Audiencia Meta Ads

**Intereses (cualquiera de estos)**:
- Barbería
- Barbero
- Barber Shop
- Salon de belleza para hombres
- Andis (marca de máquinas)
- Wahl (marca de máquinas)
- BaByliss Pro
- Barbershop Connect

**Behaviors**:
- Pequeñas empresas (business owners)
- Pequeñas empresas locales
- Pymes (small business administrators)

**Demographics**:
- Edad: 25-50
- Género: principalmente masculino (~80%) pero NO excluir femenino
- Ubicación: Argentina (CABA + GBA + Córdoba + Rosario + Mendoza + La Plata + Mar del Plata)
- Idioma: español

**Lookalike audiences (cuando tengamos data)**:
- LAL 1% de seguidores de Instagram de TijerApp
- LAL 1% de clientes existentes
- LAL 1% de visitantes web (Pixel)

### Audiencia TikTok Ads

Similar a Meta pero con interés agregado:
- #barber, #barberlife, #fade, #haircut, #barberlifestyle
- Edad: 22-40

## 4.8 Tipos de contenido que funcionan

### Top performers (probar primero)

1. **Demos del producto en mobile** — pantalla real, no mockup
2. **Comparación visual** — antes (WhatsApp) vs después (TijerApp)
3. **Stories de "cómo lo uso"** — flow real del día del barbero
4. **Reels musicales con cortes rápidos** — features en 7-15 segundos
5. **Carruseles "5 problemas que..."** — formato conocido y consumible
6. **Capturas de reportes** — gráficos de ingresos, top servicios, etc.

### Performers medios

- Frases de marca solas (sin demo)
- Posts educativos sobre la industria
- Memes barberos (con cuidado de no ser cringe)
- Behind-the-scenes del producto

### Bajo rendimiento (evitar)

- Texto puro sin imagen
- Posts genéricos de "feliz lunes a todos los barberos"
- Contenido sin CTA clara
- Plantillas de Canva genéricas
- Videos de stock genéricos de barbero (no son del producto real)

## 4.9 Anti-patrones — cosas que la IA NO debe hacer

### Sobre el contenido

- ❌ Inventar testimonios de barberos
- ❌ Inventar nombres de barberías clientes
- ❌ Decir cifras de adopción sin que sean reales
- ❌ Comparar mintiendo con competidores ("Booksy cobra 30% comisión" sin verificar)
- ❌ Crear urgencia falsa ("solo por hoy", "últimas plazas")
- ❌ Prometer features no implementadas como si estuvieran listas
- ❌ Usar emojis del WhatsApp en headlines del producto
- ❌ Tono adolescente / overhyped / gen-z forzado
- ❌ Diseño con paleta distinta a negro+gold+silver
- ❌ Mockups con datos genéricos en inglés (usar nombres y servicios argentinos)

### Sobre la voz

- ❌ "Hola barbero!! 👋" — demasiado entusiasta
- ❌ "Sabemos que es difícil..." — condescendiente
- ❌ "Solo nosotros podemos..." — arrogante
- ❌ "Como en cualquier negocio..." — no, somos vertical-específico
- ❌ "Por solo $X al mes" donde $X es un precio en ARS hardcodeado (los precios oficiales están en USD y se convierten mensualmente — ver 1.7)
- ❌ Tutearse con el lector (en AR rioplatense usamos "vos")

### Sobre el visual

- ❌ Fondos blancos (rompe la identidad oscura)
- ❌ Colores rosa, celeste, verde (fuera de paleta)
- ❌ Stock photos de barberos genéricos sonriendo a cámara
- ❌ Ilustraciones tipo "flat / Memphis style"
- ❌ Logo de TijerApp con efectos (sombras, brillos, animaciones excesivas)
- ❌ Capturas del producto que muestren data falsa obvia

## 4.10 FAQ base — respuestas que la IA puede usar

### "¿Cuánto cuesta?"

> Tenemos 3 planes: **Solo** ($22.000/mes, para barberos independientes), **Esencial** ($41.000/mes, para barberías con 2+ sillones) y **Pro** ($61.000/mes, para las que quieren crecer fuerte). También podés pagar anual con 15% off. Tenés 7 días gratis para probar sin cargar tarjeta.

### "¿Tiene app?"

> Es una PWA (Progressive Web App): se instala en tu celular como una app normal pero sin pasar por Google Play o App Store. Andá a tijerapp.com/tu-barbería desde el celular y tocá "Instalar" en el menú del navegador.

### "¿Mis clientes tienen que crear cuenta?"

> No. El cliente reserva desde tu link público en 3 taps sin crear cuenta, sin descargar nada. Solo carga nombre y teléfono. Es la fricción más baja posible.

### "¿Funciona con WhatsApp?"

> Sí, vía links de WhatsApp (`wa.me`). Cuando confirmás o cancelás un turno desde el panel, te genera el mensaje listo para mandar al cliente. No usamos API oficial todavía.

### "¿Y si tengo varios barberos?"

> Está pensado para eso. Cada barbero tiene sus propios servicios, duraciones y horarios. El cliente reserva eligiendo barbero, y el sistema bloquea solo la agenda de ese barbero. Sin pisarse entre ellos.

### "¿Reciben pagos?"

> Por ahora no procesamos pagos online dentro de TijerApp. El cliente paga en el local como hasta ahora (efectivo, QR, MP, lo que ya usás).

### "¿Tienen Google Calendar?"

> Está en roadmap pero todavía no está implementado.

### "¿Cómo arranco?"

> Por ahora estamos en pre-launch dando acceso temprano a barberías de Argentina. Escribinos un DM o llená el form de contacto en tijerapp.com/producto.

### "¿Hay versión gratis?"

> Gratis-para-siempre no, pero tenés **7 días de prueba sin necesidad de cargar tarjeta**. Probás el plan Pro completo durante una semana, y si te sirve seguís. Si no, no pagás nada y te vas tranquilo. Además, si sos uno de los primeros 10 en confiar, entrás al **programa Fundadores** con precio congelado por 12 meses.

### "¿Funciona offline?"

> Tiene una página fallback offline (te mostramos "estás sin conexión" en lugar de un error feo), pero las reservas y la agenda obviamente necesitan conexión a internet para verse en tiempo real.

---

# BLOQUE 5 — Apéndices

## 5.1 Glosario

| Término | Significado |
|---|---|
| **TijerApp** | El nombre actual del producto (marca correcta) |
| **BarberSync** | Nombre anterior. NO usar en copies externos |
| **slug** | El identificador corto de una barbería en la URL (`sv-barber`, `gino-barber`) |
| **barbershop** / **barbería** | Cliente del producto. Cada uno tiene su slug propio |
| **admin** | Usuario que gestiona una barbería específica desde `/[slug]/admin` |
| **owner** | Super-admin global de TijerApp, gestiona la plataforma completa |
| **PWA** | Progressive Web App — la versión "app instalable" de la web |
| **token** | Cadena única que permite al cliente confirmar/cancelar sin login |
| **multi-tenant** | Que sirve a múltiples barberías desde una misma instancia |
| **mobile-first** | Diseñado primero para celular |
| **RLS** | Row Level Security en Supabase — aislamiento de datos por barbería |
| **wa.me** | URL scheme de WhatsApp para abrir chat con mensaje prearmado |

## 5.2 Barberías demo conocidas

Estas viven en `data/demo-barbershops.ts` y se usan para testing y como ejemplos visuales:

| Slug | Nombre display | Características |
|---|---|---|
| `sv-barber` | SV Barber | La más completa, con barberos, servicios, fotos. Es el "demo principal" |
| `gino-barber` | Gino Barber | Demo secundaria |
| `ag-barber` | AG Barber | Demo secundaria |

**Importante**: estas son barberías de prueba, NO clientes reales. NO usarlas como "casos de éxito" en marketing.

## 5.3 Cambios importantes desde el inicio

| Fecha | Cambio |
|---|---|
| 2026-05-XX | Lanzamiento como **BarberSync** |
| 2026-06-03 | **Rebrand a TijerApp** completo (código + marca + isotipo + repo GitHub) |
| 2026-06-03 | PWA instalable lanzada en producción (US1+US2) |
| 2026-06-04 | US3 PWA completa (botón install + iOS tooltip + banner mobile) |
| 2026-06-04 | Spec + plan + tasks de push notifications listos para implementar |
| 2026-06-05 | Este doc reescrito a versión max-quality |
| 2026-06-13 | **Pricing actualizado**: 3 tiers en ARS (Solo $22.000, Esencial $41.000, Pro $61.000) + anual 15% off + trial 7d + programa Fundadores |

## 5.4 Cómo extender este documento

Si trabajás en una sesión nueva y querés agregar info al doc:

1. **Marketing actualizado** (claims, hashtags, palabras eje): editás directamente las secciones del Bloque 3 y 4
2. **Features nuevas implementadas**: actualizá Bloque 2 (2.5 y 2.6)
3. **Cambios estratégicos** (pricing, mercado, posicionamiento): editás Bloque 1
4. **Cambios de marca** (paleta, tono): editás Bloque 3

Mantené el tono del doc: directo, sin floritura, con ejemplos concretos al lado de cada regla abstracta.

## 5.5 Para agentes de código (no es el foco de este doc)

Si lo que necesitás es contexto **técnico** para escribir o modificar código:

- `AGENTS.md` en la raíz del repo (referenciado por `CLAUDE.md`)
- `specs/<NNN>-<feature>/spec.md` para entender el WHY de cada feature
- `specs/<NNN>-<feature>/plan.md` para entender el HOW técnico
- `BRAND.md` para la guía de identidad visual completa
- `SPEC.md` para la spec original del producto
- `README.md` para setup del proyecto

Este doc (`AI_PROJECT_CONTEXT.md`) es **solo para marketing, branding, contenido y comunicación**. Para código, ir a los archivos de arriba.

---

## 📌 Cierre

**TijerApp** es una plataforma SaaS de turnos para **barberías argentinas modernas**. Producto serio, en desarrollo avanzado, listo para sus primeros clientes reales.

Cualquier IA que trabaje sobre marketing, contenido o comunicación de TijerApp debe operar bajo estas premisas:

1. La marca es **TijerApp**, no BarberSync
2. Es un **SaaS multi-tenant**, no una app para una sola barbería
3. El estilo es **premium, oscuro, minimalista**
4. El tono es **claro, sobrio, confiable, argentino sin folklore**
5. **No prometer features** que no estén implementadas
6. **No inventar clientes reales** ni testimonios
7. El producto está pensado **mobile-first** para uso desde el celular del barbero
8. Foco inicial **Argentina**, arquitectura LATAM-ready
9. Canal principal de marketing: **Instagram**
10. Pricing **definido** (ver 1.7): Solo $22.000 / Esencial $41.000 / Pro $61.000 — no inventar precios distintos

Para detalles técnicos profundos, ver `AGENTS.md` y los specs en `specs/<NNN>-<feature>/`.
