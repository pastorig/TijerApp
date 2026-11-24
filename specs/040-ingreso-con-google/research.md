# Research: 040 Ingresar con Google

## R1. Cómo se hace el ingreso con Google

**Decision**: botón oficial de Google (Google Identity Services, script de `accounts.google.com/gsi/client`)
que devuelve un *ID token* en la misma página, y con ese token se abre la sesión de Supabase con
`auth.signInWithIdToken({ provider: "google", token, nonce })`.

**Rationale**:
- La pantalla de Google dice "Ir a **tijerapp.com**". Con el flujo por redirección de Supabase dice
  "Ir a **rxqxjozftxivzmgiflgm.supabase.co**", que en un barbero genera desconfianza. Arreglar eso
  con redirección exige el dominio propio de Supabase (add-on pago).
- No hay ida y vuelta de páginas: el login se resuelve en la misma pantalla y la sesión queda en el
  mismo almacenamiento que hoy usa el panel (`localStorage` del cliente de `src/lib/supabase.ts`).
  Eso evita el problema de la app instalada en iPhone, donde una redirección fuera del sitio vuelve en
  otro contexto y la sesión no llega a la app.
- No suma dependencias de npm: es un script de Google que se carga solo en las pantallas de ingreso.

**Alternatives considered**:
- `signInWithOAuth` (redirección de Supabase): más simple de codear, pero muestra el dominio de
  Supabase y tiene el riesgo de la PWA de iPhone. **Queda como plan B** si la prueba en iPhone real
  (tarea T001) muestra que el botón de Google no funciona en la app instalada; en ese caso se usa
  solo en ese contexto, con la misma credencial de Google.
- Dominio propio de Supabase: resuelve el nombre pero cuesta todos los meses y no resuelve la PWA.

**Nonce**: se genera un nonce aleatorio por intento; a Google se le pasa su SHA-256 y a Supabase el
valor original (lo que pide `signInWithIdToken`).

## R2. Unir la cuenta existente (FR-002)

**Decision**: lo resuelve Supabase solo. Cuando entra un usuario de Google cuyo mail verificado ya
existe, Supabase le agrega la identidad de Google al **mismo** usuario (mismo `user.id`).

**Rationale**: todas las cuentas de TijerApp se crean con `email_confirm: true`
(`provision-barbershop.ts`, `api/admin/team`, `api/admin/staff-access`), que es la condición que
exige Supabase para unirlas. Como el `user.id` no cambia, siguen valiendo los accesos de dueño
(`barbershop_admins`) y de empleado (que se buscan por `user_id`).

**Verificación**: test manual en producción con una cuenta de prueba creada por mail y clave
(no con cuentas de clientes): después de entrar con Google, el `user.id` es el mismo y
`identities` tiene `email` y `google`.

## R3. Persona nueva que entra con Google (FR-004/FR-005)

**Decision**: Supabase crea el usuario al primer ingreso. Si ese usuario no administra ninguna
barbería ni es empleado, el destino post-login es `/registro/completar`. Ahí completa nombre de la
barbería, su nombre (precargado de Google) y WhatsApp, y el servidor crea la barbería para **ese**
usuario con la provisión existente.

**Rationale**: `provisionBarbershop` ya busca el usuario por mail y, si existe, no le toca la clave;
solo falta llamarla con el mail que sale del token y no del formulario. No hace falta tabla nueva:
"alta pendiente" = sesión válida sin accesos.

## R4. Navegadores que Google bloquea (FR-006)

**Decision**: detectar por user agent los navegadores embebidos de Instagram (`Instagram`),
Facebook (`FBAN`, `FBAV`, `FB_IAB`) y otros webviews conocidos (`; wv)` en Android con Instagram/FB,
`Line/`). En esos casos el botón muestra el aviso y "Copiar link". WhatsApp en iPhone abre Safari
(permitido) y en Android abre una pestaña de Chrome (permitida), así que no se bloquea.

**Rationale**: Google rechaza el login en webviews (`disallowed_useragent`) y la pantalla de error
es en inglés y sin salida.

## R5. Panel owner

**Decision**: `/owner` no muestra el botón y su control de acceso no cambia. Si Bautista entra con
Google desde `/login` con el mismo mail, es el mismo usuario (R2) y el control del owner lo trata
igual que hoy; no se agrega ningún camino nuevo de acceso al owner.
