# TijerApp Project Constitution

**Purpose**: Principios fundamentales que TODOS los specs/plans/implementations de TijerApp deben respetar. Estos son non-negotiable por default; cualquier excepción debe documentarse explícitamente.

## Source of truth

Las reglas operativas día-a-día viven en [`AGENTS.md`](../../AGENTS.md) en la raíz del repo (referenciado por `CLAUDE.md`). Este archivo resume los **principios** de más alto nivel para que las skills `speckit-*` los apliquen automáticamente.

## Principios

### 1. Multi-tenant first

- El producto es multi-tenant SaaS. NUNCA hardcodear lógica de SV Barber u otra barbería específica.
- Cada barbería se identifica por su `slug` (kebab-case). Las rutas públicas y admin viven bajo `/[slug]/`.
- Datos de cada tenant aislados por `barbershop_slug` + RLS en Supabase.

### 2. Mobile-first obligatorio

- Toda UI debe diseñarse pensando en celular primero, expandir a desktop.
- Botones tactiles (min-h-11 / 44px de touch target).
- Admin compacto para uso durante el trabajo (un barbero corta y opera el panel al mismo tiempo).

### 3. Estética premium minimal

- Paleta restringida: negro `#0a0a0a` + gold `#c9a23e` + silver `#d8d8d8`. NO cambiar.
- Sin ornamentos decorativos, sin gradientes coloridos, sin glows, sin barber-stripes.
- Tipografía Geist (Sans Black para headings + wordmark, Mono para datos).
- Spacing generoso. Líneas finas. Acentos gold en estados activos.

### 4. Spanish rioplatense

- UI siempre en español: "vos", "podés", "elegí", "decime".
- Errores en lenguaje natural, no técnico ("no pudimos guardar la reserva" vs "INSERT FAILED").

### 5. Stack discipline

- TypeScript en todo el código. No JS suelto.
- Next.js App Router. NO Pages Router.
- Tailwind CSS v4 para estilos. NO CSS modules.
- Supabase como backend único. RLS estricta, RPCs `security definer` para reads públicos.
- NO agregar libs pesadas sin justificación documentada en el plan.md.

### 6. No half-finished implementations

- Cada feature debe ir end-to-end: DB → API → UI → tests → lint + build pasando.
- NO mergear código que rompe lint o build.
- NO feature flags ni shims de backwards-compat innecesarios.

### 7. Branch workflow

- Toda feature vive en su branch `<NNN>-<short-name>` o `claude/<task>` o `codex/<task>`.
- NUNCA pushear directo a `main`.
- Merge via `--no-ff` para preservar historia del branch.

### 8. Spec-driven by default

- Features nuevas (no triviales) deben pasar por el flow speckit completo.
- Excepciones explícitas: bug fixes de 1 línea, refactors mecánicos, tweaks visuales chiquitos.

## Cómo aplicar esta constitution

Cuando `speckit-plan` corra para una feature, debe:

1. Marcar como **violation** cualquier propuesta técnica que rompa estos principios.
2. Si la violation tiene justificación válida → documentarla en el plan.md como "Constitution exception" con razón.
3. Si NO tiene justificación → ERROR, volver a evaluar el approach.
