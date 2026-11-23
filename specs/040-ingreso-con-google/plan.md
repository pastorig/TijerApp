# Implementation Plan: Ingresar con Google al panel

**Branch**: `040-ingreso-con-google`
**Spec**: spec.md
**Created**: 2026-11-23
**Status**: Draft — espera la configuración de Google de Bautista (quickstart.md) para probar.

## Architecture Overview

El botón oficial de Google (Google Identity Services) se carga solo en las pantallas de ingreso y
devuelve un *ID token* en la misma página. Con ese token se abre la sesión de Supabase
(`signInWithIdToken`), en el mismo cliente y almacenamiento que hoy usa el login con clave. A partir de
ahí todo es lo que ya existe: la misma función decide a dónde va (dueño, empleado, elegir barbería).
Detalle de por qué este camino y no la redirección de Supabase: research.md R1.

Supabase une solo la identidad de Google al usuario que ya existe con ese mail (todas las cuentas se
crean confirmadas), así que no hay migración ni cambio en permisos (R2). Lo único nuevo del lado del
servidor es el alta de quien entra con Google sin tener barbería: una pantalla `/registro/completar`
y un endpoint que reutiliza `provisionBarbershop` con el mail del token (R3).

Para los navegadores de Instagram y Facebook, donde Google bloquea el login, el botón se reemplaza por
un aviso con "Copiar link" (R4).

## Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Login con Google | GIS + `supabase.auth.signInWithIdToken` con nonce | Muestra "tijerapp.com", no redirige, sirve en la PWA |
| Plan B (solo si T001 falla en iPhone instalado) | `signInWithOAuth` con redirect a `/entrar/google` | Misma credencial; solo en ese contexto |
| Dependencias | Ninguna de npm; script de Google cargado con `next/script` en las pantallas de ingreso | Constitución §5 |
| Unión de cuentas | La hace Supabase por mail verificado | Cuentas creadas con `email_confirm: true` |
| Alta pendiente | Derivada (sin accesos), sin tabla | Sin migración |
| Destino post-login | Extraer la lógica de `GlobalLoginForm` a una función compartida | Mail+clave y Google usan exactamente la misma regla (FR-003) |

## File-Level Changes

### New Files

- `src/lib/google-signin.ts` — carga del script, nonce (aleatorio + SHA-256), `signInWithGoogleIdToken(credential, nonce)`.
- `src/lib/navegador-embebido.ts` — `esNavegadorEmbebido(userAgent)`: Instagram, Facebook (`FBAN`/`FBAV`/`FB_IAB`), Line. Puro y testeable.
- `src/components/auth/GoogleSignInButton.tsx` — botón oficial (tema oscuro, texto "Continuar con Google"), estado cargando/error; en navegador embebido muestra el aviso + "Copiar link".
- `src/lib/destino-post-login.ts` — `resolverDestinoTrasLogin({ nextPath, barbershopSlug? })`: admins → staff → alta pendiente. Sale de `GlobalLoginForm` sin cambiar comportamiento.
- `src/app/registro/completar/page.tsx` + `src/components/auth/CompletarRegistroForm.tsx` — nombre de la barbería, tu nombre (precargado de Google), WhatsApp. Sin sesión → `/login`. Con barbería → su panel.
- `src/app/api/registro/google/route.ts` — contrato en `contracts/registro-google.md`.
- `src/app/privacidad/page.tsx` y `src/app/terminos/page.tsx` — Google pide estos links en la pantalla de consentimiento y hoy no existen. Texto corto y real (qué datos guarda TijerApp y para qué), sin inventar.
- `scripts/test-navegador-embebido.ts` y `scripts/test-destino-post-login.ts` — tests unitarios (se suman a `test:unit`).

### Modified Files

- `src/components/GlobalLoginForm.tsx` — botón de Google arriba + separador "o con tu mail"; usa `resolverDestinoTrasLogin`.
- `src/components/AdminLoginForm.tsx` — ídem, respetando la barbería de la URL.
- `src/components/auth/RegisterForm.tsx` — botón "Registrarme con Google" arriba; el formulario actual queda abajo.
- `src/lib/provision-barbershop.ts` — aceptar que no venga clave y el usuario ya exista (hoy lo soporta por mail; se agrega un test de que no le toca la clave).
- `src/app/sitemap.ts` — sumar `/privacidad` y `/terminos`.
- `src/app/owner/**` — sin cambios (FR-009); se verifica que `OwnerLoginForm` no muestre el botón.

## Data Model Changes

Ninguno. Ver data-model.md.

## API Surface

### New Endpoints

- `POST /api/registro/google` — ver contracts/registro-google.md.

### Modified Endpoints

Ninguno.

## UI / UX

```
/login, /[slug]/admin/login, /registro
├── GoogleSignInButton (nuevo)        ← arriba, ancho completo, min-h-11
│   └── AvisoNavegadorEmbebido        ← en Instagram/Facebook en vez del botón
├── separador "o con tu mail"
└── formulario actual (sin cambios)

/registro/completar (nuevo)
└── CompletarRegistroForm: barbería · tu nombre · WhatsApp · "Crear mi barbería"
```

- Toque en "Continuar con Google" → elige cuenta en la ventanita de Google → spinner "Entrando…" → panel.
- Cancelar en Google → vuelve sin cartel rojo.
- Error → "No pudimos entrar con Google. Probá de nuevo o entrá con tu mail."
- Respeta la paleta negro/dorado; el botón de Google usa su diseño oficial (requisito de Google), en
  variante oscura.

## Testing Strategy

- **Build verification**: `npx eslint src scripts`, `npm run test:unit`, `npm run build`.
- **Unit**: navegador embebido (UAs reales de Instagram/Facebook iOS y Android, WhatsApp, Chrome, Safari) y destino post-login (admin, varios admins, staff, alta pendiente, `next` pedido).
- **Manual en prod con cuentas de prueba** (nunca cuentas de clientes):
  1. Cuenta creada con mail y clave → entra con Google → mismo `user.id`, ve su barbería.
  2. Gmail nuevo → `/registro/completar` → barbería creada con prueba de 14 días → borrarla después.
  3. Empleado de prueba en `primebarber` → entra con Google → `/primebarber/mi-agenda`.
  4. Link abierto desde Instagram → aviso, sin pantalla de error de Google.
  5. **iPhone real con la app instalada** (T001, antes de construir el resto) y Android con la app instalada.
  6. Celular a 390 px: el botón y el aviso no tapan nada (`elementFromPoint`).

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| El botón de Google no funciona en la app instalada del iPhone | T001 lo prueba primero con una página mínima; si falla, plan B por redirección solo en ese contexto |
| Supabase no une la cuenta y crea un usuario nuevo | Probado en T002 con cuenta de prueba antes de abrirlo; si pasa, se frena el lanzamiento |
| Google deja la app "En prueba" y nadie puede entrar | Paso 2.7 del quickstart (publicar) + prueba con un Gmail que no sea de Bautista |
| Alguien queda en alta pendiente y no entiende | Cada ingreso lo devuelve a `/registro/completar`, con opción "Ya tengo cuenta con otro mail" |
| Script de Google lento | Se carga solo en las pantallas de ingreso; el formulario de mail funciona sin esperarlo |

## Rollback Plan

- Revertir el merge en `main` (sin migraciones, no hay nada que deshacer en la base).
- Para apagarlo sin deploy: desactivar Google en Supabase → el botón da error y el login con mail
  sigue andando. Las cuentas que ya unieron Google siguen entrando con su clave.

## Gasto en Vercel

Sin crons ni consultas periódicas, sin `middleware` nuevo, `/privacidad` y `/terminos` estáticas.
Un solo push con la tanda completa.

## Next Steps

- Bautista: quickstart.md (Google Cloud + Supabase + variable en Vercel).
- **speckit-tasks**, empezando por T001 (prueba en iPhone) y T002 (unión de cuentas).
