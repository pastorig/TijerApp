# Auditoría TijerApp — 2026-07-30

Auditoría de seguridad, robustez y competitividad. Todo lo de acá se **verificó contra el
código y la base real**, no de memoria.

---

## 🔴 Crítico — arreglar antes que nada

### S1. El token de MercadoPago de cada barbería es leíble por cualquiera

**Qué pasa:** la policy RLS `barbershops_public_select_active` deja que un cliente **anon**
(la anon key viaja en el bundle del browser, es pública por diseño) haga `SELECT` de la
fila **entera** de cualquier barbería activa. Esa fila incluye `mp_access_token`,
`mp_refresh_token` y `mp_user_id`.

**Confirmado en prod:** un cliente anon leyó el token real de `primebarber`
(`APP_USR-2039...`). Ese token opera la cuenta de cobros de MercadoPago del barbero: con
él, un tercero podría generar pagos, leer movimientos, etc.

**Por qué no saltó antes:** el código server-safe (`barbershops.ts`) sabe no exponer el
token al armar la respuesta pública. Pero RLS es la última línea de defensa, y ahí el token
está abierto: no hace falta pasar por nuestro código, alcanza con pegarle a Supabase con la
anon key.

**Cómo lo resolvemos:**
1. **Revocar** el `SELECT` de `anon`/`authenticated` sobre la tabla `barbershops`.
2. Exponer los datos públicos por una **vista** (`barbershops_public`) que liste solo las
   columnas seguras (sin los `mp_*` secretos), con su propio grant a anon.
3. Ajustar `barbershops.ts` para leer de la vista en los paths públicos. Los tokens los
   sigue leyendo solo el server con service-role (que ya es el único que los necesita, para
   crear preferencias de pago).

Es una migración + un cambio acotado en una función. **Yo puedo dejar la migración escrita
y el código listo; el SQL lo corrés vos** (el MCP de Supabase no llega a esta cuenta).

---

## 🟠 Importante — resolver pronto

### S2. Login sin bloqueo por intentos fallidos

El login admin es `signInWithPassword` **del lado del cliente**, así que no hay lockout
propio contra fuerza bruta. La decisión previa fue **no** codear un lockout sino configurar
los rate limits en el dashboard de Supabase Auth. **Falta confirmar que eso esté seteado**
(Auth → Rate Limits). Si no, un atacante puede probar contraseñas sin freno.

### S3. Registro público sin freno de spam

`POST /api/registro` es abierto y su única defensa es un honeypot. Un bot que no caiga en el
honeypot puede crear **barberías basura en masa** (cada una provisiona ~30 filas: barbero,
servicios, horarios, sub). Ensucia la base, el panel del owner y las métricas.

**Cómo lo resolvemos:** rate-limit por IP en el endpoint (ej. 3 registros/hora/IP) +
opcional un captcha liviano (Turnstile de Cloudflare, gratis). El rate-limit es lo mínimo.

### R1. `barbershops(slug)` sin `on update cascade`

Las 6 FKs contra `barbershops(slug)` son `on delete cascade` pero **sin** `on update
cascade`. Por eso renombrar un slug (lo de SV Barber → barber) obliga a clonar+mover+borrar
en una transacción, en vez de un `UPDATE` simple. No es un bug, pero es una trampa: cada
rename futuro es frágil. **Opción a futuro:** agregar `on update cascade` a esas FKs para
que un rename sea un update de una línea.

---

## 🟡 Mejoras — no urgentes

- **P1. LCP 3,0s en la home** (Lighthouse). Es lo único flojo (perf 93). Sin diagnosticar:
  puede ser la fuente Geist, el degradé del título o el JS del hero. Remedir contra Vercel
  (no local) antes de tocar.
- **P2. Tabla de planes del owner no es mobile.** Única pantalla del owner con `<table>`;
  en el celular scrollea al costado. Pasar a tarjetas como el resto.
- **P3. `npm audit`: 3 highs transitivos** (`brace-expansion`, `fast-uri`, `js-yaml`) — son
  de dependencias de build, no de runtime. `npm audit fix` y listo.
- **P4. Sin validación de esquema (zod).** Los endpoints validan a mano. Funciona, pero es
  fácil que un campo nuevo se cuele sin validar. Bajo riesgo; se puede sumar zod gradual.

---

## 🥊 Competencia — qué nos falta para ser el más completo

Comparado con los líderes en Argentina/LATAM (AgendaPro, Booksy, Fresha):

### Nuestras ventajas (mantenerlas en el discurso de venta)
- **Precio en pesos** — ellos cobran en USD (AgendaPro desde USD 40, Booksy USD 30).
- **Integra MercadoPago** — Booksy **no** lo integra.
- **Sin comisión por reserva** — Fresha cobra **20% de cada cliente nuevo**.
- Hecho para AR, español rioplatense, mobile-first.

### Lo que ellos tienen y nosotros no (ordenado por valor para una barbería)

| # | Funcionalidad | Quién la tiene | Por qué importa |
|---|---|---|---|
| 1 | **Comisiones por barbero** | AgendaPro | En la mayoría de las barberías el barbero cobra un %. Calcular a mano cuánto le toca a cada uno es dolor puro. **Alto valor, encaja perfecto con nuestro cierre de caja que ya existe.** |
| 2 | **Venta de productos + stock** | AgendaPro | Ceras, pomadas, shampoo. Vender y controlar stock con alerta de bajo. Suma ingreso y ata la venta al cierre de caja. |
| 3 | **Email marketing / campañas** | AgendaPro | Tenemos recordatorios automáticos, no campañas ("2x1 este finde"). Ya tenemos Resend andando: es media feature. |
| 4 | **Google Calendar sync** | Varios | Ya está en nuestro roadmap. Que el barbero vea sus turnos en su calendario personal. |
| 5 | **Marketplace / descubrir clientes nuevos** | Booksy, Fresha | Otro modelo de negocio (nos vuelve directorio). Evaluar aparte, no es trivial. |

**App nativa:** no es un hueco — nuestra PWA cubre el caso (instalable, push, offline).

---

## Plan sugerido (orden de ataque)

1. **S1 (token MP)** — seguridad crítica, ya. Migración + código.
2. **S2 + S3** — confirmar rate-limit de Auth + rate-limit en registro. Barato.
3. **Comisiones por barbero** — la feature de competencia de mayor valor y que mejor encaja
   con lo que ya tenemos (cierre de caja, reportes por barbero). Spec Kit.
4. **P3 (npm audit) + P2 (planes mobile)** — limpieza rápida.
5. **Venta de productos + stock** — feature grande, Spec Kit, después de comisiones.
6. **P1 (LCP)** — cuando haya un rato, midiendo contra prod.

Roadmap largo: email marketing (media, Resend ya está), Google Calendar (ya en roadmap).
